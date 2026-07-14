import { apiFetch } from '../mockApi';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogIn, User, Lock, Loader2, Moon, Sun, Shield } from 'lucide-react';
import React from 'react';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center relative overflow-hidden transition-colors duration-1000 px-4 py-8 sm:px-6 sm:py-12 bg-slate-100 dark:bg-[#0a0e1a]">

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-xl border transition-all bg-white/50 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/20 active:scale-95"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Aurora Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25], x: [0, 80, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[15%] -left-[10%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] lg:w-[650px] lg:h-[650px] bg-indigo-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 dark:opacity-40"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2], x: [0, -80, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[15%] -right-[10%] w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] lg:w-[550px] lg:h-[550px] bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-25 dark:opacity-35"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15], y: [0, -60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[250px] h-[250px] sm:w-[380px] sm:h-[380px] lg:w-[450px] lg:h-[450px] bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-20 dark:opacity-30"
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[400px] sm:max-w-[420px] p-7 sm:p-10 backdrop-blur-2xl border shadow-2xl rounded-3xl overflow-hidden transition-colors duration-1000 bg-white/60 dark:bg-white/[0.08] border-white/50 dark:border-white/[0.15] shadow-slate-200/50 dark:shadow-indigo-500/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br pointer-events-none from-white/40 to-white/10 dark:from-white/[0.08] dark:to-transparent" />

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg shadow-indigo-500/30">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Performance System
          </h1>
          <p className="font-medium mt-1.5 text-sm sm:text-base text-slate-500 dark:text-slate-300">
            Staff Evaluation Management
          </p>
          <p className="font-medium text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              User ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                className="block w-full pl-11 pr-4 py-3 sm:py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white/80 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="block w-full pl-11 pr-4 py-3 sm:py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white/80 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-semibold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 py-3 px-4 rounded-2xl"
            >
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3.5 sm:py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-indigo-500/25 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200/50 dark:border-white/[0.08] text-center relative z-10">
          <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500">
            Performance Appraisal System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
