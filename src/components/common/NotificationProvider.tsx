import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 size={16} className="text-green-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  info: <Info size={16} className="text-blue-500" />,
  warning: <AlertTriangle size={16} className="text-yellow-500" />
};

const backgrounds = {
  success: 'bg-green-500/10 border-green-500/20',
  error: 'bg-red-500/10 border-red-500/20',
  info: 'bg-blue-500/10 border-blue-500/20',
  warning: 'bg-yellow-500/10 border-yellow-500/20'
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg animate-slide-up ${backgrounds[notif.type]}`}
          >
            {icons[notif.type]}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {notif.message}
            </span>
            <button
              onClick={() => removeNotification(notif.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
