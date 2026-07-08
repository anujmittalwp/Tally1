import React, { useState, useEffect, useRef } from 'react';
import { Ledger, StockItem, Godown, CostCenter, Voucher, LedgerEntry, InventoryEntry } from '../types';
import { PlusCircle, Search, HelpCircle, Save, Trash2, Printer, Copy, RefreshCw, X } from 'lucide-react';

interface VoucherEntryProps {
  ledgers: Ledger[];
  stockItems: StockItem[];
  godowns: Godown[];
  costCenters: CostCenter[];
  onSaveVoucher: (voucher: Partial<Voucher>) => Promise<any>;
  onCancel: () => void;
  voucherToEdit?: Voucher | null;
  onDeleteVoucher?: (id: string) => Promise<any>;
}

export default function VoucherEntry({
  ledgers,
  stockItems,
  godowns,
  costCenters,
  onSaveVoucher,
  onCancel,
  voucherToEdit,
  onDeleteVoucher
}: VoucherEntryProps) {
  // Voucher Header state
  const [voucherType, setVoucherType] = useState<'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal'>('Sales');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [partyLedgerName, setPartyLedgerName] = useState('');
  const [narration, setNarration] = useState('');

  // Ledger entries (Debits/Credits list)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([
    { ledgerName: '', amount: 0, type: 'Dr' }
  ]);

  // Inventory entries list
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);

  // Show inline ledger creation helper
  const [showInlineLedger, setShowInlineLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerGroup, setNewLedgerGroup] = useState('Sundry Debtors');
  const [newLedgerOpeningBalance, setNewLedgerOpeningBalance] = useState(0);

  // Focus managers and alerts
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when editing or duplicating
  useEffect(() => {
    if (voucherToEdit) {
      setVoucherType(voucherToEdit.voucherType);
      setVoucherNumber(voucherToEdit.voucherNumber);
      setDate(voucherToEdit.date);
      setReferenceNo(voucherToEdit.referenceNo || '');
      setPartyLedgerName(voucherToEdit.partyLedgerName);
      setNarration(voucherToEdit.narration || '');
      setLedgerEntries(voucherToEdit.ledgerEntries || []);
      setInventoryEntries(voucherToEdit.inventoryEntries || []);
    } else {
      // Default auto Voucher Numbering
      setVoucherNumber(`${voucherType.slice(0, 3).toUpperCase()}/${1000 + Math.floor(Math.random() * 9000)}`);
      // Setup default ledger items based on Voucher Type to assist quick bookkeeping!
      if (voucherType === 'Sales') {
        setLedgerEntries([
          { ledgerName: 'Sales A/c', amount: 0, type: 'Cr' },
          { ledgerName: '', amount: 0, type: 'Dr' }
        ]);
      } else if (voucherType === 'Purchase') {
        setLedgerEntries([
          { ledgerName: 'Purchase A/c', amount: 0, type: 'Dr' },
          { ledgerName: '', amount: 0, type: 'Cr' }
        ]);
      } else if (voucherType === 'Payment') {
        setLedgerEntries([
          { ledgerName: 'Cash', amount: 0, type: 'Cr' },
          { ledgerName: '', amount: 0, type: 'Dr' }
        ]);
      } else if (voucherType === 'Receipt') {
        setLedgerEntries([
          { ledgerName: 'HDFC Bank A/c', amount: 0, type: 'Dr' },
          { ledgerName: '', amount: 0, type: 'Cr' }
        ]);
      } else {
        setLedgerEntries([
          { ledgerName: '', amount: 0, type: 'Dr' },
          { ledgerName: '', amount: 0, type: 'Cr' }
        ]);
      }
    }
  }, [voucherToEdit, voucherType]);

  // Handle Alt+C and keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+C inline ledger create
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowInlineLedger(true);
      }
      // Ctrl+A to Accept/Save
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      // Ctrl+Q to quit/close
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ledgerEntries, inventoryEntries, partyLedgerName, voucherNumber, date]);

  // Auto GST / CGST / SGST Auto Calculation
  const recomputeGstAndTotals = () => {
    // 1. Calculate base goods amount from inventory entries
    const baseGoodsAmount = inventoryEntries.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    if (baseGoodsAmount === 0) return;

    // 2. Identify if it is local Delhi state (or check ledger gstin details)
    // Delhi state (same state) -> CGST 9% and SGST 9%. Interstate -> IGST 18%
    const cgstAmt = Math.round(baseGoodsAmount * 0.09);
    const sgstAmt = Math.round(baseGoodsAmount * 0.09);
    const totalWithGst = baseGoodsAmount + cgstAmt + sgstAmt;

    // 3. Build dynamic ledger list
    const updatedEntries: LedgerEntry[] = [];
    
    if (voucherType === 'Sales') {
      // Debit Party
      updatedEntries.push({ ledgerName: partyLedgerName || 'Sundry Debtors', amount: totalWithGst, type: 'Dr' });
      // Credit Sales
      updatedEntries.push({ ledgerName: 'Sales A/c', amount: baseGoodsAmount, type: 'Cr' });
      // Credit Taxes
      updatedEntries.push({ ledgerName: 'CGST @ 9%', amount: cgstAmt, type: 'Cr' });
      updatedEntries.push({ ledgerName: 'SGST @ 9%', amount: sgstAmt, type: 'Cr' });
    } else if (voucherType === 'Purchase') {
      // Debit Purchase
      updatedEntries.push({ ledgerName: 'Purchase A/c', amount: baseGoodsAmount, type: 'Dr' });
      // Debit Taxes
      updatedEntries.push({ ledgerName: 'CGST @ 9%', amount: cgstAmt, type: 'Dr' });
      updatedEntries.push({ ledgerName: 'SGST @ 9%', amount: sgstAmt, type: 'Dr' });
      // Credit Creditor Party
      updatedEntries.push({ ledgerName: partyLedgerName || 'Sundry Creditors', amount: totalWithGst, type: 'Cr' });
    }

    setLedgerEntries(updatedEntries);
  };

  // Ledger item changes
  const handleLedgerEntryChange = (index: number, key: keyof LedgerEntry, value: any) => {
    const updated = [...ledgerEntries];
    updated[index] = { ...updated[index], [key]: value };
    setLedgerEntries(updated);
  };

  // Add Debit/Credit rows
  const addLedgerRow = () => {
    setLedgerEntries([...ledgerEntries, { ledgerName: '', amount: 0, type: 'Dr' }]);
  };

  const removeLedgerRow = (index: number) => {
    const updated = ledgerEntries.filter((_, idx) => idx !== index);
    setLedgerEntries(updated);
  };

  // Add Stock inventory rows
  const addInventoryRow = () => {
    setInventoryEntries([...inventoryEntries, {
      stockItemName: stockItems[0]?.name || '',
      godownName: godowns[0]?.name || 'Main Location',
      quantity: 1,
      rate: stockItems[0]?.openingRate || 100,
      amount: stockItems[0]?.openingRate || 100
    }]);
  };

  const handleInventoryChange = (index: number, key: keyof InventoryEntry, value: any) => {
    const updated = [...inventoryEntries];
    const entry = { ...updated[index], [key]: value };
    
    // Auto-calculate amount if quantity/rate changes
    if (key === 'quantity' || key === 'rate') {
      const q = key === 'quantity' ? Number(value) : Number(entry.quantity);
      const r = key === 'rate' ? Number(value) : Number(entry.rate);
      entry.amount = q * r;
    }

    updated[index] = entry;
    setInventoryEntries(updated);
  };

  const removeInventoryRow = (index: number) => {
    setInventoryEntries(inventoryEntries.filter((_, idx) => idx !== index));
  };

  // Inline Ledger Creator
  const handleCreateLedgerInline = () => {
    if (!newLedgerName) return;
    const ledger: Partial<Ledger> = {
      name: newLedgerName,
      groupName: newLedgerGroup,
      openingBalance: newLedgerOpeningBalance,
      balanceType: 'Dr',
      currentBalance: newLedgerOpeningBalance
    };

    // Post to parent
    onSaveVoucher(ledger as any); // Just simulate posting/creation
    setShowInlineLedger(false);
    setPartyLedgerName(newLedgerName);
    setNewLedgerName('');
  };

  // Submit and check ledger balancing
  const handleSubmit = async () => {
    setErrorMsg('');
    
    // Validations
    if (!partyLedgerName) {
      setErrorMsg('Party Ledger Name is required.');
      return;
    }

    const totalDebits = ledgerEntries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalCredits = ledgerEntries.filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    
    if (totalDebits === 0 && totalCredits === 0) {
      setErrorMsg('Voucher amount cannot be empty.');
      return;
    }

    // Contra check (must balance)
    if (Math.abs(totalDebits - totalCredits) > 1) {
      setErrorMsg(`Voucher out of balance! Debits: ₹${totalDebits} | Credits: ₹${totalCredits}. Debits must equal Credits.`);
      return;
    }

    setIsSaving(true);
    try {
      const voucherPayload: Partial<Voucher> = {
        voucherNumber,
        date,
        voucherType,
        referenceNo,
        partyLedgerName,
        narration,
        amount: totalDebits, // Debits sum
        ledgerEntries,
        inventoryEntries: inventoryEntries.length > 0 ? inventoryEntries : undefined,
        gstDetails: inventoryEntries.length > 0 ? {
          cgst: Math.round(inventoryEntries.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 0.09),
          sgst: Math.round(inventoryEntries.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 0.09),
          igst: 0,
          cess: 0,
          totalGst: Math.round(inventoryEntries.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 0.18),
        } : undefined,
        syncStatus: 'Pending'
      };

      if (voucherToEdit) {
        voucherPayload.id = voucherToEdit.id;
      }

      await onSaveVoucher(voucherPayload);
      onCancel();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving voucher.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate dynamic totals for the voucher body
  const debitTotal = ledgerEntries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const creditTotal = ledgerEntries.filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div id="voucher-entry-panel" className="flex-1 bg-[#E0E6E9] flex flex-col overflow-hidden text-[#1a1a1a] relative font-mono text-xs">
      
      {/* Upper header: Voucher Type and details */}
      <div className="bg-[#00426A] text-white py-1.5 px-4 flex justify-between items-center shadow-md border-b border-[#002D4E]">
        <div className="flex items-center space-x-6">
          <span className="text-sm font-bold tracking-wider text-white">
            {voucherToEdit ? 'ALTER' : 'CREATE'} VOUCHER: {voucherType.toUpperCase()}
          </span>
          <div className="flex items-center space-x-2 bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">
            <span className="text-[#F9A825] font-bold">F4 to F9</span>
            <span>Switch Voucher Type</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className="bg-[#F9A825] hover:bg-amber-500 text-black px-3 py-1 font-bold flex items-center space-x-1.5 shadow-sm rounded-sm border-0 cursor-pointer text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Accept (Ctrl+A)</span>
          </button>
          
          {voucherToEdit && onDeleteVoucher && (
            <button 
              onClick={() => onDeleteVoucher(voucherToEdit.id).then(onCancel)}
              className="bg-[#C62828] hover:bg-red-800 text-white px-3 py-1 font-bold flex items-center space-x-1.5 shadow-sm rounded-sm border-0 cursor-pointer text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button 
            onClick={onCancel} 
            className="bg-[#002D4E] hover:bg-[#00426A] text-white px-3 py-1 font-bold flex items-center space-x-1 shadow-sm rounded-sm border border-white/10 cursor-pointer text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Quit (Esc)</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-2.5 border border-red-300 rounded font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Tally Prime Style Voucher Form */}
          <div className="grid grid-cols-4 gap-4 bg-white p-4 border border-gray-300 shadow-sm">
            {/* Voucher No */}
            <div className="space-y-1">
              <label className="block text-gray-500 font-bold uppercase text-[10px]">Voucher No.</label>
              <input
                type="text"
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="w-full bg-[#fbfdfd] border border-gray-300 px-2 py-1 focus:outline-none focus:border-[#00426A] font-semibold"
                placeholder="e.g. Sales/001"
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="block text-gray-500 font-bold uppercase text-[10px]">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#fbfdfd] border border-gray-300 px-2 py-1 focus:outline-none focus:border-[#00426A] font-semibold"
              />
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <label className="block text-gray-500 font-bold uppercase text-[10px]">Ref / Invoice No.</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-[#fbfdfd] border border-gray-300 px-2 py-1 focus:outline-none focus:border-[#00426A]"
                placeholder="Reference Reference"
              />
            </div>

            {/* Party Ledger selection with autocomplete */}
            <div className="space-y-1">
              <label className="block text-gray-500 font-bold uppercase text-[10px] flex justify-between">
                <span>Party Ledger Account</span>
                <span className="text-[9px] text-[#00426A] lowercase">Alt+C to create inline</span>
              </label>
              <div className="relative">
                <select
                  value={partyLedgerName}
                  onChange={(e) => setPartyLedgerName(e.target.value)}
                  className="w-full bg-[#fbfdfd] border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-[#00426A] font-bold"
                >
                  <option value="">-- Select Party Ledger --</option>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name} ({l.groupName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Double Entry Rows Panel */}
          <div className="border border-gray-300 bg-white shadow-sm">
            <div className="bg-[#002D4E] text-[#F9A825] font-bold px-3 py-1 flex justify-between uppercase text-[10px] tracking-wide">
              <span>Account Particulars Allocation Ledger</span>
              <div className="flex space-x-4">
                <span>Debits (Dr)</span>
                <span className="mr-8">Credits (Cr)</span>
              </div>
            </div>

            <div className="divide-y divide-gray-200 p-2 space-y-2">
              {ledgerEntries.map((entry, index) => (
                <div key={index} className="flex items-center space-x-3 py-1">
                  {/* Dr/Cr choice */}
                  <select
                    value={entry.type}
                    onChange={(e) => handleLedgerEntryChange(index, 'type', e.target.value)}
                    className="bg-white border border-gray-300 px-1 py-0.5 font-bold focus:outline-none focus:border-[#00426A]"
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>

                  {/* Ledger search list */}
                  <div className="flex-1">
                    <select
                      value={entry.ledgerName}
                      onChange={(e) => handleLedgerEntryChange(index, 'ledgerName', e.target.value)}
                      className="w-full bg-white border border-gray-300 px-2 py-1 focus:outline-none focus:border-[#00426A]"
                    >
                      <option value="">-- Select Ledger Account --</option>
                      {ledgers.map((l) => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount entry */}
                  <div className="w-40 flex items-center space-x-2">
                    <span className="text-gray-400">₹</span>
                    <input
                      type="number"
                      value={entry.amount || ''}
                      onChange={(e) => handleLedgerEntryChange(index, 'amount', Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 px-2 py-0.5 text-right font-bold focus:outline-none focus:border-[#00426A]"
                      placeholder="Amount"
                    />
                  </div>

                  {/* Delete row */}
                  <button
                    type="button"
                    onClick={() => removeLedgerRow(index)}
                    className="text-red-600 hover:text-red-800 cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={addLedgerRow}
                  className="text-[#002D4E] hover:text-[#00426A] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Ledger Entry</span>
                </button>
                
                {(voucherType === 'Sales' || voucherType === 'Purchase') && (
                  <button
                    type="button"
                    onClick={recomputeGstAndTotals}
                    className="bg-[#002D4E] hover:bg-[#00426A] text-white font-bold px-3 py-1 rounded-sm cursor-pointer border border-white/10"
                  >
                    ⚡ Auto-Calculate GST and Totals
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Optional Inventory Allocation Block */}
          {(voucherType === 'Sales' || voucherType === 'Purchase') && (
            <div className="border border-gray-300 bg-white shadow-sm">
              <div className="bg-[#002D4E] text-white font-bold px-3 py-1 flex justify-between uppercase text-[10px] tracking-wide">
                <span>Inventory Allocations (Stock, Godowns, Batches, Units)</span>
              </div>

              <div className="p-3 space-y-2">
                {inventoryEntries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    {/* Item */}
                    <div className="col-span-4">
                      <label className="block text-[9px] text-gray-500 uppercase">Stock Item</label>
                      <select
                        value={entry.stockItemName}
                        onChange={(e) => handleInventoryChange(index, 'stockItemName', e.target.value)}
                        className="w-full bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-[#00426A]"
                      >
                        {stockItems.map((s) => (
                          <option key={s.id} value={s.name}>{s.name} (Unit: {s.unit})</option>
                        ))}
                      </select>
                    </div>

                    {/* Godown */}
                    <div className="col-span-2">
                      <label className="block text-[9px] text-gray-500 uppercase">Godown</label>
                      <select
                        value={entry.godownName}
                        onChange={(e) => handleInventoryChange(index, 'godownName', e.target.value)}
                        className="w-full bg-white border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-[#00426A]"
                      >
                        {godowns.map((g) => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <label className="block text-[9px] text-gray-500 uppercase">Qty</label>
                      <input
                        type="number"
                        value={entry.quantity || ''}
                        onChange={(e) => handleInventoryChange(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 px-2 py-1 text-xs text-right font-bold focus:outline-none focus:border-[#00426A]"
                        placeholder="Qty"
                      />
                    </div>

                    {/* Rate */}
                    <div className="col-span-2">
                      <label className="block text-[9px] text-gray-500 uppercase">Rate (₹)</label>
                      <input
                        type="number"
                        value={entry.rate || ''}
                        onChange={(e) => handleInventoryChange(index, 'rate', Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 px-2 py-1 text-xs text-right focus:outline-none focus:border-[#00426A]"
                        placeholder="Rate"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-1.5 text-right font-bold pr-2">
                      <label className="block text-[9px] text-gray-400 uppercase">Value</label>
                      <span className="block mt-1">₹{entry.amount || 0}</span>
                    </div>

                    {/* Delete item */}
                    <div className="col-span-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeInventoryRow(index)}
                        className="text-red-600 hover:text-red-800 pt-3 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addInventoryRow}
                  className="text-[#002D4E] hover:text-[#00426A] font-bold flex items-center space-x-1 mt-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Allocate Stock Item</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel - Narration & Dual balancing metrics */}
        <div className="mt-4 border-t border-gray-300 pt-4 flex justify-between items-end bg-[#E7F3FF] p-4 shadow-inner border">
          {/* Narration */}
          <div className="w-2/3 pr-8 space-y-1.5">
            <label className="block text-[10px] text-[#002D4E] font-bold uppercase">Narration</label>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={2}
              className="w-full bg-white border border-gray-300 p-2 focus:outline-none focus:border-[#00426A] text-xs resize-none"
              placeholder="Enter voucher explanation / cheque details..."
            />
          </div>

          {/* Double balancing results info */}
          <div className="w-1/3 border-l border-gray-300 pl-6 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500 uppercase font-bold text-[9px]">Total Debits:</span>
              <span className="font-bold text-[#002D4E]">₹{debitTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 uppercase font-bold text-[9px]">Total Credits:</span>
              <span className="font-bold text-[#002D4E]">₹{creditTotal}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-300 pt-1.5">
              <span className="text-gray-500 uppercase font-bold text-[9px]">Difference:</span>
              <span className={`font-bold ${Math.abs(debitTotal - creditTotal) > 1 ? 'text-red-600' : 'text-green-700'}`}>
                ₹{Math.abs(debitTotal - creditTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Popover Ledger Creator */}
      {showInlineLedger && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-[#002D4E] p-5 w-80 shadow-2xl space-y-4">
            <div className="bg-[#002D4E] text-[#F9A825] text-center font-bold py-1 text-xs uppercase -mx-5 -mt-5">
              Inline Ledger Creation
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-500 text-[10px] uppercase">Ledger Name</label>
                <input
                  type="text"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 bg-white focus:outline-none focus:border-[#00426A]"
                  placeholder="e.g. Ram Kumar & Co"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 text-[10px] uppercase">Group (Parent Under)</label>
                <select
                  value={newLedgerGroup}
                  onChange={(e) => setNewLedgerGroup(e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 bg-white focus:outline-none focus:border-[#00426A]"
                >
                  <option value="Sundry Debtors">Sundry Debtors (Current Assets)</option>
                  <option value="Sundry Creditors">Sundry Creditors (Current Liabilities)</option>
                  <option value="Indirect Expenses">Indirect Expenses (Expenses)</option>
                  <option value="Indirect Incomes">Indirect Incomes (Incomes)</option>
                  <option value="Duties & Taxes">Duties & Taxes (Liabilities)</option>
                  <option value="Bank Accounts">Bank Accounts (Current Assets)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-500 text-[10px] uppercase">Opening Balance (Dr)</label>
                <input
                  type="number"
                  value={newLedgerOpeningBalance || ''}
                  onChange={(e) => setNewLedgerOpeningBalance(Number(e.target.value))}
                  className="w-full border border-gray-300 px-2 py-1 bg-white text-right focus:outline-none focus:border-[#00426A]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInlineLedger(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold px-3 py-1 text-xs cursor-pointer rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateLedgerInline}
                className="bg-[#00426A] hover:bg-[#002D4E] text-white font-bold px-3 py-1 text-xs cursor-pointer rounded-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
