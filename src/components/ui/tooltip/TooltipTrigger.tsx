import React, { useRef, ReactNode, cloneElement } from 'react';
import { useUIStore } from '../../../store/useUIStore';

interface TooltipTriggerProps {
  content: ReactNode;
  children: React.ReactElement<any>;
  delay?: number;
}

export function TooltipTrigger({ content, children, delay = 300 }: TooltipTriggerProps) {
  const { setTooltip, hideTooltip } = useUIStore();
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom;

    timerRef.current = window.setTimeout(() => {
      setTooltip(content, x, y);
    }, delay);

    if (children.props.onMouseEnter) {
      children.props.onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    hideTooltip();
    
    if (children.props.onMouseLeave) {
      children.props.onMouseLeave(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     if (timerRef.current) {
       clearTimeout(timerRef.current);
     }
     hideTooltip();
     if (children.props.onMouseDown) {
       children.props.onMouseDown(e);
     }
  };

  return cloneElement(children, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
  });
}
