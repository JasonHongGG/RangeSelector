import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  message: string;
  onDismiss: (id: string) => void;
}

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

export function NotificationItem({ id, type, message, onDismiss }: NotificationItemProps) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg animate-slide-up ${backgrounds[type]}`}
    >
      {icons[type]}
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {message}
      </span>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
