import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Thermometer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CRMAlert } from './useAlerts';
import { KANBAN_COLUMNS } from './types';

interface AlertsPanelProps {
  alerts: CRMAlert[];
}

export const AlertsPanel = memo(function AlertsPanel({ alerts }: AlertsPanelProps) {
  const safeAlerts = alerts?.filter(Boolean) ?? [];

  if (safeAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum alerta ativo no momento.</p>
          <p className="text-xs mt-1">Todos os leads estão sendo atendidos.</p>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (tipo: CRMAlert['tipo']) => {
    switch (tipo) {
      case 'risco_perda': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'sem_atendimento': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'esfriando': return <Thermometer className="h-4 w-4 text-orange-400" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAlertBadge = (tipo: CRMAlert['tipo']) => {
    switch (tipo) {
      case 'risco_perda': return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
      case 'sem_atendimento': return <Badge className="text-[10px] bg-yellow-500/15 text-yellow-700 border-yellow-300">Atenção</Badge>;
      case 'esfriando': return <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300">Alerta</Badge>;
      default: return null;
    }
  };

  const criticalCount = safeAlerts.filter(a => a?.tipo === 'risco_perda').length;
  const warningCount = safeAlerts.filter(a => a?.tipo === 'sem_atendimento').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertas de Assistência
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="text-xs bg-yellow-500/15 text-yellow-700 border-yellow-300">
                {warningCount} atenção
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {safeAlerts.map((alert) => {
              const columnLabel = KANBAN_COLUMNS.find(c => c.key === alert?.column)?.label ?? alert?.column ?? '';
              return (
                <div
                  key={alert?.id ?? Math.random()}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    alert?.tipo === 'risco_perda'
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : alert?.tipo === 'sem_atendimento'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                        : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                  }`}
                >
                  <div className="mt-0.5">{getAlertIcon(alert?.tipo ?? 'esfriando')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{alert?.cardTitle ?? 'Lead'}</span>
                      {getAlertBadge(alert?.tipo ?? 'esfriando')}
                    </div>
                    <p className="text-xs text-muted-foreground">{alert?.mensagem ?? ''}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Cliente: {alert?.cliente ?? 'N/A'}</span>
                      <span>•</span>
                      <span>Etapa: {columnLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
