import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CRMCard, KanbanColumn, KanbanData, Collaborator, CRMMetrics, CollaboratorRole, ROLE_PERMISSIONS, KANBAN_COLUMNS } from './types';

const COLLABORATORS_KEY = 'crm_collaborators';
const EMPTY_KANBAN: KanbanData = {
  leads: [], contato_iniciado: [], qualificado: [], agendamento: [],
  visita_realizada: [], proposta: [], fechado: [], sem_interesse: [],
};

const initialCollaborators: Collaborator[] = [
  { id: 'admin-1', nome: 'Administrador', role: 'admin', ativo: true },
];

const safeParseJSON = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
};

export function useCRMStore(currentUserId?: string, currentUserRole: CollaboratorRole = 'corretor') {
  const [allCards, setAllCards] = useState<CRMCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    try {
      return safeParseJSON(localStorage.getItem(COLLABORATORS_KEY), initialCollaborators);
    } catch { return initialCollaborators; }
  });

  const channelRef = useRef<any>(null);

  // Load cards from Supabase
  const loadCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('crm_cards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading CRM cards:', error);
        return;
      }
      setAllCards((data || []) as CRMCard[]);
    } catch (e) {
      console.error('Failed to load CRM cards:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime
  useEffect(() => {
    loadCards();

    const channel = supabase
      .channel('crm_cards_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_cards' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAllCards(prev => {
            if (prev.some(c => c.id === (payload.new as CRMCard).id)) return prev;
            return [...prev, payload.new as CRMCard];
          });
        } else if (payload.eventType === 'UPDATE') {
          setAllCards(prev => prev.map(c => c.id === (payload.new as CRMCard).id ? payload.new as CRMCard : c));
        } else if (payload.eventType === 'DELETE') {
          setAllCards(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [loadCards]);

  const permissions = useMemo(() => ROLE_PERMISSIONS[currentUserRole], [currentUserRole]);

  // Build kanban data from flat card list
  const kanbanData = useMemo((): KanbanData => {
    const data = { ...EMPTY_KANBAN };
    for (const key of Object.keys(data) as KanbanColumn[]) {
      data[key] = [];
    }
    for (const card of allCards) {
      if (!card) continue;
      const col = card.coluna as KanbanColumn;
      if (!permissions.viewAll && card.responsavel !== currentUserId) continue;
      if (data[col]) {
        data[col].push(card);
      } else {
        data.leads.push(card); // fallback
      }
    }
    return data;
  }, [allCards, permissions.viewAll, currentUserId]);

  // Add card
  const addCard = useCallback(async (column: KanbanColumn, cardData: Partial<CRMCard>) => {
    try {
      const newCard = {
        titulo: cardData.titulo || 'Novo Card',
        cliente: cardData.cliente || 'Não informado',
        telefone: cardData.telefone || null,
        email: cardData.email || null,
        coluna: column,
        origem_lead: cardData.origem_lead || null,
        responsavel: cardData.responsavel || null,
        valor_estimado: cardData.valor_estimado || 0,
        lead_score: cardData.lead_score || 0,
        classificacao: cardData.classificacao || 'frio',
        probabilidade_fechamento: cardData.probabilidade_fechamento || 0,
        prioridade: cardData.prioridade || 'normal',
        notas: cardData.notas || null,
        lead_id: cardData.lead_id || null,
        historico: JSON.stringify([]),
      };

      const { data, error } = await (supabase as any)
        .from('crm_cards')
        .insert(newCard)
        .select()
        .single();

      if (error) {
        console.error('Error adding card:', error);
        return null;
      }
      return data as CRMCard;
    } catch (e) {
      console.error('Failed to add card:', e);
      return null;
    }
  }, []);

  // Update card
  const updateCard = useCallback(async (column: KanbanColumn, cardId: string, updates: Partial<CRMCard>) => {
    try {
      const cleanUpdates: any = { ...updates };
      delete cleanUpdates.id;
      delete cleanUpdates.created_at;
      if (cleanUpdates.historico && typeof cleanUpdates.historico !== 'string') {
        cleanUpdates.historico = JSON.stringify(cleanUpdates.historico);
      }
      cleanUpdates.last_interaction_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('crm_cards')
        .update(cleanUpdates)
        .eq('id', cardId);

      if (error) console.error('Error updating card:', error);
    } catch (e) {
      console.error('Failed to update card:', e);
    }
  }, []);

  // Delete card
  const deleteCard = useCallback(async (column: KanbanColumn, cardId: string) => {
    if (!permissions.canDelete) return false;
    try {
      const { error } = await (supabase as any)
        .from('crm_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        console.error('Error deleting card:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to delete card:', e);
      return false;
    }
  }, [permissions.canDelete]);

  // Move card
  const moveCard = useCallback(async (fromColumn: KanbanColumn, toColumn: KanbanColumn, cardId: string) => {
    try {
      const card = allCards.find(c => c.id === cardId);
      if (!card) return;

      const historico = Array.isArray(card.historico) ? card.historico : [];
      const newHistorico = [...historico, {
        tipo: 'status',
        descricao: `Movido de "${fromColumn}" para "${toColumn}"`,
        data: new Date().toISOString(),
      }];

      const updates: any = {
        coluna: toColumn,
        historico: JSON.stringify(newHistorico),
        last_interaction_at: toColumn === 'sem_interesse' ? card.last_interaction_at : new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('crm_cards')
        .update(updates)
        .eq('id', cardId);

      if (error) console.error('Error moving card:', error);
    } catch (e) {
      console.error('Failed to move card:', e);
    }
  }, [allCards]);

  // Add card from lead
  const addCardFromLead = useCallback(async (lead: { id: string; name?: string; phone?: string; email?: string; origin?: string }) => {
    return addCard('leads', {
      titulo: lead.name || 'Novo Lead',
      cliente: lead.name || 'Não informado',
      telefone: lead.phone || null,
      email: lead.email || null,
      origem_lead: lead.origin || 'Chat',
      lead_id: lead.id,
    });
  }, [addCard]);

  // Analyze lead with AI
  const analyzeLeadWithAI = useCallback(async (cardId: string) => {
    try {
      const card = allCards.find(c => c.id === cardId);
      if (!card) return null;

      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: { card_id: cardId, lead_id: card.lead_id },
      });

      if (error) {
        console.error('AI analysis error:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Failed to analyze lead:', e);
      return null;
    }
  }, [allCards]);

  // Analyze all cards
  const analyzeAllLeads = useCallback(async () => {
    const activeCards = allCards.filter(c => c.coluna !== 'fechado' && c.coluna !== 'sem_interesse');
    const results = [];
    for (const card of activeCards) {
      const result = await analyzeLeadWithAI(card.id);
      if (result) results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    await loadCards(); // Refresh after analysis
    return results;
  }, [allCards, analyzeLeadWithAI, loadCards]);

  // Collaborator management (still localStorage)
  const persistCollaborators = useCallback((data: Collaborator[]) => {
    try { localStorage.setItem(COLLABORATORS_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const addCollaborator = useCallback((collaborator: Omit<Collaborator, 'id'>) => {
    const newCollab: Collaborator = { ...collaborator, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setCollaborators(prev => { const u = [...prev, newCollab]; persistCollaborators(u); return u; });
    return newCollab;
  }, [persistCollaborators]);

  const updateCollaborator = useCallback((id: string, updates: Partial<Collaborator>) => {
    setCollaborators(prev => { const u = prev.map(c => c.id === id ? { ...c, ...updates } : c); persistCollaborators(u); return u; });
  }, [persistCollaborators]);

  const deleteCollaborator = useCallback((id: string) => {
    setCollaborators(prev => { const u = prev.filter(c => c.id !== id); persistCollaborators(u); return u; });
  }, [persistCollaborators]);

  // Calculate metrics
  const metrics = useMemo((): CRMMetrics => {
    const d = kanbanData;
    const totalLeads = d.leads.length;
    const contatoIniciado = d.contato_iniciado.length;
    const qualificados = d.qualificado.length;
    const agendamentos = d.agendamento.length;
    const visitasRealizadas = d.visita_realizada.length;
    const propostas = d.proposta.length;
    const fechamentos = d.fechado.length;
    const semInteresse = d.sem_interesse.length;
    const total = totalLeads + contatoIniciado + qualificados + agendamentos + visitasRealizadas + propostas + fechamentos;

    const valorTotalProposta = [...d.proposta, ...d.agendamento, ...d.visita_realizada].reduce((s, c) => s + (c.valor_estimado || 0), 0);
    const valorTotalFechado = d.fechado.reduce((s, c) => s + (c.valor_estimado || 0), 0);

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const activeColumns: KanbanColumn[] = ['leads', 'contato_iniciado', 'qualificado', 'agendamento', 'visita_realizada', 'proposta'];
    let leadsSemAtendimento = 0;
    for (const col of activeColumns) {
      for (const card of d[col]) {
        const last = card.last_interaction_at || card.created_at;
        if (last && (now - new Date(last).getTime()) >= threeDaysMs) leadsSemAtendimento++;
      }
    }

    const leadsQuentes = allCards.filter(c => c.classificacao === 'quente' && c.coluna !== 'fechado' && c.coluna !== 'sem_interesse').length;
    const activeCards = allCards.filter(c => c.coluna !== 'fechado' && c.coluna !== 'sem_interesse');
    const probabilidadeMedia = activeCards.length > 0
      ? Math.round(activeCards.reduce((s, c) => s + (c.probabilidade_fechamento || 0), 0) / activeCards.length)
      : 0;

    return {
      totalLeads, contatoIniciado, qualificados, agendamentos, visitasRealizadas,
      propostas, fechamentos, semInteresse,
      taxaConversaoContato: total > 0 ? Math.round((contatoIniciado / total) * 100) : 0,
      taxaConversaoQualificado: total > 0 ? Math.round((qualificados / total) * 100) : 0,
      taxaConversaoAgendamento: total > 0 ? Math.round((agendamentos / total) * 100) : 0,
      taxaConversaoFechamento: total > 0 ? Math.round((fechamentos / total) * 100) : 0,
      valorTotalProposta, valorTotalFechado, leadsSemAtendimento, leadsQuentes, probabilidadeMedia,
    };
  }, [kanbanData, allCards]);

  return {
    kanbanData,
    allCards,
    collaborators,
    metrics,
    permissions,
    isLoading,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    addCardFromLead,
    analyzeLeadWithAI,
    analyzeAllLeads,
    loadCards,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
  };
}
