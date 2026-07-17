import { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: string | number;
  max?: string | number;
}

export function Slider({ className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      className={cn(
        "w-full appearance-none bg-transparent cursor-pointer outline-none group",
        /* Track Styles */
        "[&::-webkit-slider-runnable-track]:h-1",
        "[&::-webkit-slider-runnable-track]:bg-black/10 dark:[&::-webkit-slider-runnable-track]:bg-white/15",
        "[&::-webkit-slider-runnable-track]:rounded-full",
        "[&::-webkit-slider-runnable-track]:transition-colors",
        "hover:[&::-webkit-slider-runnable-track]:bg-black/20 dark:hover:[&::-webkit-slider-runnable-track]:bg-white/25",
        
        /* Thumb Styles */
        "[&::-webkit-slider-thumb]:appearance-none",
        "[&::-webkit-slider-thumb]:-mt-1.5",
        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
        "[&::-webkit-slider-thumb]:rounded-full",
        "[&::-webkit-slider-thumb]:bg-gray-800 dark:[&::-webkit-slider-thumb]:bg-gray-200",
        "[&::-webkit-slider-thumb]:shadow-sm",
        "[&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200",
        "hover:[&::-webkit-slider-thumb]:scale-125 hover:[&::-webkit-slider-thumb]:shadow-md",
        "active:[&::-webkit-slider-thumb]:scale-90",
        className
      )}
      {...props}
    />
  );
}
