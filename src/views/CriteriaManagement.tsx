import { apiFetch } from '../mockApi';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, EvaluationConfig, Criterion, CriterionSection, EvaluationType, WeightingScheme } from '../hooks/useSettings';
import { Save, Plus, Trash2, Settings, List, PlusCircle, ShieldAlert, ChevronDown, ChevronRight, FolderOpen, GripVertical } from 'lucide-react';

export default function CriteriaManagement() {
  const { user } = useAuth();
  const { config, loading, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'types' | 'weighting' | 'criteria'>('criteria');
  const [selectedType, setSelectedType] = useState<string>('management');
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState<EvaluationConfig | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ isOpen: boolean, type: 'type' | 'weighting', value: string, title: string, placeholder: string }>({ isOpen: false, type: 'type', value: '', title: '', placeholder: '' });
  const [sectionDialog, setSectionDialog] = useState<{ isOpen: boolean, editId?: string, name: string, khName: string }>({ isOpen: false, name: '', khName: '' });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (config) {
      const cloned = JSON.parse(JSON.stringify(config));
      if (!cloned.types) cloned.types = [];
      if (!cloned.weightingSchemes) cloned.weightingSchemes = [];
      if (!cloned.criteriaSets) cloned.criteriaSets = {};
      if (!cloned.sections) cloned.sections = {};
      setLocalConfig(cloned);
    }
  }, [config]);

  React.useEffect(() => {
    if (localConfig && localConfig.types && localConfig.types.length > 0) {
      if (!localConfig.types.some(t => t.id === selectedType)) {
        setSelectedType(localConfig.types[0].id);
      }
    }
  }, [localConfig, selectedType]);

  if (loading || !localConfig) {
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

  const handleSave = async () => {
    setSaving(true);
    const success = await saveSettings(localConfig);
    setSaving(false);
    if (success) {
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold';
      msg.textContent = 'Settings saved successfully!';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } else {
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold';
      msg.textContent = 'Error saving settings.';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  };

  const openAddType = () => {
    setPromptDialog({ isOpen: true, type: 'type', value: '', title: 'Add Evaluation Type', placeholder: 'Enter a short ID (e.g. finance)' });
  };

  const openAddWeighting = () => {
    setPromptDialog({ isOpen: true, type: 'weighting', value: '', title: 'Add Weighting Scheme', placeholder: 'Enter a short ID (e.g. central_50)' });
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = promptDialog.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!id) return;

    if (promptDialog.type === 'type') {
      if (localConfig.types.find(t => t.id === id)) return;
      setLocalConfig({
        ...localConfig,
        types: [...localConfig.types, { id, label: `New Type (${id})` }],
        criteriaSets: { ...localConfig.criteriaSets, [id]: [] },
        sections: { ...localConfig.sections, [id]: [] }
      });
      setSelectedType(id);
    } else {
      if (localConfig.weightingSchemes.find(w => w.id === id)) return;
      setLocalConfig({
        ...localConfig,
        weightingSchemes: [...localConfig.weightingSchemes, { id, label: `New Scheme (${id})` }]
      });
    }
    setPromptDialog({ ...promptDialog, isOpen: false });
  };

  const updateType = (idx: number, label: string) => {
    const newTypes = [...localConfig.types];
    newTypes[idx].label = label;
    setLocalConfig({ ...localConfig, types: newTypes });
  };

  const deleteType = (idx: number) => {
    const typeId = localConfig.types[idx].id;
    if (confirm(`Delete ${typeId}? This removes all its criteria.`)) {
      const newTypes = localConfig.types.filter((_, i) => i !== idx);
      const newSets = { ...localConfig.criteriaSets };
      delete newSets[typeId];
      const newSections = { ...localConfig.sections };
      delete newSections[typeId];
      setLocalConfig({ ...localConfig, types: newTypes, criteriaSets: newSets, sections: newSections });
      if (selectedType === typeId) setSelectedType(newTypes[0]?.id || '');
    }
  };

  const updateWeighting = (idx: number, label: string) => {
    const newSchemes = [...localConfig.weightingSchemes];
    newSchemes[idx].label = label;
    setLocalConfig({ ...localConfig, weightingSchemes: newSchemes });
  };

  const deleteWeighting = (idx: number) => {
    if (confirm('Delete this weighting scheme?')) {
      const newSchemes = localConfig.weightingSchemes.filter((_, i) => i !== idx);
      setLocalConfig({ ...localConfig, weightingSchemes: newSchemes });
    }
  };

  // --- Section operations ---
  const getCurrentSections = (): CriterionSection[] => {
    return localConfig.sections?.[selectedType] || [];
  };

  const openAddSection = () => {
    setSectionDialog({ isOpen: true, name: '', khName: '' });
  };

  const openEditSection = (section: CriterionSection) => {
    setSectionDialog({ isOpen: true, editId: section.id, name: section.name, khName: section.khName });
  };

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = sectionDialog.name.trim();
    const khName = sectionDialog.khName.trim();
    if (!name) return;

    const sections = { ...(localConfig.sections || {}) };
    const typeSections = [...(sections[selectedType] || [])];

    if (sectionDialog.editId) {
      const idx = typeSections.findIndex(s => s.id === sectionDialog.editId);
      if (idx >= 0) {
        typeSections[idx] = { ...typeSections[idx], name, khName };
      }
    } else {
      const id = 'section_' + Date.now();
      typeSections.push({ id, name, khName });
    }
    sections[selectedType] = typeSections;
    setLocalConfig({ ...localConfig, sections });
    setSectionDialog({ isOpen: false, name: '', khName: '' });
  };

  const deleteSection = (sectionId: string) => {
    if (!confirm('Delete this section? Criteria in this section will be moved to Uncategorized.')) return;
    const sections = { ...(localConfig.sections || {}) };
    sections[selectedType] = (sections[selectedType] || []).filter(s => s.id !== sectionId);
    const newSets = { ...localConfig.criteriaSets };
    const typeCriteria = [...(newSets[selectedType] || [])];
    typeCriteria.forEach(c => {
      if (c.sectionId === sectionId) {
        delete c.sectionId;
      }
    });
    newSets[selectedType] = typeCriteria;
    setLocalConfig({ ...localConfig, sections, criteriaSets: newSets });
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // --- Criterion operations ---
  const addCriterion = (sectionId?: string) => {
    if (!selectedType) {
      alert("Please add or select an Evaluation Type first.");
      return;
    }
    const newSets = { ...localConfig.criteriaSets };
    const newCriterion: Criterion = { id: Date.now(), kh: '', khDesc: '', en: '', desc: '', max: 10 };
    if (sectionId) newCriterion.sectionId = sectionId;
    newSets[selectedType] = [
      ...(newSets[selectedType] || []),
      newCriterion
    ];
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const updateCriterion = (idx: number, field: keyof Criterion, val: string | number) => {
    const newSets = { ...localConfig.criteriaSets };
    const newArr = [...(newSets[selectedType] || [])];
    newArr[idx] = { ...newArr[idx], [field]: val };
    newSets[selectedType] = newArr;
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const deleteCriterion = (idx: number) => {
    const newSets = { ...localConfig.criteriaSets };
    newSets[selectedType] = newSets[selectedType].filter((_, i) => i !== idx);
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const moveCriterionSection = (idx: number, sectionId: string) => {
    const newSets = { ...localConfig.criteriaSets };
    const newArr = [...(newSets[selectedType] || [])];
    if (sectionId) {
      newArr[idx] = { ...newArr[idx], sectionId };
    } else {
      const { sectionId: _, ...rest } = newArr[idx];
      newArr[idx] = rest as Criterion;
    }
    newSets[selectedType] = newArr;
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const allCriteria = localConfig.criteriaSets[selectedType] || [];
  const sections = getCurrentSections();
  const unsectionedCriteria = allCriteria.filter(c => !c.sectionId || !sections.find(s => s.id === c.sectionId));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">System Configuration</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage Evaluation Criteria, Weighting & Evaluators / រៀបចំលក្ខណៈវិនិច្ឆ័យ</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 p-2 gap-2 bg-slate-50 dark:bg-slate-900/50">
          <TabButton active={activeTab === 'types'} onClick={() => setActiveTab('types')} icon={<List size={18}/>} label="Evaluation Types" />
          <TabButton active={activeTab === 'weighting'} onClick={() => setActiveTab('weighting')} icon={<Settings size={18}/>} label="Weighting Schemes" />
          <TabButton active={activeTab === 'criteria'} onClick={() => setActiveTab('criteria')} icon={<PlusCircle size={18}/>} label="Criteria & Sections" />
        </div>

        <div className="p-8">
          {activeTab === 'types' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Evaluation Types / ប្រភេទវាយតម្លៃ</h3>
                <button onClick={openAddType} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Plus size={16} /> Add Type
                </button>
              </div>
              <div className="space-y-4">
                {(localConfig.types || []).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <div className="w-48 font-mono text-xs font-bold text-slate-400 dark:text-slate-500 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">{t.id}</div>
                    <input 
                      className="flex-1 px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      value={t.label} onChange={e => updateType(i, e.target.value)} placeholder="Type Name"
                    />
                    <button onClick={() => deleteType(i)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'weighting' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Weighting Schemes / របៀបគណនា</h3>
                <button onClick={openAddWeighting} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Plus size={16} /> Add Scheme
                </button>
              </div>
              <div className="space-y-4">
                {(localConfig.weightingSchemes || []).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <div className="w-48 font-mono text-xs font-bold text-slate-400 dark:text-slate-500 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">{s.id}</div>
                    <input 
                      className="flex-1 px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      value={s.label} onChange={e => updateWeighting(i, e.target.value)} placeholder="Scheme Label"
                    />
                    <button onClick={() => deleteWeighting(i)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'criteria' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Type:</label>
                <select 
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 outline-none"
                  value={selectedType} onChange={e => setSelectedType(e.target.value)}
                >
                  {(localConfig.types || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button onClick={() => openAddSection()} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors">
                  <FolderOpen size={16} /> Add Section
                </button>
                <button onClick={() => addCriterion()} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={16} /> Add Criterion
                </button>
              </div>

              {/* Sections */}
              {sections.map(section => (
                <div key={section.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-500/10 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => toggleSectionCollapse(section.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      {collapsedSections[section.id] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </button>
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{section.khName}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium ml-2 text-sm">/ {section.name}</span>
                      <span className="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {(allCriteria.filter(c => c.sectionId === section.id)).length} criteria
                      </span>
                    </div>
                    <button onClick={() => openEditSection(section)} className="px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">Edit</button>
                    <button onClick={() => deleteSection(section.id)} className="px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">Delete</button>
                    <button onClick={() => addCriterion(section.id)} className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {!collapsedSections[section.id] && (
                    <div className="p-4 space-y-4 bg-white dark:bg-slate-800">
                      {allCriteria.filter(c => c.sectionId === section.id).map((c, i) => {
                        const realIdx = allCriteria.indexOf(c);
                        return (
                          <CriterionCard key={c.id} criterion={c} idx={realIdx} updateCriterion={updateCriterion} deleteCriterion={deleteCriterion} moveCriterionSection={moveCriterionSection} sections={sections} selectedSectionId={c.sectionId} />
                        );
                      })}
                      {allCriteria.filter(c => c.sectionId === section.id).length === 0 && (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                          No criteria in this section. Click "Add" above.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Uncategorized criteria */}
              {unsectionedCriteria.length > 0 && (
                <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Uncategorized</span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                      {unsectionedCriteria.length} criteria
                    </span>
                  </div>
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800">
                    {unsectionedCriteria.map(c => {
                      const realIdx = allCriteria.indexOf(c);
                      return (
                        <CriterionCard key={c.id} criterion={c} idx={realIdx} updateCriterion={updateCriterion} deleteCriterion={deleteCriterion} moveCriterionSection={moveCriterionSection} sections={sections} selectedSectionId={c.sectionId} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {sections.length === 0 && unsectionedCriteria.length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No criteria defined for this type. Add a Section or Criteria to get started.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Dialog for Types/Weighting */}
      {promptDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{promptDialog.title}</h2>
            </div>
            <form onSubmit={handlePromptSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Identifier</label>
                <input
                  autoFocus
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder={promptDialog.placeholder}
                  value={promptDialog.value}
                  onChange={e => setPromptDialog({ ...promptDialog, value: e.target.value })}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Use lowercase letters, numbers, and underscores only.</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPromptDialog({ ...promptDialog, isOpen: false })}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Dialog */}
      {sectionDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{sectionDialog.editId ? 'Edit Section' : 'Add New Section'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize criteria into named groups</p>
            </div>
            <form onSubmit={handleSectionSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">English Name *</label>
                <input
                  autoFocus
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder="e.g. Work Performance"
                  value={sectionDialog.name}
                  onChange={e => setSectionDialog({ ...sectionDialog, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ឈ្មោះជាភាសាខ្មែរ / Khmer Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder="e.g. សមិទ្ធផលការងារ"
                  value={sectionDialog.khName}
                  onChange={e => setSectionDialog({ ...sectionDialog, khName: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setSectionDialog({ isOpen: false, name: '', khName: '' })}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  {sectionDialog.editId ? 'Save Changes' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CriterionCard({ criterion, idx, updateCriterion, deleteCriterion, moveCriterionSection, sections, selectedSectionId }: {
  key?: string | number;
  criterion: Criterion;
  idx: number;
  updateCriterion: (idx: number, field: keyof Criterion, val: string | number) => void;
  deleteCriterion: (idx: number) => void;
  moveCriterionSection: (idx: number, sectionId: string) => void;
  sections: CriterionSection[];
  selectedSectionId?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 relative group hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all">
      <button 
        onClick={() => deleteCriterion(idx)} 
        className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
      >
        <Trash2 size={18}/>
      </button>

      {sections.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Section:</label>
          <select
            className="px-3 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedSectionId || ''}
            onChange={e => moveCriterionSection(idx, e.target.value)}
          >
            <option value="">Uncategorized</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.khName ? `${s.khName} / ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ចំណងជើងជាភាសាខ្មែរ<br/><span className="text-[10px] font-normal">Khmer Title</span></label>
          <input className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={criterion.kh} onChange={e => updateCriterion(idx, 'kh', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ចំណងជើងជាភាសាអង់គ្លេស<br/><span className="text-[10px] font-normal">English Title</span></label>
          <input className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={criterion.en} onChange={e => updateCriterion(idx, 'en', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ពិន្ទុអតិបរមា<br/><span className="text-[10px] font-normal">Max Score</span></label>
          <input type="number" min="1" max="100" className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={criterion.max || 10} onChange={e => updateCriterion(idx, 'max', parseInt(e.target.value) || 10)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ការពិពណ៌នាជាភាសាខ្មែរ<br/><span className="text-[10px] font-normal">Khmer Description</span></label>
          <textarea rows={2} className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm text-slate-600 dark:text-slate-300 resize-none" value={criterion.khDesc} onChange={e => updateCriterion(idx, 'khDesc', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ការពិពណ៌នាជាភាសាអង់គ្លេស<br/><span className="text-[10px] font-normal">English Description</span></label>
          <textarea rows={2} className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm text-slate-600 dark:text-slate-300 resize-none" value={criterion.desc} onChange={e => updateCriterion(idx, 'desc', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${active ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
    >
      {icon}
      {label}
    </button>
  );
}
