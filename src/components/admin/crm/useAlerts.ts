import { useMemo } from 'react';
import { CRMCard, KanbanColumn, KanbanData, ALERT_THRESHOLD_DAYS } from './types';

export interface CRMAlert {
  id: string;
  cardId: string;
  cardTitle: string;
  cliente: string;
  column: KanbanColumn;
  tipo: 'sem_atendimento' | 'risco_perda' | 'esfriando' | 'hot_lead' | 'followup';
  mensagem: string;
  diasSemInteracao: number;
  responsavel?: string | null;
  classificacao?: string;
  prioridade?: string;
}

export function useAlerts(kanbanData: KanbanData): CRMAlert[] {
  return useMemo(() => {
    const alerts: CRMAlert[] = [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const threeDaysMs = ALERT_THRESHOLD_DAYS * oneDayMs;
    const fiveDaysMs = 5 * oneDayMs;
    const sevenDaysMs = 7 * oneDayMs;

    const activeColumns: KanbanColumn[] = ['leads', 'contato_iniciado', 'qualificado', 'agendamento', 'visita_realizada', 'proposta'];

    for (const col of activeColumns) {
      for (const card of (kanbanData?.[col] || [])) {
        if (!card) continue;

        // Hot lead alert
        if (card.classificacao === 'quente') {
          alerts.push({
            id: `alert-${card.id}-hot`,
            cardId: card.id,
            cardTitle: card.titulo,
            cliente: card.cliente,
            column: col,
            tipo: 'hot_lead',
            mensagem: `🔥 Lead QUENTE detectado! Score: ${card.lead_score}, Prob: ${card.probabilidade_fechamento}%`,
            diasSemInteracao: 0,
            responsavel: card.responsavel,
            classificacao: card.classificacao,
            prioridade: card.prioridade,
          });
        }

        const last = card.last_interaction_at || card.created_at;
        if (!last) continue;
        const diffMs = now - new Date(last).getTime();
        const dias = Math.floor(diffMs / oneDayMs);

        // Follow-up alerts (7+ days)
        if (diffMs >= sevenDaysMs) {
          alerts.push({
            id: `alert-${card.id}-followup`,
            cardId: card.id,
            cardTitle: card.titulo,
            cliente: card.cliente,
            column: col,
            tipo: 'followup',
            mensagem: `Reengajar: ${dias} dias sem contato. Ação urgente necessária.`,
            diasSemInteracao: dias,
            responsavel: card.responsavel,
          });
        } else if (diffMs >= fiveDaysMs) {
          alerts.push({
            id: `alert-${card.id}-risco`,
            cardId: card.id,
            cardTitle: card.titulo,
            cliente: card.cliente,
            column: col,
            tipo: 'risco_perda',
            mensagem: `Risco de perda: ${dias} dias sem contato`,
            diasSemInteracao: dias,
            responsavel: card.responsavel,
          });
        } else if (diffMs >= threeDaysMs) {
          alerts.push({
            id: `alert-${card.id}-atendimento`,
            cardId: card.id,
            cardTitle: card.titulo,
            cliente: card.cliente,
            column: col,
            tipo: 'sem_atendimento',
            mensagem: `Lead sem atendimento há ${dias} dias`,
            diasSemInteracao: dias,
            responsavel: card.responsavel,
          });
        } else if (diffMs >= 2 * oneDayMs) {
          alerts.push({
            id: `alert-${card.id}-esfriando`,
            cardId: card.id,
            cardTitle: card.titulo,
            cliente: card.cliente,
            column: col,
            tipo: 'esfriando',
            mensagem: `Lead esfriando: ${dias} dias sem interação`,
            diasSemInteracao: dias,
            responsavel: card.responsavel,
          });
        }
      }
    }

    // Sort: hot leads first, then by severity
    return alerts.sort((a, b) => {
      const priority = { hot_lead: 0, followup: 1, risco_perda: 2, sem_atendimento: 3, esfriando: 4 };
      const pA = priority[a.tipo] ?? 5;
      const pB = priority[b.tipo] ?? 5;
      if (pA !== pB) return pA - pB;
      return b.diasSemInteracao - a.diasSemInteracao;
    });
  }, [kanbanData]);
}
