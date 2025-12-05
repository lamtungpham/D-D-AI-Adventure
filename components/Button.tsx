
import React from 'react';
import { playSound } from '../services/audioFxService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  disableSound?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  disableSound = false,
  onClick,
  onMouseEnter,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-bold text-white transition-all duration-200 rounded-sm group focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-amber-700 hover:bg-amber-600 border-2 border-amber-900/50 shadow-[0_4px_0_rgb(67,20,7)] active:shadow-none active:translate-y-[4px]",
    secondary: "bg-stone-700 hover:bg-stone-600 border-2 border-stone-800 shadow-[0_4px_0_rgb(28,25,23)] active:shadow-none active:translate-y-[4px]",
    danger: "bg-red-800 hover:bg-red-700 border-2 border-red-950 shadow-[0_4px_0_rgb(69,10,10)] active:shadow-none active:translate-y-[4px]",
    ghost: "bg-transparent hover:bg-stone-800/20 border border-transparent hover:border-stone-600/50 text-stone-700 hover:text-stone-900",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && !disableSound) {
      playSound(variant === 'primary' ? 'confirm' : 'click');
    }
    if (onClick) onClick(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && !disableSound) {
      playSound('hover');
    }
    if (onMouseEnter) onMouseEnter(e);
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {/* Button texture overlay */}
      {variant !== 'ghost' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>}
      
      <span className="cinzel tracking-widest relative z-10 flex items-center gap-2">
        {isLoading && (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </span>
    </button>
  );
};
