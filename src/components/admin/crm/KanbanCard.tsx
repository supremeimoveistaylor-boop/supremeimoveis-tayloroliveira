import { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  Edit,
  Trash2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { KanbanCard as KanbanCardType, KanbanColumn, KANBAN_COLUMNS, ALERT_THRESHOLD_DAYS } from './types';

interface KanbanCardProps {
  card: KanbanCardType;
  column: KanbanColumn;
  onEdit?: (card: KanbanCardType) => void;
  onDelete?: (cardId: string) => void;
  onMove?: (toColumn: KanbanColumn) => void;
  canDelete?: boolean;
}

export const KanbanCardComponent = memo(function KanbanCardComponent({
  card,
  column,
  onEdit,
  onDelete,
  onMove,
  canDelete = false,
}: KanbanCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleEdit = useCallback(() => {
    try {
      setIsMenuOpen(false);
      onEdit?.(card);
    } catch (e) {
      console.error('Error editing card:', e);
    }
  }, [card, onEdit]);

  const handleDelete = useCallback(() => {
    try {
      setIsMenuOpen(false);
      if (confirm('Tem certeza que deseja excluir este card?')) {
        onDelete?.(card?.id ?? '');
      }
    } catch (e) {
      console.error('Error deleting card:', e);
    }
  }, [card?.id, onDelete]);

  const handleMove = useCallback((toColumn: KanbanColumn) => {
    try {
      setIsMenuOpen(false);
      onMove?.(toColumn);
    } catch (e) {
      console.error('Error moving card:', e);
    }
  }, [onMove]);

  const formatCurrency = useCallback((value?: number) => {
    if (!value) return null;
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    } catch {
      return `R$ ${value}`;
    }
  }, []);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }, []);

  if (!card) return null;

  const isSemInteresse = column === 'sem_interesse';
  
  // Check if card has inactivity alert (3+ days without interaction)
  const hasAlert = useMemo(() => {
    if (isSemInteresse) return false;
    try {
      const lastInteraction = card?.lastInteractionAt || card?.createdAt;
      if (!lastInteraction) return false;
      const diffMs = Date.now() - new Date(lastInteraction).getTime();
      return diffMs >= ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [card?.lastInteractionAt, card?.createdAt, isSemInteresse]);

  const daysWithoutInteraction = useMemo(() => {
    try {
      const lastInteraction = card?.lastInteractionAt || card?.createdAt;
      if (!lastInteraction) return 0;
      const diffMs = Date.now() - new Date(lastInteraction).getTime();
      return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    } catch {
      return 0;
    }
  }, [card?.lastInteractionAt, card?.createdAt]);

  return (
    <Card className={`mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${
      isSemInteresse 
        ? 'bg-muted/50 opacity-70 border-muted' 
        : hasAlert 
          ? 'bg-card border-yellow-400/60 ring-1 ring-yellow-400/30' 
          : 'bg-card border-border'
    }`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate" title={card?.titulo ?? ''}>
              {card?.titulo ?? 'Sem título'}
            </h4>
          </div>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Mover para
              </div>
              {KANBAN_COLUMNS.filter(col => col.key !== column).map(col => (
                <DropdownMenuItem key={col.key} onClick={() => handleMove(col.key)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {col.label}
                </DropdownMenuItem>
              ))}
              
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Alert indicator */}
        {hasAlert && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{daysWithoutInteraction}d sem atendimento</span>
          </div>
        )}

        {/* Sem Interesse indicator */}
        {isSemInteresse && (
          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
            Encerrado
          </Badge>
        )}

        {/* Cliente */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{card?.cliente ?? 'Não informado'}</span>
        </div>

        {/* Telefone */}
        {card?.telefone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{card.telefone}</span>
          </div>
        )}

        {/* Email */}
        {card?.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{card.email}</span>
          </div>
        )}

        {/* Próximo Agendamento */}
        {card?.proximoAgendamento && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 flex-shrink-0 text-primary" />
            <span className="text-primary font-medium">
              {formatDate(card.proximoAgendamento)}
            </span>
          </div>
        )}

        {/* Valor Estimado */}
        {card?.valorEstimado && (
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3 w-3 flex-shrink-0 text-green-600" />
            <span className="text-green-600 font-medium">
              {formatCurrency(card.valorEstimado)}
            </span>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 pt-1">
          {card?.origemLead && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {card.origemLead}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
