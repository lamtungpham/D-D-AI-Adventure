import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  label: string;
  colorClass: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, label, colorClass }) => {
  const percentage = Math.min(Math.max((current / max) * 100, 0), 100);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 cinzel">{label}</span>
        <span className="text-[10px] font-bold text-amber-100 font-mono">{current}/{max}</span>
      </div>
      {/* RPG Style Bar Container */}
      <div className="w-full h-3 bg-stone-900 border border-stone-600 rounded-sm relative shadow-inner">
        {/* Background texture for empty part */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50"></div>
        
        <div 
          className={`h-full relative transition-all duration-700 ease-out ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40"></div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/30"></div>
        </div>
        
        {/* Border Overlay for that metallic look */}
        <div className="absolute inset-0 border border-white/10 rounded-sm pointer-events-none"></div>
      </div>
    </div>
  );
};