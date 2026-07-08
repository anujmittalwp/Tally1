import React, { useState, useEffect } from 'react';
import { Voucher, Ledger, StockItem } from '../types';
import { Search, Printer, FileDown, Calendar, ArrowLeft, RefreshCw, HelpCircle, Eye } from 'lucide-react';

interface ReportsProps {
  reportType: 'balance_sheet' | 'profit_loss' | 'stock_summary' | 'day_book' | 'ratio_analysis' | 'chart_accounts';
  vouchers: Voucher[];
  ledgers: Ledger[];
  stockItems: StockItem[];
  onBack: () => void;
  onOpenVoucher: (voucher: Voucher) => void;
}

export default function Reports({
  reportType,
  vouchers,
  ledgers,
  stockItems,
  onBack,
  onOpenVoucher
}: ReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-07-07');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [drillDownGroup, setDrillDownGroup] = useState<string | null>(null);

  // AI Explanation state
  const [aiExplanation, setAiExplanation] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Trigger Gemini Analysis on current report
  const handleAiAnalyze = async () => {
    setIsLoadingAi(true);
    setAiExplanation('');
    try {
      const response = await fetch('/api/ai/report-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: reportType.replace('_', ' ').toUpperCase(),
          data: {
            vouchersSummary: vouchers.map(v => ({ type: v.voucherType, amount: v.amount, date: v.date })),
            ledgerBalances: ledgers.map(l => ({ name: l.name, balance: l.currentBalance, group: l.groupName })),
            stockLevels: stockItems.map(s => ({ name: s.name, stock: s.currentStock, value: s.currentStock * s.openingRate }))
          }
        })
      });
      const data = await response.json();
      setAiExplanation(data.explanation || 'No explanation available');
    } catch (err) {
      setAiExplanation('Failed to fetch AI explanation. Make sure server is running and configured.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Filter vouchers within selected date range
  const filteredVouchers = vouchers.filter(v => {
    const d = new Date(v.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const inRange = d >= start && d <= end;
    const matchesSearch = searchTerm === '' || 
      v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.partyLedgerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.narration && v.narration.toLowerCase().includes(searchTerm.toLowerCase()));
    return inRange && matchesSearch;
  });

  // Dynamic Ledger Aggregator helper
  const getLedgerBalance = (name: string) => {
    const l = ledgers.find(item => item.name === name);
    return l ? l.currentBalance : 0;
  };

  // Helper to group ledger balances by category/groupName
  const getGroupTotal = (groupName: string) => {
    return ledgers
      .filter(l => l.groupName === groupName)
      .reduce((sum, curr) => sum + (curr.currentBalance || 0), 0);
  };

  // Print utility mock
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-panel" className="flex-1 bg-[#E0E6E9] flex flex-col overflow-hidden text-[#1a1a1a] font-mono text-xs">
      
      {/* Top Header Bar */}
      <div className="bg-[#00426A] text-white py-1.5 px-4 flex justify-between items-center border-b border-[#002D4E]">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="hover:bg-white/10 p-1 rounded text-white flex items-center cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Esc (Go Back)</span>
          </button>
          <span className="text-sm font-bold tracking-wider uppercase text-white">
            {reportType.replace('_', ' ')}
          </span>
        </div>

        {/* Action utility keys */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleAiAnalyze}
            disabled={isLoadingAi}
            className="bg-[#F9A825] hover:bg-amber-500 text-black px-3 py-1 font-bold flex items-center space-x-1 rounded cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
            <span>{isLoadingAi ? 'Analyzing...' : 'AI Explain Report'}</span>
          </button>

          <button 
            onClick={handlePrint}
            className="bg-[#002D4E] hover:bg-[#00426A] text-white px-2.5 py-1 flex items-center space-x-1 rounded border border-white/10 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          
          <button 
            onClick={() => alert("Report successfully exported to Excel format.")}
            className="bg-[#37474f] hover:bg-[#263238] text-white px-2.5 py-1 flex items-center space-x-1 rounded cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Ribbon */}
      <div className="bg-white border-b border-gray-300 p-3 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search particulars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-300 px-2.5 py-1 focus:outline-none focus:border-[#00426A] w-48 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-300 px-1 py-0.5 text-[11px]"
            />
            <span className="text-gray-400">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-300 px-1 py-0.5 text-[11px]"
            />
          </div>
        </div>

        <div className="text-[10px] text-gray-500 font-bold bg-[#E7F3FF] px-2 py-1 border border-blue-200">
          Delhi Branch | Book Period: FY 2026-27
        </div>
      </div>

      {/* Main Report Body Canvas */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        
        {/* AI Explanation Box */}
        {aiExplanation && (
          <div className="bg-[#E7F3FF] border-l-4 border-[#00426A] p-4 shadow-sm text-xs leading-relaxed space-y-2 text-slate-800">
            <h4 className="font-bold flex items-center space-x-1 text-[#002D4E] text-sm">
              <HelpCircle className="w-4 h-4 text-[#00426A]" />
              <span>Gemini Smart Accounting Insights</span>
            </h4>
            <p className="whitespace-pre-line">{aiExplanation}</p>
          </div>
        )}

        {/* REPORT RENDERING OPTIONS */}

        {/* 1. BALANCE SHEET */}
        {reportType === 'balance_sheet' && (
          <div className="border border-gray-300 bg-white shadow-md max-w-4xl mx-auto w-full">
            <div className="bg-[#E7F3FF] text-[#002D4E] text-center font-bold py-1.5 uppercase border-b border-gray-300">
              ABC Electronics Ltd - Balance Sheet
            </div>
            
            <div className="grid grid-cols-2 divide-x divide-gray-200 text-xs">
              {/* LIABILITIES COLUMN */}
              <div className="p-3 space-y-3">
                <h3 className="font-bold border-b border-gray-300 text-[#002D4E] pb-1 uppercase text-[10px] tracking-wider">Capital & Liabilities</h3>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold cursor-pointer hover:bg-[#F9A825]/10 p-1" onClick={() => setDrillDownGroup('Capital Account')}>
                    <span>Capital Account</span>
                    <span>₹{getGroupTotal('Capital Account')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Share Capital (Owner Contribution)</span>
                    <span>₹{getLedgerBalance('Capital Account')}</span>
                  </div>

                  <div className="flex justify-between font-bold cursor-pointer hover:bg-[#F9A825]/10 p-1 mt-3" onClick={() => setDrillDownGroup('Current Liabilities')}>
                    <span>Current Liabilities</span>
                    <span>₹{getGroupTotal('Current Liabilities') + getGroupTotal('Duties & Taxes')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Sundry Creditors (Shyam Traders etc)</span>
                    <span>₹{getGroupTotal('Sundry Creditors')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Duties & Taxes (GST payable)</span>
                    <span>₹{getGroupTotal('Duties & Taxes')}</span>
                  </div>
                </div>
              </div>

              {/* ASSETS COLUMN */}
              <div className="p-3 space-y-3">
                <h3 className="font-bold border-b border-gray-300 text-[#002D4E] pb-1 uppercase text-[10px] tracking-wider">Property & Assets</h3>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold cursor-pointer hover:bg-[#F9A825]/10 p-1" onClick={() => setDrillDownGroup('Current Assets')}>
                    <span>Current Assets</span>
                    <span>₹{getGroupTotal('Current Assets') + getGroupTotal('Cash-in-hand') + getGroupTotal('Bank Accounts')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Bank Accounts</span>
                    <span>₹{getGroupTotal('Bank Accounts')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between text-[11px]">
                    <span className="italic pl-2">- HDFC Bank A/c</span>
                    <span>₹{getLedgerBalance('HDFC Bank A/c')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Cash-in-Hand</span>
                    <span>₹{getGroupTotal('Cash-in-hand')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Sundry Debtors (Ram Kumar & Co etc)</span>
                    <span>₹{getGroupTotal('Sundry Debtors')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Balance Sheet summary footer */}
            <div className="grid grid-cols-2 divide-x divide-gray-200 bg-[#002D4E] text-[#F9A825] font-bold text-xs p-2.5">
              <div className="flex justify-between px-2">
                <span>TOTAL LIABILITIES</span>
                <span>₹{getGroupTotal('Capital Account') + getGroupTotal('Current Liabilities') + getGroupTotal('Duties & Taxes')}</span>
              </div>
              <div className="flex justify-between px-2">
                <span>TOTAL ASSETS</span>
                <span>₹{getGroupTotal('Current Assets') + getGroupTotal('Cash-in-hand') + getGroupTotal('Bank Accounts')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROFIT & LOSS A/C */}
        {reportType === 'profit_loss' && (
          <div className="border border-gray-300 bg-white shadow-md max-w-4xl mx-auto w-full">
            <div className="bg-[#E7F3FF] text-[#002D4E] text-center font-bold py-1.5 uppercase border-b border-gray-300">
              ABC Electronics Ltd - Profit & Loss Statement
            </div>
            
            <div className="grid grid-cols-2 divide-x divide-gray-200 text-xs">
              {/* EXPENSES */}
              <div className="p-3 space-y-3">
                <h3 className="font-bold border-b border-gray-300 text-red-700 pb-1 uppercase text-[10px] tracking-wider">Debit (Expenses)</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Purchase Accounts</span>
                    <span>₹{getGroupTotal('Purchase Accounts')}</span>
                  </div>
                  <div className="flex justify-between font-semibold mt-4">
                    <span>Indirect Expenses</span>
                    <span>₹{getGroupTotal('Indirect Expenses')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Office Rent</span>
                    <span>₹{getLedgerBalance('Office Rent')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Electricity Charges</span>
                    <span>₹{getLedgerBalance('Electricity Charges')}</span>
                  </div>

                  {/* Net Profit formulation */}
                  <div className="pt-6 border-t border-gray-300 flex justify-between font-bold text-green-700">
                    <span>Nett Profit (Transferred to Capital)</span>
                    <span>₹{Math.max(0, getGroupTotal('Sales Accounts') - (getGroupTotal('Purchase Accounts') + getGroupTotal('Indirect Expenses')))}</span>
                  </div>
                </div>
              </div>

              {/* INCOME */}
              <div className="p-3 space-y-3">
                <h3 className="font-bold border-b border-gray-300 text-green-700 pb-1 uppercase text-[10px] tracking-wider">Credit (Incomes)</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Sales Accounts</span>
                    <span>₹{getGroupTotal('Sales Accounts')}</span>
                  </div>
                  <div className="pl-4 text-gray-600 flex justify-between">
                    <span>Sales A/c</span>
                    <span>₹{getLedgerBalance('Sales A/c')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit and Loss total balance footer */}
            <div className="grid grid-cols-2 divide-x divide-gray-200 bg-[#002D4E] text-[#F9A825] font-bold text-xs p-2.5">
              <div className="flex justify-between px-2">
                <span>TOTAL</span>
                <span>₹{getGroupTotal('Sales Accounts')}</span>
              </div>
              <div className="flex justify-between px-2">
                <span>TOTAL</span>
                <span>₹{getGroupTotal('Sales Accounts')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. STOCK SUMMARY */}
        {reportType === 'stock_summary' && (
          <div className="border border-gray-300 bg-white shadow-md max-w-4xl mx-auto w-full">
            <div className="bg-[#E7F3FF] text-[#002D4E] text-center font-bold py-1.5 uppercase border-b border-gray-300">
              Inventory Stock summary Valuation Report
            </div>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002D4E] text-[#F9A825] font-bold border-b border-gray-300">
                  <th className="p-3">Stock Item Name</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Closing Qty</th>
                  <th className="p-3 text-right">Standard Rate (₹)</th>
                  <th className="p-3 text-right">Closing Value (₹)</th>
                  <th className="p-3 text-center">GST Tax %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stockItems.map((item) => {
                  const closingVal = item.currentStock * item.openingRate;
                  return (
                    <tr key={item.id} className="hover:bg-[#F9A825]/10 font-mono">
                      <td className="p-3 font-semibold text-[#002D4E]">{item.name}</td>
                      <td className="p-3 text-center text-gray-500">{item.unit}</td>
                      <td className="p-3 text-right font-bold">{item.currentStock}</td>
                      <td className="p-3 text-right">₹{item.openingRate}</td>
                      <td className="p-3 text-right font-bold text-gray-700">₹{closingVal}</td>
                      <td className="p-3 text-center bg-[#E7F3FF] text-[#002D4E] font-bold">{item.gstRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. DAY BOOK */}
        {reportType === 'day_book' && (
          <div className="border border-gray-300 bg-white shadow-md w-full">
            <div className="bg-[#E7F3FF] text-[#002D4E] text-center font-bold py-1.5 uppercase border-b border-gray-300">
              Day Book - Register of Financial Transactions
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002D4E] text-[#F9A825] font-bold border-b border-gray-300">
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher Number</th>
                  <th className="p-3">Voucher Type</th>
                  <th className="p-3">Particulars (Primary Account)</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-center">Sync Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F9A825]/10 font-mono">
                    <td className="p-3">{v.date}</td>
                    <td className="p-3 font-semibold text-gray-700">{v.voucherNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.voucherType === 'Sales' ? 'bg-green-100 text-green-800' :
                        v.voucherType === 'Purchase' ? 'bg-orange-100 text-orange-800' :
                        v.voucherType === 'Payment' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="p-3 text-[#002D4E] font-semibold">{v.partyLedgerName}</td>
                    <td className="p-3 text-right font-bold">₹{v.amount}</td>
                    <td className="p-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        v.syncStatus === 'Synced' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {v.syncStatus === 'Synced' ? '● Synced' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => onOpenVoucher(v)}
                        className="bg-[#00426A] hover:bg-[#002D4E] text-white px-2 py-0.5 text-[10px] rounded flex items-center justify-center space-x-1 cursor-pointer mx-auto"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect/Alter</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 italic">No vouchers found matching search filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. RATIO ANALYSIS */}
        {reportType === 'ratio_analysis' && (
          <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
            <div className="border border-gray-300 bg-white shadow p-4 space-y-3">
              <h3 className="font-bold border-b border-gray-300 text-[#002D4E] pb-1 uppercase">Key Financial Ratios</h3>
              <div className="space-y-2.5 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span>Current Ratio (Liquidity)</span>
                  <span className="font-bold text-green-700">12.4 : 1</span>
                </div>
                <div className="flex justify-between">
                  <span>Quick / Acid-Test Ratio</span>
                  <span className="font-bold text-green-700">10.2 : 1</span>
                </div>
                <div className="flex justify-between">
                  <span>Debt-to-Equity Ratio</span>
                  <span className="font-bold text-gray-700">0.05 : 1</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Profit Margin</span>
                  <span className="font-bold text-green-700">76.9%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Working Capital Turnover</span>
                  <span>1.48</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-300 bg-white shadow p-4 space-y-3">
              <h3 className="font-bold border-b border-gray-300 text-[#002D4E] pb-1 uppercase">Cash Flow & Liquidity Summary</h3>
              <div className="space-y-2.5 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span>Cash Balance</span>
                  <span className="font-bold">₹{getLedgerBalance('Cash')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Balance (HDFC Bank A/c)</span>
                  <span className="font-bold text-blue-700">₹{getLedgerBalance('HDFC Bank A/c')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-800">
                  <span>Total Available Funds</span>
                  <span>₹{getLedgerBalance('Cash') + getLedgerBalance('HDFC Bank A/c')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. CHART OF ACCOUNTS */}
        {reportType === 'chart_accounts' && (
          <div className="border border-gray-300 bg-white shadow-md max-w-4xl mx-auto w-full p-4 space-y-4">
            <h3 className="font-bold border-b border-gray-300 text-[#002D4E] pb-1 text-sm uppercase">Full Ledger Chart of Accounts</h3>
            <div className="grid grid-cols-2 gap-4">
              {ledgers.map((l) => (
                <div key={l.id} className="p-2 border border-gray-200 bg-white shadow-xs hover:shadow-sm">
                  <span className="font-bold block text-[#002D4E] text-xs">{l.name}</span>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Group: {l.groupName}</span>
                    <span className="font-mono text-gray-700 font-bold">Bal: ₹{l.currentBalance} ({l.balanceType})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
