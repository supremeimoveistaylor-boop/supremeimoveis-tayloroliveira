import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Thermometer, Zap, Clock } from 'lucide-react';
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
      case 'hot_lead': return <Zap className="h-4 w-4 text-red-500" />;
      case 'followup': return <Clock className="h-4 w-4 text-purple-500" />;
      case 'risco_perda': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'sem_atendimento': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'esfriando': return <Thermometer className="h-4 w-4 text-orange-400" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (tipo: CRMAlert['tipo']) => {
    switch (tipo) {
      case 'hot_lead': return <Badge className="text-[10px] bg-red-500 text-white border-0">HOT LEAD</Badge>;
      case 'followup': return <Badge className="text-[10px] bg-purple-500 text-white border-0">Reengajar</Badge>;
      case 'risco_perda': return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
      case 'sem_atendimento': return <Badge className="text-[10px] bg-yellow-500/15 text-yellow-700 border-yellow-300">Atenção</Badge>;
      case 'esfriando': return <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300">Alerta</Badge>;
      default: return null;
    }
  };

  const getAlertBg = (tipo: CRMAlert['tipo']) => {
    switch (tipo) {
      case 'hot_lead': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      case 'followup': return 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800';
      case 'risco_perda': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      case 'sem_atendimento': return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'esfriando': return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
      default: return 'bg-muted';
    }
  };

  const hotCount = safeAlerts.filter(a => a.tipo === 'hot_lead').length;
  const criticalCount = safeAlerts.filter(a => a.tipo === 'risco_perda' || a.tipo === 'followup').length;
  const warningCount = safeAlerts.filter(a => a.tipo === 'sem_atendimento').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertas Inteligentes
          </CardTitle>
          <div className="flex gap-2">
            {hotCount > 0 && <Badge className="text-xs bg-red-500 text-white border-0">{hotCount} 🔥 hot</Badge>}
            {criticalCount > 0 && <Badge variant="destructive" className="text-xs">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</Badge>}
            {warningCount > 0 && <Badge className="text-xs bg-yellow-500/15 text-yellow-700 border-yellow-300">{warningCount} atenção</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {safeAlerts.map((alert) => {
              const colLabel = KANBAN_COLUMNS.find(c => c.key === alert.column)?.label ?? alert.column;
              return (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alert.tipo)}`}>
                  <div className="mt-0.5">{getAlertIcon(alert.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{alert.cardTitle}</span>
                      {getAlertBadge(alert.tipo)}
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.mensagem}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Cliente: {alert.cliente}</span>
                      <span>•</span>
                      <span>Etapa: {colLabel}</span>
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
