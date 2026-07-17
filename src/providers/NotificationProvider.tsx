import React from 'react';
import { useUIStore } from '../store/useUIStore';
import { NotificationItem, NotificationType } from '../components/common/NotificationItem';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            id={notif.id}
            type={notif.type as NotificationType}
            message={notif.message}
            onDismiss={removeNotification}
          />
        ))}
      </div>
    </>
  );
}
