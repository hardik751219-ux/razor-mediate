import React from 'react';

interface HeaderProps {
  activeTab: 'studio' | 'benchmark' | 'audit';
  setActiveTab: (tab: 'studio' | 'benchmark' | 'audit') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-[#162238] bg-[#070D18] sticky top-0 z-40 px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand with rounded 'R' logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base leading-none">R</span>
          </div>
          <h1 className="text-base font-bold text-white tracking-tight">
            RazorMediate
          </h1>
        </div>

        {/* Center: Navigation Tabs in a centered row */}
        <div className="flex items-center gap-8 text-xs font-medium">
          <button
            onClick={() => setActiveTab('studio')}
            className={`pb-1 transition-colors relative ${
              activeTab === 'studio'
                ? 'text-white font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-500 after:rounded-full'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Mediation Desk
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`pb-1 transition-colors relative ${
              activeTab === 'benchmark'
                ? 'text-white font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-500 after:rounded-full'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            100-Batch Benchmark
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-1 transition-colors relative ${
              activeTab === 'audit'
                ? 'text-white font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-500 after:rounded-full'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Ledger
          </button>
        </div>

        {/* Right: Razorpay Test Mode with green dot */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-medium text-emerald-400">
            Razorpay Test Mode
          </span>
        </div>
      </div>
    </header>
  );
};
