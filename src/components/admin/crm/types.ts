// CRM Types - Supabase-backed with AI integration

export type KanbanColumn = 'leads' | 'contato_iniciado' | 'qualificado' | 'agendamento' | 'visita_realizada' | 'proposta' | 'fechado' | 'sem_interesse';

export type CollaboratorRole = 'admin' | 'gestor' | 'corretor';

export type LeadClassificacao = 'frio' | 'morno' | 'quente';
export type LeadPrioridade = 'normal' | 'alta' | 'urgente';

export interface CRMCard {
  id: string;
  lead_id?: string | null;
  titulo: string;
  cliente: string;
  telefone?: string | null;
  email?: string | null;
  coluna: KanbanColumn;
  origem_lead?: string | null;
  responsavel?: string | null;
  valor_estimado?: number | null;
  lead_score: number;
  classificacao: LeadClassificacao;
  probabilidade_fechamento: number;
  prioridade: LeadPrioridade;
  notas?: string | null;
  proximo_agendamento?: string | null;
  ultimo_followup_at?: string | null;
  proxima_acao?: string | null;
  historico: any[];
  ai_summary?: string | null;
  ai_last_analysis_at?: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at?: string | null;
}

export interface CRMEvent {
  id: string;
  card_id?: string | null;
  lead_id?: string | null;
  event_type: string;
  old_value?: string | null;
  new_value?: string | null;
  metadata: any;
  created_at: string;
}

export interface Collaborator {
  id: string;
  nome: string;
  role: CollaboratorRole;
  email?: string;
  ativo: boolean;
}

export interface KanbanData {
  leads: CRMCard[];
  contato_iniciado: CRMCard[];
  qualificado: CRMCard[];
  agendamento: CRMCard[];
  visita_realizada: CRMCard[];
  proposta: CRMCard[];
  fechado: CRMCard[];
  sem_interesse: CRMCard[];
}

export interface CRMMetrics {
  totalLeads: number;
  contatoIniciado: number;
  qualificados: number;
  agendamentos: number;
  visitasRealizadas: number;
  propostas: number;
  fechamentos: number;
  semInteresse: number;
  taxaConversaoContato: number;
  taxaConversaoQualificado: number;
  taxaConversaoAgendamento: number;
  taxaConversaoFechamento: number;
  valorTotalProposta: number;
  valorTotalFechado: number;
  leadsSemAtendimento: number;
  leadsQuentes: number;
  probabilidadeMedia: number;
}

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; color: string }[] = [
  { key: 'leads', label: 'Novos Leads', color: 'bg-blue-500' },
  { key: 'contato_iniciado', label: 'Contato Iniciado', color: 'bg-cyan-500' },
  { key: 'qualificado', label: 'Qualificado', color: 'bg-yellow-500' },
  { key: 'agendamento', label: 'Agendamento', color: 'bg-purple-500' },
  { key: 'visita_realizada', label: 'Visita Realizada', color: 'bg-indigo-500' },
  { key: 'proposta', label: 'Proposta', color: 'bg-orange-500' },
  { key: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { key: 'sem_interesse', label: 'Sem Interesse', color: 'bg-gray-400' },
];

export const ALERT_THRESHOLD_DAYS = 3;

export const ROLE_PERMISSIONS: Record<CollaboratorRole, { canView: boolean; canEdit: boolean; canDelete: boolean; viewAll: boolean }> = {
  admin: { canView: true, canEdit: true, canDelete: true, viewAll: true },
  gestor: { canView: true, canEdit: true, canDelete: false, viewAll: true },
  corretor: { canView: true, canEdit: true, canDelete: false, viewAll: false },
};

export const CLASSIFICACAO_CONFIG: Record<LeadClassificacao, { label: string; color: string; bgColor: string }> = {
  frio: { label: '❄️ Frio', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  morno: { label: '🌤️ Morno', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  quente: { label: '🔥 Quente', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};
