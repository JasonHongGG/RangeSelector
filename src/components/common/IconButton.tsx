import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function IconButton({ className, active, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        "flex justify-center items-center w-8 h-8 rounded-md transition-all",
        active 
          ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" 
          : "hover:bg-white/10 text-white/70 hover:text-white hover:scale-105 active:scale-95",
        props.disabled && "opacity-20 cursor-not-allowed hover:bg-transparent hover:scale-100 active:scale-100",
        className
      )}
      {...props}
    />
  );
}
