import { apiFetch } from '../mockApi';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PositionFormConfig } from '../types';

export interface Criterion {
  id: number;
  kh: string;
  khDesc: string;
  en: string;
  desc: string;
  max: number;
  sectionId?: string;
  assignedPositions?: string[];
}

export interface CriterionSection {
  id: string;
  name: string;
  khName: string;
  weight?: number;
  displayOrder?: number;
  status?: 'active' | 'inactive';
  assignedPositions?: string[];
}

export interface SelfEvalProfile {
  id: string;
  name: string;
  department: string;
  campus: string;
  position: string;
  category: string;
  evaluationPeriod: string;
  criteria: Criterion[];
}

export interface WeightingScheme {
  id: string;
  label: string;
}

export interface EvaluationConfig {
  weightingSchemes: WeightingScheme[];
  criteriaSets: Record<string, Criterion[]>;
  sections: Record<string, CriterionSection[]>;
}

export function useSettings() {
  const [config, setConfig] = useState<EvaluationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchSettings = async () => {
    try {
      if (!token) return;
      const res = await apiFetch('/api/settings/evaluation_config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const saveSettings = async (newConfig: EvaluationConfig) => {
    try {
      const res = await apiFetch('/api/settings/evaluation_config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { config, loading, saveSettings, refresh: fetchSettings };
}

export function useSelfEvalSettings() {
  const [profiles, setProfiles] = useState<SelfEvalProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchProfiles = async () => {
    try {
      if (!token) return;
      const res = await apiFetch('/api/settings/self_eval_profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [token]);

  const saveProfiles = async (newProfiles: SelfEvalProfile[]) => {
    try {
      const res = await apiFetch('/api/settings/self_eval_profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProfiles)
      });
      if (res.ok) {
        setProfiles(newProfiles);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { profiles, loading, saveProfiles, refresh: fetchProfiles };
}

export function usePositionFormConfigs() {
  const [configs, setConfigs] = useState<PositionFormConfig[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchConfigs = async () => {
    try {
      if (!token) return;
      const res = await apiFetch('/api/settings/position_form_configs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const saveConfigs = async (newConfigs: PositionFormConfig[]) => {
    try {
      const res = await apiFetch('/api/settings/position_form_configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConfigs)
      });
      if (res.ok) {
        setConfigs(newConfigs);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return { configs, loading, saveConfigs, refresh: fetchConfigs };
}
