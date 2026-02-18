import { useState, useCallback, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutGrid, BarChart3, Users, RefreshCw, Plus, Bell, Brain, Loader2
} from 'lucide-react';
import { useCRMStore } from './useCRMStore';
import { useAlerts } from './useAlerts';
import { KanbanColumnComponent } from './KanbanColumn';
import { CRMMetricsPanel } from './CRMMetricsPanel';
import { CollaboratorsPanel } from './CollaboratorsPanel';
import { AlertsPanel } from './AlertsPanel';
import { AIAnalyticsPanel } from './AIAnalyticsPanel';
import { CardFormDialog } from './CardFormDialog';
import { CRMCard, KanbanColumn, KANBAN_COLUMNS } from './types';
import { toast } from '@/hooks/use-toast';

// Notification sound for hot leads
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVocEpfR6bpxMQQml8rrw31NHBCb0O21eFQPD5fQ77t9VQ0Pm87utXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwPl87vtXlVDA+Xzu+1eVUMD5fO77V5VQwP';

interface CRMKanbanPanelProps {
  currentUserId?: string;
  currentUserRole?: 'admin' | 'gestor' | 'corretor';
}

export const CRMKanbanPanel = memo(function CRMKanbanPanel({
  currentUserId,
  currentUserRole = 'admin',
}: CRMKanbanPanelProps) {
  const {
    kanbanData, allCards, collaborators, metrics, permissions, isLoading,
    addCard, updateCard, deleteCard, moveCard, analyzeLeadWithAI, analyzeAllLeads, loadCards,
    addCollaborator, updateCollaborator, deleteCollaborator,
  } = useCRMStore(currentUserId, currentUserRole);

  const alerts = useAlerts(kanbanData);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<string>('kanban');
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CRMCard | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn>('leads');
  const [analyzingCardId, setAnalyzingCardId] = useState<string | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

  const criticalAlerts = (alerts ?? []).filter(a => a?.tipo === 'risco_perda' || a?.tipo === 'sem_atendimento' || a?.tipo === 'hot_lead');

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const handleAddCard = useCallback((column: KanbanColumn) => {
    setEditingCard(null);
    setSelectedColumn(column);
    setIsCardDialogOpen(true);
  }, []);

  const handleEditCard = useCallback((card: CRMCard, column: KanbanColumn) => {
    setEditingCard(card);
    setSelectedColumn(column);
    setIsCardDialogOpen(true);
  }, []);

  const handleDeleteCard = useCallback(async (cardId: string, column: KanbanColumn) => {
    const success = await deleteCard(column, cardId);
    if (success) toast({ title: 'Card excluído', description: 'O card foi removido com sucesso.' });
  }, [deleteCard]);

  const handleMoveCard = useCallback(async (fromColumn: KanbanColumn, cardId: string, toColumn: KanbanColumn) => {
    await moveCard(fromColumn, toColumn, cardId);
    const toLabel = KANBAN_COLUMNS.find(c => c.key === toColumn)?.label ?? toColumn;
    toast({
      title: toColumn === 'sem_interesse' ? 'Lead encerrado' : 'Card movido',
      description: toColumn === 'sem_interesse' ? 'Lead marcado como Sem Interesse.' : `Card movido para ${toLabel}`,
    });
  }, [moveCard]);

  const handleSaveCard = useCallback(async (data: Partial<CRMCard>, column: KanbanColumn) => {
    try {
      if (editingCard) {
        await updateCard(editingCard.coluna, editingCard.id, data);
        if (editingCard.coluna !== column) {
          await moveCard(editingCard.coluna, column, editingCard.id);
        }
        toast({ title: 'Card atualizado' });
      } else {
        await addCard(column, data);
        toast({ title: 'Card criado' });
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  }, [editingCard, addCard, updateCard, moveCard]);

  const handleAnalyzeCard = useCallback(async (cardId: string) => {
    setAnalyzingCardId(cardId);
    try {
      const result = await analyzeLeadWithAI(cardId);
      if (result?.is_hot_lead) {
        playNotificationSound();
        toast({
          title: '🔥 HOT LEAD DETECTADO!',
          description: `Lead classificado como QUENTE com ${result.analysis?.probabilidade_fechamento}% de probabilidade.`,
          duration: 8000,
        });
      } else if (result?.success) {
        toast({
          title: '🧠 Análise concluída',
          description: result.analysis?.resumo || 'Lead analisado com sucesso.',
        });
      } else {
        toast({ title: 'Erro na análise', description: 'Tente novamente.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro na análise', variant: 'destructive' });
    } finally {
      setAnalyzingCardId(null);
    }
  }, [analyzeLeadWithAI, playNotificationSound]);

  const handleAnalyzeAll = useCallback(async () => {
    setIsAnalyzingAll(true);
    toast({ title: '🧠 Analisando todos os leads...', description: 'Isso pode levar alguns segundos.' });
    try {
      const results = await analyzeAllLeads();
      const hotCount = results.filter((r: any) => r?.is_hot_lead).length;
      if (hotCount > 0) playNotificationSound();
      toast({
        title: '✅ Análise completa',
        description: `${results.length} leads analisados. ${hotCount} lead(s) quente(s) detectado(s).`,
        duration: 8000,
      });
    } catch {
      toast({ title: 'Erro na análise em lote', variant: 'destructive' });
    } finally {
      setIsAnalyzingAll(false);
    }
  }, [analyzeAllLeads, playNotificationSound]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            CRM Kanban <Badge className="bg-purple-500 text-white border-0 text-xs">IA</Badge>
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie leads com inteligência artificial integrada
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadCards()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleAnalyzeAll} disabled={isAnalyzingAll} className="border-purple-300 text-purple-700 hover:bg-purple-50">
            {isAnalyzingAll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
            {isAnalyzingAll ? 'Analisando...' : 'Analisar Todos'}
          </Button>
          <Button size="sm" onClick={() => handleAddCard('leads')}>
            <Plus className="h-4 w-4 mr-1" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="kanban" className="flex items-center gap-1">
            <LayoutGrid className="h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="ai_analytics" className="flex items-center gap-1">
            <Brain className="h-4 w-4" /> IA Analytics
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 relative">
            <Bell className="h-4 w-4" /> Alertas
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {criticalAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Carregando cards...</span>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-4">
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
                    onAnalyzeCard={handleAnalyzeCard}
                    canDelete={permissions.canDelete}
                    analyzingCardId={analyzingCardId}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="ai_analytics" className="mt-4">
          <AIAnalyticsPanel metrics={metrics} allCards={allCards} kanbanData={kanbanData} />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <CRMMetricsPanel metrics={metrics} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel alerts={alerts} />
        </TabsContent>

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
