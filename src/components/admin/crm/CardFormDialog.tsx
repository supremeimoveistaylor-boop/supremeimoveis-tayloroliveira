import { useState, useEffect, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanCard, KanbanColumn, Collaborator } from './types';

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: KanbanCard | null;
  column?: KanbanColumn;
  collaborators?: Collaborator[];
  onSave: (data: Partial<KanbanCard>, column: KanbanColumn) => void;
}

const initialFormData = {
  titulo: '',
  cliente: '',
  telefone: '',
  email: '',
  origemLead: '',
  responsavel: '',
  valorEstimado: '',
  notas: '',
};

export const CardFormDialog = memo(function CardFormDialog({
  open,
  onOpenChange,
  card,
  column = 'leads',
  collaborators = [],
  onSave,
}: CardFormDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn>(column);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (card) {
        setFormData({
          titulo: card?.titulo ?? '',
          cliente: card?.cliente ?? '',
          telefone: card?.telefone ?? '',
          email: card?.email ?? '',
          origemLead: card?.origemLead ?? '',
          responsavel: card?.responsavel ?? '',
          valorEstimado: card?.valorEstimado?.toString() ?? '',
          notas: card?.notas ?? '',
        });
      } else {
        setFormData(initialFormData);
      }
      setSelectedColumn(column);
    }
  }, [open, card, column]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const valorEstimado = formData.valorEstimado 
        ? parseFloat(formData.valorEstimado.replace(/[^\d.,]/g, '').replace(',', '.')) 
        : undefined;

      onSave({
        ...card,
        titulo: formData.titulo || 'Novo Card',
        cliente: formData.cliente || 'Não informado',
        telefone: formData.telefone || undefined,
        email: formData.email || undefined,
        origemLead: formData.origemLead || undefined,
        responsavel: formData.responsavel || undefined,
        valorEstimado: valorEstimado || undefined,
        notas: formData.notas || undefined,
      }, selectedColumn);
      
      onOpenChange(false);
    } catch (e) {
      console.error('Error saving card:', e);
    } finally {
      setIsSaving(false);
    }
  }, [formData, card, selectedColumn, onSave, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {card ? 'Editar Card' : 'Novo Card'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Título do card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="column">Coluna</Label>
              <Select value={selectedColumn} onValueChange={(v) => setSelectedColumn(v as KanbanColumn)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="contato">Em Contato</SelectItem>
                  <SelectItem value="proposta">Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="sem_interesse">Sem Interesse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Input
                id="origem"
                value={formData.origemLead}
                onChange={(e) => handleChange('origemLead', e.target.value)}
                placeholder="Ex: Chat, Telefone, Site"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Estimado (R$)</Label>
              <Input
                id="valor"
                value={formData.valorEstimado}
                onChange={(e) => handleChange('valorEstimado', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Select 
              value={formData.responsavel || 'none'} 
              onValueChange={(v) => handleChange('responsavel', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(collaborators || []).filter(c => c?.ativo).map((collab) => (
                  <SelectItem key={collab?.id ?? 'unknown'} value={collab?.id ?? ''}>
                    {collab?.nome ?? 'Sem nome'} ({collab?.role ?? 'corretor'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              placeholder="Observações sobre o cliente..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
