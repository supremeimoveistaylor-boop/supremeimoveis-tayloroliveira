import { useState, useCallback, useMemo } from 'react';
import { KanbanCard, KanbanColumn, KanbanData, Collaborator, CRMMetrics, CollaboratorRole, ROLE_PERMISSIONS } from './types';

const STORAGE_KEY = 'crm_kanban_data';
const COLLABORATORS_KEY = 'crm_collaborators';

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to safely parse JSON
const safeParseJSON = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

// Initial empty state
const initialKanbanData: KanbanData = {
  leads: [],
  contato: [],
  proposta: [],
  negociacao: [],
  fechado: [],
  sem_interesse: [],
};

const initialCollaborators: Collaborator[] = [
  { id: 'admin-1', nome: 'Administrador', role: 'admin', ativo: true },
];

export function useCRMStore(currentUserId?: string, currentUserRole: CollaboratorRole = 'corretor') {
  // Load initial state from localStorage
  const [kanbanData, setKanbanData] = useState<KanbanData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return safeParseJSON(stored, initialKanbanData);
    } catch {
      return initialKanbanData;
    }
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    try {
      const stored = localStorage.getItem(COLLABORATORS_KEY);
      return safeParseJSON(stored, initialCollaborators);
    } catch {
      return initialCollaborators;
    }
  });

  // Persist to localStorage
  const persistKanban = useCallback((data: KanbanData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist kanban data:', e);
    }
  }, []);

  const persistCollaborators = useCallback((data: Collaborator[]) => {
    try {
      localStorage.setItem(COLLABORATORS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist collaborators:', e);
    }
  }, []);

  // Get user permissions
  const permissions = useMemo(() => ROLE_PERMISSIONS[currentUserRole], [currentUserRole]);

  // Filter cards based on user role
  const getFilteredKanbanData = useCallback((): KanbanData => {
    if (permissions.viewAll) {
      return kanbanData;
    }
    // Corretores only see their own cards
    return {
      leads: kanbanData.leads.filter(c => c?.responsavel === currentUserId),
      contato: kanbanData.contato.filter(c => c?.responsavel === currentUserId),
      proposta: kanbanData.proposta.filter(c => c?.responsavel === currentUserId),
      negociacao: kanbanData.negociacao.filter(c => c?.responsavel === currentUserId),
      fechado: kanbanData.fechado.filter(c => c?.responsavel === currentUserId),
      sem_interesse: kanbanData.sem_interesse.filter(c => c?.responsavel === currentUserId),
    };
  }, [kanbanData, permissions.viewAll, currentUserId]);

  // Add card to a column
  const addCard = useCallback((column: KanbanColumn, card: Omit<KanbanCard, 'id' | 'createdAt'>) => {
    try {
      const now = new Date().toISOString();
      const newCard: KanbanCard = {
        ...card,
        id: generateId(),
        createdAt: now,
        lastInteractionAt: now,
      };
      setKanbanData(prev => {
        const updated = {
          ...prev,
          [column]: [...(prev[column] || []), newCard],
        };
        persistKanban(updated);
        return updated;
      });
      return newCard;
    } catch (e) {
      console.error('Failed to add card:', e);
      return null;
    }
  }, [persistKanban]);

  // Update card (also updates lastInteractionAt)
  const updateCard = useCallback((column: KanbanColumn, cardId: string, updates: Partial<KanbanCard>) => {
    try {
      const now = new Date().toISOString();
      setKanbanData(prev => {
        const updated = {
          ...prev,
          [column]: (prev[column] || []).map(card =>
            card?.id === cardId ? { ...card, ...updates, updatedAt: now, lastInteractionAt: now } : card
          ),
        };
        persistKanban(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to update card:', e);
    }
  }, [persistKanban]);

  // Delete card
  const deleteCard = useCallback((column: KanbanColumn, cardId: string) => {
    if (!permissions.canDelete) {
      console.warn('User does not have delete permission');
      return false;
    }
    try {
      setKanbanData(prev => {
        const updated = {
          ...prev,
          [column]: (prev[column] || []).filter(card => card?.id !== cardId),
        };
        persistKanban(updated);
        return updated;
      });
      return true;
    } catch (e) {
      console.error('Failed to delete card:', e);
      return false;
    }
  }, [permissions.canDelete, persistKanban]);

  // Move card between columns (updates lastInteractionAt and adds history)
  const moveCard = useCallback((fromColumn: KanbanColumn, toColumn: KanbanColumn, cardId: string) => {
    try {
      const now = new Date().toISOString();
      setKanbanData(prev => {
        const card = (prev[fromColumn] || []).find(c => c?.id === cardId);
        if (!card) return prev;

        const historyEntry = {
          tipo: 'status' as const,
          descricao: `Movido de "${fromColumn}" para "${toColumn}"`,
          data: now,
        };

        const updatedCard = {
          ...card,
          updatedAt: now,
          lastInteractionAt: toColumn === 'sem_interesse' ? card.lastInteractionAt : now,
          historico: [...(card?.historico || []), historyEntry],
        };

        const updated = {
          ...prev,
          [fromColumn]: (prev[fromColumn] || []).filter(c => c?.id !== cardId),
          [toColumn]: [...(prev[toColumn] || []), updatedCard],
        };
        persistKanban(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to move card:', e);
    }
  }, [persistKanban]);

  // Add card from lead
  const addCardFromLead = useCallback((lead: { id: string; name?: string; phone?: string; email?: string; origin?: string }) => {
    try {
      return addCard('leads', {
        titulo: lead?.name ?? 'Novo Lead',
        cliente: lead?.name ?? 'Não informado',
        telefone: lead?.phone ?? '',
        email: lead?.email ?? '',
        origemLead: lead?.origin ?? 'Chat',
        leadId: lead?.id ?? '',
      });
    } catch (e) {
      console.error('Failed to add card from lead:', e);
      return null;
    }
  }, [addCard]);

  // Remove card by lead ID
  const removeCardByLeadId = useCallback((leadId: string) => {
    try {
      setKanbanData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          const column = key as KanbanColumn;
          updated[column] = (prev[column] || []).filter(card => card?.leadId !== leadId);
        });
        persistKanban(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to remove card by lead ID:', e);
    }
  }, [persistKanban]);

  // Link appointment to card
  const linkAppointmentToCard = useCallback((cardId: string, appointmentDate: string) => {
    try {
      // Find which column contains the card
      for (const column of Object.keys(kanbanData) as KanbanColumn[]) {
        const card = (kanbanData[column] || []).find(c => c?.id === cardId);
        if (card) {
          updateCard(column, cardId, { proximoAgendamento: appointmentDate });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to link appointment:', e);
      return false;
    }
  }, [kanbanData, updateCard]);

  // Collaborator management
  const addCollaborator = useCallback((collaborator: Omit<Collaborator, 'id'>) => {
    try {
      const newCollaborator: Collaborator = {
        ...collaborator,
        id: generateId(),
      };
      setCollaborators(prev => {
        const updated = [...prev, newCollaborator];
        persistCollaborators(updated);
        return updated;
      });
      return newCollaborator;
    } catch (e) {
      console.error('Failed to add collaborator:', e);
      return null;
    }
  }, [persistCollaborators]);

  const updateCollaborator = useCallback((id: string, updates: Partial<Collaborator>) => {
    try {
      setCollaborators(prev => {
        const updated = prev.map(c => c?.id === id ? { ...c, ...updates } : c);
        persistCollaborators(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to update collaborator:', e);
    }
  }, [persistCollaborators]);

  const deleteCollaborator = useCallback((id: string) => {
    try {
      setCollaborators(prev => {
        const updated = prev.filter(c => c?.id !== id);
        persistCollaborators(updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to delete collaborator:', e);
    }
  }, [persistCollaborators]);

  // Calculate metrics (sem_interesse excluded from funnel)
  const metrics = useMemo((): CRMMetrics => {
    try {
      const data = getFilteredKanbanData();
      const totalLeads = (data.leads?.length ?? 0);
      const leadsEmContato = (data.contato?.length ?? 0);
      const propostasEnviadas = (data.proposta?.length ?? 0);
      const negociacoes = (data.negociacao?.length ?? 0);
      const fechamentos = (data.fechado?.length ?? 0);
      const semInteresse = (data.sem_interesse?.length ?? 0);

      // sem_interesse does NOT count for funnel metrics
      const total = totalLeads + leadsEmContato + propostasEnviadas + negociacoes + fechamentos;

      const valorTotalNegociacao = (data.negociacao || []).reduce((sum, card) => sum + (card?.valorEstimado ?? 0), 0);
      const valorTotalFechado = (data.fechado || []).reduce((sum, card) => sum + (card?.valorEstimado ?? 0), 0);

      // Count leads without interaction for 3+ days
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const activeColumns: KanbanColumn[] = ['leads', 'contato', 'proposta', 'negociacao'];
      let leadsSemAtendimento = 0;
      for (const col of activeColumns) {
        for (const card of (data[col] || [])) {
          const lastInteraction = card?.lastInteractionAt || card?.createdAt;
          if (lastInteraction) {
            try {
              const diff = now - new Date(lastInteraction).getTime();
              if (diff >= threeDaysMs) leadsSemAtendimento++;
            } catch { /* ignore */ }
          }
        }
      }

      return {
        totalLeads,
        leadsEmContato,
        propostasEnviadas,
        negociacoes,
        fechamentos,
        semInteresse,
        taxaConversaoContato: total > 0 ? Math.round((leadsEmContato / total) * 100) : 0,
        taxaConversaoProposta: total > 0 ? Math.round((propostasEnviadas / total) * 100) : 0,
        taxaConversaoNegociacao: total > 0 ? Math.round((negociacoes / total) * 100) : 0,
        taxaConversaoFechamento: total > 0 ? Math.round((fechamentos / total) * 100) : 0,
        valorTotalNegociacao,
        valorTotalFechado,
        leadsSemAtendimento,
      };
    } catch {
      return {
        totalLeads: 0,
        leadsEmContato: 0,
        propostasEnviadas: 0,
        negociacoes: 0,
        fechamentos: 0,
        semInteresse: 0,
        taxaConversaoContato: 0,
        taxaConversaoProposta: 0,
        taxaConversaoNegociacao: 0,
        taxaConversaoFechamento: 0,
        valorTotalNegociacao: 0,
        valorTotalFechado: 0,
        leadsSemAtendimento: 0,
      };
    }
  }, [getFilteredKanbanData]);

  // Get all cards flat list
  const getAllCards = useCallback((): KanbanCard[] => {
    try {
      const data = getFilteredKanbanData();
      return [
        ...(data.leads || []),
        ...(data.contato || []),
        ...(data.proposta || []),
        ...(data.negociacao || []),
        ...(data.fechado || []),
        ...(data.sem_interesse || []),
      ].filter(Boolean);
    } catch {
      return [];
    }
  }, [getFilteredKanbanData]);

  return {
    kanbanData: getFilteredKanbanData(),
    rawKanbanData: kanbanData,
    collaborators,
    metrics,
    permissions,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    addCardFromLead,
    removeCardByLeadId,
    linkAppointmentToCard,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
    getAllCards,
  };
}
