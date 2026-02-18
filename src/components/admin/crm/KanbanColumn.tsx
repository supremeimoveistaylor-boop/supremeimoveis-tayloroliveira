import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CRMCard, KanbanColumn as KanbanColumnType } from './types';
import { KanbanCardComponent } from './KanbanCard';

interface KanbanColumnProps {
  columnKey: KanbanColumnType;
  label: string;
  color: string;
  cards: CRMCard[];
  onAddCard?: () => void;
  onEditCard?: (card: CRMCard) => void;
  onDeleteCard?: (cardId: string) => void;
  onMoveCard?: (cardId: string, toColumn: KanbanColumnType) => void;
  onAnalyzeCard?: (cardId: string) => void;
  canDelete?: boolean;
  analyzingCardId?: string | null;
}

export const KanbanColumnComponent = memo(function KanbanColumnComponent({
  columnKey, label, color, cards, onAddCard, onEditCard, onDeleteCard, onMoveCard,
  onAnalyzeCard, canDelete = false, analyzingCardId,
}: KanbanColumnProps) {
  const handleMoveCard = useCallback((cardId: string, toColumn: KanbanColumnType) => {
    onMoveCard?.(cardId, toColumn);
  }, [onMoveCard]);

  const safeCards = cards?.filter(Boolean) ?? [];

  return (
    <Card className="flex flex-col h-full min-w-[260px] max-w-[300px] bg-muted/30">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {safeCards.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddCard}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="pr-2">
            {safeCards.map((card) => (
              <KanbanCardComponent
                key={card.id}
                card={card}
                column={columnKey}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onMove={(toColumn) => handleMoveCard(card.id, toColumn)}
                onAnalyze={onAnalyzeCard}
                canDelete={canDelete}
                isAnalyzing={analyzingCardId === card.id}
              />
            ))}
            {safeCards.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum card nesta coluna
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
