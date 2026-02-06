import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Calendar, Clock, User, Phone, 
  Home, FileText, Printer, Download, ChevronDown
} from 'lucide-react';

interface VisitClient {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface ScheduledVisit {
  id: string;
  tenant_id: string;
  client_id: string;
  property_id: string | null;
  property_name: string | null;
  visit_date: string;
  visit_time: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  notes: string | null;
  created_at: string;
}

interface Property {
  id: string;
  title: string;
}

export function VisitSchedulingPanel() {
  const { user } = useAuth();
  const [clients, setClients] = useState<VisitClient[]>([]);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Client form state
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<VisitClient | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  
  // Visit form state
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ScheduledVisit | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState({
    property_id: '',
    property_name: '',
    visit_date: '',
    visit_time: '',
    status: 'agendada' as 'agendada' | 'realizada' | 'cancelada',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('visit_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('scheduled_visits')
        .select('*')
        .order('visit_date', { ascending: true });

      if (visitsError) throw visitsError;
      setVisits((visitsData || []).map(v => ({
        ...v,
        status: v.status as 'agendada' | 'realizada' | 'cancelada'
      })));

      // Fetch properties for dropdown
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title')
        .eq('status', 'active')
        .order('title');

      setProperties(propertiesData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Client CRUD
  const handleSaveClient = async () => {
    if (!user) return;
    
    if (!clientForm.name.trim() || !clientForm.phone.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e telefone do cliente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('visit_clients')
          .update({ 
            name: clientForm.name, 
            phone: clientForm.phone 
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('visit_clients')
          .insert({ 
            tenant_id: user.id,
            name: clientForm.name, 
            phone: clientForm.phone 
          });

        if (error) throw error;
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }

      setIsClientDialogOpen(false);
      setEditingClient(null);
      setClientForm({ name: '', phone: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditClient = (client: VisitClient) => {
    setEditingClient(client);
    setClientForm({ name: client.name, phone: client.phone });
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Tem certeza? Todas as visitas deste cliente serão excluídas.')) return;

    try {
      const { error } = await supabase
        .from('visit_clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      toast({ title: 'Cliente excluído com sucesso!' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Visit CRUD
  const getClientVisitCount = (clientId: string) => {
    return visits.filter(v => v.client_id === clientId).length;
  };

  const handleOpenVisitDialog = (clientId: string, visit?: ScheduledVisit) => {
    if (!visit && getClientVisitCount(clientId) >= 5) {
      toast({
        title: 'Limite atingido',
        description: 'Este cliente já possui 5 visitas cadastradas.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedClientId(clientId);
    if (visit) {
      setEditingVisit(visit);
      setVisitForm({
        property_id: visit.property_id || '',
        property_name: visit.property_name || '',
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        status: visit.status,
        notes: visit.notes || '',
      });
    } else {
      setEditingVisit(null);
      setVisitForm({
        property_id: '',
        property_name: '',
        visit_date: '',
        visit_time: '',
        status: 'agendada',
        notes: '',
      });
    }
    setIsVisitDialogOpen(true);
  };

  const handleSaveVisit = async () => {
    if (!user || !selectedClientId) return;

    if (!visitForm.visit_date || !visitForm.visit_time) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a data e horário da visita.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedProperty = properties.find(p => p.id === visitForm.property_id);
      const visitData = {
        tenant_id: user.id,
        client_id: selectedClientId,
        property_id: visitForm.property_id || null,
        property_name: selectedProperty?.title || visitForm.property_name || null,
        visit_date: visitForm.visit_date,
        visit_time: visitForm.visit_time,
        status: visitForm.status,
        notes: visitForm.notes || null,
      };

      if (editingVisit) {
        const { error } = await supabase
          .from('scheduled_visits')
          .update(visitData)
          .eq('id', editingVisit.id);

        if (error) throw error;
        toast({ title: 'Visita atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('scheduled_visits')
          .insert(visitData);

        if (error) throw error;
        toast({ title: 'Visita agendada com sucesso!' });
      }

      setIsVisitDialogOpen(false);
      setEditingVisit(null);
      setSelectedClientId(null);
      setVisitForm({
        property_id: '',
        property_name: '',
        visit_date: '',
        visit_time: '',
        status: 'agendada',
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar visita',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta visita?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      toast({ title: 'Visita excluída com sucesso!' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir visita',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // PDF Generation
  const generatePDF = (client: VisitClient) => {
    const clientVisits = visits.filter(v => v.client_id === client.id);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visitas - ${client.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .client-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .client-info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-agendada { color: #2563eb; font-weight: bold; }
          .status-realizada { color: #16a34a; font-weight: bold; }
          .status-cancelada { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          @media print { 
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📅 Relatório de Visitas</h1>
        
        <div class="client-info">
          <p><strong>Cliente:</strong> ${client.name}</p>
          <p><strong>Telefone:</strong> ${client.phone}</p>
          <p><strong>Total de Visitas:</strong> ${clientVisits.length}</p>
        </div>
        
        ${clientVisits.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Imóvel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${clientVisits.map(visit => `
                <tr>
                  <td>${new Date(visit.visit_date).toLocaleDateString('pt-BR')}</td>
                  <td>${visit.visit_time}</td>
                  <td>${visit.property_name || 'Não especificado'}</td>
                  <td class="status-${visit.status}">
                    ${visit.status === 'agendada' ? '🔵 Agendada' : 
                      visit.status === 'realizada' ? '🟢 Realizada' : '🔴 Cancelada'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>Nenhuma visita cadastrada para este cliente.</p>'}
        
        <div class="footer">
          <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Agendada</Badge>;
      case 'realizada':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Realizada</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamento de Visitas</h2>
          <p className="text-muted-foreground">Gerencie clientes e visitas imobiliárias</p>
        </div>
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingClient(null);
              setClientForm({ name: '', phone: '' });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente para agendamento de visitas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="client-phone">Telefone *</Label>
                <Input
                  id="client-phone"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClient}>
                {editingClient ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visit Dialog */}
      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVisit ? 'Editar Visita' : 'Nova Visita'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da visita imobiliária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="visit-date">Data *</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitForm.visit_date}
                onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="visit-time">Horário *</Label>
              <Input
                id="visit-time"
                type="time"
                value={visitForm.visit_time}
                onChange={(e) => setVisitForm({ ...visitForm, visit_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="visit-property">Imóvel</Label>
              <Select
                value={visitForm.property_id}
                onValueChange={(value) => setVisitForm({ ...visitForm, property_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!visitForm.property_id && (
              <div>
                <Label htmlFor="visit-property-name">Ou digite o nome do imóvel</Label>
                <Input
                  id="visit-property-name"
                  value={visitForm.property_name}
                  onChange={(e) => setVisitForm({ ...visitForm, property_name: e.target.value })}
                  placeholder="Nome do imóvel"
                />
              </div>
            )}
            <div>
              <Label htmlFor="visit-status">Status</Label>
              <Select
                value={visitForm.status}
                onValueChange={(value: 'agendada' | 'realizada' | 'cancelada') => 
                  setVisitForm({ ...visitForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="visit-notes">Observações</Label>
              <Input
                id="visit-notes"
                value={visitForm.notes}
                onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                placeholder="Notas adicionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVisitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVisit}>
              {editingVisit ? 'Salvar' : 'Agendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clients List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre clientes para agendar visitas imobiliárias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {clients.map((client) => {
            const clientVisits = visits.filter(v => v.client_id === client.id);
            
            return (
              <AccordionItem 
                key={client.id} 
                value={client.id}
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{client.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {clientVisits.length}/5 visitas
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    {/* Client Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClient(client)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenVisitDialog(client.id)}
                        disabled={clientVisits.length >= 5}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Visita
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generatePDF(client)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>

                    {/* Visits Table */}
                    {clientVisits.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead>Imóvel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientVisits.map((visit) => (
                            <TableRow key={visit.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(visit.visit_date).toLocaleDateString('pt-BR')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {visit.visit_time}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground" />
                                  {visit.property_name || 'Não especificado'}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(visit.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenVisitDialog(client.id, visit)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>Nenhuma visita agendada</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
