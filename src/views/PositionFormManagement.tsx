import { apiFetch } from '../mockApi';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePositionFormConfigs, useSettings } from '../hooks/useSettings';
import { PREDEFINED_POSITIONS, PositionFormConfig, PositionSection, PositionCriterion } from '../types';
import { Save, Plus, Trash2, ChevronDown, ChevronRight, ShieldAlert, Copy, ChevronUp, Eye, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useRealtimeRefresh } from '../hooks/useRealtime';

export default function PositionFormManagement() {
  const { user } = useAuth();
  const { configs, loading, saveConfigs, refresh: refreshConfigs } = usePositionFormConfigs();
  const { config: evalConfig } = useSettings();
  useRealtimeRefresh(['settings:updated', 'data:imported', 'data:reset'], refreshConfigs);
  const [localConfigs, setLocalConfigs] = useState<PositionFormConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sectionDialog, setSectionDialog] = useState<{ isOpen: boolean; editId?: string; name: string; khName: string; weight: number; displayOrder: number }>({
    isOpen: false, name: '', khName: '', weight: 50, displayOrder: 0
  });

  useEffect(() => {
    if (configs) {
      setLocalConfigs(JSON.parse(JSON.stringify(configs)));
      if (configs.length > 0 && !selectedId) {
        setSelectedId(configs[0].id);
      }
    }
  }, [configs]);

  const persistConfigs = useCallback(async (toSave: PositionFormConfig[]) => {
    setSaving(true);
    const success = await saveConfigs(toSave);
    setSaving(false);
    if (success) {
      setIsDirty(false);
    }
    return success;
  }, [saveConfigs]);

  const scheduleAutoSave = useCallback((updated: PositionFormConfig[]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const success = await persistConfigs(updated);
      if (success) {
        toast.success('Auto-saved', { duration: 1500, icon: '💾' });
      }
    }, 2000);
  }, [persistConfigs]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (loading || !localConfigs) {
    return <div className="p-12 text-center font-bold text-slate-500">Loading Configuration...</div>;
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Administrators can access this area.</p>
      </div>
    );
  }

  const selectedConfig = localConfigs.find(c => c.id === selectedId);

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const success = await persistConfigs(localConfigs);
    if (success) {
      toast.success('Position form configurations saved!');
    } else {
      toast.error('Error saving configurations.');
    }
  };

  const updateConfigs = (updated: PositionFormConfig[]) => {
    setLocalConfigs(updated);
    setIsDirty(true);
    scheduleAutoSave(updated);
  };

  const addConfig = (position: string) => {
    if (localConfigs.find(c => c.position === position)) {
      toast.error(`A form for "${position}" already exists.`);
      return;
    }
    const newConfig: PositionFormConfig = {
      id: 'pf_' + Date.now(),
      position,
      weightingScheme: evalConfig?.weightingSchemes?.[0]?.id || 'campus_60_40',
      sections: [],
      criteria: []
    };
    const updated = [...localConfigs, newConfig];
    updateConfigs(updated);
    setSelectedId(newConfig.id);
    toast.success(`Created form for "${position}"`);
  };

  const deleteConfig = (id: string) => {
    if (!confirm('Delete this position form configuration? This cannot be undone.')) return;
    const updated = localConfigs.filter(c => c.id !== id);
    updateConfigs(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || '');
    toast.success('Form configuration deleted.');
  };

  const duplicateConfig = (sourceId: string) => {
    const source = localConfigs.find(c => c.id === sourceId);
    if (!source) return;
    const usedPositions = localConfigs.map(c => c.position);
    const available = PREDEFINED_POSITIONS.find(p => !usedPositions.includes(p) && p !== source.position);
    const newName = available || `${source.position} (Copy)`;
    const newConfig: PositionFormConfig = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'pf_' + Date.now(),
      position: newName,
    };
    newConfig.criteria.forEach((c: PositionCriterion) => c.id = Date.now() + Math.random() * 1000);
    const updated = [...localConfigs, newConfig];
    updateConfigs(updated);
    setSelectedId(newConfig.id);
    toast.success(`Duplicated to "${newName}"`);
  };

  const updateConfig = (id: string, updates: Partial<PositionFormConfig>) => {
    const updated = localConfigs.map(c => c.id === id ? { ...c, ...updates } : c);
    updateConfigs(updated);
  };

  // Reorder helpers
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.sections].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = sorted[idx].displayOrder;
    sorted[idx] = { ...sorted[idx], displayOrder: sorted[swapIdx].displayOrder };
    sorted[swapIdx] = { ...sorted[swapIdx], displayOrder: temp };
    updateConfig(selectedConfig.id, { sections: [...sorted] });
  };

  const moveCriterion = (criterionId: number, direction: 'up' | 'down') => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(c => c.id === criterionId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = sorted[idx].displayOrder;
    sorted[idx] = { ...sorted[idx], displayOrder: sorted[swapIdx].displayOrder };
    sorted[swapIdx] = { ...sorted[swapIdx], displayOrder: temp };
    updateConfig(selectedConfig.id, { criteria: [...sorted] });
  };

  // Section operations
  const openAddSection = () => {
    const maxOrder = selectedConfig?.sections.reduce((max, s) => Math.max(max, s.displayOrder), 0) || 0;
    setSectionDialog({ isOpen: true, name: '', khName: '', weight: 50, displayOrder: maxOrder + 1 });
  };

  const openEditSection = (section: PositionSection) => {
    setSectionDialog({
      isOpen: true, editId: section.id, name: section.name, khName: section.khName,
      weight: section.weight, displayOrder: section.displayOrder
    });
  };

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig) return;
    const name = sectionDialog.name.trim();
    const khName = sectionDialog.khName.trim();
    if (!name) return;

    let sections: PositionSection[];
    if (sectionDialog.editId) {
      sections = selectedConfig.sections.map(s =>
        s.id === sectionDialog.editId
          ? { ...s, name, khName, weight: sectionDialog.weight, displayOrder: sectionDialog.displayOrder }
          : s
      );
    } else {
      sections = [...selectedConfig.sections, {
        id: 'ps_' + Date.now(),
        name, khName,
        weight: sectionDialog.weight,
        displayOrder: sectionDialog.displayOrder,
        status: 'active' as const
      }];
    }
    updateConfig(selectedConfig.id, { sections });
    setSectionDialog({ isOpen: false, name: '', khName: '', weight: 50, displayOrder: 0 });
  };

  const deleteSection = (sectionId: string) => {
    if (!selectedConfig || !confirm('Delete this section? Criteria in this section will be uncategorized.')) return;
    const sections = selectedConfig.sections.filter(s => s.id !== sectionId);
    const criteria = selectedConfig.criteria.map(c =>
      c.sectionId === sectionId ? { ...c, sectionId: '' } : c
    );
    updateConfig(selectedConfig.id, { sections, criteria });
  };

  const toggleSectionStatus = (sectionId: string) => {
    if (!selectedConfig) return;
    const sections = selectedConfig.sections.map(s =>
      s.id === sectionId ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
    );
    updateConfig(selectedConfig.id, { sections });
  };

  // Criterion operations
  const addCriterion = (sectionId?: string) => {
    if (!selectedConfig) return;
    const maxOrder = selectedConfig.criteria.reduce((max, c) => Math.max(max, c.displayOrder), 0) || 0;
    const newCriterion: PositionCriterion = {
      id: Date.now(),
      sectionId: sectionId || '',
      kh: '', en: '', khDesc: '', desc: '',
      max: 10,
      displayOrder: maxOrder + 1,
      status: 'active'
    };
    updateConfig(selectedConfig.id, { criteria: [...selectedConfig.criteria, newCriterion] });
  };

  const updateCriterion = (idx: number, field: keyof PositionCriterion, val: string | number) => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    sorted[idx] = { ...sorted[idx], [field]: val };
    updateConfig(selectedConfig.id, { criteria: sorted });
  };

  const deleteCriterion = (idx: number) => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    const criteria = sorted.filter((_, i) => i !== idx);
    updateConfig(selectedConfig.id, { criteria });
  };

  const toggleCriterionStatus = (idx: number) => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    sorted[idx] = { ...sorted[idx], status: sorted[idx].status === 'active' ? 'inactive' : 'active' };
    updateConfig(selectedConfig.id, { criteria: sorted });
  };

  const moveCriterionSection = (idx: number, sectionId: string) => {
    if (!selectedConfig) return;
    const sorted = [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder);
    sorted[idx] = { ...sorted[idx], sectionId };
    updateConfig(selectedConfig.id, { criteria: sorted });
  };

  const usedPositions = localConfigs.map(c => c.position);
  const availablePositions = PREDEFINED_POSITIONS.filter(p => !usedPositions.includes(p));

  const sortedSections = selectedConfig
    ? [...selectedConfig.sections].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const sortedCriteria = selectedConfig
    ? [...selectedConfig.criteria].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Position Form Management
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            ការគ្រប់គ្រងแบบฟូមវាយតម្លៃតាមតួនាទី • Configure evaluation forms per position
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedConfig && (
            <button onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-colors active:scale-95">
              <Eye size={18} />
              Preview
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !isDirty}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50",
              isDirty
                ? "bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            )}>
            <Save size={18} />
            {saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
          <AlertTriangle size={16} />
          You have unsaved changes. They will auto-save in 2 seconds.
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Left: Position List */}
        <div className="w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[75vh]">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 mb-3">Positions ({localConfigs.length})</h2>
            {availablePositions.length > 0 && (
              <select
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                value=""
                onChange={e => { if (e.target.value) addConfig(e.target.value); e.target.value = ''; }}
              >
                <option value="">+ Add Position Form...</option>
                {availablePositions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {localConfigs.map(c => (
              <div key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex justify-between items-center p-3 mb-1 rounded-xl cursor-pointer transition-colors",
                  selectedId === c.id
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                )}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{c.position}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {c.sections.length} sections • {c.criteria.length} criteria
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={e => { e.stopPropagation(); duplicateConfig(c.id); }}
                    className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteConfig(c.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {localConfigs.length === 0 && (
              <div className="text-center p-6 text-slate-500 text-sm">
                No position forms configured. Use the dropdown above to add one.
              </div>
            )}
          </div>
        </div>

        {/* Right: Config Editor */}
        <div className="w-2/3 flex flex-col gap-6">
          {selectedConfig ? (
            <>
              {/* Config Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Position / តួនាទី</label>
                    <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedConfig.position} disabled />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Weighting Scheme / របៀបគណនា</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedConfig.weightingScheme}
                      onChange={e => updateConfig(selectedConfig.id, { weightingScheme: e.target.value })}>
                      {evalConfig?.weightingSchemes?.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sections & Criteria */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    Sections & Criteria
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-2">
                      ({sortedSections.length} sections, {sortedCriteria.length} criteria)
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={openAddSection}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors">
                      <Plus size={14} /> Section
                    </button>
                    <button onClick={() => addCriterion()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors">
                      <Plus size={14} /> Criterion
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {sortedSections.map((section, sIdx) => {
                    const sectionCriteria = sortedCriteria.filter(c => c.sectionId === section.id);
                    const isCollapsed = collapsedSections[section.id];
                    return (
                      <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-500/10 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                          <button onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveSection(section.id, 'up')} disabled={sIdx === 0}
                              className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 transition-colors p-0 leading-none">
                              <ChevronUp size={12} />
                            </button>
                            <button onClick={() => moveSection(section.id, 'down')} disabled={sIdx === sortedSections.length - 1}
                              className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 transition-colors p-0 leading-none">
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{section.khName || section.name}</span>
                            {section.khName && section.name && <span className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">/ {section.name}</span>}
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                              {section.weight}%
                            </span>
                            <span className="ml-1 text-[10px] font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full">
                              {sectionCriteria.length} criteria
                            </span>
                          </div>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                            section.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                          )}>
                            {section.status}
                          </span>
                          <button onClick={() => toggleSectionStatus(section.id)}
                            className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            {section.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => openEditSection(section)}
                            className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteSection(section.id)}
                            className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                            Del
                          </button>
                          <button onClick={() => addCriterion(section.id)}
                            className="px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
                            +Add
                          </button>
                        </div>
                        {!isCollapsed && (
                          <div className="p-3 space-y-3 bg-white dark:bg-slate-800">
                            {sectionCriteria.length > 0 ? sectionCriteria.map((crit) => {
                              const realIdx = sortedCriteria.indexOf(crit);
                              const critSortIdx = sIdx;
                              return (
                                <div key={crit.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 relative group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                                  <div className="absolute top-3 right-3 flex items-center gap-1">
                                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                                      crit.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                                    )}>{crit.status}</span>
                                    <button onClick={() => moveCriterion(crit.id, 'up')} disabled={realIdx === 0}
                                      className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-20 rounded transition-colors" title="Move up">
                                      <ChevronUp size={12} />
                                    </button>
                                    <button onClick={() => moveCriterion(crit.id, 'down')} disabled={realIdx === sortedCriteria.length - 1}
                                      className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-20 rounded transition-colors" title="Move down">
                                      <ChevronDown size={12} />
                                    </button>
                                    <button onClick={() => toggleCriterionStatus(realIdx)}
                                      className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors" title="Toggle status">
                                      <RotateCcw size={12} />
                                    </button>
                                    <button onClick={() => deleteCriterion(realIdx)}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Khmer</label>
                                      <input className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={crit.kh} onChange={e => updateCriterion(realIdx, 'kh', e.target.value)} placeholder="Khmer name" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">English</label>
                                      <input className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={crit.en} onChange={e => updateCriterion(realIdx, 'en', e.target.value)} placeholder="English name" />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Score</label>
                                      <input type="number" min="1" max="100"
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                        value={crit.max} onChange={e => updateCriterion(realIdx, 'max', parseInt(e.target.value) || 10)} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Order</label>
                                      <input type="number" min="0"
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                        value={crit.displayOrder} onChange={e => updateCriterion(realIdx, 'displayOrder', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                                      <select className="w-full px-2 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={crit.sectionId} onChange={e => moveCriterionSection(realIdx, e.target.value)}>
                                        <option value="">Uncategorized</option>
                                        {sortedSections.map(s => (
                                          <option key={s.id} value={s.id}>{s.khName || s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                No criteria in this section. Click "+Add" above.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Uncategorized */}
                  {sortedCriteria.filter(c => !c.sectionId || !sortedSections.find(s => s.id === c.sectionId)).length > 0 && (
                    <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-sm">Uncategorized Criteria</span>
                      </div>
                      <div className="p-3 space-y-3 bg-white dark:bg-slate-800">
                        {sortedCriteria.filter(c => !c.sectionId || !sortedSections.find(s => s.id === c.sectionId)).map(crit => {
                          const realIdx = sortedCriteria.indexOf(crit);
                          return (
                            <div key={crit.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 relative">
                              <div className="absolute top-3 right-3 flex items-center gap-1">
                                <button onClick={() => moveCriterion(crit.id, 'up')} disabled={realIdx === 0}
                                  className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-20 rounded transition-colors" title="Move up">
                                  <ChevronUp size={12} />
                                </button>
                                <button onClick={() => moveCriterion(crit.id, 'down')} disabled={realIdx === sortedCriteria.length - 1}
                                  className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-20 rounded transition-colors" title="Move down">
                                  <ChevronDown size={12} />
                                </button>
                                <button onClick={() => deleteCriterion(realIdx)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <input className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={crit.kh} onChange={e => updateCriterion(realIdx, 'kh', e.target.value)} placeholder="Khmer name" />
                                <input className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={crit.en} onChange={e => updateCriterion(realIdx, 'en', e.target.value)} placeholder="English name" />
                              </div>
                              <div className="flex gap-3 items-end">
                                <div className="w-24">
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Max</label>
                                  <input type="number" min="1" className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-center outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={crit.max} onChange={e => updateCriterion(realIdx, 'max', parseInt(e.target.value) || 10)} />
                                </div>
                                <select className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 outline-none"
                                  value={crit.sectionId} onChange={e => moveCriterionSection(realIdx, e.target.value)}>
                                  <option value="">Move to section...</option>
                                  {sortedSections.map(s => <option key={s.id} value={s.id}>{s.khName || s.name}</option>)}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sortedSections.length === 0 && sortedCriteria.length === 0 && (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-lg mb-2">No sections or criteria configured</p>
                      <p className="text-sm">Click "Section" or "Criterion" above to start building the form.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center h-64 text-slate-500 font-bold">
              Select a position to configure its evaluation form
            </div>
          )}
        </div>
      </div>

      {/* Section Dialog */}
      {sectionDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {sectionDialog.editId ? 'Edit Section' : 'Add New Section'}
              </h2>
            </div>
            <form onSubmit={handleSectionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">English Name *</label>
                <input autoFocus type="text" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder="e.g. Personal Characteristics"
                  value={sectionDialog.name}
                  onChange={e => setSectionDialog({ ...sectionDialog, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ឈ្មោះជាភាសាខ្មែរ / Khmer Name</label>
                <input type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder="e.g. លក្ខណៈផ្ទាល់ខ្លួន"
                  value={sectionDialog.khName}
                  onChange={e => setSectionDialog({ ...sectionDialog, khName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Weight (%) *</label>
                  <input type="number" min="0" max="100" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all text-center"
                    value={sectionDialog.weight}
                    onChange={e => setSectionDialog({ ...sectionDialog, weight: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Display Order</label>
                  <input type="number" min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all text-center"
                    value={sectionDialog.displayOrder}
                    onChange={e => setSectionDialog({ ...sectionDialog, displayOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setSectionDialog({ isOpen: false, name: '', khName: '', weight: 50, displayOrder: 0 })}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                  {sectionDialog.editId ? 'Save Changes' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Form Preview</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedConfig.position} • {sortedSections.length} sections, {sortedCriteria.length} criteria</p>
              </div>
              <button onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Close
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {sortedSections.filter(s => s.status === 'active').map(section => {
                const sectionCriteria = sortedCriteria.filter(c => c.sectionId === section.id && c.status === 'active');
                if (sectionCriteria.length === 0) return null;
                const totalMax = sectionCriteria.reduce((sum, c) => sum + c.max, 0);
                return (
                  <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{section.khName || section.name}</span>
                          {section.khName && section.name && <span className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">/ {section.name}</span>}
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Weight: {section.weight}% • Max: {totalMax}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sectionCriteria.map((crit, i) => (
                        <div key={crit.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              <span className="text-slate-400 dark:text-slate-500 mr-2">{i + 1}.</span>
                              {crit.kh || crit.en || 'Untitled'}
                            </span>
                            {crit.kh && crit.en && <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">/ {crit.en}</span>}
                          </div>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">/{crit.max}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sortedSections.filter(s => s.status === 'active').length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  No active sections to preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
