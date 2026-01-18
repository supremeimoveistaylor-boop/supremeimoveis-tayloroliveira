import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Phone, Mail, UserCheck, UserX, Loader2 } from "lucide-react";

interface ChatAttendant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "atendente" | "corretor" | "gestor";
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AttendantFormData {
  name: string;
  phone: string;
  email: string;
  role: "atendente" | "corretor" | "gestor";
  active: boolean;
}

const initialFormData: AttendantFormData = {
  name: "",
  phone: "",
  email: "",
  role: "atendente",
  active: true,
};

export const ChatAttendantsPanel = () => {
  const [attendants, setAttendants] = useState<ChatAttendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AttendantFormData>(initialFormData);
  const { toast } = useToast();

  const fetchAttendants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_attendants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttendants((data || []) as ChatAttendant[]);
    } catch (error) {
      console.error("Erro ao buscar atendentes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os atendentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendants();
  }, []);

  const handleOpenDialog = (attendant?: ChatAttendant) => {
    if (attendant) {
      setEditingId(attendant.id);
      setFormData({
        name: attendant.name,
        phone: attendant.phone,
        email: attendant.email || "",
        role: attendant.role,
        active: attendant.active,
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        role: formData.role,
        active: formData.active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("chat_attendants")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Atendente atualizado com sucesso." });
      } else {
        const { error } = await supabase
          .from("chat_attendants")
          .insert(payload);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Atendente criado com sucesso." });
      }

      setDialogOpen(false);
      fetchAttendants();
    } catch (error) {
      console.error("Erro ao salvar atendente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o atendente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (attendant: ChatAttendant) => {
    try {
      const { error } = await supabase
        .from("chat_attendants")
        .update({ active: !attendant.active })
        .eq("id", attendant.id);

      if (error) throw error;
      
      toast({
        title: attendant.active ? "Desativado" : "Ativado",
        description: `${attendant.name} foi ${attendant.active ? "desativado" : "ativado"}.`,
      });
      fetchAttendants();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attendant: ChatAttendant) => {
    if (!confirm(`Tem certeza que deseja excluir ${attendant.name}?`)) return;

    try {
      const { error } = await supabase
        .from("chat_attendants")
        .delete()
        .eq("id", attendant.id);

      if (error) throw error;
      
      toast({ title: "Excluído", description: "Atendente excluído com sucesso." });
      fetchAttendants();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o atendente.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      atendente: { label: "Atendente", className: "bg-blue-500" },
      corretor: { label: "Corretor", className: "bg-green-500" },
      gestor: { label: "Gestor", className: "bg-purple-500" },
    };
    const { label, className } = variants[role] || variants.atendente;
    return <Badge className={className}>{label}</Badge>;
  };

  const activeCount = attendants.filter(a => a.active).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Atendentes / Colaboradores
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} ativos de {attendants.length} cadastrados
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Atendente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Atendente" : "Novo Atendente"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "atendente" | "corretor" | "gestor") => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendente">Atendente</SelectItem>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Status Ativo</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : attendants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum atendente cadastrado</p>
            <p className="text-sm">Clique em "Novo Atendente" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendants.map((attendant) => (
                  <TableRow key={attendant.id}>
                    <TableCell className="font-medium">{attendant.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {attendant.phone}
                        </span>
                        {attendant.email && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {attendant.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(attendant.role)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(attendant)}
                        className={attendant.active ? "text-green-600" : "text-gray-400"}
                      >
                        {attendant.active ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Inativo
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(attendant)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(attendant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
