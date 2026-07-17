import React, { useEffect, useState } from 'react';
import { useUIStore } from '../store/useUIStore';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const { visible, content, x, y } = useUIStore((state) => state.tooltipContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted && !visible) return <>{children}</>;

  return (
    <>
      {children}
      <div
        className={`fixed z-[10000] pointer-events-none transition-opacity duration-200 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          left: x,
          top: y,
          transform: 'translate(-50%, 8px)' // Position below the cursor
        }}
      >
        <div className="bg-gray-900/90 dark:bg-black/90 backdrop-blur border border-white/10 text-white/90 text-xs px-2.5 py-1.5 rounded shadow-xl font-medium whitespace-nowrap">
          {content}
        </div>
      </div>
    </>
  );
}
