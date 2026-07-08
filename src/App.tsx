import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SidebarKeys from './components/SidebarKeys';
import GatewayOfTally from './components/GatewayOfTally';
import VoucherEntry from './components/VoucherEntry';
import Reports from './components/Reports';
import SyncPanel from './components/SyncPanel';
import AIDashboard from './components/AIDashboard';
import { Company, Voucher, Ledger, StockItem, Godown, CostCenter, User, ActivityLog } from './types';
import { Bot, Search, LogIn, Lock, Check, HelpCircle, AlertCircle, Building, Wifi, ArrowLeft, Database, RotateCw } from 'lucide-react';

export default function App() {
  // Navigation & User session states
  const [activeScreen, setActiveScreen] = useState<string>('login');
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGoToModal, setShowGoToModal] = useState(false);
  const [goToQuery, setGoToQuery] = useState('');

  // ERP Master & Transaction databases
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activePeriod, setActivePeriod] = useState({ from: '2026-04-01', to: '2027-03-31' });

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Editing state
  const [voucherToEdit, setVoucherToEdit] = useState<Voucher | null>(null);

  // Authentication Fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Company Selection Modal states
  const [showCompanySelectModal, setShowCompanySelectModal] = useState(false);
  const [companySelectionError, setCompanySelectionError] = useState('');
  const [companySelectLoading, setCompanySelectLoading] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);

  // Fetch all databases from Express APIs
  const fetchAllData = async () => {
    try {
      const compRes = await fetch('/api/company');
      const comps = await compRes.json();
      setCompanies(comps);
      if (comps.length > 0 && !activeCompany) {
        setActiveCompany(comps[0]);
      }

      const lRes = await fetch('/api/masters/ledgers');
      setLedgers(await lRes.json());

      const sRes = await fetch('/api/masters/stock-items');
      setStockItems(await sRes.json());

      const gRes = await fetch('/api/masters/godowns');
      setGodowns(await gRes.json());

      const cRes = await fetch('/api/masters/cost-centers');
      setCostCenters(await cRes.json());

      const vRes = await fetch('/api/vouchers');
      setVouchers(await vRes.json());

      const actRes = await fetch('/api/activity-logs');
      setActivityLogs(await actRes.json());
    } catch (err) {
      console.error("Error loading ERP databases:", err);
    }
  };

  useEffect(() => {
    // If logged in, fetch data
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Trigger function for selecting company (called on F1 or sidebar key click)
  const handleSelectCompanyTrigger = async () => {
    setCompanySelectionError('');
    setCompanySelectLoading(true);
    setShowCompanySelectModal(true);
    try {
      const statusRes = await fetch('/api/sync/status');
      const statusData = await statusRes.json();
      
      if (!statusData.connected) {
        setCompanySelectionError('Please Start Tally Connector.');
        setCompanySelectLoading(false);
        return;
      }
      
      const compRes = await fetch('/api/company');
      const comps = await compRes.json();
      setAvailableCompanies(comps);
      setCompanySelectLoading(false);
    } catch (err) {
      setCompanySelectionError('Please Start Tally Connector.');
      setCompanySelectLoading(false);
    }
  };

  // Global keyboard listeners for hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape -> Go Back (usually back to Gateway)
      if (e.key === 'Escape') {
        if (showGoToModal) {
          setShowGoToModal(false);
        } else if (showCompanySelectModal) {
          setShowCompanySelectModal(false);
        } else if (activeScreen !== 'gateway' && activeScreen !== 'login') {
          e.preventDefault();
          setActiveScreen('gateway');
          setVoucherToEdit(null);
        }
      }

      // F1 -> Select Company
      if (e.key === 'F1' && activeScreen !== 'login') {
        e.preventDefault();
        handleSelectCompanyTrigger();
      }

      // Alt+G -> Go To
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGoToModal(true);
      }

      // Alt+S -> Sync Status
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setActiveScreen('sync_panel');
      }

      // Alt+A -> AI Dashboard
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveScreen('ai_dashboard');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeScreen, showGoToModal, showCompanySelectModal]);

  // Login handler
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      // 1. Verify credentials
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        // Authenticate immediately and open the Tally gateway
        setUser(data.user);
        setActiveScreen('gateway');
        setIsLoggingIn(false);
      } else {
        setAuthError(data.message || 'Login failed.');
        setIsLoggingIn(false);
      }
    } catch (err) {
      setAuthError('Connection error to backend ERP.');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveScreen('login');
    setShowCompanySelectModal(false);
    setAvailableCompanies([]);
  };

  // Create or Update Voucher
  const handleSaveVoucher = async (payload: Partial<Voucher>) => {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/vouchers/${payload.id}` : '/api/vouchers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        await fetchAllData(); // reload
      }
    } catch (err) {
      console.error("Failed to post voucher:", err);
    }
  };

  // Delete voucher
  const handleDeleteVoucher = async (id: string) => {
    try {
      const response = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchAllData();
      }
    } catch (err) {
      console.error("Failed to delete voucher:", err);
    }
  };

  // Accept a ledger from AI Creator or similar
  const handleSaveLedgerInline = async (ledger: Partial<Ledger>) => {
    try {
      await fetch('/api/masters/ledgers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ledger)
      });
      await fetchAllData();
    } catch (err) {
      console.error("Failed to save ledger inline:", err);
    }
  };

  // Hotkey sidebar clicks
  const handleSidebarKeyClick = (key: string) => {
    if (key === 'F1') {
      handleSelectCompanyTrigger();
    } else if (key === 'F2' || key === 'Alt+F2') {
      alert("Delhi region financial period: 01-Apr-2026 to 31-Mar-2027.");
    } else if (key === 'F3') {
      alert(`Company Info: ABC Electronics Ltd\nGSTIN: 07AAAAA1111A1Z1\nState: Delhi\nCountry: India`);
    } else if (key === 'Alt+C') {
      alert("To create inline ledgers, please open the 'Voucher Entry' screen and press Alt+C.");
    } else if (key === 'Alt+G') {
      setShowGoToModal(true);
    } else if (key === 'Alt+S' || key === 'Sync Status') {
      setActiveScreen('sync_panel');
    } else if (key === 'Alt+A' || key === 'AI Dash') {
      setActiveScreen('ai_dashboard');
    } else if (key === 'F11' || key === 'Features') {
      alert("Tally Prime Features: GST Enabled (Yes), Inventory Enabled (Yes), Cost Centers (Yes), Multi-Location Godowns (Yes).");
    } else if (key === 'F12' || key === 'Configure') {
      alert("Configuration options locked in Educational Mode.");
    } else if (key === 'Esc') {
      setActiveScreen('gateway');
    } else if (key === 'Ctrl+A') {
      // Handled inside components
    }
  };

  // Screen navigator from GoTo search
  const goToOptions = [
    { name: 'Gateway of Tally', screen: 'gateway' },
    { name: 'Accounting Vouchers (Sales, Payment etc.)', screen: 'voucher_entry' },
    { name: 'Day Book (Transaction logs)', screen: 'day_book' },
    { name: 'Balance Sheet', screen: 'balance_sheet' },
    { name: 'Profit & Loss Statement', screen: 'profit_loss' },
    { name: 'Stock Summary Inventory levels', screen: 'stock_summary' },
    { name: 'Ratio Analysis Metrics', screen: 'ratio_analysis' },
    { name: 'Sync Status (Desktop Connector Panel)', screen: 'sync_panel' },
    { name: 'AI Voice/Text Assistant (Gemini AI)', screen: 'ai_dashboard' },
    { name: 'Audit / Activity Logs', screen: 'activity_logs' }
  ];

  const filteredGoToOptions = goToQuery === '' 
    ? goToOptions 
    : goToOptions.filter(o => o.name.toLowerCase().includes(goToQuery.toLowerCase()));

  return (
    <div className="h-screen w-screen flex flex-col bg-[#E0E6E9] select-none text-[#1a1a1a] overflow-hidden">
      
      {/* Top Header */}
      {user && (
        <Header 
          activeCompany={activeCompany}
          activePeriod={activePeriod}
          user={user}
          onSelectPeriod={() => alert("Period selection locked to default Financial Year 2026-27.")}
          onOpenGoTo={() => setShowGoToModal(true)}
          onLogout={handleLogout}
          onOpenLogin={() => setShowLoginModal(true)}
        />
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left / Center content panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* LOGIN SCREEN */}
          {activeScreen === 'login' && (
            <div className="flex-1 bg-[#E0E6E9] flex items-center justify-center p-4">
              <div className="w-[420px] bg-white border border-gray-300 shadow-xl relative font-mono text-xs">
                <div className="bg-[#00426A] text-white text-center font-bold py-2.5 text-sm uppercase tracking-wider shadow-sm">
                  🔐 TallyPrime Login Authentication
                </div>

                <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                  {authError && (
                    <div className="bg-red-50 text-red-700 p-2.5 border border-red-200 font-bold flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[10px]">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoggingIn}
                        className="w-full bg-slate-50 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00426A] font-bold"
                        placeholder="e.g. admin, accountant, operator"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[10px]">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoggingIn}
                        className="w-full bg-slate-50 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#00426A] font-bold"
                        placeholder="e.g. admin123"
                      />
                    </div>
                  </div>

                  <div className="bg-[#E7F3FF] p-3 border border-blue-200 text-slate-700 text-[10px] space-y-1 leading-relaxed">
                    <p className="font-bold text-[#002D4E]">💡 Standard Simulated Roles Available:</p>
                    <p>• <strong>admin</strong> (pass: <strong>admin123</strong>) — Full ERP Access</p>
                    <p>• <strong>accountant</strong> (pass: <strong>acc123</strong>) — General reporting + Bookkeeper</p>
                    <p>• <strong>operator</strong> (pass: <strong>op123</strong>) — Voucher entries only</p>
                    <p>• <strong>viewer</strong> (pass: <strong>view123</strong>) — Read-only access</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-[#00426A] hover:bg-[#002D4E] text-white font-bold py-2.5 text-xs uppercase shadow-md cursor-pointer transition-all flex items-center justify-center space-x-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging In...</span>
                      </>
                    ) : (
                      <span>Open Tally Gateway</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* GATEWAY OF TALLY (Main screen) */}
          {activeScreen === 'gateway' && user && (
            <GatewayOfTally 
              activeCompany={activeCompany}
              vouchers={vouchers}
              onSelectOption={(option) => {
                if (option === 'activity_logs') {
                  setActiveScreen('activity_logs');
                } else if (option === 'sync_panel') {
                  setActiveScreen('sync_panel');
                } else if (option === 'ai_dashboard') {
                  setActiveScreen('ai_dashboard');
                } else if (option === 'voucher_entry') {
                  setVoucherToEdit(null);
                  setActiveScreen('voucher_entry');
                } else if (option === 'create_master' || option === 'alter_master' || option === 'chart_accounts') {
                  setActiveScreen('chart_accounts');
                } else {
                  // It's a report!
                  setActiveScreen(option);
                }
              }}
            />
          )}

          {/* VOUCHER ENTRY FORM */}
          {activeScreen === 'voucher_entry' && user && (
            <VoucherEntry 
              ledgers={ledgers}
              stockItems={stockItems}
              godowns={godowns}
              costCenters={costCenters}
              onSaveVoucher={handleSaveVoucher}
              onCancel={() => setActiveScreen('gateway')}
              voucherToEdit={voucherToEdit}
              onDeleteVoucher={handleDeleteVoucher}
            />
          )}

          {/* REPORTS PANELS */}
          {(activeScreen === 'balance_sheet' || 
            activeScreen === 'profit_loss' || 
            activeScreen === 'stock_summary' || 
            activeScreen === 'day_book' || 
            activeScreen === 'ratio_analysis' || 
            activeScreen === 'chart_accounts') && user && (
            <Reports 
              reportType={activeScreen as any}
              vouchers={vouchers}
              ledgers={ledgers}
              stockItems={stockItems}
              onBack={() => setActiveScreen('gateway')}
              onOpenVoucher={(vch) => {
                setVoucherToEdit(vch);
                setActiveScreen('voucher_entry');
              }}
            />
          )}

          {/* SYNC PANEL */}
          {activeScreen === 'sync_panel' && user && (
            <SyncPanel 
              onBack={() => setActiveScreen('gateway')}
              vouchers={vouchers}
              onTriggerSync={fetchAllData}
            />
          )}

          {/* AI DASHBOARD */}
          {activeScreen === 'ai_dashboard' && user && (
            <AIDashboard 
              ledgers={ledgers}
              stockItems={stockItems}
              onAddParsedVoucher={handleSaveVoucher}
              onBack={() => setActiveScreen('gateway')}
            />
          )}

          {/* COMPLIANCE / ACTIVITY LOG BOOK */}
          {activeScreen === 'activity_logs' && user && (
            <div className="flex-1 bg-[#E0E6E9] flex flex-col overflow-hidden text-[#1a1a1a] font-mono text-xs p-4 gap-4">
              <div className="bg-white border border-gray-300 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="bg-[#00426A] text-white py-1.5 px-4 flex justify-between items-center border-b border-gray-300">
                  <span className="text-xs font-bold tracking-wider uppercase text-white">
                    Compliance Activity Book & Audit Trails
                  </span>
                  <button 
                    onClick={() => setActiveScreen('gateway')}
                    className="bg-[#002D4E] hover:bg-[#00426A] text-white px-3 py-1 font-bold border border-white/10 rounded cursor-pointer"
                  >
                    Quit (Esc)
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="border border-gray-300 bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#002D4E] text-white font-bold border-b border-gray-300">
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Operator User</th>
                          <th className="p-3">Action Event</th>
                          <th className="p-3">Activity description details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {activityLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#F9A825]/10 font-mono">
                            <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-3 font-bold text-[#002D4E]">{log.user}</td>
                            <td className="p-3 font-bold text-slate-800">{log.action}</td>
                            <td className="p-3 text-gray-600">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Right Hotkeys Sidebar */}
        {user && activeScreen !== 'login' && (
          <SidebarKeys 
            activeScreen={activeScreen}
            voucherType={voucherToEdit?.voucherType}
            onKeyClick={handleSidebarKeyClick}
          />
        )}

      </div>

      {/* Calculator & Status Footer */}
      <footer id="tally-footer" className="bg-[#002D4E] text-white/80 text-[10px] px-3 py-1 flex justify-between border-t border-white/20 font-mono">
        <div className="flex space-x-6">
          <span>TallyPrime Gold (Multi-user)</span>
          <span>Version: Release 1.2.0 (Sync Edition)</span>
          <span>Gateway Server: LOCALHOST:3000</span>
        </div>
        <div className="flex space-x-4">
          <span className="text-[#F9A825] font-semibold">Ctrl+N: Calculator</span>
          <span className="text-white/60 font-bold">EDUCATIONAL VERSION</span>
        </div>
      </footer>

      {/* Alt+G "GO TO" MODAL */}
      {showGoToModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#eef6f6] border-2 border-[#005051] w-[450px] shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="bg-[#005051] text-yellow-300 font-bold px-4 py-2 flex justify-between items-center border-b border-[#003d3f]">
              <span>🔍 GO TO - Search & Navigate ERP</span>
              <button 
                onClick={() => setShowGoToModal(false)}
                className="text-white hover:text-yellow-400 font-bold cursor-pointer"
              >
                [X]
              </button>
            </div>

            {/* Input */}
            <div className="p-4 border-b border-gray-300">
              <input
                type="text"
                placeholder="Type name of voucher, report or tool..."
                value={goToQuery}
                onChange={(e) => setGoToQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-[#005e60] font-bold"
                autoFocus
              />
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-[#c2dede]">
              {filteredGoToOptions.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setActiveScreen(opt.screen);
                    setShowGoToModal(false);
                    setGoToQuery('');
                  }}
                  className="px-4 py-2 hover:bg-yellow-100 cursor-pointer flex justify-between items-center text-[#002f30]"
                >
                  <span className="font-semibold">{opt.name}</span>
                  <span className="text-[10px] text-gray-400 italic">Jump➔</span>
                </div>
              ))}
              {filteredGoToOptions.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-400 italic">No screens matched. Try "day book" or "balance".</div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-100 px-4 py-1.5 text-[10px] text-gray-500 border-t border-gray-200 flex justify-between">
              <span>Press [Esc] to exit search</span>
              <span>TallyPrime Navigation</span>
            </div>
          </div>
        </div>
      )}

      {/* F1 COMPANY SELECTION MODAL */}
      {showCompanySelectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="bg-[#eef6f6] border-2 border-[#00426A] w-[450px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#00426A] text-white font-bold px-4 py-2.5 flex justify-between items-center border-b border-[#002D4E]">
              <span className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#F9A825]" />
                <span>🏢 TallyPrime - Select Company</span>
              </span>
              <button 
                onClick={() => setShowCompanySelectModal(false)}
                className="text-white hover:text-yellow-400 font-bold cursor-pointer"
              >
                [X]
              </button>
            </div>

            {/* Main body */}
            <div className="p-5 space-y-4">
              {companySelectLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-600">
                  <RotateCw className="w-8 h-8 animate-spin text-[#00426A]" />
                  <span className="font-bold">Checking Tally Connector & active companies...</span>
                </div>
              ) : companySelectionError ? (
                <div className="space-y-4">
                  <div className="bg-red-50 text-red-700 p-4 border border-red-200 rounded font-bold flex items-start space-x-3 leading-snug">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm">Connection Failed!</p>
                      <p className="text-xs font-normal text-red-600/95">{companySelectionError}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 text-amber-800 p-3.5 border border-amber-200 text-[10px] rounded space-y-1 leading-relaxed">
                    <p className="font-bold">💡 How to fix this:</p>
                    <p>1. Ensure your local <strong>Tally Prime</strong> desktop application is open.</p>
                    <p>2. Verify that the <strong>Tally Sync Connector</strong> utility is running in the background.</p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSelectCompanyTrigger}
                      className="flex-1 bg-[#00426A] hover:bg-[#002D4E] text-white font-bold py-2 text-xs uppercase cursor-pointer transition-all flex items-center justify-center space-x-2"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retry Connection</span>
                    </button>
                    <button
                      onClick={() => setShowCompanySelectModal(false)}
                      className="flex-1 border border-gray-300 hover:bg-slate-100 text-slate-700 font-bold py-2 text-xs uppercase cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#E7F3FF] p-3 border border-blue-200 text-slate-700 text-[10px] flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-emerald-600 animate-pulse flex-shrink-0" />
                    <span><strong>Tally Prime Connected!</strong> Select an active company loaded on your desktop.</span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {availableCompanies.length > 0 ? (
                      availableCompanies.map((comp) => (
                        <button
                          key={comp.id}
                          onClick={() => {
                            setActiveCompany(comp);
                            setShowCompanySelectModal(false);
                          }}
                          className="w-full text-left p-3 border border-gray-200 hover:border-[#00426A] hover:bg-[#F4F9FC] transition-all flex items-start space-x-3 cursor-pointer group"
                        >
                          <Building className="w-4 h-4 text-slate-500 group-hover:text-[#00426A] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 group-hover:text-[#00426A] truncate">
                              {comp.name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                              <span>State: <strong>{comp.state}</strong></span>
                              <span>GSTIN: <strong>{comp.gstin}</strong></span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 border border-dashed border-gray-300 text-center text-slate-500 rounded space-y-2">
                        <p className="font-bold text-slate-700">No active companies found in Tally Prime.</p>
                        <p className="text-[10px] text-slate-400">Please open at least one company in your desktop Tally application, then retry.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSelectCompanyTrigger}
                      className="flex-1 border border-[#00426A] text-[#00426A] hover:bg-slate-50 font-bold py-2 text-xs uppercase cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Refresh List</span>
                    </button>
                    <button
                      onClick={() => setShowCompanySelectModal(false)}
                      className="flex-1 border border-gray-300 hover:bg-slate-100 text-slate-700 font-bold py-2 text-xs uppercase cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-100 px-4 py-1.5 text-[10px] text-gray-500 border-t border-gray-200 flex justify-between">
              <span>Press [Esc] to exit</span>
              <span>TallyPrime Integration</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
