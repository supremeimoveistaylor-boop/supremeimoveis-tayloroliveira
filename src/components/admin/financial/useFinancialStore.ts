import { useState, useCallback, useMemo } from 'react';
import { Venda, Gasto, VendasMetrics, GastosMetrics, DateFilter } from './types';
import { generateId } from './utils';

const VENDAS_KEY = 'admin_vendas_data';
const GASTOS_KEY = 'admin_gastos_data';

// Helper to safely parse JSON
const safeParseJSON = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

export function useFinancialStore() {
  // Vendas state
  const [vendas, setVendas] = useState<Venda[]>(() => {
    try {
      const stored = localStorage.getItem(VENDAS_KEY);
      return safeParseJSON(stored, []);
    } catch {
      return [];
    }
  });

  // Gastos state
  const [gastos, setGastos] = useState<Gasto[]>(() => {
    try {
      const stored = localStorage.getItem(GASTOS_KEY);
      return safeParseJSON(stored, []);
    } catch {
      return [];
    }
  });

  // Persist functions
  const persistVendas = useCallback((data: Venda[]) => {
    try {
      localStorage.setItem(VENDAS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist vendas:', e);
    }
  }, []);

  const persistGastos = useCallback((data: Gasto[]) => {
    try {
      localStorage.setItem(GASTOS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist gastos:', e);
    }
  }, []);

  // === VENDAS CRUD ===
  const addVenda = useCallback((venda: Omit<Venda, 'id' | 'createdAt'>) => {
    try {
      const newVenda: Venda = {
        ...venda,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setVendas(prev => {
        const updated = [...prev, newVenda];
        persistVendas(updated);
        return updated;
      });
      return newVenda;
    } catch (e) {
      console.error('Failed to add venda:', e);
      return null;
    }
  }, [persistVendas]);

  const updateVenda = useCallback((id: string, updates: Partial<Venda>) => {
    try {
      setVendas(prev => {
        const updated = prev.map(v =>
          v?.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
        );
        persistVendas(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to update venda:', e);
    }
  }, [persistVendas]);

  const deleteVenda = useCallback((id: string) => {
    try {
      setVendas(prev => {
        const updated = prev.filter(v => v?.id !== id);
        persistVendas(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to delete venda:', e);
    }
  }, [persistVendas]);

  // === GASTOS CRUD ===
  const addGasto = useCallback((gasto: Omit<Gasto, 'id' | 'createdAt'>) => {
    try {
      const newGasto: Gasto = {
        ...gasto,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setGastos(prev => {
        const updated = [...prev, newGasto];
        persistGastos(updated);
        return updated;
      });
      return newGasto;
    } catch (e) {
      console.error('Failed to add gasto:', e);
      return null;
    }
  }, [persistGastos]);

  const updateGasto = useCallback((id: string, updates: Partial<Gasto>) => {
    try {
      setGastos(prev => {
        const updated = prev.map(g =>
          g?.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
        );
        persistGastos(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to update gasto:', e);
    }
  }, [persistGastos]);

  const deleteGasto = useCallback((id: string) => {
    try {
      setGastos(prev => {
        const updated = prev.filter(g => g?.id !== id);
        persistGastos(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to delete gasto:', e);
    }
  }, [persistGastos]);

  // === FILTERING ===
  const filterVendas = useCallback((
    dateFilter?: DateFilter,
    cliente?: string,
    corretor?: string
  ): Venda[] => {
    try {
      let filtered = [...vendas].filter(Boolean);

      if (dateFilter?.startDate) {
        const start = new Date(dateFilter.startDate);
        filtered = filtered.filter(v => v?.dataVenda && new Date(v.dataVenda) >= start);
      }

      if (dateFilter?.endDate) {
        const end = new Date(dateFilter.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(v => v?.dataVenda && new Date(v.dataVenda) <= end);
      }

      if (cliente) {
        filtered = filtered.filter(v =>
          v?.nomeCliente?.toLowerCase().includes(cliente.toLowerCase())
        );
      }

      if (corretor) {
        filtered = filtered.filter(v =>
          v?.nomeCorretor?.toLowerCase().includes(corretor.toLowerCase())
        );
      }

      return filtered.sort((a, b) =>
        new Date(b?.dataVenda ?? 0).getTime() - new Date(a?.dataVenda ?? 0).getTime()
      );
    } catch {
      return [];
    }
  }, [vendas]);

  const filterGastos = useCallback((
    dateFilter?: DateFilter,
    tipo?: string
  ): Gasto[] => {
    try {
      let filtered = [...gastos].filter(Boolean);

      if (dateFilter?.startDate) {
        const start = new Date(dateFilter.startDate);
        filtered = filtered.filter(g => g?.dataGasto && new Date(g.dataGasto) >= start);
      }

      if (dateFilter?.endDate) {
        const end = new Date(dateFilter.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(g => g?.dataGasto && new Date(g.dataGasto) <= end);
      }

      if (tipo) {
        filtered = filtered.filter(g =>
          g?.tipoGasto?.toLowerCase().includes(tipo.toLowerCase())
        );
      }

      return filtered.sort((a, b) =>
        new Date(b?.dataGasto ?? 0).getTime() - new Date(a?.dataGasto ?? 0).getTime()
      );
    } catch {
      return [];
    }
  }, [gastos]);

  // === METRICS ===
  const vendasMetrics = useMemo((): VendasMetrics => {
    try {
      const safeVendas = vendas?.filter(Boolean) ?? [];
      const totalVendas = safeVendas.length;
      const valorTotalVendido = safeVendas.reduce((sum, v) => sum + (v?.valorVenda ?? 0), 0);
      const totalComissoes = safeVendas.reduce((sum, v) => sum + (v?.valorComissao ?? 0), 0);
      const mediaVenda = totalVendas > 0 ? valorTotalVendido / totalVendas : 0;

      return {
        totalVendas,
        valorTotalVendido,
        totalComissoes,
        mediaVenda,
      };
    } catch {
      return { totalVendas: 0, valorTotalVendido: 0, totalComissoes: 0, mediaVenda: 0 };
    }
  }, [vendas]);

  const gastosMetrics = useMemo((): GastosMetrics => {
    try {
      const safeGastos = gastos?.filter(Boolean) ?? [];
      const totalGastos = safeGastos.length;
      const valorTotalGasto = safeGastos.reduce((sum, g) => sum + (g?.valorGasto ?? 0), 0);
      const mediaGasto = totalGastos > 0 ? valorTotalGasto / totalGastos : 0;

      return {
        totalGastos,
        valorTotalGasto,
        mediaGasto,
      };
    } catch {
      return { totalGastos: 0, valorTotalGasto: 0, mediaGasto: 0 };
    }
  }, [gastos]);

  // Get unique values for filters
  const uniqueCorretores = useMemo(() => {
    try {
      return [...new Set(vendas.map(v => v?.nomeCorretor).filter(Boolean))];
    } catch {
      return [];
    }
  }, [vendas]);

  const uniqueTiposGasto = useMemo(() => {
    try {
      return [...new Set(gastos.map(g => g?.tipoGasto).filter(Boolean))];
    } catch {
      return [];
    }
  }, [gastos]);

  return {
    // Data
    vendas,
    gastos,
    // Vendas CRUD
    addVenda,
    updateVenda,
    deleteVenda,
    filterVendas,
    // Gastos CRUD
    addGasto,
    updateGasto,
    deleteGasto,
    filterGastos,
    // Metrics
    vendasMetrics,
    gastosMetrics,
    // Filter options
    uniqueCorretores,
    uniqueTiposGasto,
  };
}
