import { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreVertical, User, Phone, Mail, Calendar, DollarSign,
  Edit, Trash2, ArrowRight, AlertTriangle, Brain, Target, Zap
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CRMCard, KanbanColumn, KANBAN_COLUMNS, ALERT_THRESHOLD_DAYS, CLASSIFICACAO_CONFIG } from './types';

interface KanbanCardProps {
  card: CRMCard;
  column: KanbanColumn;
  onEdit?: (card: CRMCard) => void;
  onDelete?: (cardId: string) => void;
  onMove?: (toColumn: KanbanColumn) => void;
  onAnalyze?: (cardId: string) => void;
  canDelete?: boolean;
  isAnalyzing?: boolean;
}

export const KanbanCardComponent = memo(function KanbanCardComponent({
  card, column, onEdit, onDelete, onMove, onAnalyze, canDelete = false, isAnalyzing = false,
}: KanbanCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleEdit = useCallback(() => { setIsMenuOpen(false); onEdit?.(card); }, [card, onEdit]);
  const handleDelete = useCallback(() => {
    setIsMenuOpen(false);
    if (confirm('Tem certeza que deseja excluir este card?')) onDelete?.(card?.id ?? '');
  }, [card?.id, onDelete]);
  const handleMove = useCallback((toColumn: KanbanColumn) => { setIsMenuOpen(false); onMove?.(toColumn); }, [onMove]);

  const formatCurrency = (value?: number | null) => {
    if (!value) return null;
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    } catch { return `R$ ${value}`; }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr; }
  };

  if (!card) return null;

  const isSemInteresse = column === 'sem_interesse';
  const isQuente = card.classificacao === 'quente';
  const classConfig = CLASSIFICACAO_CONFIG[card.classificacao] || CLASSIFICACAO_CONFIG.frio;

  const hasAlert = useMemo(() => {
    if (isSemInteresse || column === 'fechado') return false;
    const last = card.last_interaction_at || card.created_at;
    if (!last) return false;
    return (Date.now() - new Date(last).getTime()) >= ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  }, [card.last_interaction_at, card.created_at, isSemInteresse, column]);

  const daysWithout = useMemo(() => {
    const last = card.last_interaction_at || card.created_at;
    if (!last) return 0;
    return Math.floor((Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000));
  }, [card.last_interaction_at, card.created_at]);

  return (
    <Card className={`mb-3 shadow-sm hover:shadow-md transition-all cursor-pointer border ${
      isSemInteresse ? 'bg-muted/50 opacity-70 border-muted'
        : isQuente ? 'bg-card border-red-400/60 ring-2 ring-red-400/30 shadow-red-500/10 shadow-lg'
        : hasAlert ? 'bg-card border-yellow-400/60 ring-1 ring-yellow-400/30'
        : 'bg-card border-border'
    }`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="font-medium text-sm truncate">{card.titulo || 'Sem título'}</h4>
              {isQuente && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0 animate-pulse" />}
            </div>
            {/* Classification + Score badges */}
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className={`text-[9px] px-1.5 py-0 ${classConfig.bgColor} ${classConfig.color} border-0`}>
                {classConfig.label}
              </Badge>
              {card.lead_score > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  <Target className="h-2.5 w-2.5 mr-0.5" />
                  {card.lead_score}
                </Badge>
              )}
              {card.probabilidade_fechamento > 0 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-green-600 border-green-300">
                  {card.probabilidade_fechamento}%
                </Badge>
              )}
              {card.prioridade === 'urgente' && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">URGENTE</Badge>
              )}
              {card.prioridade === 'alta' && (
                <Badge className="text-[9px] px-1.5 py-0 bg-orange-500 text-white border-0">ALTA</Badge>
              )}
            </div>
          </div>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              {onAnalyze && (
                <DropdownMenuItem onClick={() => { setIsMenuOpen(false); onAnalyze(card.id); }} disabled={isAnalyzing}>
                  <Brain className="h-4 w-4 mr-2" /> {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Mover para</div>
              {KANBAN_COLUMNS.filter(col => col.key !== column).map(col => (
                <DropdownMenuItem key={col.key} onClick={() => handleMove(col.key)}>
                  <ArrowRight className="h-4 w-4 mr-2" /> {col.label}
                </DropdownMenuItem>
              ))}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1.5">
        {hasAlert && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{daysWithout}d sem atendimento</span>
          </div>
        )}
        {isSemInteresse && <Badge variant="secondary" className="text-[10px]">Encerrado</Badge>}

        {/* AI Summary */}
        {card.ai_summary && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Brain className="h-3 w-3 flex-shrink-0 mt-0.5 text-purple-500" />
            <span className="line-clamp-2">{card.ai_summary}</span>
          </div>
        )}

        {/* Next action */}
        {card.proxima_acao && (
          <div className="text-[10px] text-primary font-medium truncate">
            → {card.proxima_acao}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" /><span className="truncate">{card.cliente}</span>
        </div>
        {card.telefone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /><span className="truncate">{card.telefone}</span>
          </div>
        )}
        {card.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" /><span className="truncate">{card.email}</span>
          </div>
        )}
        {card.proximo_agendamento && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 text-primary" />
            <span className="text-primary font-medium">{formatDate(card.proximo_agendamento)}</span>
          </div>
        )}
        {card.valor_estimado && card.valor_estimado > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="text-green-600 font-medium">{formatCurrency(card.valor_estimado)}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {card.origem_lead && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{card.origem_lead}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
