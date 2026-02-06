import { useMemo } from 'react';
import { KanbanCard, KanbanColumn, KanbanData, ALERT_THRESHOLD_DAYS } from './types';

export interface CRMAlert {
  id: string;
  cardId: string;
  cardTitle: string;
  cliente: string;
  column: KanbanColumn;
  tipo: 'sem_atendimento' | 'risco_perda' | 'esfriando';
  mensagem: string;
  diasSemInteracao: number;
  responsavel?: string;
}

export function useAlerts(kanbanData: KanbanData): CRMAlert[] {
  return useMemo(() => {
    const alerts: CRMAlert[] = [];
    const now = Date.now();
    const threeDaysMs = ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    // Only check active columns (not fechado or sem_interesse)
    const activeColumns: KanbanColumn[] = ['leads', 'contato', 'proposta', 'negociacao'];

    for (const col of activeColumns) {
      const cards = kanbanData?.[col] || [];
      for (const card of cards) {
        if (!card) continue;
        try {
          const lastInteraction = card?.lastInteractionAt || card?.createdAt;
          if (!lastInteraction) continue;

          const diffMs = now - new Date(lastInteraction).getTime();
          const dias = Math.floor(diffMs / (24 * 60 * 60 * 1000));

          if (diffMs >= fiveDaysMs) {
            alerts.push({
              id: `alert-${card.id}-risco`,
              cardId: card.id,
              cardTitle: card?.titulo ?? 'Sem título',
              cliente: card?.cliente ?? 'Não informado',
              column: col,
              tipo: 'risco_perda',
              mensagem: `Risco de perda: ${dias} dias sem contato`,
              diasSemInteracao: dias,
              responsavel: card?.responsavel,
            });
          } else if (diffMs >= threeDaysMs) {
            alerts.push({
              id: `alert-${card.id}-atendimento`,
              cardId: card.id,
              cardTitle: card?.titulo ?? 'Sem título',
              cliente: card?.cliente ?? 'Não informado',
              column: col,
              tipo: 'sem_atendimento',
              mensagem: `Lead sem atendimento há ${dias} dias`,
              diasSemInteracao: dias,
              responsavel: card?.responsavel,
            });
          } else if (diffMs >= 2 * 24 * 60 * 60 * 1000) {
            alerts.push({
              id: `alert-${card.id}-esfriando`,
              cardId: card.id,
              cardTitle: card?.titulo ?? 'Sem título',
              cliente: card?.cliente ?? 'Não informado',
              column: col,
              tipo: 'esfriando',
              mensagem: `Lead esfriando: ${dias} dias sem interação`,
              diasSemInteracao: dias,
              responsavel: card?.responsavel,
            });
          }
        } catch {
          // Ignore invalid dates
        }
      }
    }

    // Sort: most critical first
    return alerts.sort((a, b) => b.diasSemInteracao - a.diasSemInteracao);
  }, [kanbanData]);
}
