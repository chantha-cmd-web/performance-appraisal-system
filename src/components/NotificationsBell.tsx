import { apiFetch } from '../mockApi';
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  message: string;
  type: string;
  link: string;
}

export default function NotificationsBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          
          if (!hasShownToast && data.length > 0) {
            data.forEach((n: Notification) => {
              if (n.type === 'warning') toast.error(n.message, { icon: '⚠️' });
              else toast.success(n.message, { icon: '🔔' });
            });
            setHasShownToast(true);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [token, hasShownToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.06]"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[9px] font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-card-strong rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 z-50 overflow-hidden">
          <div className="p-4 border-b border-white/20 dark:border-white/[0.06] bg-white/30 dark:bg-white/[0.02]">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium text-sm">
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => {
                    navigate(n.link);
                    setIsOpen(false);
                  }}
                  className="p-4 border-b border-white/10 dark:border-white/[0.04] hover:bg-white/40 dark:hover:bg-white/[0.04] cursor-pointer transition-colors last:border-b-0"
                >
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
