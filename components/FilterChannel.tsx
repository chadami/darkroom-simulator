import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface FilterChannelProps {
  label: string;
  colorClass: string;
  bgClass: string;
  trackClass: string;
  value: number;
  onChange: (val: number) => void;
  isLocked?: boolean;
}

export const FilterChannel: React.FC<FilterChannelProps> = ({
  label,
  colorClass,
  bgClass,
  trackClass,
  value,
  onChange,
  isLocked = false,
}) => {
  const handleIncrement = () => !isLocked && onChange(value + 1);
  const handleDecrement = () => !isLocked && onChange(value - 1);
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLocked) onChange(Number(e.target.value));
  };

  return (
    <div className={`p-4 rounded-xl ${bgClass} border border-white/5`}>
      <div className="flex justify-between items-center mb-2">
        <label className={`font-bold text-lg ${colorClass}`}>{label}</label>
        <span className="font-mono text-2xl text-white font-medium">{value}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={handleDecrement}
          disabled={isLocked}
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white disabled:opacity-30 transition-colors"
        >
          <Minus size={16} />
        </button>
        
        <input
          type="range"
          min="0"
          max="200"
          step="0.5"
          value={value}
          onChange={handleSliderChange}
          disabled={isLocked}
          className={`flex-1 h-3 rounded-lg appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full ${trackClass} [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white`}
        />

        <button
          onClick={handleIncrement}
          disabled={isLocked}
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white disabled:opacity-30 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
