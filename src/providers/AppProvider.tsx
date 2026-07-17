import React from 'react';
import { NotificationProvider } from './NotificationProvider';
import { TooltipProvider } from './TooltipProvider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </NotificationProvider>
  );
}
