import React from 'react';

interface SidebarKeysProps {
  activeScreen: string;
  voucherType?: string;
  onKeyClick: (key: string) => void;
}

export default function SidebarKeys({ activeScreen, voucherType, onKeyClick }: SidebarKeysProps) {
  // Classic Tally Sidebar lists
  const defaultKeys = [
    { key: 'F1', label: 'Select Comp', sub: 'Company selection' },
    { key: 'F2', label: 'Date', sub: 'Change date' },
    { key: 'Alt+F2', label: 'Period', sub: 'Change active period' },
    { key: 'F3', label: 'Company', sub: 'Company config' },
    { key: 'Alt+C', label: 'Create Ledg', sub: 'Inline creation' },
    { key: 'Alt+G', label: 'Go To', sub: 'Search anywhere' },
    { key: 'Alt+S', label: 'Sync Status', sub: 'Sync gateway' },
    { key: 'Alt+A', label: 'AI Dash', sub: 'Vocal entry' },
    { key: 'F11', label: 'Features', sub: 'ERP configuration' },
    { key: 'F12', label: 'Configure', sub: 'Preferences' },
  ];

  const voucherKeys = [
    { key: 'F2', label: 'Date', sub: 'Change Date' },
    { key: 'F4', label: 'Contra', sub: 'Contra Voucher', active: voucherType === 'Contra' },
    { key: 'F5', label: 'Payment', sub: 'Payment Voucher', active: voucherType === 'Payment' },
    { key: 'F6', label: 'Receipt', sub: 'Receipt Voucher', active: voucherType === 'Receipt' },
    { key: 'F7', label: 'Journal', sub: 'Journal Voucher', active: voucherType === 'Journal' },
    { key: 'F8', label: 'Sales', sub: 'Sales Voucher', active: voucherType === 'Sales' },
    { key: 'F9', label: 'Purchase', sub: 'Purchase Voucher', active: voucherType === 'Purchase' },
    { key: 'Alt+C', label: 'Create Ledg', sub: 'Inline Master' },
    { key: 'Ctrl+A', label: 'Accept', sub: 'Save/Post Voucher' },
    { key: 'Esc', label: 'Cancel', sub: 'Quit Screen' },
  ];

  const keys = activeScreen === 'voucher_entry' ? voucherKeys : defaultKeys;

  return (
    <aside id="tally-sidebar" className="w-32 bg-[#BFD0D9] border-l border-gray-300 text-slate-800 flex flex-col select-none text-[10px] font-mono h-full p-1.5 gap-1.5 overflow-y-auto">
      {keys.map((item: any) => (
        <button
          key={item.key}
          id={`sidebar-key-${item.key.replace('+', '-')}`}
          onClick={() => onKeyClick(item.key)}
          className={`flex flex-col text-left px-2 py-1.5 rounded transition-all cursor-pointer h-[46px] justify-center ${
            item.active 
              ? 'bg-[#F9A825] text-black border-l-4 border-[#002D4E] font-bold shadow-sm' 
              : 'bg-white/45 hover:bg-white/70 active:bg-white/90 text-slate-950 border border-slate-300/30'
          }`}
        >
          <span className={`font-bold text-[10px] leading-tight flex items-center justify-between ${item.active ? 'text-black' : 'text-[#002D4E]'}`}>
            {item.key}
            {item.active && <span className="w-1.5 h-1.5 rounded-full bg-black block animate-pulse"></span>}
          </span>
          <span className={`text-[9px] mt-0.5 truncate uppercase font-sans font-medium ${item.active ? 'text-black/80' : 'text-slate-600'}`}>
            {item.label}
          </span>
        </button>
      ))}
      {/* Footer spacer */}
      <div className="flex-1 min-h-[20px]"></div>
    </aside>
  );
}
