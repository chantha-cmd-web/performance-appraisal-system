import { apiFetch } from '../mockApi';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Evaluation, STATUS_LABELS } from '../types';
import {
  Users, TrendingUp, Award, AlertTriangle, FileSpreadsheet, Download,
  BarChart2, Search, RefreshCw, Filter, Upload, Send, Trash2, ArrowUpDown,
  ChevronLeft, ChevronRight, ClipboardList, Plus, Eye, Pencil, Trash,
  ArrowUp, ArrowDown, ChevronsUpDown, FileText, X, RotateCcw, FileDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import * as xlsx from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  filterEvaluationsByRole, canSeeEvaluatorColumn, canEditEvaluation,
  canDeleteEvaluation, canEvaluate
} from '../utils/rbac';
import { motion, AnimatePresence } from 'motion/react';

type SortKey = 'employeeName' | 'employeeId' | 'campus' | 'position' | 'totalSelf' | 'totalSuper' | 'overallScore' | 'status' | 'createdByName' | 'reviewDate';
type SortDir = 'asc' | 'desc';

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return count;
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', khLabel: 'ល្អប្រសើរបំផុត', bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' };
  if (score >= 90) return { label: 'Excellent', khLabel: 'ល្អ', bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' };
  if (score >= 70) return { label: 'Very Good', khLabel: 'ល្អបង្គួរ', bg: 'bg-indigo-50 dark:bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/30' };
  if (score >= 60) return { label: 'Good', khLabel: 'មធ្យម', bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' };
  return { label: 'Needs Improvement', khLabel: 'ត្រូវកែលម្អ', bg: 'bg-red-50 dark:bg-red-500/15', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/30' };
}

const PAGE_SIZE = 12;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [sortKey, setSortKey] = useState<SortKey>('employeeName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchEvals(); }, []);

  const fetchEvals = async () => {
    try {
      const res = await apiFetch('/api/evaluations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEvals(filterEvaluationsByRole(data, user));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvals();
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredEvals = useMemo(() => {
    return evals.filter(e => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        (e.position && e.position.toLowerCase().includes(q)) ||
        (e.campus && e.campus.toLowerCase().includes(q));
      const matchesCampus = filterCampus ? e.campus === filterCampus : true;
      const matchesPeriod = filterPeriod ? e.reviewDate.startsWith(filterPeriod) : true;
      return matchesSearch && matchesCampus && matchesPeriod;
    });
  }, [evals, searchQuery, filterCampus, filterPeriod]);

  const sortedEvals = useMemo(() => {
    const sorted = [...filteredEvals];
    sorted.sort((a, b) => {
      let aVal = a[sortKey] as any;
      let bVal = b[sortKey] as any;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredEvals, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedEvals.length / PAGE_SIZE));
  const paginatedEvals = sortedEvals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const campuses = useMemo(() => Array.from(new Set(evals.map(e => e.campus))), [evals]);
  const periods = useMemo(() => Array.from(new Set(evals.map(e => e.reviewDate.substring(0, 7)))), [evals]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCampus('');
    setFilterPeriod('');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    const exportData = filteredEvals.map(e => {
      const rating = getRating(e.overallScore);
      const statusLabel = e.status ? (STATUS_LABELS[e.status]?.kh || e.status) : 'ព្រាង';
      return {
        'Employee ID': e.employeeId,
        'Employee Name': e.employeeName,
        'Campus': e.campus,
        'Position': e.position,
        'Type': e.evaluationType,
        'Date': e.reviewDate,
        'Self Score': e.totalSelf,
        'Supervisor Score': e.totalSuper,
        'Overall Score': e.overallScore.toFixed(1),
        'Rating': `${rating.khLabel} (${rating.label})`,
        'Status': statusLabel,
        'Evaluator': e.createdByName,
        'Created': e.createdAt ? format(new Date(e.createdAt), 'yyyy-MM-dd HH:mm') : ''
      };
    });
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Evaluations');
    ws['!cols'] = Object.keys(exportData[0] || {}).map(k => ({ wch: Math.max(k.length, 18) }));
    xlsx.writeFile(wb, `Appraisal_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEvals, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Appraisal_Report_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) document.documentElement.classList.remove('dark');
    setTimeout(() => {
      window.print();
      if (isDark) document.documentElement.classList.add('dark');
    }, 100);
  };

  const handleBulkTelegram = () => {
    alert('Bulk Telegram notification feature - Coming soon!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          for (const ev of data) {
            await apiFetch('/api/evaluations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(ev)
            });
          }
          fetchEvals();
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    input.click();
  };

  const avgScore = evals.length ? (evals.reduce((s, e) => s + e.overallScore, 0) / evals.length) : 0;
  const topScore = evals.length ? Math.max(...evals.map(e => e.overallScore)) : 0;
  const needsImprovement = evals.filter(e => e.overallScore < 70).length;
  const completedCount = evals.filter(e => e.status === 'Completed' || e.status === 'Approved').length;

  const hasActiveFilters = searchQuery || filterCampus || filterPeriod;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Aurora Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">របាយការណ៍វាយតម្លៃបុគ្គលិកប្រចាំឆ្នាំ</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Annual Performance Evaluations</h2>
        <p className="text-sm text-slate-500">ថ្ងៃទីបញ្ចេញរបាយការណ៍ / Generated on: {format(new Date(), 'dd MMM yyyy, h:mm a')}</p>
      </div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-2 mb-6 print:hidden"
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300",
            activeTab === 'overview'
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
              : "glass-card text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10"
          )}
        >
          <FileSpreadsheet size={18} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300",
            activeTab === 'analytics'
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
              : "glass-card text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10"
          )}
        >
          <BarChart2 size={18} />
          Analytics
        </button>
      </motion.div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 print:hidden"
          >
            <StatCard
              title="Total Staff"
              subtitle="សរុបបុគ្គលិក"
              value={evals.length}
              icon={<Users size={24} />}
              color="blue"
              description="Employees evaluated"
              delay={0}
            />
            <StatCard
              title="Average Score"
              subtitle="ពិន្ទុមធ្យម"
              value={avgScore}
              icon={<TrendingUp size={24} />}
              color="indigo"
              description="Overall performance"
              decimals={1}
              delay={0.1}
            />
            <StatCard
              title="Top Performer"
              subtitle="លទ្ធផលខ្ពស់បំផុត"
              value={topScore}
              icon={<Award size={24} />}
              color="emerald"
              description="Highest achievement"
              decimals={1}
              delay={0.2}
            />
            <StatCard
              title="Needs Improvement"
              subtitle="ត្រូវកែលម្អ"
              value={needsImprovement}
              icon={<AlertTriangle size={24} />}
              color="amber"
              description="Below expectations"
              delay={0.3}
            />
          </motion.div>

          {/* Pending Reviews Banner */}
          {(() => {
            const pendingReviews = evals.filter(ev =>
              canEvaluate(ev, user) && ev.status !== 'Completed' && ev.status !== 'Approved'
            );
            if (pendingReviews.length === 0) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mb-6"
              >
                <div className="rounded-3xl p-5 sm:p-6 border-l-4 border-indigo-500 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-500/10 dark:to-purple-500/5 dark:border-indigo-400">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                        {pendingReviews.length} Evaluation{pendingReviews.length > 1 ? 's' : ''} Pending Your Review
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        {user?.role === 'supervisor'
                          ? 'Employees are waiting for your supervisor evaluation.'
                          : 'Evaluations are waiting for your supporter review.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pendingReviews.slice(0, 5).map(ev => (
                          <button
                            key={ev.id}
                            onClick={() => navigate(`/evaluation?id=${ev.id}`)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-white/[0.06] border border-indigo-200/50 dark:border-indigo-400/20 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-all active:scale-95"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            {ev.employeeName}
                          </button>
                        ))}
                        {pendingReviews.length > 5 && (
                          <span className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-500">
                            +{pendingReviews.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Reports Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="glass-card-strong rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden print:border-none print:shadow-none"
          >
            {/* Container Header */}
            <div className="p-6 border-b border-white/20 dark:border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Evaluation Reports</h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">របាយការណ៍វាយតម្លៃបុគ្គលិក • {filteredEvals.length} records</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <ToolbarBtn icon={<FileDown size={16} />} label="JSON" onClick={handleExportJSON} variant="slate" />
                  <ToolbarBtn icon={<Download size={16} />} label="Excel" onClick={handleExportExcel} variant="emerald" />
                  <ToolbarBtn icon={<FileDown size={16} />} label="PDF" onClick={handlePrint} variant="indigo" />
                  <ToolbarBtn icon={<Upload size={16} />} label="Import" onClick={handleImport} variant="blue" />
                  <ToolbarBtn icon={<Send size={16} />} label="Telegram" onClick={handleBulkTelegram} variant="purple" />
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
                  <ToolbarBtn icon={<RefreshCw size={16} />} label="Refresh" onClick={handleRefresh} variant="slate" spinning={refreshing} />
                  <ToolbarBtn icon={<Trash2 size={16} />} label="Clear" onClick={clearFilters} variant="rose" disabled={!hasActiveFilters} />
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 print:hidden">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-1 min-w-0">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name, Staff ID, Position or Campus..."
                    className="w-full pl-11 pr-4 py-3 glass-input rounded-2xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className="pl-9 pr-8 py-3 glass-input rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer min-w-[140px]"
                      value={filterCampus}
                      onChange={(e) => { setFilterCampus(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">All Campuses</option>
                      {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <select
                    className="px-4 py-3 glass-input rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer min-w-[130px]"
                    value={filterPeriod}
                    onChange={(e) => { setFilterPeriod(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">All Periods</option>
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700/80">
                    <SortableHeader label="Employee" sublabel="បុគ្គលិក" sortKey="employeeName" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Staff ID" sublabel="លេខសម្គាល់" sortKey="employeeId" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="px-5 py-4">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Campus</span>
                      <br /><span className="text-[10px] font-normal text-slate-400">សាខា</span>
                    </th>
                    <SortableHeader label="Position" sublabel="តួនាទី" sortKey="position" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Self" sublabel="ខ្លួនឯង" sortKey="totalSelf" currentSort={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                    <SortableHeader label="Supervisor" sublabel="អ្នកគ្រប់គ្រង" sortKey="totalSuper" currentSort={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                    <SortableHeader label="Overall" sublabel="ពិន្ទុសរុប" sortKey="overallScore" currentSort={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                    <th className="px-5 py-4 text-center">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Rating</span>
                      <br /><span className="text-[10px] font-normal text-slate-400">ចំណាត់ថ្នាក់</span>
                    </th>
                    <SortableHeader label="Status" sublabel="ស្ថានភាព" sortKey="status" currentSort={sortKey} dir={sortDir} onSort={handleSort} align="center" />
                    {canSeeEvaluatorColumn(user) && (
                      <SortableHeader label="Evaluator" sublabel="អ្នកវាយតម្លៃ" sortKey="createdByName" currentSort={sortKey} dir={sortDir} onSort={handleSort} />
                    )}
                    <th className="px-5 py-4 text-right print:hidden">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</span>
                      <br /><span className="text-[10px] font-normal text-slate-400">សកម្មភាព</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={canSeeEvaluatorColumn(user) ? 11 : 10} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium text-slate-400">Loading evaluations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedEvals.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeEvaluatorColumn(user) ? 11 : 10} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <ClipboardList size={36} className="text-slate-300 dark:text-slate-600" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-600 dark:text-slate-300">No evaluation reports available</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">រកមិនឃើញទិន្នន័យវាយតម្លៃទេ។</p>
                          </div>
                          <button
                            onClick={() => navigate('/evaluation')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95"
                          >
                            <Plus size={16} />
                            Create Evaluation
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {paginatedEvals.map((ev, idx) => {
                        const rating = getRating(ev.overallScore);
                        const statusDef = ev.status ? STATUS_LABELS[ev.status] : STATUS_LABELS['Draft'];
                        return (
                          <motion.tr
                            key={ev.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            className={cn(
                              "group transition-all duration-200 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5",
                              idx % 2 === 0 ? 'bg-white/40 dark:bg-white/[0.02]' : 'bg-slate-50/40 dark:bg-white/[0.01]'
                            )}
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">{ev.employeeName}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                                {ev.employeeId}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{ev.campus}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{ev.position}</div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <ScoreBadge score={ev.totalSelf} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <ScoreBadge score={ev.totalSuper} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-400/15 dark:to-purple-400/15 border border-indigo-200/50 dark:border-indigo-400/20">
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{ev.overallScore.toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={cn(
                                "inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap",
                                rating.bg, rating.text, rating.border
                              )}>
                                {rating.khLabel}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">{rating.label}</div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {statusDef && (
                                <span className={cn(
                                  "inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap",
                                  statusDef.color
                                )}>
                                  {statusDef.kh}
                                </span>
                              )}
                            </td>
                            {canSeeEvaluatorColumn(user) && (
                              <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {ev.createdByName}
                              </td>
                            )}
                            <td className="px-5 py-4 text-right print:hidden">
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => navigate(`/evaluation?id=${ev.id}&view=true`)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                  title="View"
                                >
                                  <Eye size={16} />
                                </button>
                                {canEvaluate(ev, user) && (
                                  <button
                                    onClick={() => navigate(`/evaluation?id=${ev.id}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                                    title="Evaluate"
                                  >
                                    <Pencil size={13} />
                                    Evaluate
                                  </button>
                                )}
                                {canEditEvaluation(ev, user) && !canEvaluate(ev, user) && (
                                  <button
                                    onClick={() => navigate(`/evaluation?id=${ev.id}`)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                                    title="Edit"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                )}
                                {canDeleteEvaluation(ev, user) && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm("Are you sure you want to delete this appraisal?")) {
                                        try {
                                          const res = await apiFetch(`/api/evaluations/${ev.id}`, {
                                            method: 'DELETE',
                                            headers: { Authorization: `Bearer ${token}` }
                                          });
                                          if (res.ok) fetchEvals();
                                        } catch { alert('Error deleting appraisal'); }
                                      }
                                    }}
                                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                    title="Delete"
                                  >
                                    <Trash size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && sortedEvals.length > 0 && (
              <div className="p-4 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                    {' '}-{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, sortedEvals.length)}</span>
                    {' '}of{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{sortedEvals.length}</span> records
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl glass-card text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-sm font-semibold transition-all",
                            page === currentPage
                              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                              : "glass-card text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl glass-card text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {activeTab === 'analytics' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <AnalyticsDashboard evals={evals} />
        </motion.div>
      )}
    </div>
  );
}

/* ─── Sub-Components ─── */

function StatCard({ title, subtitle, value, icon, color, description, decimals = 0, delay = 0 }: {
  title: string; subtitle: string; value: number; icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'emerald' | 'amber'; description: string;
  decimals?: number; delay?: number;
}) {
  const animatedValue = useAnimatedCounter(Math.round(value * (decimals ? 10 : 1)), 1400);
  const displayValue = decimals ? (animatedValue / 10).toFixed(decimals) : animatedValue.toLocaleString();

  const gradients = {
    blue: 'from-blue-500 to-cyan-500',
    indigo: 'from-indigo-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500'
  };

  const bgGradients = {
    blue: 'from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10',
    indigo: 'from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10',
    emerald: 'from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10',
    amber: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card-strong rounded-3xl p-6 group cursor-default hover:shadow-xl dark:hover:shadow-black/20 transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl bg-gradient-to-br shadow-lg", gradients[color], `shadow-${color}-500/20`)}>
          <div className="text-white">{icon}</div>
        </div>
        <ArrowUp size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{subtitle}</p>
        <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-1">{displayValue}</p>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{description}</p>
      </div>
      <div className={cn("mt-4 h-1 rounded-full bg-gradient-to-r opacity-30 group-hover:opacity-60 transition-opacity", gradients[color])} />
    </motion.div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  if (score >= 90) color = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  else if (score >= 80) color = 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
  else if (score >= 70) color = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
  else if (score >= 60) color = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
  else color = 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';

  return (
    <span className={cn("inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums min-w-[48px]", color)}>
      {score.toFixed(1)}
    </span>
  );
}

function ToolbarBtn({ icon, label, onClick, variant = 'slate', spinning = false, disabled = false }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  variant?: 'slate' | 'emerald' | 'indigo' | 'blue' | 'purple' | 'rose';
  spinning?: boolean; disabled?: boolean;
}) {
  const variants = {
    slate: 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/50 dark:border-slate-700/50',
    emerald: 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200/50 dark:border-emerald-500/20',
    indigo: 'bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border-indigo-200/50 dark:border-indigo-500/20',
    blue: 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border-blue-200/50 dark:border-blue-500/20',
    purple: 'bg-purple-50/80 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 border-purple-200/50 dark:border-purple-500/20',
    rose: 'bg-rose-50/80 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200/50 dark:border-rose-500/20'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
        variants[variant]
      )}
    >
      <span className={cn(spinning && "animate-spin")}>{icon}</span>
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function SortableHeader({ label, sublabel, sortKey: key, currentSort, dir, onSort, align = 'left' }: {
  label: string; sublabel: string; sortKey: SortKey; currentSort: SortKey;
  dir: SortDir; onSort: (k: SortKey) => void; align?: 'left' | 'right' | 'center';
}) {
  const isActive = currentSort === key;
  return (
    <th
      className={cn("px-5 py-4 cursor-pointer select-none group/header hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors", align === 'right' && "text-right", align === 'center' && "text-center")}
      onClick={() => onSort(key)}
    >
      <div className={cn("flex items-center gap-1.5", align === 'right' && "justify-end", align === 'center' && "justify-center")}>
        <span className={cn("font-semibold text-xs uppercase tracking-wider", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>{label}</span>
        <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover/header:opacity-50")}>
          {isActive ? (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} />}
        </span>
      </div>
      <br /><span className="text-[10px] font-normal text-slate-400">{sublabel}</span>
    </th>
  );
}

function AnalyticsDashboard({ evals }: { evals: Evaluation[] }) {
  if (evals.length === 0) {
    return (
      <div className="glass-card-strong rounded-3xl p-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={36} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-base font-bold text-slate-600 dark:text-slate-300">No data available for analytics</p>
        <p className="text-sm text-slate-400 mt-1">មិនទាន់មានទិន្នន័យដើម្បីបង្ហាញ</p>
      </div>
    );
  }

  const campusScores = evals.reduce((acc, curr) => {
    if (!acc[curr.campus]) acc[curr.campus] = { name: curr.campus, totalScore: 0, count: 0 };
    acc[curr.campus].totalScore += curr.overallScore;
    acc[curr.campus].count += 1;
    return acc;
  }, {} as Record<string, { name: string; totalScore: number; count: number }>);

  const campusData = Object.values(campusScores).map(c => ({
    name: c.name, score: Number((c.totalScore / c.count).toFixed(1))
  }));

  const ratingCounts = evals.reduce((acc, curr) => {
    const r = getRating(curr.overallScore).label;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];
  const ratingData = Object.keys(ratingCounts).map(key => ({ name: key, value: ratingCounts[key] }));

  const topPerformers = [...evals].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5).map(e => ({
    name: e.employeeName, score: Number(e.overallScore.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campus Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card-strong p-6 rounded-3xl"
        >
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Average Score by Campus</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">ពិន្ទុមធ្យមតាមសាខា</p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}
                />
                <Bar dataKey="score" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Average Score" />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card-strong p-6 rounded-3xl"
        >
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Top Performers</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">បុគ្គលិកឆ្នើម</p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}
                />
                <Bar dataKey="score" fill="url(#greenGradient)" radius={[0, 8, 8, 0]} name="Score" barSize={28} />
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rating Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card-strong p-6 rounded-3xl lg:col-span-2"
        >
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Performance Rating Distribution</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">របាយការណ៍ចំណាត់ថ្នាក់</p>
          <div className="h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  iconType="circle"
                  iconSize={10}
                  formatter={(value: string) => <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
