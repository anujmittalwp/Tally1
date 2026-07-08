import React, { useState } from 'react';
import { Company, User } from '../types';
import { Search, HelpCircle, Settings, LogIn, LogOut, ArrowRight, Shield } from 'lucide-react';

interface HeaderProps {
  activeCompany: Company | null;
  activePeriod: { from: string; to: string };
  user: User | null;
  onSelectPeriod: () => void;
  onOpenGoTo: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export default function Header({
  activeCompany,
  activePeriod,
  user,
  onSelectPeriod,
  onOpenGoTo,
  onLogout,
  onOpenLogin
}: HeaderProps) {
  return (
    <header id="tally-header" className="bg-[#00426A] text-white text-xs select-none shadow-md">
      {/* Top Utility Bar */}
      <div className="flex justify-between items-center px-3 h-8 border-b border-[#002D4E]">
        {/* Left Tally Brand logo */}
        <div className="flex items-center space-x-3">
          <span className="font-bold tracking-wider text-[#F9A825] uppercase">TallyPrime</span>
          <span className="bg-[#F9A825] text-black px-1.5 py-0.5 rounded text-[9px] font-bold">GOLD</span>
          {activeCompany && (
            <span className="text-white/80 font-medium border-l border-white/20 pl-3 ml-3 text-[11px]">
              {activeCompany.name}
            </span>
          )}
        </div>

        {/* Center Alt+G GO TO Button */}
        <div className="flex items-center space-x-2">
          <button 
            id="btn-goto"
            onClick={onOpenGoTo}
            className="bg-[#F9A825] hover:bg-amber-500 text-black px-3 py-0.5 rounded font-bold flex items-center space-x-1.5 cursor-pointer transition-colors text-[11px]"
          >
            <span className="text-[9px] text-black/70 font-mono bg-white/20 px-1 rounded">Alt+G</span>
            <span>Go To</span>
            <Search className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* Right Help / User Area */}
        <div className="flex items-center space-x-4 font-mono">
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5 bg-white/10 px-2 py-0.5 rounded text-white/90">
                <Shield className="w-3 h-3 text-[#F9A825]" />
                <span className="capitalize font-sans text-[10px]">{user.role} ({user.username})</span>
              </span>
              <button 
                id="btn-logout"
                onClick={onLogout}
                className="hover:text-[#F9A825] font-sans font-medium flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Quit</span>
              </button>
            </div>
          ) : (
            <button 
              id="btn-login"
              onClick={onOpenLogin}
              className="text-[#F9A825] hover:text-white font-sans font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <LogIn className="w-3 h-3" />
              <span>Login / Alt+L</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb / Action Row */}
      <div className="bg-[#002D4E] text-[11px] px-3 h-7 flex justify-between items-center text-white/90 font-sans border-b border-white/10">
        <div className="flex items-center space-x-1.5">
          <span className="opacity-75">Gateway of Tally</span>
          {activeCompany && (
            <>
              <ArrowRight className="w-3 h-3 text-white/40" />
              <span className="text-white font-medium">{activeCompany.name}</span>
            </>
          )}
        </div>

        {/* Period selection */}
        <div 
          onClick={onSelectPeriod} 
          className="flex items-center space-x-2 cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded transition-all"
        >
          <span className="text-[9px] bg-[#F9A825] text-black px-1 font-mono rounded font-bold">Alt+F2</span>
          <span className="text-white font-mono text-[11px]">Period: {activePeriod.from} to {activePeriod.to}</span>
        </div>
      </div>
    </header>
  );
}
