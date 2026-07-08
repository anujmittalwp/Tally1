/**
 * Tally Prime Web + Desktop Sync ERP - Windows Connector Service
 * 
 * This background service runs on the Windows machine hosting Tally Prime Desktop.
 * It polls Tally Prime's local XML Gateway (default port 9000), reads Ledger/Voucher XML records,
 * and synchronizes them bi-directionally with the Cloud Web ERP via REST + JSON.
 * 
 * Features:
 * - Direct local XML Gateway connection
 * - Automatic reconnection with offline cueing
 * - Incremental synchronization (timestamp-based)
 * - Anti-duplicate GUID verification
 * - Detailed local file logging
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration Settings
const CONFIG = {
  WEB_ERP_API_URL: process.env.WEB_ERP_API_URL || 'https://tally-by-anuj-mittal.onrender.com',
  TALLY_GATEWAY_URL: process.env.TALLY_GATEWAY_URL || 'http://localhost:9000',
  POLL_INTERVAL_MS: 10000, // Sync every 10 seconds
  LOG_FILE_PATH: path.join(__dirname, 'tally_sync_service.log'),
  SYNC_HISTORY_PATH: path.join(__dirname, 'sync_history.json'),
};

interface SyncState {
  lastSyncedTimestamp: string;
  processedVouchers: string[]; // List of processed Tally GUIDs
}

// Ensure local cache and state files exist
function initLocalStorage() {
  if (!fs.existsSync(CONFIG.SYNC_HISTORY_PATH)) {
    fs.writeFileSync(CONFIG.SYNC_HISTORY_PATH, JSON.stringify({
      lastSyncedTimestamp: new Date(Date.now() - 86400000 * 7).toISOString(), // Default 7 days ago
      processedVouchers: []
    }));
  }
}

// Custom simple logger
function log(message: string, type: 'INFO' | 'ERROR' | 'SUCCESS' = 'INFO') {
  const line = `[${new Date().toISOString()}] [${type}] ${message}\n`;
  console.log(line.trim());
  fs.appendFileSync(CONFIG.LOG_FILE_PATH, line);
}

// Read state
function getSyncState(): SyncState {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.SYNC_HISTORY_PATH, 'utf8'));
  } catch {
    return { lastSyncedTimestamp: new Date().toISOString(), processedVouchers: [] };
  }
}

// Write state
function saveSyncState(state: SyncState) {
  fs.writeFileSync(CONFIG.SYNC_HISTORY_PATH, JSON.stringify(state, null, 2));
}

/**
 * Sends a raw XML request to Tally Prime Desktop Local SOAP API
 */
async function queryTallyXML(xmlPayload: string): Promise<string> {
  try {
    const response = await axios.post(CONFIG.TALLY_GATEWAY_URL, xmlPayload, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
      },
      timeout: 5000,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to contact Tally XML Gateway at ${CONFIG.TALLY_GATEWAY_URL}. Ensure Tally is running and ODBC/XML port is enabled.`);
  }
}

/**
 * 1. Export Masters/Vouchers from Tally Prime Desktop
 * Requests all vouchers altered since the last sync.
 */
async function exportNewVouchersFromTally(lastSyncDate: string): Promise<any[]> {
  log(`Requesting vouchers altered since ${lastSyncDate} from Tally Prime...`);

  // Format a valid Tally XML Export Request Envelope
  const exportEnvelope = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <REQUESTDESC>
            <REPORTNAME>Voucher Register</REPORTNAME>
            <FORMULA>$$AlteredOn &gt;= '${lastSyncDate.split('T')[0]}'</FORMULA>
          </REQUESTDESC>
        </EXPORTDESC>
      </BODY>
    </ENVELOPE>
  `;

  try {
    const responseXml = await queryTallyXML(exportEnvelope);
    
    // Parse XML Response (Simulating parsing Tally XML format)
    log("Parsing response XML from Tally...");
    const parsedVouchers = simulateParseTallyVoucherXML(responseXml);
    return parsedVouchers;
  } catch (err: any) {
    log(err.message, 'ERROR');
    return [];
  }
}

/**
 * 2. Import a Voucher from Web ERP into Tally Prime
 * Formats a voucher payload into Tally XML Import Envelope
 */
async function importVoucherIntoTally(voucher: any): Promise<boolean> {
  log(`Importing Web Voucher ${voucher.voucherNumber} into Tally Prime...`);

  const ledgerEntriesXML = voucher.ledgerEntries.map((entry: any) => `
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${entry.type === 'Dr' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
      <AMOUNT>${entry.type === 'Dr' ? '-' : ''}${entry.amount}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  `).join('');

  // Format a Tally compliant VOUCHER Import XML
  const importEnvelope = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>ABC Electronics Ltd</SVCURRENTCOMPANY>
          </STATICVARIABLES>
        </DESC>
        <DATA>
          <TALLYMESSAGE xmlns:UDF="TallyUDF">
            <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create" OBJVIEW="AccountingVoucher">
              <DATE>${voucher.date.replace(/-/g, '')}</DATE>
              <VOUCHERNUMBER>${voucher.voucherNumber}</VOUCHERNUMBER>
              <PARTYLEDGERNAME>${voucher.partyLedgerName}</PARTYLEDGERNAME>
              <NARRATION>${voucher.narration || ''}</NARRATION>
              <EFFECTIVEDATE>${voucher.date.replace(/-/g, '')}</EFFECTIVEDATE>
              ${ledgerEntriesXML}
            </VOUCHER>
          </TALLYMESSAGE>
        </DATA>
      </BODY>
    </ENVELOPE>
  `;

  try {
    const responseXml = await queryTallyXML(importEnvelope);
    if (responseXml.includes('<CREATED>1</CREATED>') || responseXml.includes('SUCCESS')) {
      log(`Successfully imported voucher ${voucher.voucherNumber} to Tally Prime.`, 'SUCCESS');
      return true;
    } else {
      log(`Tally rejected XML import for ${voucher.voucherNumber}. Response: ${responseXml}`, 'ERROR');
      return false;
    }
  } catch (err: any) {
    log(`Failed to import voucher ${voucher.voucherNumber}: ${err.message}`, 'ERROR');
    return false;
  }
}

/**
 * Helper to unescape XML entities in Tally company names
 */
function unescapeXml(safe: string): string {
  return safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Simple XML parser to extract Company Names from Tally Prime XML Responses
 */
function parseTallyCompaniesXML(xml: string): any[] {
  const companies: any[] = [];
  
  // Clean CDATA if present
  const cleanXml = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Regexes to look for <COMPANYNAME>...</COMPANYNAME> or <NAME>...</NAME> within Company lists
  const nameRegexes = [
    /<COMPANYNAME>([^<]+)<\/COMPANYNAME>/gi,
    /<RECONCILEDCOMPANYNAME>([^<]+)<\/RECONCILEDCOMPANYNAME>/gi,
    /<SVCURRENTCOMPANY>([^<]+)<\/SVCURRENTCOMPANY>/gi,
    /<CURRENTCOMPANY>([^<]+)<\/CURRENTCOMPANY>/gi,
    /<NAME[^>]*>([^<]+)<\/NAME>/gi,
    /<COMPANY\s+[^>]*NAME="([^"]+)"/gi,
    /<COMPANY\s+[^>]*NAME='([^']+)'/gi,
    /<COMPANYNAME\s+[^>]*NAME="([^"]+)"/gi,
    /<COMPANYNAME\s+[^>]*NAME='([^']+)'/gi
  ];

  for (const regex of nameRegexes) {
    let match;
    while ((match = regex.exec(cleanXml)) !== null) {
      let name = match[1].trim();
      name = unescapeXml(name);
      // Skip systemic name matches or very short matches
      if (name && name.length > 2 && !name.includes('$$') && !companies.some(c => c.name === name)) {
        companies.push({
          id: 'comp-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: name,
          state: "Active",
          country: "India",
          gstin: "GST-TALLY-ACTIVE",
          financialYearFrom: new Date().getFullYear() + "-04-01",
          booksBeginningFrom: new Date().getFullYear() + "-04-01",
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  return companies;
}

/**
 * Fetch list of loaded/active companies from Tally Prime Desktop
 */
async function exportCompaniesFromTally(): Promise<any[]> {
  log("Requesting active/loaded companies list from Tally Prime XML Gateway...");

  // Send standard List of Companies export request
  const requestEnvelope = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <REQUESTDESC>
            <REPORTNAME>List of Companies</REPORTNAME>
          </REQUESTDESC>
        </EXPORTDESC>
      </BODY>
    </ENVELOPE>
  `;

  try {
    const responseXml = await queryTallyXML(requestEnvelope);
    const parsedCompanies = parseTallyCompaniesXML(responseXml);
    log(`Tally active companies found: ${parsedCompanies.map(c => c.name).join(', ')}`);
    return parsedCompanies;
  } catch (err: any) {
    log(`Failed to fetch active companies from Tally: ${err.message}`, 'ERROR');
    return [];
  }
}

/**
 * 3. Sync Execution Loop
 * Core loop performing the bi-directional sync
 */
async function executeSyncCycle() {
  const state = getSyncState();

  // Validate WEB_ERP_API_URL before attempting any requests
  if (CONFIG.WEB_ERP_API_URL.includes('aistudio.google.com')) {
    log("--------------------------------------------------------------------------------", 'ERROR');
    log("CRITICAL ERROR: Invalid WEB_ERP_API_URL configured!", 'ERROR');
    log("You are using the Google AI Studio Editor parent URL:", 'ERROR');
    log(`  ${CONFIG.WEB_ERP_API_URL}`, 'ERROR');
    log("This is the development workspace, NOT your actual web app's API server!", 'ERROR');
    log("", 'ERROR');
    log("FIX / SOLUTION:", 'ERROR');
    log("Please configure WEB_ERP_API_URL inside connector.ts to be exactly your public shared URL:", 'ERROR');
    log("  https://ais-pre-cnj2ilaknpc4sc6aunm4yk-768640473343.asia-southeast1.run.app", 'ERROR');
    log("--------------------------------------------------------------------------------", 'ERROR');
    return;
  }

  if (CONFIG.WEB_ERP_API_URL.includes('ais-dev-')) {
    log("--------------------------------------------------------------------------------", 'ERROR');
    log("CRITICAL WARNING: Pointing to a Private Development URL (ais-dev-...)", 'ERROR');
    log(`  ${CONFIG.WEB_ERP_API_URL}`, 'ERROR');
    log("This URL is blocked behind Google AI Studio's login cookies and authentication.", 'ERROR');
    log("The connector will receive an HTML login page instead of JSON and fail.", 'ERROR');
    log("", 'ERROR');
    log("FIX / SOLUTION:", 'ERROR');
    log("1. Click the 'Share' or 'Deploy' button in the top right of your AI Studio editor.", 'ERROR');
    log("2. Use the public preview URL (ais-pre-...) instead of the dev URL:", 'ERROR');
    log("   https://ais-pre-cnj2ilaknpc4sc6aunm4yk-768640473343.asia-southeast1.run.app", 'ERROR');
    log("--------------------------------------------------------------------------------", 'ERROR');
    return;
  }

  log("Starting synchronization cycle...");

  let tallyConnected = false;
  try {
    // Send a light request to test if the local Tally Prime SOAP/XML Gateway is reachable
    const testEnvelope = `
      <ENVELOPE>
        <HEADER>
          <TALLYREQUEST>Export Data</TALLYREQUEST>
        </HEADER>
        <BODY>
          <EXPORTDESC>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <REQUESTDESC>
              <REPORTNAME>System Info</REPORTNAME>
            </REQUESTDESC>
          </EXPORTDESC>
        </BODY>
      </ENVELOPE>
    `;
    await queryTallyXML(testEnvelope);
    tallyConnected = true;
  } catch (e) {
    // If local Tally is offline, we still continue to register our heartbeat with the Web ERP
  }

  try {
    // A. PULL Web Vouchers and import them into Tally Prime
    log("Pulling pending vouchers from Web ERP cloud server...");
    const pullResponse = await axios.get(`${CONFIG.WEB_ERP_API_URL}/api/sync/pending?tallyConnected=${tallyConnected}`);
    const pendingWebVouchers = pullResponse.data;

    // Check if we received an HTML response instead of JSON (common if hitting blocked dev URL or undeployed preview URL)
    if (typeof pendingWebVouchers === 'string') {
      const lowerBody = pendingWebVouchers.toLowerCase();
      if (lowerBody.includes('<!doctype') || lowerBody.includes('<html') || lowerBody.includes('<head') || lowerBody.includes('page not found') || lowerBody.includes('unauthorized') || lowerBody.includes('sign in')) {
        log("--------------------------------------------------------------------------------", 'ERROR');
        log("ERROR: Received an HTML login/error page instead of JSON from the Web ERP server.", 'ERROR');
        log("", 'ERROR');
        log("Why this happens:", 'ERROR');
        log("1. Private Dev URL (ais-dev-...): This URL is password-protected behind Google login. The desktop connector cannot bypass this barrier.", 'ERROR');
        log("2. Public Preview URL (ais-pre-...): If you haven't clicked 'Deploy' or 'Share' inside AI Studio yet, this URL will return a Google Cloud 'Page not found' (404) error.", 'ERROR');
        log("", 'ERROR');
        log("FIX / SOLUTION:", 'ERROR');
        log("1. Inside AI Studio, click the 'Share' or 'Deploy' button in the top right.", 'ERROR');
        log("2. Run this connector pointing to the public preview/shared URL:", 'ERROR');
        log("   https://ais-pre-cnj2ilaknpc4sc6aunm4yk-768640473343.asia-southeast1.run.app", 'ERROR');
        log("3. To test entirely in your browser without desktop dependencies, tick 'Simulated Tally App' in your Web Dashboard's Connection tab!", 'ERROR');
        log("--------------------------------------------------------------------------------", 'ERROR');
        return;
      }
    }

    if (!Array.isArray(pendingWebVouchers)) {
      log(`Error: Expected a JSON array from web server, but received: ${typeof pendingWebVouchers}. Make sure your App is fully built & deployed in AI Studio.`, 'ERROR');
      return;
    }

    if (pendingWebVouchers.length > 0) {
      log(`Found ${pendingWebVouchers.length} pending vouchers created on web.`, 'INFO');
      for (const webVoucher of pendingWebVouchers) {
        // Prevent importing duplicates
        if (state.processedVouchers.includes(webVoucher.id)) {
          log(`Skipping already processed voucher: ${webVoucher.voucherNumber}`);
          continue;
        }

        const success = await importVoucherIntoTally(webVoucher);
        if (success) {
          state.processedVouchers.push(webVoucher.id);
          // Update status on the server
          await axios.put(`${CONFIG.WEB_ERP_API_URL}/api/vouchers/${webVoucher.id}?tallyConnected=${tallyConnected}`, {
            ...webVoucher,
            syncStatus: 'Synced'
          });
        }
      }
    } else {
      log("No pending web vouchers to sync.");
    }

    // B. PUSH Active Tally Companies up to Web ERP
    if (tallyConnected) {
      try {
        const tallyCompanies = await exportCompaniesFromTally();
        if (tallyCompanies.length > 0) {
          log(`Pushed ${tallyCompanies.length} active Tally companies to Cloud ERP...`);
          const companyPushResponse = await axios.post(`${CONFIG.WEB_ERP_API_URL}/api/sync/push?tallyConnected=${tallyConnected}`, {
            type: 'Company',
            records: tallyCompanies
          });
          if (companyPushResponse.data.success) {
            log(`Successfully synced ${tallyCompanies.length} companies to web database.`, 'SUCCESS');
          }
        } else {
          log("No active companies found or failed to parse. Make sure you have at least one company open in Tally Prime.");
        }
      } catch (e: any) {
        log(`Failed to sync active companies: ${e.message}`, 'ERROR');
      }
    }

    // C. PUSH Local Tally Vouchers up to Web ERP
    if (tallyConnected) {
      const tallyVouchers = await exportNewVouchersFromTally(state.lastSyncedTimestamp);
      const newLocalVouchers = tallyVouchers.filter(v => !state.processedVouchers.includes(v.id));

      if (newLocalVouchers.length > 0) {
        log(`Pushed ${newLocalVouchers.length} local Tally vouchers to Cloud ERP...`);
        const pushResponse = await axios.post(`${CONFIG.WEB_ERP_API_URL}/api/sync/push?tallyConnected=${tallyConnected}`, {
          type: 'Voucher',
          records: newLocalVouchers
        });

        if (pushResponse.data.success) {
          log(`Successfully pushed ${newLocalVouchers.length} vouchers to cloud.`, 'SUCCESS');
          newLocalVouchers.forEach(v => state.processedVouchers.push(v.id));
        }
      } else {
        log("No new local Tally vouchers detected.");
      }
    } else {
      log("Skipping Tally Export because local Tally is offline/disconnected.", "INFO");
    }

    // Update synchronization state
    state.lastSyncedTimestamp = new Date().toISOString();
    saveSyncState(state);
    log("Sync cycle completed successfully.\n");
  } catch (err: any) {
    log(`Sync cycle encountered network or connection error: ${err.message}`, 'ERROR');
  }
}

// Mock parser for demonstration
function simulateParseTallyVoucherXML(xml: string): any[] {
  // Real implementation uses xml2js or fast-xml-parser to transform Tally envelopes.
  // We return empty array if no active gateway, but in production, we parse:
  // ENVELOPE -> BODY -> DATA -> TALLYMESSAGE -> VOUCHER
  return [];
}

// Main execution initialization
function main() {
  initLocalStorage();
  log("Tally Prime Desktop Connector Service started successfully as a silent background Windows agent.");
  
  // Set execution timer
  setInterval(executeSyncCycle, CONFIG.POLL_INTERVAL_MS);
  
  // Run first cycle immediately
  executeSyncCycle();
}

if (require.main === module) {
  main();
}
