import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  BarChart3, 
  Users, 
  RefreshCw,
  Plus,
  Bell
} from 'lucide-react';
import { useCRMStore } from './useCRMStore';
import { useAlerts } from './useAlerts';
import { KanbanColumnComponent } from './KanbanColumn';
import { CRMMetricsPanel } from './CRMMetricsPanel';
import { CollaboratorsPanel } from './CollaboratorsPanel';
import { AlertsPanel } from './AlertsPanel';
import { CardFormDialog } from './CardFormDialog';
import { KanbanCard, KanbanColumn, KANBAN_COLUMNS } from './types';
import { toast } from '@/hooks/use-toast';

interface CRMKanbanPanelProps {
  currentUserId?: string;
  currentUserRole?: 'admin' | 'gestor' | 'corretor';
}

export const CRMKanbanPanel = memo(function CRMKanbanPanel({
  currentUserId,
  currentUserRole = 'admin',
}: CRMKanbanPanelProps) {
  const {
    kanbanData,
    collaborators,
    metrics,
    permissions,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
  } = useCRMStore(currentUserId, currentUserRole);

  const alerts = useAlerts(kanbanData);

  const [activeSubTab, setActiveSubTab] = useState<'kanban' | 'metrics' | 'team' | 'alerts'>('kanban');
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn>('leads');

  const criticalAlerts = (alerts ?? []).filter(a => a?.tipo === 'risco_perda' || a?.tipo === 'sem_atendimento');

  const handleAddCard = useCallback((column: KanbanColumn) => {
    try {
      setEditingCard(null);
      setSelectedColumn(column);
      setIsCardDialogOpen(true);
    } catch (e) {
      console.error('Error opening add card dialog:', e);
    }
  }, []);

  const handleEditCard = useCallback((card: KanbanCard, column: KanbanColumn) => {
    try {
      setEditingCard(card);
      setSelectedColumn(column);
      setIsCardDialogOpen(true);
    } catch (e) {
      console.error('Error opening edit card dialog:', e);
    }
  }, []);

  const handleDeleteCard = useCallback((cardId: string, column: KanbanColumn) => {
    try {
      const success = deleteCard(column, cardId);
      if (success) {
        toast({
          title: 'Card excluído',
          description: 'O card foi removido com sucesso.',
        });
      }
    } catch (e) {
      console.error('Error deleting card:', e);
    }
  }, [deleteCard]);

  const handleMoveCard = useCallback((fromColumn: KanbanColumn, cardId: string, toColumn: KanbanColumn) => {
    try {
      moveCard(fromColumn, toColumn, cardId);
      const toLabel = KANBAN_COLUMNS.find(c => c.key === toColumn)?.label ?? toColumn;
      toast({
        title: toColumn === 'sem_interesse' ? 'Lead encerrado' : 'Card movido',
        description: toColumn === 'sem_interesse'
          ? 'Lead marcado como Sem Interesse. Cronômetro pausado.'
          : `Card movido para ${toLabel}`,
      });
    } catch (e) {
      console.error('Error moving card:', e);
    }
  }, [moveCard]);

  const handleSaveCard = useCallback((data: Partial<KanbanCard>, column: KanbanColumn) => {
    try {
      if (editingCard) {
        let originalColumn: KanbanColumn | null = null;
        for (const col of KANBAN_COLUMNS) {
          if ((kanbanData[col.key] || []).find(c => c?.id === editingCard.id)) {
            originalColumn = col.key;
            break;
          }
        }

        if (originalColumn) {
          updateCard(originalColumn, editingCard.id, data);
          if (originalColumn !== column) {
            moveCard(originalColumn, column, editingCard.id);
          }
        }
        
        toast({
          title: 'Card atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        addCard(column, data as any);
        toast({
          title: 'Card criado',
          description: 'O novo card foi adicionado com sucesso.',
        });
      }
    } catch (e) {
      console.error('Error saving card:', e);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o card.',
        variant: 'destructive',
      });
    }
  }, [editingCard, kanbanData, addCard, updateCard, moveCard]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Kanban</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie leads e oportunidades em um fluxo visual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => handleAddCard('leads')}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban" className="flex items-center gap-1">
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 relative">
            <Bell className="h-4 w-4" />
            Alertas
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {criticalAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
        </TabsList>

        {/* Kanban Board */}
        <TabsContent value="kanban" className="mt-4">
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumnComponent
                  key={column.key}
                  columnKey={column.key}
                  label={column.label}
                  color={column.color}
                  cards={kanbanData[column.key] || []}
                  onAddCard={() => handleAddCard(column.key)}
                  onEditCard={(card) => handleEditCard(card, column.key)}
                  onDeleteCard={(cardId) => handleDeleteCard(cardId, column.key)}
                  onMoveCard={(cardId, toColumn) => handleMoveCard(column.key, cardId, toColumn)}
                  canDelete={permissions.canDelete}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TabsContent>

        {/* Metrics */}
        <TabsContent value="metrics" className="mt-4">
          <CRMMetricsPanel metrics={metrics} />
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel alerts={alerts} />
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="mt-4">
          <CollaboratorsPanel
            collaborators={collaborators}
            onAdd={addCollaborator}
            onUpdate={updateCollaborator}
            onDelete={deleteCollaborator}
            canManage={permissions.canDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Card Form Dialog */}
      <CardFormDialog
        open={isCardDialogOpen}
        onOpenChange={setIsCardDialogOpen}
        card={editingCard}
        column={selectedColumn}
        collaborators={collaborators}
        onSave={handleSaveCard}
      />
    </div>
  );
});
