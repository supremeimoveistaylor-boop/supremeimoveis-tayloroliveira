import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Bell, UserCheck, MessageSquare, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FollowupAlert {
  id: string;
  lead_id: string | null;
  alert_type: string;
  stage: number;
  message_sent: string | null;
  channel: string | null;
  status: string | null;
  whatsapp_message_id: string | null;
  metadata: any;
  created_at: string;
}

export function FollowupAlertsPanel() {
  const [alerts, setAlerts] = useState<FollowupAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lead_followup' | 'broker_reminder'>('all');

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('followup_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('alert_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching followup alerts:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar alertas de follow-up', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const leadFollowups = alerts.filter(a => a.alert_type === 'lead_followup');
  const brokerReminders = alerts.filter(a => a.alert_type === 'broker_reminder');
  const sentCount = alerts.filter(a => a.status === 'sent').length;
  const failedCount = alerts.filter(a => a.status === 'failed').length;

  const getStageLabel = (alert: FollowupAlert) => {
    if (alert.alert_type === 'lead_followup') {
      const stages: Record<number, string> = { 1: 'Suave', 2: 'Abordagem', 3: 'Escassez', 4: 'Última' };
      return stages[alert.stage] || `Estágio ${alert.stage}`;
    }
    const brokerStages: Record<number, string> = { 0: 'Alerta', 1: 'Lembrete', 2: 'Sem Atendimento' };
    return brokerStages[alert.stage] || `Nível ${alert.stage}`;
  };

  const getStageBadgeClass = (alert: FollowupAlert) => {
    if (alert.alert_type === 'lead_followup') {
      const classes: Record<number, string> = {
        1: 'bg-blue-500/20 text-blue-400',
        2: 'bg-purple-500/20 text-purple-400',
        3: 'bg-orange-500/20 text-orange-400',
        4: 'bg-red-500/20 text-red-400',
      };
      return classes[alert.stage] || '';
    }
    const classes: Record<number, string> = {
      0: 'bg-yellow-500/20 text-yellow-400',
      1: 'bg-orange-500/20 text-orange-400',
      2: 'bg-red-500/20 text-red-400',
    };
    return classes[alert.stage] || '';
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xl font-bold text-white">{alerts.length}</p>
                <p className="text-xs text-slate-400">Total Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xl font-bold text-white">{leadFollowups.length}</p>
                <p className="text-xs text-slate-400">Follow-ups Lead</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xl font-bold text-white">{brokerReminders.length}</p>
                <p className="text-xs text-slate-400">Cobranças Corretor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              {failedCount > 0 ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
              <div>
                <p className="text-xl font-bold text-white">{sentCount}/{sentCount + failedCount}</p>
                <p className="text-xs text-slate-400">Enviados/Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Refresh */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Histórico de Follow-ups & Cobranças
              </CardTitle>
              <CardDescription className="text-slate-400">
                Mensagens automáticas enviadas para leads e corretores via WhatsApp
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isLoading} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="space-y-4">
            <TabsList className="bg-slate-700/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Todos</TabsTrigger>
              <TabsTrigger value="lead_followup" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Follow-ups Lead</TabsTrigger>
              <TabsTrigger value="broker_reminder" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">Cobranças Corretor</TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum alerta encontrado.</p>
                  <p className="text-xs mt-1">Os follow-ups automáticos aparecerão aqui quando forem executados.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Tipo</TableHead>
                        <TableHead className="text-slate-300">Estágio</TableHead>
                        <TableHead className="text-slate-300">Destinatário</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Mensagem</TableHead>
                        <TableHead className="text-slate-300">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert) => (
                        <TableRow key={alert.id} className="border-slate-700">
                          <TableCell>
                            <Badge variant="outline" className={alert.alert_type === 'lead_followup' ? 'border-purple-500/50 text-purple-400' : 'border-amber-500/50 text-amber-400'}>
                              {alert.alert_type === 'lead_followup' ? 'Lead' : 'Corretor'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStageBadgeClass(alert)}>
                              {getStageLabel(alert)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            <div>
                              <span className="font-medium">{alert.metadata?.lead_name || alert.metadata?.broker_name || '—'}</span>
                              <br />
                              <span className="text-xs text-slate-500">{alert.metadata?.lead_phone || alert.metadata?.broker_phone || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {alert.status === 'sent' ? (
                              <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>
                            ) : (
                              <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs max-w-[250px]">
                            <p className="truncate" title={alert.message_sent || ''}>
                              {alert.message_sent?.slice(0, 80) || '—'}{(alert.message_sent?.length || 0) > 80 ? '...' : ''}
                            </p>
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(alert.created_at).toLocaleString('pt-BR')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
