import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Phone, 
  FileText, 
  Handshake, 
  CheckCircle2, 
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { CRMMetrics } from './types';

interface CRMMetricsPanelProps {
  metrics: CRMMetrics;
}

export const CRMMetricsPanel = memo(function CRMMetricsPanel({ metrics }: CRMMetricsPanelProps) {
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value ?? 0);
    } catch {
      return `R$ ${value ?? 0}`;
    }
  };

  const metricCards = [
    {
      title: 'Leads',
      value: metrics?.totalLeads ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Em Contato',
      value: metrics?.leadsEmContato ?? 0,
      icon: Phone,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      rate: metrics?.taxaConversaoContato ?? 0,
    },
    {
      title: 'Propostas',
      value: metrics?.propostasEnviadas ?? 0,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      rate: metrics?.taxaConversaoProposta ?? 0,
    },
    {
      title: 'Negociações',
      value: metrics?.negociacoes ?? 0,
      icon: Handshake,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      rate: metrics?.taxaConversaoNegociacao ?? 0,
    },
    {
      title: 'Fechados',
      value: metrics?.fechamentos ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      rate: metrics?.taxaConversaoFechamento ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className={`${metric.bgColor} border-0`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  {metric.rate !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {metric.rate}%
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Valores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-sm font-medium">Em Negociação</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics?.valorTotalNegociacao ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total em negociação
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <CardTitle className="text-sm font-medium">Fechado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics?.valorTotalFechado ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total fechado
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
