import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, User, Shield, Users as UsersIcon } from 'lucide-react';
import { Collaborator, CollaboratorRole } from './types';

interface CollaboratorsPanelProps {
  collaborators: Collaborator[];
  onAdd: (collaborator: Omit<Collaborator, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Collaborator>) => void;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

const roleLabels: Record<CollaboratorRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-red-500' },
  gestor: { label: 'Gestor', color: 'bg-blue-500' },
  corretor: { label: 'Corretor', color: 'bg-green-500' },
};

export const CollaboratorsPanel = memo(function CollaboratorsPanel({
  collaborators,
  onAdd,
  onUpdate,
  onDelete,
  canManage = true,
}: CollaboratorsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'corretor' as CollaboratorRole,
    ativo: true,
  });

  const handleOpenDialog = useCallback((collaborator?: Collaborator) => {
    if (collaborator) {
      setEditingCollaborator(collaborator);
      setFormData({
        nome: collaborator?.nome ?? '',
        email: collaborator?.email ?? '',
        role: collaborator?.role ?? 'corretor',
        ativo: collaborator?.ativo ?? true,
      });
    } else {
      setEditingCollaborator(null);
      setFormData({
        nome: '',
        email: '',
        role: 'corretor',
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    try {
      if (editingCollaborator) {
        onUpdate(editingCollaborator.id, formData);
      } else {
        onAdd(formData);
      }
      setIsDialogOpen(false);
    } catch (e) {
      console.error('Error saving collaborator:', e);
    }
  }, [editingCollaborator, formData, onAdd, onUpdate]);

  const handleDelete = useCallback((id: string) => {
    try {
      if (confirm('Tem certeza que deseja excluir este colaborador?')) {
        onDelete(id);
      }
    } catch (e) {
      console.error('Error deleting collaborator:', e);
    }
  }, [onDelete]);

  const safeCollaborators = collaborators?.filter(Boolean) ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            <CardTitle className="text-lg">Colaboradores</CardTitle>
            <Badge variant="secondary">{safeCollaborators.length}</Badge>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {safeCollaborators.map((collab) => {
            const roleInfo = roleLabels[collab?.role ?? 'corretor'];
            return (
              <div
                key={collab?.id ?? Math.random()}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${collab?.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{collab?.nome ?? 'Sem nome'}</span>
                    </div>
                    {collab?.email && (
                      <span className="text-xs text-muted-foreground">{collab.email}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {roleInfo?.label ?? 'Corretor'}
                  </Badge>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(collab)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(collab?.id ?? '')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {safeCollaborators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum colaborador cadastrado
            </div>
          )}
        </div>
      </CardContent>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do colaborador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as CollaboratorRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="corretor">Corretor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});
