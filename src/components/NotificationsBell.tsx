import { apiFetch } from '../mockApi';
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../types';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../utils/notifications';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function NotificationsBell() {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const myNotifications = user ? notifications.filter(n => n.userId === user.id) : [];
  const unreadCount = myNotifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!token) return;

    const loadNotifications = async () => {
      const data = await fetchNotifications(token);
      setNotifications(data);

      if (!hasShownToast && user) {
        const myUnread = data.filter((n: AppNotification) => n.userId === user.id && !n.read);
        if (myUnread.length > 0) {
          myUnread.slice(0, 3).forEach((n: AppNotification) => {
            if (n.type === 'warning') toast.error(n.message, { icon: '⚠️', duration: 5000 });
            else if (n.type === 'action_required') toast(n.message, { icon: '📋', duration: 6000 });
            else toast.success(n.message, { icon: '🔔', duration: 4000 });
          });
          setHasShownToast(true);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, user, hasShownToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (n: AppNotification) => {
    if (!token) return;
    await markNotificationRead(token, n.id);
    setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
  };

  const handleMarkAllRead = async () => {
    if (!token || !user) return;
    await markAllNotificationsRead(token, user.id);
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkRead(n);
    navigate(n.link);
    setIsOpen(false);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'action_required': return '📋';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.06]"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[9px] font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 glass-card-strong rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 z-50 overflow-hidden">
          <div className="p-4 border-b border-white/20 dark:border-white/[0.06] bg-white/30 dark:bg-white/[0.02] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
              {unreadCount > 0 && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{unreadCount} unread</p>}
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                <CheckCheck size={12} /> Read all
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {myNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium text-sm">
                No notifications yet
              </div>
            ) : (
              myNotifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-4 border-b border-white/10 dark:border-white/[0.04] cursor-pointer transition-colors last:border-b-0",
                    n.read
                      ? "hover:bg-white/20 dark:hover:bg-white/[0.03]"
                      : "bg-indigo-50/40 dark:bg-indigo-500/5 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/8"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 shrink-0">{getNotifIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", n.read ? "text-slate-600 dark:text-slate-400" : "font-semibold text-slate-800 dark:text-slate-200")}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
