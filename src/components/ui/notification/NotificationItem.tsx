import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  id: string;
  type: NotificationType;
  message: string;
  onDismiss: (id: string) => void;
  duration?: number;
}

const typeConfig = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-red-400" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-400" />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
};

export function NotificationItem({ id, type, message, onDismiss, duration = 3000 }: NotificationProps) {
  const [isClosing, setIsClosing] = useState(false);
  const config = typeConfig[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto
        ${config.bg} ${config.border} bg-gray-900/80
        transition-all duration-300 ease-in-out origin-right
        ${isClosing ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100 translate-x-0 animate-slide-in-right'}
      `}
    >
      <div className="shrink-0">{config.icon}</div>
      <p className="text-sm font-medium text-white/90 leading-tight pt-0.5">{message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
