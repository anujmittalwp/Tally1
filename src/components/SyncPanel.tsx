import React, { useState, useEffect } from 'react';
import { SyncLog, Voucher } from '../types';
import { ArrowLeft, RefreshCw, HardDrive, AlertTriangle, Download, CheckCircle, Server, HelpCircle, Info, ExternalLink } from 'lucide-react';

interface SyncPanelProps {
  onBack: () => void;
  vouchers: Voucher[];
  onTriggerSync: () => Promise<void>;
}

export default function SyncPanel({ onBack, vouchers, onTriggerSync }: SyncPanelProps) {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'queue'>('status');

  const sharedUrl = typeof window !== 'undefined' ? window.location.origin.replace('ais-dev-', 'ais-pre-') : '';

  // Load sync metrics and logs
  const loadSyncData = async () => {
    try {
      const statusRes = await fetch('/api/sync/status');
      const statusData = await statusRes.json();
      setSyncStatus(statusData);

      const logsRes = await fetch('/api/sync/logs');
      const logsData = await logsRes.json();
      setSyncLogs(logsData);
    } catch (err) {
      console.error("Failed to load sync statistics:", err);
    }
  };

  useEffect(() => {
    loadSyncData();
    // Auto refresh status every 6 seconds to show background synchronization in action!
    const interval = setInterval(loadSyncData, 6000);
    return () => clearInterval(interval);
  }, [vouchers]);

  // Toggle Simulated Desktop Mode
  const handleToggleSimulation = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/sync/toggle-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      if (data.success) {
        await loadSyncData();
      }
    } catch (err) {
      console.error("Failed to toggle simulation:", err);
    }
  };

  // Trigger manual synchronizer
  const handleTriggerSync = async () => {
    // If Tally is closed and simulation is off, warn and ask to enable simulation
    if (syncStatus && !syncStatus.connected && !syncStatus.simulationMode) {
      const enableSim = window.confirm(
        "Tally Prime is currently closed/disconnected on your desktop.\n\nWould you like to enable the 'Tally Prime Desktop Simulator' to test the sync workflow inside this web playground?"
      );
      if (enableSim) {
        await handleToggleSimulation(true);
        // wait a moment
        await new Promise(r => setTimeout(r, 500));
      } else {
        return;
      }
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await onTriggerSync(); // Force parent voucher refresh
        await loadSyncData();
        alert(`Synchronizer success! Pushed web records and downloaded any updated vouchers from Tally Prime Desktop.`);
      }
    } catch (err) {
      alert("Synchronization trigger failed. Check server connectivity.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Vouchers pending sync in queue
  const pendingVouchers = vouchers.filter(v => v.syncStatus === 'Pending');

  return (
    <div id="sync-panel-container" className="flex-1 bg-[#E0E6E9] flex flex-col overflow-hidden text-[#1a1a1a] font-mono text-xs">
      
      {/* Upper header */}
      <div className="bg-[#00426A] text-white py-1.5 px-4 flex justify-between items-center border-b border-[#002D4E]">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="hover:bg-white/10 p-1 rounded text-white flex items-center cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Esc (Go Back)</span>
          </button>
          <span className="text-sm font-bold tracking-wider uppercase text-white">
            Tally Prime Desktop XML Synchronizer
          </span>
        </div>

        {/* Action button */}
        <button 
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="bg-[#F9A825] hover:bg-amber-500 text-black font-bold px-4 py-1.5 rounded-sm flex items-center space-x-2 border-0 cursor-pointer shadow-sm text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing...' : 'Trigger Manual Sync (Alt+S)'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-300 px-4 flex space-x-2 pt-2">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-1.5 font-bold border-t-2 border-x transition-all cursor-pointer ${
            activeTab === 'status' 
              ? 'bg-[#E0E6E9] border-gray-300 border-t-[#00426A] text-[#00426A]' 
              : 'bg-white border-transparent hover:bg-gray-100 text-gray-500'
          }`}
        >
          🖥️ Connection Status & Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-1.5 font-bold border-t-2 border-x transition-all cursor-pointer ${
            activeTab === 'logs' 
              ? 'bg-[#E0E6E9] border-gray-300 border-t-[#00426A] text-[#00426A]' 
              : 'bg-white border-transparent hover:bg-gray-100 text-gray-500'
          }`}
        >
          📜 Sync History Logs
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-1.5 font-bold border-t-2 border-x relative transition-all cursor-pointer ${
            activeTab === 'queue' 
              ? 'bg-[#E0E6E9] border-gray-300 border-t-[#00426A] text-[#00426A]' 
              : 'bg-white border-transparent hover:bg-gray-100 text-gray-500'
          }`}
        >
          ⏳ Pending Queue ({pendingVouchers.length})
          {pendingVouchers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-bounce">
              {pendingVouchers.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        
        {activeTab === 'status' && (
          <div className="grid grid-cols-3 gap-4">
            
             {/* Status Panel */}
             <div className="bg-white border border-gray-300 p-4 shadow-sm space-y-4 col-span-3 lg:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-300 pb-2 gap-2">
                <h3 className="font-bold text-[#002D4E] uppercase tracking-wider flex items-center space-x-1.5 text-sm">
                  <HardDrive className="w-4 h-4 text-[#00426A]" />
                  <span>Windows Connector Agent Diagnostics</span>
                </h3>
                
                {/* Simulated Tally checkbox switch */}
                <label className="flex items-center space-x-2 bg-[#F9A825]/10 hover:bg-[#F9A825]/20 px-2.5 py-1 rounded cursor-pointer border border-[#F9A825] text-xs transition-colors self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={!!syncStatus?.simulationMode}
                    onChange={(e) => handleToggleSimulation(e.target.checked)}
                    className="cursor-pointer accent-[#00426A]"
                  />
                  <span className="font-bold text-[#002D4E]">Simulated Tally App (Port 9000)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Service Status */}
                <div className="bg-slate-50 p-3 border border-gray-200 rounded flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Connector Service:</span>
                  {syncStatus?.isServiceActive ? (
                    <span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded flex items-center space-x-1.5 text-[10px] uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-green-600 block animate-ping"></span>
                      <span>Active {syncStatus?.simulationMode ? '(Simulated)' : ''}</span>
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded flex items-center space-x-1.5 text-[10px] uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-rose-600 block"></span>
                      <span>Offline / Closed</span>
                    </span>
                  )}
                </div>

                {/* Tally XML API Port Status */}
                <div className="bg-slate-50 p-3 border border-gray-200 rounded flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Tally XML Port 9000:</span>
                  {syncStatus?.connected ? (
                    <span className="font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded text-[10px] uppercase tracking-wider">
                      Connected
                    </span>
                  ) : (
                    <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded text-[10px] uppercase tracking-wider">
                      Disconnected
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 border border-gray-200 rounded flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Connector Version:</span>
                  <span className="font-bold text-gray-700 font-mono">{syncStatus?.connectorVersion || 'v1.2.0-stable'}</span>
                </div>

                <div className="bg-slate-50 p-3 border border-gray-200 rounded flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Platform Host:</span>
                  <span className="font-bold text-gray-700 truncate max-w-[150px]" title={syncStatus?.platform}>
                    {syncStatus?.platform || 'No Connector Connected'}
                  </span>
                </div>
              </div>

              {/* Status Alert/Guidance Banner */}
              {!syncStatus?.connected && !syncStatus?.simulationMode ? (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded text-rose-950 space-y-3 text-xs">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-rose-900">
                        टैली शुरू होने के बाद भी "Disconnected" क्यों आ रहा है?
                      </p>
                      <p className="font-bold text-xs text-rose-800">
                        Why is it still disconnected after starting Tally Prime?
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] leading-relaxed text-gray-800 pl-7">
                    <p>
                      <strong>🇮🇳 हिंदी:</strong> यह ERP क्लाउड (Internet) पर चल रहा है। यह आपके कंप्यूटर के अंदर सीधे <code>localhost:9000</code> को एक्सेस नहीं कर सकता क्योंकि विंडोज फायरवॉल और सिक्योरिटी इसे रोकती है। कनेक्शन जोड़ने के लिए आपको अपने कंप्यूटर पर एक छोटा **Tally Connector Agent** चलाना होगा जो दोनों को आपस में जोड़ेगा।
                    </p>
                    <p>
                      <strong>🇬🇧 English:</strong> This Web ERP is running in the cloud. It cannot directly read <code>localhost:9000</code> on your local PC due to browser security & firewall rules. You must run the lightweight **Desktop Connector script** locally on your PC to act as a secure bridge.
                    </p>
                  </div>

                  {/* Dynamic Download Box */}
                  <div className="bg-white p-4 border border-rose-200 rounded space-y-4">
                    <p className="font-bold text-[#002D4E] text-xs flex items-center space-x-1 border-b border-rose-100 pb-1.5">
                      <Server className="w-4 h-4 text-[#00426A]" />
                      <span>सिर्फ 2 मिनट में कनेक्शन चालू करें (Quick Setup Guide)</span>
                    </p>

                    {/* CRITICAL DEPLOYMENT ALERT */}
                    <div className="bg-amber-50 border border-amber-300 p-3 rounded text-amber-950 space-y-1.5 text-[11px]">
                      <p className="font-bold text-amber-900 flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                        <span>⚠️ क्रिटिकल स्टेप: ऐप को "Share" या "Deploy" करें!</span>
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        <strong>🇮🇳 हिंदी:</strong> यह कनेक्टर सिर्फ <strong>पब्लिक यूआरएल (Shared/Preview App)</strong> के साथ काम कर सकता है। कृपया पहले ऊपर राइट साइड में <strong>"Share"</strong> या <strong>"Deploy"</strong> बटन पर क्लिक करें। इसके बिना आपका पब्लिक लिंक एक्टिव नहीं होगा और कनेक्टर <strong>404 Page Not Found</strong> एरर देगा।
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        <strong>🇬🇧 English:</strong> You <strong>MUST</strong> click the <strong>"Share"</strong> or <strong>"Deploy"</strong> button in the top-right corner of Google AI Studio first! Otherwise, your public preview URL remains inactive, and the connector will fail with a <strong>404 Page Not Found</strong> or HTML response error.
                      </p>
                      <div className="pt-1.5 font-mono text-[10px] bg-white/70 p-1.5 rounded border border-amber-200">
                        <span className="font-bold">Your Active Shared URL:</span>{' '}
                        <a 
                          href={sharedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline font-bold hover:text-blue-800 break-all inline-flex items-center space-x-1"
                        >
                          <span>{sharedUrl}</span>
                          <ExternalLink className="w-3 h-3 inline-block" />
                        </a>
                        <p className="text-gray-500 mt-1 text-[9px] italic">
                          (इस लिंक को नए टैब में खोलें। अगर यह खुल रहा है, तो आपका कनेक्टर सफलतापूर्वक जुड़ जाएगा!)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                      <div className="space-y-2 border-r border-gray-100 pr-2">
                        <p className="font-bold text-gray-700">1. डाउनलोड करें (Download):</p>
                        <p className="text-gray-600">नीचे दिए गए बटन से अपने ERP के यूआरएल से पहले से कॉन्फ़िगर की गई फाइल डाउनलोड करें:</p>
                        <a 
                          href="/api/sync/download-connector" 
                          download="connector.ts"
                          className="inline-flex items-center space-x-1.5 bg-[#00426A] hover:bg-[#002D4E] text-white font-bold px-3 py-2 rounded border-0 cursor-pointer text-[10px] uppercase tracking-wider transition-colors mt-1 w-full justify-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download connector.ts</span>
                        </a>
                      </div>

                      <div className="space-y-2">
                        <p className="font-bold text-gray-700">2. अपने PC पर रन करें (Run on Windows):</p>
                        <div className="bg-slate-950 text-emerald-400 p-2.5 rounded font-mono text-[10px] space-y-1">
                          <p className="text-gray-500"># 1. Create directory</p>
                          <p>mkdir TallySync && cd TallySync</p>
                          <p className="text-gray-500"># 2. Place downloaded connector.ts here</p>
                          <p className="text-gray-500"># 3. Install axios dependencies</p>
                          <p>npm install axios</p>
                          <p className="text-gray-500"># 4. Start the Windows service</p>
                          <p>npx tsx connector.ts</p>
                        </div>
                      </div>
                    </div>

                    {/* RED WARNING BANNED ADDRESS BAR URL */}
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-red-950 text-[11px] space-y-1">
                      <p className="font-bold text-red-800">⚠️ महत्वपूर्ण चेतावनी (IMPORTANT WARNING):</p>
                      <p className="text-gray-700">
                        <strong>कभी भी अपने ब्राउज़र एड्रेस बार से `https://aistudio.google.com/apps/...` यूआरएल कॉपी न करें!</strong> वह गूगल का इंटरनल डेवलपमेंट एडिटर है। कनेक्टर के काम करने के लिए सिर्फ डाउनलोड की गई फाइल का उपयोग करें या अपनी <code>{sharedUrl}</code> का उपयोग करें।
                      </p>
                    </div>

                    <div className="border-t border-gray-100 pt-2 text-[10px] text-gray-500 flex items-center justify-between">
                      <span className="italic flex items-center space-x-1">
                        <Info className="w-3 h-3 text-blue-500" />
                        <span>शॉर्टकट: बिना डाउनलोड किए चेक करने के लिए ऊपर <strong>"Simulated Tally App"</strong> चालू करें।</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded text-emerald-950 space-y-2.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-emerald-900 font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>सिंक्रनाइज़ेशन सेवा सक्रिय है! (Bidirectional Connector is Active)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900">
                    The background service is communicating beautifully with Tally Prime's local XML Gateway. Vouchers entered on the web automatically queue in the database and are fetched locally. Updates/deletions are tracked incrementally using altered date-time parameters.
                  </p>
                  {syncStatus?.simulationMode && (
                    <div className="bg-white/80 p-2.5 border border-emerald-100 rounded text-[10px] space-y-1 text-emerald-950">
                      <p className="font-bold">✨ Simulated Tally App Active</p>
                      <p>आपकी स्थानीय टैली ऐप को सिम्युलेट किया जा रहा है। अब आप <strong>"Trigger Manual Sync"</strong> दबाकर वेब और टैली के बीच डेटा सिंक का आनंद ले सकते हैं!</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="bg-white border border-gray-300 p-4 shadow-sm space-y-4">
              <h3 className="font-bold border-b border-gray-300 pb-1 text-[#002D4E] uppercase tracking-wider">
                Records Summary
              </h3>

              <div className="space-y-3 font-mono">
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span>Total Vouchers:</span>
                  <span className="font-bold">{syncStatus?.totalVouchers || vouchers.length}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span>Synced Web↔Tally:</span>
                  <span className="font-bold text-[#002D4E]">✓ {syncStatus?.syncedVouchers || vouchers.length - pendingVouchers.length}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5 text-orange-700 font-bold">
                  <span>Pending Outbox:</span>
                  <span>⏳ {pendingVouchers.length}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Synced Ledgers:</span>
                  <span>{syncStatus?.totalLedgers || 12}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. HISTORY LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="border border-gray-300 bg-white shadow-md rounded-sm overflow-hidden">
            <div className="bg-[#002D4E] text-white p-2 font-bold flex justify-between uppercase text-[10px] tracking-wide">
              <span>Synchronization Activity Log File</span>
              <span>Total Logs: {syncLogs.length}</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002D4E] text-[#F9A825] font-bold border-b border-gray-300">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-center">Direction</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Synced Recs</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9A825]/10 font-mono">
                    <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        log.direction === 'DesktopToWeb' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.direction === 'DesktopToWeb' ? 'Tally ➔ Web' : 'Web ➔ Tally'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{log.recordsSynced}</td>
                    <td className="p-3 text-gray-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. PENDING QUEUE TAB */}
        {activeTab === 'queue' && (
          <div className="border border-gray-300 bg-white shadow-md rounded-sm overflow-hidden">
            <div className="bg-[#C62828] text-white p-2.5 font-bold uppercase text-[10px] tracking-wide flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pending Web Records Queue (Waiting for Windows PM2 Desktop Sync)</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002D4E] text-[#F9A825] font-bold border-b border-gray-300">
                  <th className="p-3">Voucher Date</th>
                  <th className="p-3">Voucher No</th>
                  <th className="p-3">Voucher Type</th>
                  <th className="p-3">Party Ledger</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3">Pending Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F9A825]/10 font-mono">
                    <td className="p-3">{v.date}</td>
                    <td className="p-3 font-semibold text-gray-700">{v.voucherNumber}</td>
                    <td className="p-3 font-bold text-blue-700">{v.voucherType}</td>
                    <td className="p-3 text-gray-600">{v.partyLedgerName}</td>
                    <td className="p-3 text-right font-bold text-gray-800">₹{v.amount}</td>
                    <td className="p-3 text-gray-500 italic">Waiting for Tally SOAP listener fetch</td>
                  </tr>
                ))}
                {pendingVouchers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 italic">No pending vouchers in outbox queue. All data fully synchronized!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
