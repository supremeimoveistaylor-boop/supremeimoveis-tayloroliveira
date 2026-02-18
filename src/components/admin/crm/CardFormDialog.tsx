import { useState, useEffect, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CRMCard, KanbanColumn, Collaborator, KANBAN_COLUMNS } from './types';

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CRMCard | null;
  column?: KanbanColumn;
  collaborators?: Collaborator[];
  onSave: (data: Partial<CRMCard>, column: KanbanColumn) => void;
}

export const CardFormDialog = memo(function CardFormDialog({
  open, onOpenChange, card, column = 'leads', collaborators = [], onSave,
}: CardFormDialogProps) {
  const [formData, setFormData] = useState({
    titulo: '', cliente: '', telefone: '', email: '',
    origem_lead: '', responsavel: '', valor_estimado: '', notas: '',
  });
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn>(column);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (card) {
        setFormData({
          titulo: card.titulo || '',
          cliente: card.cliente || '',
          telefone: card.telefone || '',
          email: card.email || '',
          origem_lead: card.origem_lead || '',
          responsavel: card.responsavel || '',
          valor_estimado: card.valor_estimado?.toString() || '',
          notas: card.notas || '',
        });
      } else {
        setFormData({ titulo: '', cliente: '', telefone: '', email: '', origem_lead: '', responsavel: '', valor_estimado: '', notas: '' });
      }
      setSelectedColumn(column);
    }
  }, [open, card, column]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const valor = formData.valor_estimado
        ? parseFloat(formData.valor_estimado.replace(/[^\d.,]/g, '').replace(',', '.'))
        : undefined;

      onSave({
        ...card,
        titulo: formData.titulo || 'Novo Card',
        cliente: formData.cliente || 'Não informado',
        telefone: formData.telefone || undefined,
        email: formData.email || undefined,
        origem_lead: formData.origem_lead || undefined,
        responsavel: formData.responsavel || undefined,
        valor_estimado: valor || undefined,
        notas: formData.notas || undefined,
      }, selectedColumn);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [formData, card, selectedColumn, onSave, onOpenChange]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{card ? 'Editar Card' : 'Novo Card'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={formData.titulo} onChange={(e) => handleChange('titulo', e.target.value)} placeholder="Título do card" />
            </div>
            <div className="space-y-2">
              <Label>Coluna</Label>
              <Select value={selectedColumn} onValueChange={(v) => setSelectedColumn(v as KanbanColumn)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map(col => (
                    <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input value={formData.cliente} onChange={(e) => handleChange('cliente', e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={formData.telefone} onChange={(e) => handleChange('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input value={formData.origem_lead} onChange={(e) => handleChange('origem_lead', e.target.value)} placeholder="Ex: Chat, Telefone" />
            </div>
            <div className="space-y-2">
              <Label>Valor Estimado (R$)</Label>
              <Input value={formData.valor_estimado} onChange={(e) => handleChange('valor_estimado', e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={formData.responsavel || 'none'} onValueChange={(v) => handleChange('responsavel', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {collaborators.filter(c => c?.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={formData.notas} onChange={(e) => handleChange('notas', e.target.value)} placeholder="Observações..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
