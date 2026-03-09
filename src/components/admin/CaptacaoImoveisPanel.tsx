import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Home, Phone, Mail, MapPin, CalendarDays, TrendingUp, Users, Calculator } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CaptacaoLead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  tipo_imovel: string;
  cidade: string;
  bairro: string;
  quartos: number | null;
  vagas: number | null;
  area: number | null;
  estado_imovel: string;
  valor_estimado_min: number;
  valor_estimado_max: number;
  status: string;
  created_at: string;
  broker_id: string | null;
}

interface CaptacaoStats {
  total: number;
  novos: number;
  emAndamento: number;
  finalizados: number;
  valorTotalEstimado: number;
  mediaValor: number;
}

export const CaptacaoImoveisPanel = () => {
  const [leads, setLeads] = useState<CaptacaoLead[]>([]);
  const [stats, setStats] = useState<CaptacaoStats>({
    total: 0,
    novos: 0,
    emAndamento: 0,
    finalizados: 0,
    valorTotalEstimado: 0,
    mediaValor: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [brokers, setBrokers] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchBrokers();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('captacao_imoveis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar leads de captação:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setBrokers(data || []);
    } catch (error) {
      console.error('Erro ao buscar corretores:', error);
    }
  };

  const calculateStats = (data: CaptacaoLead[]) => {
    const novos = data.filter(lead => lead.status === 'novo').length;
    const emAndamento = data.filter(lead => lead.status === 'em_andamento').length;
    const finalizados = data.filter(lead => lead.status === 'finalizado').length;
    
    const valorTotalEstimado = data.reduce((sum, lead) => {
      return sum + (lead.valor_estimado_min + lead.valor_estimado_max) / 2;
    }, 0);

    const mediaValor = data.length > 0 ? valorTotalEstimado / data.length : 0;

    setStats({
      total: data.length,
      novos,
      emAndamento,
      finalizados,
      valorTotalEstimado,
      mediaValor
    });
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('captacao_imoveis')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));

      toast({
        title: 'Status atualizado',
        description: 'Status do lead atualizado com sucesso.',
      });

      // Recalculate stats
      const updatedLeads = leads.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      );
      calculateStats(updatedLeads);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const assignBroker = async (leadId: string, brokerId: string) => {
    try {
      const { error } = await supabase
        .from('captacao_imoveis')
        .update({ broker_id: brokerId, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, broker_id: brokerId } : lead
      ));

      toast({
        title: 'Corretor atribuído',
        description: 'Corretor atribuído ao lead com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir corretor',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'novo':
        return 'default';
      case 'em_andamento':
        return 'secondary';
      case 'finalizado':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo':
        return 'Novo';
      case 'em_andamento':
        return 'Em Andamento';
      case 'finalizado':
        return 'Finalizado';
      default:
        return status;
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'apartamento':
        return 'Apartamento';
      case 'casa':
        return 'Casa';
      case 'terreno':
        return 'Terreno';
      case 'comercial':
        return 'Comercial';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-12 bg-muted rounded mb-4"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Captação de Imóveis</h2>
          <p className="text-muted-foreground">
            Gerencie leads de proprietários que desejam avaliar seus imóveis
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.novos}</p>
                <p className="text-sm text-muted-foreground">Novos Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0
                  }).format(stats.mediaValor)}
                </p>
                <p className="text-sm text-muted-foreground">Valor Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads de Captação</CardTitle>
          <CardDescription>
            Lista de proprietários que solicitaram avaliação de imóveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietário</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.nome}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3" />
                        {lead.telefone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{getPropertyTypeLabel(lead.tipo_imovel)}</div>
                      <div className="text-sm text-muted-foreground">
                        {lead.quartos && `${lead.quartos} quartos`}
                        {lead.quartos && lead.vagas && ' • '}
                        {lead.vagas && `${lead.vagas} vagas`}
                        {(lead.quartos || lead.vagas) && lead.area && ' • '}
                        {lead.area && `${lead.area}m²`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3 h-3" />
                      <div>
                        <div>{lead.bairro}</div>
                        <div className="text-muted-foreground">{lead.cidade}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0
                      }).format(lead.valor_estimado_min)} - {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0
                      }).format(lead.valor_estimado_max)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.broker_id || ""}
                      onValueChange={(value) => assignBroker(lead.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Atribuir" />
                      </SelectTrigger>
                      <SelectContent>
                        {brokers.map((broker) => (
                          <SelectItem key={broker.id} value={broker.id}>
                            {broker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => updateLeadStatus(lead.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {leads.length === 0 && (
            <div className="text-center py-12">
              <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum lead de captação</h3>
              <p className="text-muted-foreground">
                Quando proprietários solicitarem avaliações, eles aparecerão aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};