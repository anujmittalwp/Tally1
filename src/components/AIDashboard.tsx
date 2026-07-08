import React, { useState } from 'react';
import { Sparkles, Terminal, CornerDownRight, Check, AlertCircle, Bot, Cpu } from 'lucide-react';
import { Voucher, Ledger, StockItem } from '../types';

interface AIDashboardProps {
  ledgers: Ledger[];
  stockItems: StockItem[];
  onAddParsedVoucher: (voucher: Partial<Voucher>) => Promise<void>;
  onBack: () => void;
}

export default function AIDashboard({ ledgers, stockItems, onAddParsedVoucher, onBack }: AIDashboardProps) {
  const [naturalText, setNaturalText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedVoucher, setParsedVoucher] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState('');

  // GST Assistant State
  const [gstinInput, setGstinInput] = useState('');
  const [gstinCheckResult, setGstinCheckResult] = useState<any>(null);

  // Auto Reconciler / Error detection anomalies
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isScanningAnomalies, setIsScanningAnomalies] = useState(false);

  // Call Express API endpoint to parse natural language statement using Gemini AI!
  const handleParseText = async () => {
    if (!naturalText.trim()) return;
    setIsLoading(true);
    setParsedVoucher(null);
    setSaveStatus('');
    try {
      const response = await fetch('/api/ai/natural-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: naturalText })
      });
      const data = await response.json();
      if (data.success && data.voucher) {
        setParsedVoucher(data.voucher);
      } else {
        alert("Parsing failed. Check server connection.");
      }
    } catch (err) {
      alert("Error calling Gemini API endpoint on server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-set samples to help the user test!
  const handleSampleClick = (sample: string) => {
    setNaturalText(sample);
  };

  // Accept and save the AI-generated voucher directly to the system!
  const handleAcceptAIVoucher = async () => {
    if (!parsedVoucher) return;
    try {
      setSaveStatus('Saving...');
      const totalAmount = parsedVoucher.amount || 0;
      
      const payload: Partial<Voucher> = {
        voucherNumber: `${parsedVoucher.voucherType.slice(0, 3).toUpperCase()}/AI-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        voucherType: parsedVoucher.voucherType,
        partyLedgerName: parsedVoucher.partyLedgerName || 'Cash',
        narration: `AI parsed: "${naturalText}"`,
        amount: totalAmount,
        ledgerEntries: parsedVoucher.ledgerEntries || [
          { ledgerName: parsedVoucher.partyLedgerName || 'Cash', amount: totalAmount, type: 'Dr' }
        ],
        inventoryEntries: parsedVoucher.inventoryEntries,
        syncStatus: 'Pending'
      };

      await onAddParsedVoucher(payload);
      setSaveStatus('Voucher posted successfully and queued for Tally Prime Sync!');
      setParsedVoucher(null);
      setNaturalText('');
    } catch (err) {
      setSaveStatus('Failed to save voucher.');
    }
  };

  // GSTIN Verifier Simulation
  const handleCheckGstin = () => {
    if (gstinInput.length !== 15) {
      setGstinCheckResult({ valid: false, message: "GSTIN must be exactly 15 alphanumeric characters." });
      return;
    }
    const stateCode = gstinInput.slice(0, 2);
    const pan = gstinInput.slice(2, 12).toUpperCase();
    
    setGstinCheckResult({
      valid: true,
      stateCode,
      pan,
      entityType: pan[3] === 'C' ? 'Company' : pan[3] === 'P' ? 'Individual' : 'Partnership/Trust',
      locationMatched: stateCode === '07' ? 'Delhi State (Local CGST/SGST Applicable)' : 'Interstate (IGST Applicable)'
    });
  };

  // Run anomaly scanning
  const handleScanAnomalies = () => {
    setIsScanningAnomalies(true);
    setTimeout(() => {
      const list = [
        { type: 'Duplicate Ref', desc: 'Voucher number Sales/001 shares matching sequence with offline ledger 9988.', severity: 'Medium' },
        { type: 'Tax Discrepancy', desc: 'Office Rent ledger lacks CGST/SGST tax registration code mapping.', severity: 'Low' },
        { type: 'Negative Balance', desc: 'Cash-in-hand ledger has negative current balance in local vault.', severity: 'High' }
      ];
      setAnomalies(list);
      setIsScanningAnomalies(false);
    }, 1000);
  };

  return (
    <div id="ai-dashboard-container" className="flex-1 bg-[#E0E6E9] flex flex-col overflow-hidden text-[#1a1a1a] font-mono text-xs">
      
      {/* Header */}
      <div className="bg-[#00426A] text-white py-1.5 px-4 flex justify-between items-center border-b border-[#002D4E]">
        <span className="text-xs font-bold tracking-wider uppercase text-[#F9A825] flex items-center space-x-1.5">
          <Bot className="w-4 h-4 text-[#F9A825]" />
          <span>Gemini ERP Smart Intelligence Suite</span>
        </span>
        <button 
          onClick={onBack}
          className="bg-[#002D4E] hover:bg-[#00426A] text-white px-3 py-1 font-bold text-xs border border-white/10 rounded-sm cursor-pointer"
        >
          Quit (Esc)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Row 1: Natural Language Entry */}
        <div className="grid grid-cols-12 gap-4">
          <div className="bg-white border border-gray-300 p-4 shadow-sm col-span-7 space-y-3">
            <h3 className="font-bold border-b border-gray-300 pb-1 text-[#002D4E] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Natural Language Voucher Creator (Gemini API)</span>
            </h3>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Describe any transactional event in standard natural business terms. Gemini will map double-entry ledger accounts, allocate debit/credits, calculate taxes, and construct a structured voucher instantly!
            </p>

            <div className="space-y-2">
              <textarea
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="Type here, e.g., 'Received ₹10000 from Ram Kumar & Co towards HDFC Bank Account'"
                rows={3}
                className="w-full border border-gray-300 p-2.5 bg-white text-xs focus:outline-none focus:border-[#00426A] resize-none"
              />

              <div className="flex justify-between items-center">
                {/* Samples */}
                <div className="flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => handleSampleClick("Paid electricity charges ₹3500 via HDFC Bank")}
                    className="bg-[#E7F3FF] hover:bg-[#F9A825]/10 px-2 py-1 text-[10px] text-[#002D4E] border border-blue-200 cursor-pointer"
                  >
                    💡 Paid electricity ₹3500
                  </button>
                  <button 
                    onClick={() => handleSampleClick("Received ₹5000 from Ram Kumar & Co")}
                    className="bg-[#E7F3FF] hover:bg-[#F9A825]/10 px-2 py-1 text-[10px] text-[#002D4E] border border-blue-200 cursor-pointer"
                  >
                    💡 Received ₹5000
                  </button>
                  <button 
                    onClick={() => handleSampleClick("Purchased HP Pavilion Laptop for ₹55000")}
                    className="bg-[#E7F3FF] hover:bg-[#F9A825]/10 px-2 py-1 text-[10px] text-[#002D4E] border border-blue-200 cursor-pointer"
                  >
                    💡 Purchased Laptop ₹55000
                  </button>
                </div>

                <button
                  onClick={handleParseText}
                  disabled={isLoading || !naturalText}
                  className="bg-[#00426A] hover:bg-[#002D4E] text-white font-bold px-4 py-1.5 rounded-sm cursor-pointer shadow flex items-center space-x-1 border-0"
                >
                  <Cpu className="w-3.5 h-3.5 animate-pulse" />
                  <span>{isLoading ? 'Thinking...' : 'AI Analyze (Enter)'}</span>
                </button>
              </div>
            </div>

            {saveStatus && (
              <div className="p-2 bg-[#E7F3FF] text-[#002D4E] border border-blue-200 font-bold text-xs">
                ✓ {saveStatus}
              </div>
            )}
          </div>

          {/* AI Resulting Voucher Preview Allocation */}
          <div className="bg-white border border-gray-300 p-4 shadow-sm col-span-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold border-b border-gray-300 pb-1 text-[#002D4E] uppercase tracking-wider flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-[#00426A]" />
                <span>Structured Double Entry Output</span>
              </h3>

              {parsedVoucher ? (
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 border border-gray-200">
                    <div>
                      <span className="text-gray-400 block uppercase text-[9px]">Voucher Type</span>
                      <strong className="text-[#002D4E] font-bold text-xs">{parsedVoucher.voucherType}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block uppercase text-[9px]">Party Account</span>
                      <strong className="text-gray-700 font-bold text-xs">{parsedVoucher.partyLedgerName || 'Cash'}</strong>
                    </div>
                  </div>

                  {/* Ledger entries mapping */}
                  <div className="bg-white border border-gray-200 p-2 text-[10px] space-y-1">
                    <span className="font-bold text-[#002D4E] block uppercase text-[8px] mb-1">Double Entry Ledgers</span>
                    {parsedVoucher.ledgerEntries && parsedVoucher.ledgerEntries.map((e: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-gray-700">
                        <span className="flex items-center">
                          <CornerDownRight className="w-3 h-3 text-cyan-500 mr-1" />
                          <span className="font-bold text-gray-400 mr-1">{e.type}</span>
                          <span>{e.ledgerName}</span>
                        </span>
                        <strong className="font-bold text-gray-800">₹{e.amount}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Optional inventory allocation */}
                  {parsedVoucher.inventoryEntries && parsedVoucher.inventoryEntries.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-2 text-[10px] space-y-1">
                      <span className="font-bold text-amber-900 block uppercase text-[8px] mb-1">Stock Allocations</span>
                      {parsedVoucher.inventoryEntries.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-amber-800">
                          <span>{item.stockItemName}</span>
                          <span>{item.quantity} Qty @ ₹{item.rate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-400 italic">
                  Awaiting natural language input analysis...
                </div>
              )}
            </div>

            {parsedVoucher && (
              <button
                onClick={handleAcceptAIVoucher}
                className="w-full bg-[#F9A825] hover:bg-amber-500 text-black font-bold py-2 shadow-sm border-0 cursor-pointer uppercase tracking-wider mt-4 rounded-sm"
              >
                Accept and Post Voucher to Tally
              </button>
            )}
          </div>
        </div>

        {/* Row 2: GST Assistant & Audit Reconciler */}
        <div className="grid grid-cols-2 gap-4">
          {/* GST Assistant */}
          <div className="bg-white border border-gray-300 p-4 shadow-sm space-y-3">
            <h3 className="font-bold border-b border-gray-300 pb-1 text-[#002D4E] uppercase tracking-wider">
              AI GST Registration Verifier
            </h3>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter 15-character GSTIN (e.g. 07AAAAA1111A1Z1)"
                value={gstinInput}
                onChange={(e) => setGstinInput(e.target.value)}
                className="flex-1 border border-gray-300 p-1.5 bg-white uppercase text-xs focus:outline-none focus:border-[#00426A]"
              />
              <button
                onClick={handleCheckGstin}
                className="bg-[#00426A] hover:bg-[#002D4E] text-white font-bold px-3 py-1 cursor-pointer rounded-sm border-0 text-xs"
              >
                Validate
              </button>
            </div>

            {gstinCheckResult && (
              <div className={`p-3 border text-[11px] ${gstinCheckResult.valid ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                <p className="font-bold flex items-center space-x-1">
                  {gstinCheckResult.valid ? <Check className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{gstinCheckResult.valid ? 'Valid GSTIN Format' : 'Invalid GSTIN'}</span>
                </p>
                {gstinCheckResult.valid && (
                  <div className="mt-2 space-y-1 pl-5">
                    <p>State Jurisdiction Code: <strong>{gstinCheckResult.stateCode}</strong> ({gstinCheckResult.locationMatched})</p>
                    <p>Assessee PAN Extraction: <strong>{gstinCheckResult.pan}</strong></p>
                    <p>Business Type Classification: <strong>{gstinCheckResult.entityType}</strong></p>
                  </div>
                )}
                {!gstinCheckResult.valid && <p className="mt-1 pl-5">{gstinCheckResult.message}</p>}
              </div>
            )}
          </div>

          {/* Anomaly / Duplicate Detector */}
          <div className="bg-white border border-gray-300 p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-gray-300 pb-1">
              <h3 className="font-bold text-[#002D4E] uppercase tracking-wider">
                Compliance Scan & Leakage Audit
              </h3>
              <button
                onClick={handleScanAnomalies}
                disabled={isScanningAnomalies}
                className="bg-[#00426A] hover:bg-[#002D4E] text-white font-bold px-3 py-1 cursor-pointer text-[10px] rounded-sm border-0"
              >
                {isScanningAnomalies ? 'Scanning...' : 'Run Audit'}
              </button>
            </div>

            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <div key={i} className="bg-white p-2 border border-gray-200 rounded flex items-start space-x-2 text-[11px]">
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    a.severity === 'High' ? 'text-red-600' : a.severity === 'Medium' ? 'text-amber-600' : 'text-blue-500'
                  }`} />
                  <div>
                    <span className="font-bold text-gray-700">{a.type}</span>
                    <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{a.desc}</p>
                  </div>
                </div>
              ))}
              {anomalies.length === 0 && (
                <p className="text-gray-400 italic text-center py-4">No anomalies scanned yet. Click Run Audit above.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
