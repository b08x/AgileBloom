import React from 'react';

interface SliderInputProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const SliderInput: React.FC<SliderInputProps> = ({ id, label, min, max, step, value, onChange, disabled }) => {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between items-center text-sm font-medium text-gray-300 mb-1">
        <span>{label}</span>
        <span className="text-purple-400 font-mono bg-gray-900/50 px-2 py-0.5 rounded">{value.toFixed(id === 'temperature' ? 2 : (step < 1 ? 2 : 0) )}</span>
      </label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};
