import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Archive, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CleanupLog {
  id: string;
  executed_at: string;
  tables_processed: string[];
  records_archived: number;
  records_deleted: number;
  status: string;
  details: Record<string, number>;
}

interface ArchiveCounts {
  chat_messages: number;
  chat_sessions: number;
  channel_messages: number;
  general_chat_messages: number;
  omnichat_messages: number;
  omnichat_conversations: number;
  leads: number;
  followup_alerts: number;
}

export const ArchiveStatusPanel = () => {
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [archiveCounts, setArchiveCounts] = useState<ArchiveCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, cmRes, csRes, chRes, gcRes, omRes, ocRes, ldRes, faRes] = await Promise.all([
        supabase.from('system_cleanup_logs').select('*').order('executed_at', { ascending: false }).limit(10),
        supabase.from('chat_messages_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('chat_sessions_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('channel_messages_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('general_chat_messages_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('omnichat_messages_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('omnichat_conversations_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('leads_archive' as any).select('id', { count: 'exact', head: true }),
        supabase.from('followup_alerts_archive' as any).select('id', { count: 'exact', head: true }),
      ]);

      setLogs((logsRes.data || []) as CleanupLog[]);
      setArchiveCounts({
        chat_messages: cmRes.count || 0,
        chat_sessions: csRes.count || 0,
        channel_messages: chRes.count || 0,
        general_chat_messages: gcRes.count || 0,
        omnichat_messages: omRes.count || 0,
        omnichat_conversations: ocRes.count || 0,
        leads: ldRes.count || 0,
        followup_alerts: faRes.count || 0,
      });
    } catch (err) {
      console.error('Erro ao carregar dados de arquivo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const runManualArchive = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc('archive_old_system_data');
      if (error) throw error;
      toast({
        title: 'Arquivamento concluído',
        description: `${(data as any)?.total_archived || 0} registros arquivados, ${(data as any)?.total_deleted || 0} removidos.`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro no arquivamento', description: err.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const totalArchived = archiveCounts
    ? Object.values(archiveCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Sistema de Arquivamento
          </h2>
          <p className="text-sm text-muted-foreground">
            Dados com mais de 30 dias são arquivados automaticamente às 03:00
          </p>
        </div>
        <Button onClick={runManualArchive} disabled={running} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Executando...' : 'Executar Agora'}
        </Button>
      </div>

      {/* Archive Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Arquivado</p>
                <p className="text-2xl font-bold">{totalArchived.toLocaleString('pt-BR')}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {archiveCounts && Object.entries(archiveCounts).filter(([, v]) => v > 0).slice(0, 3).map(([key, val]) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{key.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold">{val.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimas Execuções</CardTitle>
          <CardDescription>Histórico de arquivamento automático e manual</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma execução registrada ainda. O cron roda diariamente às 03:00.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(log.executed_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(log.tables_processed || []).join(', ') || 'Nenhuma tabela processada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.records_archived} arquivados</Badge>
                    <Badge variant="secondary">{log.records_deleted} removidos</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
