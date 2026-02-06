import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard, KanbanColumn as KanbanColumnType } from './types';
import { KanbanCardComponent } from './KanbanCard';

interface KanbanColumnProps {
  columnKey: KanbanColumnType;
  label: string;
  color: string;
  cards: KanbanCard[];
  onAddCard?: () => void;
  onEditCard?: (card: KanbanCard) => void;
  onDeleteCard?: (cardId: string) => void;
  onMoveCard?: (cardId: string, toColumn: KanbanColumnType) => void;
  canDelete?: boolean;
}

export const KanbanColumnComponent = memo(function KanbanColumnComponent({
  columnKey,
  label,
  color,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onMoveCard,
  canDelete = false,
}: KanbanColumnProps) {
  const handleMoveCard = useCallback((cardId: string, toColumn: KanbanColumnType) => {
    try {
      onMoveCard?.(cardId, toColumn);
    } catch (e) {
      console.error('Error moving card:', e);
    }
  }, [onMoveCard]);

  const safeCards = cards?.filter(Boolean) ?? [];
  const cardCount = safeCards.length;

  return (
    <Card className="flex flex-col h-full min-w-[280px] max-w-[320px] bg-muted/30">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <CardTitle className="text-sm font-medium">{label ?? 'Coluna'}</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {cardCount}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onAddCard}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="pr-2">
            {safeCards.map((card) => (
              <KanbanCardComponent
                key={card?.id ?? Math.random()}
                card={card}
                column={columnKey}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onMove={(toColumn) => handleMoveCard(card?.id ?? '', toColumn)}
                canDelete={canDelete}
              />
            ))}
            {cardCount === 0 && (
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
