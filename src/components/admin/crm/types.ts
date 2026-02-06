// CRM Types - All state managed locally, no Supabase persistence

export type KanbanColumn = 'leads' | 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'sem_interesse';

export type CollaboratorRole = 'admin' | 'gestor' | 'corretor';

export interface KanbanCardHistoryEntry {
  tipo: 'alerta' | 'status' | 'interacao';
  descricao: string;
  data: string;
}

export interface KanbanCard {
  id: string;
  titulo: string;
  cliente: string;
  telefone?: string;
  email?: string;
  origemLead?: string;
  agendamentoRelacionado?: string;
  proximoAgendamento?: string;
  responsavel?: string;
  valorEstimado?: number;
  leadId?: string;
  createdAt: string;
  updatedAt?: string;
  lastInteractionAt?: string;
  notas?: string;
  historico?: KanbanCardHistoryEntry[];
}

export interface Collaborator {
  id: string;
  nome: string;
  role: CollaboratorRole;
  email?: string;
  ativo: boolean;
}

export interface KanbanData {
  leads: KanbanCard[];
  contato: KanbanCard[];
  proposta: KanbanCard[];
  negociacao: KanbanCard[];
  fechado: KanbanCard[];
  sem_interesse: KanbanCard[];
}

export interface CRMMetrics {
  totalLeads: number;
  leadsEmContato: number;
  propostasEnviadas: number;
  negociacoes: number;
  fechamentos: number;
  semInteresse: number;
  taxaConversaoContato: number;
  taxaConversaoProposta: number;
  taxaConversaoNegociacao: number;
  taxaConversaoFechamento: number;
  valorTotalNegociacao: number;
  valorTotalFechado: number;
  leadsSemAtendimento: number;
}

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; color: string }[] = [
  { key: 'leads', label: 'Leads', color: 'bg-blue-500' },
  { key: 'contato', label: 'Em Contato', color: 'bg-yellow-500' },
  { key: 'proposta', label: 'Proposta Enviada', color: 'bg-purple-500' },
  { key: 'negociacao', label: 'Negociação', color: 'bg-orange-500' },
  { key: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { key: 'sem_interesse', label: 'Sem Interesse', color: 'bg-gray-400' },
];

// Alert threshold in days
export const ALERT_THRESHOLD_DAYS = 3;

export const ROLE_PERMISSIONS: Record<CollaboratorRole, { canView: boolean; canEdit: boolean; canDelete: boolean; viewAll: boolean }> = {
  admin: { canView: true, canEdit: true, canDelete: true, viewAll: true },
  gestor: { canView: true, canEdit: true, canDelete: false, viewAll: true },
  corretor: { canView: true, canEdit: true, canDelete: false, viewAll: false },
};
