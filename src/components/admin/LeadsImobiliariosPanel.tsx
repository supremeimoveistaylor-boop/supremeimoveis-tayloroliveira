import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Eye, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  ExternalLink,
  RefreshCw,
  Download,
  Trash2
} from "lucide-react";

interface LeadImobiliario {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  tipo_imovel: string | null;
  finalidade: string | null;
  descricao: string | null;
  origem: string | null;
  pagina_origem: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "em_atendimento", label: "Em Atendimento", color: "bg-yellow-500" },
  { value: "visita_agendada", label: "Visita Agendada", color: "bg-purple-500" },
  { value: "fechado", label: "Fechado", color: "bg-green-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];

const tipoImovelLabels: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  rural: "Propriedade Rural",
  terreno: "Terreno",
  comercial: "Comercial",
};

const finalidadeLabels: Record<string, string> = {
  comprar: "Comprar",
  alugar: "Alugar",
  investir: "Investir",
};

export const LeadsImobiliariosPanel = () => {
  const [leads, setLeads] = useState<LeadImobiliario[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadImobiliario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterFinalidade, setFilterFinalidade] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<LeadImobiliario | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, filterStatus, filterTipo, filterFinalidade]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads_imobiliarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Erro ao carregar leads",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.nome.toLowerCase().includes(term) ||
          lead.telefone.includes(term) ||
          (lead.email && lead.email.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((lead) => lead.status === filterStatus);
    }

    // Tipo filter
    if (filterTipo !== "all") {
      filtered = filtered.filter((lead) => lead.tipo_imovel === filterTipo);
    }

    // Finalidade filter
    if (filterFinalidade !== "all") {
      filtered = filtered.filter((lead) => lead.finalidade === filterFinalidade);
    }

    setFilteredLeads(filtered);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads_imobiliarios")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      setLeads(leads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }

      toast({
        title: "Status atualizado",
        description: "O status do lead foi atualizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

    try {
      const { error } = await supabase
        .from("leads_imobiliarios")
        .delete()
        .eq("id", leadId);

      if (error) throw error;

      setLeads(leads.filter((lead) => lead.id !== leadId));
      setIsDetailOpen(false);
      
      toast({
        title: "Lead excluído",
        description: "O lead foi excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lead",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Telefone", "E-mail", "Tipo", "Finalidade", "Status", "Origem", "Data"];
    const rows = filteredLeads.map((lead) => [
      lead.nome,
      lead.telefone,
      lead.email || "",
      tipoImovelLabels[lead.tipo_imovel || ""] || lead.tipo_imovel || "",
      finalidadeLabels[lead.finalidade || ""] || lead.finalidade || "",
      statusOptions.find((s) => s.value === lead.status)?.label || lead.status,
      lead.origem || "",
      new Date(lead.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_imobiliarios_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((s) => s.value === status);
    return (
      <Badge className={`${statusConfig?.color || "bg-gray-500"} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const openLeadDetail = (lead: LeadImobiliario) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusOptions.map((status) => {
          const count = leads.filter((l) => l.status === status.value).length;
          return (
            <Card key={status.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(status.value)}>
              <CardContent className="p-4 text-center">
                <div className={`inline-block w-3 h-3 rounded-full ${status.color} mb-2`} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{status.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLeads}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(tipoImovelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFinalidade} onValueChange={setFilterFinalidade}>
              <SelectTrigger>
                <SelectValue placeholder="Finalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Finalidades</SelectItem>
                {Object.entries(finalidadeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leads ({filteredLeads.length} de {leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLeadDetail(lead)}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>
                        <a
                          href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {lead.telefone}
                        </a>
                      </TableCell>
                      <TableCell>{tipoImovelLabels[lead.tipo_imovel || ""] || "-"}</TableCell>
                      <TableCell>{finalidadeLabels[lead.finalidade || ""] || "-"}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>
              Visualize e gerencie as informações do lead
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedLead.nome}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <a
                    href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:underline font-medium"
                  >
                    <Phone className="h-4 w-4" />
                    {selectedLead.telefone}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {selectedLead.email && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      <Mail className="h-4 w-4" />
                      {selectedLead.email}
                    </a>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                  <p className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(selectedLead.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Property Interest */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo de Imóvel</p>
                  <p className="font-medium">{tipoImovelLabels[selectedLead.tipo_imovel || ""] || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Finalidade</p>
                  <p className="font-medium">{finalidadeLabels[selectedLead.finalidade || ""] || "-"}</p>
                </div>
              </div>

              {/* Description */}
              {selectedLead.descricao && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="bg-muted p-3 rounded-lg whitespace-pre-wrap">{selectedLead.descricao}</p>
                </div>
              )}

              {/* Origin Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedLead.origem || "site"}
                  </p>
                </div>
                {selectedLead.pagina_origem && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Página de Origem</p>
                    <a
                      href={selectedLead.pagina_origem}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate block"
                    >
                      {selectedLead.pagina_origem}
                    </a>
                  </div>
                )}
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Alterar Status</p>
                <div className="flex gap-2 flex-wrap">
                  {statusOptions.map((status) => (
                    <Button
                      key={status.value}
                      variant={selectedLead.status === status.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateLeadStatus(selectedLead.id, status.value)}
                      className={selectedLead.status === status.value ? status.color : ""}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLead(selectedLead.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Lead
                </Button>
                <Button
                  onClick={() => window.open(`https://wa.me/55${selectedLead.telefone.replace(/\D/g, "")}`, "_blank")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
