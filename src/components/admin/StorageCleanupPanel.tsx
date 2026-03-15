import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { HardDrive, Trash2, RefreshCw, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CleanupLog {
  id: string;
  file_path: string;
  bucket: string;
  removed_at: string;
  reason: string;
  file_size: number;
}

export const StorageCleanupPanel = () => {
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ total: 0, lastRun: '', lastCount: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('storage_cleanup_logs' as any)
        .select('*')
        .order('removed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const logsData = (data || []) as unknown as CleanupLog[];
      setLogs(logsData);

      // Calculate stats
      const total = logsData.length;
      const lastRun = logsData[0]?.removed_at || '';
      const lastRunDate = lastRun ? new Date(lastRun).toISOString().split('T')[0] : '';
      const lastCount = logsData.filter(l => 
        lastRunDate && l.removed_at.startsWith(lastRunDate)
      ).length;

      setStats({ total, lastRun, lastCount });
    } catch (err) {
      console.error('Erro ao carregar logs de limpeza:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const runCleanup = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-cleanup');
      if (error) throw error;

      const result = data as any;
      toast({
        title: 'Limpeza concluída',
        description: `${result?.files_deleted || 0} arquivos removidos de ${result?.scanned_buckets?.length || 0} buckets.`,
      });
      fetchLogs();
    } catch (err: any) {
      toast({
        title: 'Erro na limpeza',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Limpeza de Storage
          </h2>
          <p className="text-sm text-muted-foreground">
            Remove arquivos órfãos e temporários do Supabase Storage
          </p>
        </div>
        <Button onClick={runCleanup} disabled={running} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Executando...' : 'Executar Limpeza'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Removidos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Trash2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Última Execução</p>
                <p className="text-lg font-bold">
                  {stats.lastRun ? new Date(stats.lastRun).toLocaleDateString('pt-BR') : 'Nunca'}
                </p>
              </div>
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Removidos na Última</p>
                <p className="text-2xl font-bold">{stats.lastCount}</p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Remoções</CardTitle>
          <CardDescription>Arquivos removidos nas últimas limpezas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma limpeza realizada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {log.file_path}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.bucket}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.reason}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(log.removed_at).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
