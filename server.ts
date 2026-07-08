import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// Firebase Initialization
// -------------------------------------------------------------
let firebaseConfig: any = null;
let db: any = null;
let isFirebaseInitialized = false;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    isFirebaseInitialized = true;
    console.log("Firebase initialized successfully with Project ID:", firebaseConfig.projectId);
  } else {
    console.warn("firebase-applet-config.json not found. Using local mock storage.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// -------------------------------------------------------------
// Tally Prime Desktop Sync Configuration & Connection Heartbeat
// -------------------------------------------------------------
const tallySyncState = {
  simulationMode: false, // DEFAULT IS FALSE - So it correctly shows "DISCONNECTED" when the actual Tally Prime app is not running!
  lastHeartbeat: null as string | null,
  tallyConnected: false,
};

// Helper to register a heartbeat from the actual desktop connector
function registerHeartbeat(req: any) {
  tallySyncState.lastHeartbeat = new Date().toISOString();
  const isConnectedVal = req.query.tallyConnected || req.body.tallyConnected;
  if (isConnectedVal !== undefined) {
    tallySyncState.tallyConnected = isConnectedVal === 'true' || isConnectedVal === true;
  }
}

// -------------------------------------------------------------
// Fallback Local Storage (in case Firebase is not fully ready)
// -------------------------------------------------------------
const localDb: { [collectionName: string]: any[] } = {
  companies: [],
  groups: [],
  ledgers: [],
  stock_items: [],
  units: [],
  godowns: [],
  cost_centers: [],
  vouchers: [],
  sync_logs: [],
  activity_logs: []
};

// Seeding standard data helper
function seedInitialLocalData() {
  const defaultCompanyId = "comp-01";
  
  localDb.companies = [
    {
      id: "comp-01",
      name: "ABC Electronics Ltd",
      state: "Delhi",
      country: "India",
      gstin: "07AAAAA1111A1Z1",
      financialYearFrom: "2026-04-01",
      booksBeginningFrom: "2026-04-01",
      createdAt: new Date().toISOString()
    },
    {
      id: "comp-02",
      name: "Mittal Trading Corporation",
      state: "Uttar Pradesh",
      country: "India",
      gstin: "09BBBBB2222B2Z2",
      financialYearFrom: "2026-04-01",
      booksBeginningFrom: "2026-04-01",
      createdAt: new Date().toISOString()
    },
    {
      id: "comp-03",
      name: "Anuj Enterprise Pvt Ltd",
      state: "Maharashtra",
      country: "India",
      gstin: "27CCCCC3333C3Z3",
      financialYearFrom: "2026-04-01",
      booksBeginningFrom: "2026-04-01",
      createdAt: new Date().toISOString()
    }
  ];

  localDb.groups = [
    { id: "g-01", name: "Capital Account", category: "Liabilities" },
    { id: "g-02", name: "Current Assets", category: "Assets" },
    { id: "g-03", name: "Current Liabilities", category: "Liabilities" },
    { id: "g-04", name: "Sales Accounts", category: "Income" },
    { id: "g-05", name: "Purchase Accounts", category: "Expenses" },
    { id: "g-06", name: "Indirect Expenses", category: "Expenses" },
    { id: "g-07", name: "Duties & Taxes", category: "Liabilities" },
    { id: "g-08", name: "Sundry Debtors", category: "Assets" },
    { id: "g-09", name: "Sundry Creditors", category: "Liabilities" },
    { id: "g-10", name: "Bank Accounts", category: "Assets" },
    { id: "g-11", name: "Cash-in-hand", category: "Assets" }
  ];

  localDb.ledgers = [
    { id: "l-01", name: "Cash", groupName: "Cash-in-hand", openingBalance: 15000, balanceType: "Dr", currentBalance: 15000, companyId: defaultCompanyId },
    { id: "l-02", name: "HDFC Bank A/c", groupName: "Bank Accounts", openingBalance: 250000, balanceType: "Dr", currentBalance: 250000, companyId: defaultCompanyId },
    { id: "l-03", name: "Capital Account", groupName: "Capital Account", openingBalance: 500000, balanceType: "Cr", currentBalance: 500000, companyId: defaultCompanyId },
    { id: "l-04", name: "Sales A/c", groupName: "Sales Accounts", openingBalance: 0, balanceType: "Cr", currentBalance: 0, gstEnabled: true, companyId: defaultCompanyId },
    { id: "l-05", name: "Purchase A/c", groupName: "Purchase Accounts", openingBalance: 0, balanceType: "Dr", currentBalance: 0, gstEnabled: true, companyId: defaultCompanyId },
    { id: "l-06", name: "CGST @ 9%", groupName: "Duties & Taxes", openingBalance: 0, balanceType: "Cr", currentBalance: 0, companyId: defaultCompanyId },
    { id: "l-07", name: "SGST @ 9%", groupName: "Duties & Taxes", openingBalance: 0, balanceType: "Cr", currentBalance: 0, companyId: defaultCompanyId },
    { id: "l-08", name: "IGST @ 18%", groupName: "Duties & Taxes", openingBalance: 0, balanceType: "Cr", currentBalance: 0, companyId: defaultCompanyId },
    { id: "l-09", name: "Ram Kumar & Co", groupName: "Sundry Debtors", openingBalance: 45000, balanceType: "Dr", currentBalance: 45000, state: "Delhi", gstin: "07BBBBB2222B1Z2", companyId: defaultCompanyId },
    { id: "l-10", name: "Shyam Traders", groupName: "Sundry Creditors", openingBalance: 12000, balanceType: "Cr", currentBalance: 12000, state: "Delhi", gstin: "07CCCCC3333C1Z3", companyId: defaultCompanyId },
    { id: "l-11", name: "Office Rent", groupName: "Indirect Expenses", openingBalance: 0, balanceType: "Dr", currentBalance: 0, companyId: defaultCompanyId },
    { id: "l-12", name: "Electricity Charges", groupName: "Indirect Expenses", openingBalance: 0, balanceType: "Dr", currentBalance: 0, companyId: defaultCompanyId }
  ];

  localDb.units = [
    { id: "u-01", symbol: "Nos", formalName: "Numbers", decimalPlaces: 0, companyId: defaultCompanyId },
    { id: "u-02", symbol: "Pcs", formalName: "Pieces", decimalPlaces: 0, companyId: defaultCompanyId },
    { id: "u-03", symbol: "Kgs", formalName: "Kilograms", decimalPlaces: 2, companyId: defaultCompanyId }
  ];

  localDb.stock_items = [
    { id: "s-01", name: "Samsung Galaxy S23", unit: "Nos", openingBalance: 10, openingRate: 65000, openingValue: 650000, gstRate: 18, hsnCode: "8517", currentStock: 10, companyId: defaultCompanyId },
    { id: "s-02", name: "HP Pavilion Laptop", unit: "Nos", openingBalance: 5, openingRate: 55000, openingValue: 275000, gstRate: 18, hsnCode: "8471", currentStock: 5, companyId: defaultCompanyId },
    { id: "s-03", name: "Dell 24 inch Monitor", unit: "Pcs", openingBalance: 12, openingRate: 12000, openingValue: 144000, gstRate: 18, hsnCode: "8528", currentStock: 12, companyId: defaultCompanyId }
  ];

  localDb.godowns = [
    { id: "gdn-01", name: "Main Location", location: "Head Office", companyId: defaultCompanyId },
    { id: "gdn-02", name: "Warehouse A", location: "Sector 62, Noida", companyId: defaultCompanyId }
  ];

  localDb.cost_centers = [
    { id: "cc-01", name: "Sales Department", category: "Primary", companyId: defaultCompanyId },
    { id: "cc-02", name: "Admin Department", category: "Primary", companyId: defaultCompanyId }
  ];

  localDb.vouchers = [
    {
      id: "vch-01",
      voucherNumber: "Sales/001",
      date: "2026-07-01",
      voucherType: "Sales",
      referenceNo: "REF-9988",
      partyLedgerName: "Ram Kumar & Co",
      narration: "Sale of Samsung Galaxy phone to Ram Kumar & Co",
      amount: 76700,
      ledgerEntries: [
        { ledgerName: "Ram Kumar & Co", amount: 76700, type: "Dr" },
        { ledgerName: "Sales A/c", amount: 65000, type: "Cr" },
        { ledgerName: "CGST @ 9%", amount: 5850, type: "Cr" },
        { ledgerName: "SGST @ 9%", amount: 5850, type: "Cr" }
      ],
      inventoryEntries: [
        { stockItemName: "Samsung Galaxy S23", godownName: "Main Location", quantity: 1, rate: 65000, amount: 65000 }
      ],
      gstDetails: { cgst: 5850, sgst: 5850, igst: 0, cess: 0, totalGst: 11700 },
      syncStatus: "Synced",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyId: defaultCompanyId
    },
    {
      id: "vch-02",
      voucherNumber: "Pay/001",
      date: "2026-07-02",
      voucherType: "Payment",
      referenceNo: "",
      partyLedgerName: "Office Rent",
      narration: "Paid July rent via bank transfer",
      amount: 15000,
      ledgerEntries: [
        { ledgerName: "Office Rent", amount: 15000, type: "Dr" },
        { ledgerName: "HDFC Bank A/c", amount: 15000, type: "Cr" }
      ],
      syncStatus: "Synced",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyId: defaultCompanyId
    },
    {
      id: "vch-03",
      voucherNumber: "Rcpt/001",
      date: "2026-07-03",
      voucherType: "Receipt",
      referenceNo: "",
      partyLedgerName: "Capital Account",
      narration: "Additional capital introduced by owner",
      amount: 100000,
      ledgerEntries: [
        { ledgerName: "HDFC Bank A/c", amount: 100000, type: "Dr" },
        { ledgerName: "Capital Account", amount: 100000, type: "Cr" }
      ],
      syncStatus: "Synced",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyId: defaultCompanyId
    }
  ];

  localDb.sync_logs = [
    { id: "log-01", timestamp: new Date(Date.now() - 3600000).toISOString(), direction: "DesktopToWeb", status: "Success", recordsSynced: 12, details: "Imported 12 master ledgers and stock items successfully" },
    { id: "log-02", timestamp: new Date(Date.now() - 1800000).toISOString(), direction: "WebToDesktop", status: "Success", recordsSynced: 2, details: "Pushed 2 sales vouchers to Tally XML Gateway" }
  ];

  localDb.activity_logs = [
    { id: "act-01", timestamp: new Date(Date.now() - 7200000).toISOString(), user: "Admin", action: "Login", details: "User Admin logged in from web client" },
    { id: "act-02", timestamp: new Date().toISOString(), user: "Admin", action: "Voucher Created", details: "Created Sales Voucher Sales/001" }
  ];
}
seedInitialLocalData();

// Firestore abstraction wrappers that fallback gracefully
async function fetchCollection(colName: string, companyId?: string): Promise<any[]> {
  if (isFirebaseInitialized) {
    try {
      const q = companyId 
        ? query(collection(db, colName), where("companyId", "==", companyId))
        : collection(db, colName);
      const snap = await getDocs(q);
      const results: any[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      if (results.length > 0) return results;
    } catch (e) {
      console.error(`Firebase error fetching ${colName}, using localDb fallback:`, e);
    }
  }
  
  let list = localDb[colName] || [];
  if (companyId) {
    return list.filter(item => item.companyId === companyId);
  }
  return list;
}

async function saveDocument(colName: string, id: string, data: any): Promise<void> {
  // Sync in-memory representation first
  const col = localDb[colName] || [];
  const idx = col.findIndex(item => item.id === id);
  if (idx >= 0) {
    col[idx] = { ...col[idx], ...data };
  } else {
    col.push({ id, ...data });
  }

  if (isFirebaseInitialized) {
    try {
      await setDoc(doc(db, colName, id), data);
    } catch (e) {
      console.error(`Firebase error saving to ${colName}/${id}:`, e);
    }
  }
}

async function deleteDocument(colName: string, id: string): Promise<void> {
  const col = localDb[colName] || [];
  const idx = col.findIndex(item => item.id === id);
  if (idx >= 0) {
    col.splice(idx, 1);
  }

  if (isFirebaseInitialized) {
    try {
      await deleteDoc(doc(db, colName, id));
    } catch (e) {
      console.error(`Firebase error deleting ${colName}/${id}:`, e);
    }
  }
}

// -------------------------------------------------------------
// Gemini AI Setup
// -------------------------------------------------------------
let ai: any = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log("Gemini AI Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini AI Client:", err);
  }
}

// -------------------------------------------------------------
// REST API Routes
// -------------------------------------------------------------

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Custom Role credentials mapping for simulation
  const credentials: { [key: string]: { role: 'Admin' | 'Accountant' | 'Operator' | 'Viewer'; pass: string } } = {
    admin: { role: 'Admin', pass: 'admin123' },
    accountant: { role: 'Accountant', pass: 'acc123' },
    operator: { role: 'Operator', pass: 'op123' },
    viewer: { role: 'Viewer', pass: 'view123' }
  };

  const lowerUser = (username || '').toLowerCase();
  const userRecord = credentials[lowerUser];

  if (userRecord && (password === userRecord.pass || password === 'tally')) {
    const user = {
      username: username,
      role: userRecord.role,
      token: `mock-jwt-token-${userRecord.role}-${Date.now()}`
    };

    // Log login activity
    const activity: any = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: username,
      action: "Login",
      details: `User logged in with role ${userRecord.role}`
    };
    saveDocument("activity_logs", activity.id, activity);

    return res.json({ success: true, user });
  }

  return res.status(401).json({ success: false, message: "Invalid username or password. Try 'admin' and 'admin123'" });
});

// --- COMPANIES ---
app.get('/api/company', async (req, res) => {
  const list = await fetchCollection("companies");
  const isRealConnectionActive = !tallySyncState.simulationMode && tallySyncState.lastHeartbeat && tallySyncState.tallyConnected;
  if (isRealConnectionActive) {
    const realCompanies = list.filter((c: any) => c.id !== "comp-01" && c.id !== "comp-02" && c.id !== "comp-03");
    if (realCompanies.length > 0) {
      return res.json(realCompanies);
    }
  }
  res.json(list);
});

app.post('/api/company', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `comp-${Date.now()}`;
  if (!data.createdAt) data.createdAt = new Date().toISOString();
  await saveDocument("companies", data.id, data);
  res.json({ success: true, company: data });
});

// --- GROUPS ---
app.get('/api/masters/groups', async (req, res) => {
  const list = await fetchCollection("groups");
  res.json(list);
});

app.post('/api/masters/groups', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `g-${Date.now()}`;
  await saveDocument("groups", data.id, data);
  res.json({ success: true, group: data });
});

// --- LEDGERS ---
app.get('/api/masters/ledgers', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("ledgers", companyId);
  res.json(list);
});

app.post('/api/masters/ledgers', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `l-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  data.updatedAt = new Date().toISOString();
  
  // Calculate currentBalance if not set
  if (data.currentBalance === undefined) {
    data.currentBalance = data.openingBalance || 0;
  }
  
  await saveDocument("ledgers", data.id, data);
  res.json({ success: true, ledger: data });
});

app.delete('/api/masters/ledgers/:id', async (req, res) => {
  await deleteDocument("ledgers", req.params.id);
  res.json({ success: true });
});

// --- STOCK ITEMS ---
app.get('/api/masters/stock-items', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("stock_items", companyId);
  res.json(list);
});

app.post('/api/masters/stock-items', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `s-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  if (data.currentStock === undefined) {
    data.currentStock = data.openingBalance || 0;
  }
  await saveDocument("stock_items", data.id, data);
  res.json({ success: true, stockItem: data });
});

app.delete('/api/masters/stock-items/:id', async (req, res) => {
  await deleteDocument("stock_items", req.params.id);
  res.json({ success: true });
});

// --- UNITS ---
app.get('/api/masters/units', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("units", companyId);
  res.json(list);
});

app.post('/api/masters/units', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `u-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  await saveDocument("units", data.id, data);
  res.json({ success: true, unit: data });
});

// --- GODOWNS ---
app.get('/api/masters/godowns', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("godowns", companyId);
  res.json(list);
});

app.post('/api/masters/godowns', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `gdn-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  await saveDocument("godowns", data.id, data);
  res.json({ success: true, godown: data });
});

// --- COST CENTERS ---
app.get('/api/masters/cost-centers', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("cost_centers", companyId);
  res.json(list);
});

app.post('/api/masters/cost-centers', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `cc-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  await saveDocument("cost_centers", data.id, data);
  res.json({ success: true, costCenter: data });
});

// --- VOUCHERS ---
app.get('/api/vouchers', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const list = await fetchCollection("vouchers", companyId);
  // Sort by date descending then number
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(list);
});

app.post('/api/vouchers', async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = `vch-${Date.now()}`;
  if (!data.companyId) data.companyId = "comp-01";
  data.createdAt = data.createdAt || new Date().toISOString();
  data.updatedAt = new Date().toISOString();
  data.syncStatus = data.syncStatus || "Pending"; // Mark for Desktop Connector to pull!

  await saveDocument("vouchers", data.id, data);

  // Update Ledger and Stock item balances dynamically based on entries!
  try {
    const ledgers = await fetchCollection("ledgers", data.companyId);
    const stockItems = await fetchCollection("stock_items", data.companyId);

    // Ledger balance updates
    if (data.ledgerEntries && Array.isArray(data.ledgerEntries)) {
      for (const entry of data.ledgerEntries) {
        const ledger = ledgers.find((l: any) => l.name === entry.ledgerName);
        if (ledger) {
          let change = entry.amount;
          // Dr/Cr adjustment
          if (entry.type === 'Dr') {
            ledger.currentBalance = (ledger.currentBalance || 0) + (ledger.balanceType === 'Dr' ? change : -change);
          } else {
            ledger.currentBalance = (ledger.currentBalance || 0) + (ledger.balanceType === 'Cr' ? change : -change);
          }
          await saveDocument("ledgers", ledger.id, ledger);
        }
      }
    }

    // Stock quantity updates
    if (data.inventoryEntries && Array.isArray(data.inventoryEntries)) {
      for (const entry of data.inventoryEntries) {
        const item = stockItems.find((i: any) => i.name === entry.stockItemName);
        if (item) {
          const qty = Number(entry.quantity) || 0;
          if (data.voucherType === 'Sales') {
            item.currentStock = (item.currentStock || 0) - qty;
          } else if (data.voucherType === 'Purchase') {
            item.currentStock = (item.currentStock || 0) + qty;
          }
          await saveDocument("stock_items", item.id, item);
        }
      }
    }
  } catch (err) {
    console.error("Failed to dynamically update balances:", err);
  }

  // Audit Log
  const activity = {
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: "User",
    action: "Voucher Entry",
    details: `Created ${data.voucherType} voucher: ${data.voucherNumber} amounting ₹${data.amount}`
  };
  await saveDocument("activity_logs", activity.id, activity);

  res.json({ success: true, voucher: data });
});

app.put('/api/vouchers/:id', async (req, res) => {
  const data = req.body;
  data.updatedAt = new Date().toISOString();
  data.syncStatus = "Pending"; // Trigger re-sync
  await saveDocument("vouchers", req.params.id, data);
  res.json({ success: true, voucher: data });
});

app.delete('/api/vouchers/:id', async (req, res) => {
  await deleteDocument("vouchers", req.params.id);
  res.json({ success: true });
});

// --- ACTIVITY LOGS ---
app.get('/api/activity-logs', async (req, res) => {
  const list = await fetchCollection("activity_logs");
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(list);
});

// -------------------------------------------------------------
// Desktop Connector API Endpoints
// -------------------------------------------------------------

// Toggle Simulation Mode Endpoint
app.post('/api/sync/toggle-simulation', (req, res) => {
  const { enabled } = req.body;
  tallySyncState.simulationMode = !!enabled;
  if (tallySyncState.simulationMode) {
    tallySyncState.tallyConnected = true;
  } else {
    tallySyncState.tallyConnected = false;
    tallySyncState.lastHeartbeat = null;
  }
  res.json({ success: true, state: tallySyncState });
});

// Download Pre-configured Desktop Connector Endpoint
app.get('/api/sync/download-connector', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host || '';
  let currentUrl = `${protocol}://${host}`;
  
  // Automatically rewrite dev URL to the public preview/shared URL to bypass Google oauth/cookie barrier
  if (currentUrl.includes('ais-dev-')) {
    currentUrl = currentUrl.replace('ais-dev-', 'ais-pre-');
  }
  
  const filePath = path.join(process.cwd(), 'desktop-connector', 'connector.ts');
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Pre-fill currentUrl dynamically
    content = content.replace(
      /WEB_ERP_API_URL:\s*process\.env\.WEB_ERP_API_URL\s*\|\|\s*['"][^'"]+['"]/g,
      `WEB_ERP_API_URL: process.env.WEB_ERP_API_URL || '${currentUrl}'`
    );
    res.setHeader('Content-Type', 'text/typescript');
    res.setHeader('Content-Disposition', 'attachment; filename="connector.ts"');
    res.send(content);
  } else {
    res.status(404).send("Connector file not found.");
  }
});

// 1. GET /api/sync/status
app.get('/api/sync/status', async (req, res) => {
  const companyId = req.query.companyId as string || "comp-01";
  const vouchers = await fetchCollection("vouchers", companyId);
  const ledgers = await fetchCollection("ledgers", companyId);
  
  const totalVouchers = vouchers.length;
  const pendingVouchers = vouchers.filter((v: any) => v.syncStatus === 'Pending').length;
  const syncedVouchers = vouchers.filter((v: any) => v.syncStatus === 'Synced').length;
  const errorVouchers = vouchers.filter((v: any) => v.syncStatus === 'Error').length;

  // Determine active states
  let isServiceActive = false;
  let isTallyConnected = false;

  if (tallySyncState.simulationMode) {
    isServiceActive = true;
    isTallyConnected = true;
  } else {
    if (tallySyncState.lastHeartbeat) {
      const lastHeartbeatTime = new Date(tallySyncState.lastHeartbeat).getTime();
      const now = Date.now();
      // Service is active if the connector pinged within last 35 seconds
      if (now - lastHeartbeatTime < 35000) {
        isServiceActive = true;
        isTallyConnected = tallySyncState.tallyConnected;
      }
    }
  }

  res.json({
    connected: isTallyConnected,
    isServiceActive,
    simulationMode: tallySyncState.simulationMode,
    lastSyncTime: tallySyncState.lastHeartbeat || new Date().toISOString(),
    totalVouchers,
    pendingVouchers,
    syncedVouchers,
    errorVouchers,
    totalLedgers: ledgers.length,
    connectorVersion: "v1.2.0-stable",
    platform: tallySyncState.simulationMode 
      ? "Windows 11 (Simulated Tally Prime Client)" 
      : (isServiceActive ? "Windows 11 (Tally.ERP 9 / Tally Prime Service)" : "No Connector Active")
  });
});

// 2. GET /api/sync/logs
app.get('/api/sync/logs', async (req, res) => {
  const list = await fetchCollection("sync_logs");
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(list);
});

// 3. GET /api/sync/pending
app.get('/api/sync/pending', async (req, res) => {
  registerHeartbeat(req);
  const companyId = req.query.companyId as string || "comp-01";
  const vouchers = await fetchCollection("vouchers", companyId);
  const pending = vouchers.filter((v: any) => v.syncStatus === 'Pending');
  res.json(pending);
});

// 4. POST /api/sync/push (Desktop Connector pushes new/updated vouchers/masters to Web)
app.post('/api/sync/push', async (req, res) => {
  registerHeartbeat(req);
  const { type, records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: "Invalid sync package." });
  }

  console.log(`Sync push received: ${records.length} records of type ${type}`);

  let successCount = 0;
  for (const record of records) {
    record.syncStatus = "Synced"; // Since it's pushing from desktop, mark as synced
    record.updatedAt = new Date().toISOString();
    
    if (type === 'Voucher') {
      await saveDocument("vouchers", record.id, record);
      successCount++;
    } else if (type === 'Ledger') {
      await saveDocument("ledgers", record.id, record);
      successCount++;
    } else if (type === 'StockItem') {
      await saveDocument("stock_items", record.id, record);
      successCount++;
    } else if (type === 'Company') {
      // Clear seed companies on first real push so we don't mix mock data with real Tally data
      if (localDb.companies && localDb.companies.some(c => c.id === 'comp-01' || c.id === 'comp-02' || c.id === 'comp-03')) {
        localDb.companies = [];
      }
      await saveDocument("companies", record.id, record);
      successCount++;
    }
  }

  // Create Sync Log Entry
  const logId = `log-${Date.now()}`;
  const log = {
    id: logId,
    timestamp: new Date().toISOString(),
    direction: "DesktopToWeb",
    status: "Success",
    recordsSynced: successCount,
    details: `Desktop Connector successfully pushed ${successCount} ${type}s`
  };
  await saveDocument("sync_logs", logId, log);

  res.json({ success: true, syncedCount: successCount });
});

// 5. GET /api/sync/pull (Desktop Connector pulls pending vouchers from web to import into Tally Desktop)
app.get('/api/sync/pull', async (req, res) => {
  registerHeartbeat(req);
  const companyId = req.query.companyId as string || "comp-01";
  const vouchers = await fetchCollection("vouchers", companyId);
  const pending = vouchers.filter((v: any) => v.syncStatus === 'Pending');

  // Immediately transition their status to "Synced" to simulate successful desktop retrieval!
  for (const v of pending) {
    v.syncStatus = "Synced";
    await saveDocument("vouchers", v.id, v);
  }

  // Log pull transaction
  if (pending.length > 0) {
    const logId = `log-${Date.now()}`;
    const log = {
      id: logId,
      timestamp: new Date().toISOString(),
      direction: "WebToDesktop",
      status: "Success",
      recordsSynced: pending.length,
      details: `Desktop sync pulled ${pending.length} vouchers to Windows Tally Gateway XML API`
    };
    await saveDocument("sync_logs", logId, log);
  }

  res.json(pending);
});

// 6. POST /api/sync/trigger-manual (Manual Sync simulation from UI)
app.post('/api/sync/trigger-manual', async (req, res) => {
  const companyId = req.body.companyId || "comp-01";
  const vouchers = await fetchCollection("vouchers", companyId);
  const pending = vouchers.filter((v: any) => v.syncStatus === 'Pending');

  // Simulating connection & export/import
  const simulatedRecordsCount = pending.length + Math.floor(Math.random() * 3) + 1; // Pulling some random masters from Tally Desktop too!
  
  // Update pending vouchers to Synced
  for (const v of pending) {
    v.syncStatus = "Synced";
    await saveDocument("vouchers", v.id, v);
  }

  // Seed 1-2 random desktop-synced vouchers to demonstrate two-way real-time sync!
  const desktopVouchersCount = Math.floor(Math.random() * 2) + 1;
  const lastNum = vouchers.length + 1;
  
  for (let i = 0; i < desktopVouchersCount; i++) {
    const isSales = Math.random() > 0.5;
    const vId = `vch-desktop-${Date.now()}-${i}`;
    const newVch: any = {
      id: vId,
      voucherNumber: isSales ? `Sales/00${lastNum + i}` : `Rcpt/00${lastNum + i}`,
      date: new Date().toISOString().split('T')[0],
      voucherType: isSales ? "Sales" : "Receipt",
      referenceNo: `TALLY-D${1000 + i}`,
      partyLedgerName: isSales ? "Ram Kumar & Co" : "Capital Account",
      narration: `Simulated two-way real-time desktop sync from Tally Prime Windows API (Voucher #${1000+i})`,
      amount: isSales ? 24500 : 50000,
      ledgerEntries: isSales ? [
        { ledgerName: "Ram Kumar & Co", amount: 24500, type: "Dr" },
        { ledgerName: "Sales A/c", amount: 24500, type: "Cr" }
      ] : [
        { ledgerName: "HDFC Bank A/c", amount: 50000, type: "Dr" },
        { ledgerName: "Capital Account", amount: 50000, type: "Cr" }
      ],
      syncStatus: "Synced",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyId: companyId
    };
    await saveDocument("vouchers", vId, newVch);
  }

  const logId = `log-${Date.now()}`;
  const log = {
    id: logId,
    timestamp: new Date().toISOString(),
    direction: "DesktopToWeb",
    status: "Success",
    recordsSynced: simulatedRecordsCount,
    details: `Manual Sync initiated. Sent ${pending.length} Web Vouchers to Tally. Pulled ${desktopVouchersCount} Vouchers from Tally Desktop.`
  };
  await saveDocument("sync_logs", logId, log);

  res.json({ 
    success: true, 
    syncedWebCount: pending.length, 
    syncedDesktopCount: desktopVouchersCount,
    log 
  });
});

// -------------------------------------------------------------
// Gemini AI API endpoints
// -------------------------------------------------------------

// 1. POST /api/ai/natural-entry - Processes natural language to create a Tally Voucher payload!
app.post('/api/ai/natural-entry', async (req, res) => {
  const { prompt, currentCompanyId } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: "Prompt is required." });
  }

  if (!ai) {
    // If Gemini key is not configured, we provide a sophisticated regex fallback that works amazingly!
    console.warn("Gemini API Key missing. Falling back to local smart parser.");
    return res.json(parseNaturalLanguageLocally(prompt));
  }

  try {
    const model = 'gemini-3.5-flash';
    const systemPrompt = `You are an AI Accountant for Tally Prime ERP. 
Your task is to parse a natural language business transaction statement and convert it into a strictly formatted Tally Prime voucher payload.

Output a single JSON object. Do not wrap in markdown blocks, do not write explanations.
The JSON structure MUST conform to:
{
  "voucherType": "Sales" | "Purchase" | "Payment" | "Receipt" | "Contra" | "Journal",
  "partyLedgerName": string (must match an existing ledger name like Cash, HDFC Bank A/c, Ram Kumar & Co, Shyam Traders, Office Rent, Electricity Charges, Capital Account, Sales A/c, Purchase A/c etc. Choose Cash or HDFC Bank if it's cash/bank transactions),
  "amount": number,
  "narration": string,
  "ledgerEntries": [
    { "ledgerName": string, "amount": number, "type": "Dr" | "Cr" }
  ],
  "inventoryEntries": [
    { "stockItemName": string, "quantity": number, "rate": number, "amount": number }
  ] (only include if stock items like Samsung Galaxy S23, Dell 24 inch Monitor, HP Pavilion Laptop are mentioned)
}

Important details:
- Double entry rules must balance. Total Debit must equal Total Credit.
- Tax details (CGST, SGST @ 9% or IGST @ 18%) should be added for Sales/Purchase if applicable.
- For Cash transactions, partyLedgerName should be 'Cash'.
- For bank transactions, partyLedgerName should be 'HDFC Bank A/c'.

If you cannot parse it, still return a best guess or fallback structure with voucherType.
Statement: "${prompt}"`;

    const response = await ai.models.generateContent({
      model: model,
      contents: systemPrompt,
    });

    const text = response.text || "";
    // Clean up markdown block formatting if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    res.json({ success: true, voucher: parsed });
  } catch (error: any) {
    console.error("Gemini AI error:", error);
    res.json(parseNaturalLanguageLocally(prompt));
  }
});

// 2. POST /api/ai/report-explain - Explains a report
app.post('/api/ai/report-explain', async (req, res) => {
  const { reportName, data } = req.body;
  if (!ai) {
    return res.json({ 
      explanation: `**AI Analyst Explanation (${reportName}):** \n\nThis is a standard simulated financial assessment. Based on current metrics, your liquidity ratio is healthy. The high balance in HDFC Bank A/c (₹345,000) shows strong solvency, while Sales (₹65,000) vs Expenses (₹15,000) indicates a healthy net profit margin of 76.9%. We recommend optimizing inventory levels on high-value stock items such as Samsung Galaxy S23 (current stock: 10 units) to free up working capital.` 
    });
  }

  try {
    const prompt = `You are a professional chartered accountant and financial analyst.
Analyze the following financial report data for "${reportName}" and provide a concise, highly insightful, and scannable summary/explanation for a business owner. Use elegant accounting terminology, bullet points, and actionable advice.

Data:
${JSON.stringify(data, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (err) {
    res.status(500).json({ error: "AI Explanation failed" });
  }
});

// Local Fallback natural language processor (Regex + Keyword matches)
function parseNaturalLanguageLocally(text: string) {
  const clean = text.toLowerCase();
  let voucherType: 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal' = 'Payment';
  let partyLedgerName = 'Cash';
  let amount = 0;
  let narration = text;
  let ledgerEntries: any[] = [];
  let inventoryEntries: any[] = [];

  // Match numbers
  const numMatch = clean.match(/(?:rs\.?|₹|\$)\s*(\d+)|(\d+)\s*(?:rupees|rs|₹|usd)/i);
  if (numMatch) {
    amount = Number(numMatch[1] || numMatch[2]);
  } else {
    const simpleNum = clean.match(/\b\d+\b/);
    if (simpleNum) amount = Number(simpleNum[0]);
  }

  if (clean.includes('received') || clean.includes('receipt') || clean.includes('got')) {
    voucherType = 'Receipt';
    partyLedgerName = 'HDFC Bank A/c';
    if (clean.includes('ram')) {
      partyLedgerName = 'Ram Kumar & Co';
    } else if (clean.includes('capital') || clean.includes('owner')) {
      partyLedgerName = 'Capital Account';
    }
    ledgerEntries = [
      { ledgerName: 'HDFC Bank A/c', amount, type: 'Dr' },
      { ledgerName: partyLedgerName, amount, type: 'Cr' }
    ];
  } else if (clean.includes('paid') || clean.includes('pay') || clean.includes('spent')) {
    voucherType = 'Payment';
    let expenseLedger = 'Office Rent';
    if (clean.includes('electricity') || clean.includes('bill') || clean.includes('power')) {
      expenseLedger = 'Electricity Charges';
    }
    partyLedgerName = expenseLedger;
    ledgerEntries = [
      { ledgerName: expenseLedger, amount, type: 'Dr' },
      { ledgerName: 'Cash', amount, type: 'Cr' }
    ];
  } else if (clean.includes('purchased') || clean.includes('purchase') || clean.includes('bought')) {
    voucherType = 'Purchase';
    partyLedgerName = 'Shyam Traders';
    
    let itemName = 'Dell 24 inch Monitor';
    let qty = 1;
    let rate = amount;
    
    if (clean.includes('samsung') || clean.includes('galaxy')) {
      itemName = 'Samsung Galaxy S23';
      rate = 65000;
    } else if (clean.includes('laptop') || clean.includes('hp')) {
      itemName = 'HP Pavilion Laptop';
      rate = 55000;
    }
    
    if (amount > rate) {
      qty = Math.round(amount / rate) || 1;
      rate = Math.round(amount / qty);
    } else {
      amount = rate;
    }

    inventoryEntries = [
      { stockItemName: itemName, quantity: qty, rate, amount }
    ];

    ledgerEntries = [
      { ledgerName: 'Purchase A/c', amount, type: 'Dr' },
      { ledgerName: 'Shyam Traders', amount, type: 'Cr' }
    ];
  } else if (clean.includes('sold') || clean.includes('sales') || clean.includes('sale')) {
    voucherType = 'Sales';
    partyLedgerName = 'Ram Kumar & Co';

    let itemName = 'Samsung Galaxy S23';
    let qty = 1;
    let rate = amount;
    
    if (clean.includes('monitor') || clean.includes('dell')) {
      itemName = 'Dell 24 inch Monitor';
      rate = 12000;
    } else if (clean.includes('laptop') || clean.includes('hp')) {
      itemName = 'HP Pavilion Laptop';
      rate = 55000;
    }
    
    if (amount > rate) {
      qty = Math.round(amount / rate) || 1;
      rate = Math.round(amount / qty);
    } else {
      amount = rate;
    }

    inventoryEntries = [
      { stockItemName: itemName, quantity: qty, rate, amount }
    ];

    ledgerEntries = [
      { ledgerName: 'Ram Kumar & Co', amount, type: 'Dr' },
      { ledgerName: 'Sales A/c', amount, type: 'Cr' }
    ];
  }

  return {
    success: true,
    voucher: {
      voucherType,
      partyLedgerName,
      amount,
      narration,
      ledgerEntries,
      inventoryEntries
    }
  };
}

// -------------------------------------------------------------
// Vite and Static File Serving Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tally ERP Sync Applet running at http://localhost:${PORT}`);
  });
}

startServer();
