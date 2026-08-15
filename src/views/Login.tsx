import { apiFetch } from '../mockApi';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogIn, User, Lock, Loader2, Moon, Sun, Shield, Eye, EyeOff } from 'lucide-react';
import React from 'react';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const cleanUserId = userId.trim().toLowerCase();
    const cleanPassword = password.trim();
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanUserId, password: cleanPassword }),
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
    <div className="min-h-dvh w-full flex flex-col relative overflow-y-auto py-8 px-4 xs:px-6 transition-colors duration-1000 bg-gradient-to-br from-indigo-100 via-sky-50 to-purple-200 dark:from-[#0a0e1a] dark:via-[#121a36] dark:to-[#2a1e54]">

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

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[450px] sm:max-w-[500px] my-auto mx-auto p-6 xs:p-8 sm:p-12 flex flex-col justify-center backdrop-blur-2xl border border-slate-200/50 dark:border-white/[0.15] shadow-xl xs:shadow-2xl rounded-2xl xs:rounded-3xl overflow-hidden transition-colors duration-1000 bg-white/95 dark:bg-[#0d1222] sm:bg-white/60 sm:dark:bg-white/[0.08] shadow-slate-200/50 dark:shadow-indigo-500/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br pointer-events-none from-white/40 to-white/10 dark:from-white/[0.08] dark:to-transparent" />

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 relative z-10">
          <div className="flex items-center justify-center mx-auto mb-5 max-w-[280px]">
            <img src="https://lh3.googleusercontent.com/d/1BedaCZHY2D8BflrgKy4-wDoTsTJ2eQ2F" alt="Western International School Logo" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
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
            <label className="block text-lg sm:text-xl font-black mb-3 text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              User ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <User className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="login-input block w-full pl-14 pr-14 py-5 sm:py-6 border-3 border-slate-700 dark:border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white dark:bg-[#161c2e] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xl sm:text-2xl font-black"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-lg sm:text-xl font-black mb-3 text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <Lock className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="login-input block w-full pl-14 pr-14 py-5 sm:py-6 border-3 border-slate-700 dark:border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white dark:bg-[#161c2e] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xl sm:text-2xl font-black"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-6 w-6" />
                ) : (
                  <Eye className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

           {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 text-base sm:text-lg font-extrabold bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 py-4 px-5 rounded-2xl"
            >
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 py-5 sm:py-6 px-6 border border-transparent rounded-2xl shadow-lg shadow-indigo-500/25 text-xl sm:text-2xl font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <LogIn className="w-6 h-6" />
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
