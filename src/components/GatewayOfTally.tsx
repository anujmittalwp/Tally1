import React, { useState, useEffect } from 'react';
import { Company, Voucher } from '../types';

interface GatewayOfTallyProps {
  activeCompany: Company | null;
  vouchers: Voucher[];
  onSelectOption: (option: string) => void;
}

export default function GatewayOfTally({ activeCompany, vouchers, onSelectOption }: GatewayOfTallyProps) {
  // Classic Tally Gateway Options with their hotkeys
  const menuItems = [
    { category: 'MASTERS', items: [
      { id: 'create_master', label: 'Create', keyChar: 'C', description: 'Create ledgers, stock items, groups' },
      { id: 'alter_master', label: 'Alter', keyChar: 'A', description: 'Modify existing ledgers or stock' },
      { id: 'chart_accounts', label: 'Chart of Accounts', keyChar: 'H', description: 'View full ledger structure' },
    ]},
    { category: 'TRANSACTIONS', items: [
      { id: 'voucher_entry', label: 'Vouchers', keyChar: 'V', description: 'Enter financial transactions' },
      { id: 'day_book', label: 'Day Book', keyChar: 'D', description: 'View list of daily transactions' },
    ]},
    { category: 'UTILITIES', items: [
      { id: 'sync_panel', label: 'Sync Status (Desktop Sync)', keyChar: 'S', description: 'Two-way Desktop XML Synchronizer' },
      { id: 'ai_dashboard', label: 'AI Voice/Text Assistant', keyChar: 'X', description: 'Generate vouchers and ask reports with Gemini AI' },
    ]},
    { category: 'REPORTS', items: [
      { id: 'balance_sheet', label: 'Balance Sheet', keyChar: 'B', description: 'Statement of Liabilities & Assets' },
      { id: 'profit_loss', label: 'Profit & Loss A/c', keyChar: 'P', description: 'Operational Profit/Loss performance' },
      { id: 'stock_summary', label: 'Stock Summary', keyChar: 'I', description: 'Real-time inventory levels' },
      { id: 'ratio_analysis', label: 'Ratio Analysis', keyChar: 'R', description: 'Financial metric ratios' },
      { id: 'activity_logs', label: 'Audit / Activity Logs', keyChar: 'L', description: 'Secure compliance audit trail' },
    ]}
  ];

  // Flatten menu for keyboard selection
  const flatMenu = menuItems.flatMap(cat => cat.items);
  const [selectedIndex, setSelectedIndex] = useState(3); // Start highlighted on 'Vouchers'!

  // Listen to keyboard inputs on this menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatMenu.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatMenu.length) % flatMenu.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelectOption(flatMenu[selectedIndex].id);
      } else {
        // Hotkey selection
        const char = e.key.toUpperCase();
        const matched = flatMenu.find(item => item.keyChar === char);
        if (matched) {
          e.preventDefault();
          onSelectOption(matched.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, flatMenu]);

  // Find date of last entry
  const lastEntryDate = vouchers.length > 0 
    ? vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
    : "No Entries";

  return (
    <div id="gateway-of-tally" className="flex-1 bg-[#E0E6E9] flex p-4 text-[#1a1a1a] overflow-y-auto gap-4">
      {/* Left Column: Current Status info panel */}
      <div className="w-1/2 border border-gray-300 bg-white p-4 flex flex-col justify-between font-mono text-xs shadow-sm">
        <div>
          <div className="flex justify-between border-b border-gray-200 pb-1 font-bold text-[#002D4E]">
            <span>CURRENT PERIOD</span>
            <span>CURRENT DATE</span>
          </div>
          <div className="flex justify-between pt-1 font-semibold text-sm text-slate-800">
            <span>01-Apr-2026 to 31-Mar-2027</span>
            <span>07-Jul-2026</span>
          </div>

          <div className="mt-8">
            <div className="font-bold text-[#002D4E] border-b border-gray-200 pb-1">
              LIST OF SELECTED COMPANIES
            </div>
            {activeCompany ? (
              <div className="flex justify-between items-start pt-2 text-sm">
                <span className="font-bold text-[#002D4E]">{activeCompany.name}</span>
                <span className="text-right">
                  <span className="block text-[10px] text-gray-500 uppercase">Last Entry Date</span>
                  <span className="font-semibold text-gray-700">{lastEntryDate}</span>
                </span>
              </div>
            ) : (
              <div className="text-gray-500 pt-2 italic">No Company Selected. Press F1 to Select.</div>
            )}
          </div>
        </div>

        {/* Sync Indicator Info */}
        <div className="mt-6 border-t border-gray-200 pt-3 text-[11px] text-[#002D4E] leading-relaxed">
          <p className="font-bold text-slate-800">🖥️ Two-Way Real-time Desktop Sync:</p>
          <p className="text-gray-600 mt-1">
            Connected to Tally Prime Desktop SOAP gateway. Use <strong className="text-[#C62828] font-mono">Alt+S</strong> or select <strong className="font-bold text-[#002D4E]">Sync Status</strong> to inspect transaction sync queues.
          </p>
        </div>
      </div>

      {/* Right Column: Gateway of Tally Menu Box */}
      <div className="w-1/2 flex justify-center items-start pl-8 pt-4">
        <div className="w-[340px] border border-gray-300 bg-white shadow-sm flex flex-col">
          {/* Header */}
          <div className="bg-[#E7F3FF] border-b border-gray-300 text-[#002D4E] text-center font-bold py-1.5 text-xs uppercase tracking-tight">
            Gateway of Tally
          </div>

          {/* Body items */}
          <div className="p-3">
            {menuItems.map((categoryObj, catIdx) => (
              <div key={categoryObj.category} className="mb-3 last:mb-1">
                {/* Section Title */}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 mb-1.5">
                  {categoryObj.category}
                </div>

                {/* Items */}
                <div className="space-y-0.5">
                  {categoryObj.items.map((item) => {
                    // Find actual flat index
                    const flatIdx = flatMenu.findIndex(i => i.id === item.id);
                    const isSelected = flatIdx === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectOption(item.id)}
                        className={`px-3 py-1 flex justify-between items-center cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#F9A825]/30 border-l-4 border-[#F9A825] font-bold shadow-xs' 
                            : 'hover:bg-[#F9A825]/15'
                        }`}
                      >
                        <div className="text-xs font-mono">
                          {/* Highlight the hotkey letter in Tally Red */}
                          {item.label.split('').map((char, charIdx) => {
                            const isHotkey = char.toUpperCase() === item.keyChar && item.label.toUpperCase().indexOf(item.keyChar) === charIdx;
                            return (
                              <span
                                key={charIdx}
                                className={isHotkey ? 'text-[#C62828] font-bold underline decoration-2' : 'text-[#1a1a1a]'}
                              >
                                {char}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-gray-500 font-sans italic max-w-[150px] truncate">
                          {item.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Hint footer */}
          <div className="bg-[#E7F3FF]/40 text-[10px] py-1.5 text-center border-t border-gray-200 text-slate-500 font-sans font-medium">
            Use <strong className="text-[#002D4E]">↑ ↓ Arrows</strong> to navigate, <strong className="text-[#002D4E]">Enter</strong> to select
          </div>
        </div>
      </div>
    </div>
  );
}
