import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Phone, FileText, Handshake, CheckCircle2,
  TrendingUp, DollarSign, AlertTriangle, XCircle, Calendar,
  Eye, Target, Zap
} from 'lucide-react';
import { CRMMetrics } from './types';

interface CRMMetricsPanelProps {
  metrics: CRMMetrics;
}

export const CRMMetricsPanel = memo(function CRMMetricsPanel({ metrics }: CRMMetricsPanelProps) {
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value ?? 0);
    } catch { return `R$ ${value ?? 0}`; }
  };

  const metricCards = [
    { title: 'Novos Leads', value: metrics.totalLeads, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Contato Iniciado', value: metrics.contatoIniciado, icon: Phone, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', rate: metrics.taxaConversaoContato },
    { title: 'Qualificados', value: metrics.qualificados, icon: Target, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', rate: metrics.taxaConversaoQualificado },
    { title: 'Agendamentos', value: metrics.agendamentos, icon: Calendar, color: 'text-purple-500', bgColor: 'bg-purple-500/10', rate: metrics.taxaConversaoAgendamento },
    { title: 'Visitas', value: metrics.visitasRealizadas, icon: Eye, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
    { title: 'Propostas', value: metrics.propostas, icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Fechados', value: metrics.fechamentos, icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10', rate: metrics.taxaConversaoFechamento },
    { title: 'Sem Interesse', value: metrics.semInteresse, icon: XCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className={`${m.bgColor} border-0`}>
              <CardHeader className="pb-2 pt-4 px-3">
                <div className="flex items-center justify-between">
                  <Icon className={`h-4 w-4 ${m.color}`} />
                  {m.rate !== undefined && <span className="text-[10px] text-muted-foreground">{m.rate}%</span>}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-bold">{m.value}</div>
                <p className="text-[10px] text-muted-foreground">{m.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <Zap className="h-6 w-6 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-600">{metrics.leadsQuentes}</div>
              <p className="text-xs text-muted-foreground">Leads Quentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-purple-500" />
            <div>
              <div className="text-2xl font-bold text-purple-600">{metrics.probabilidadeMedia}%</div>
              <p className="text-xs text-muted-foreground">Probabilidade Média</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{metrics.leadsSemAtendimento}</div>
              <p className="text-xs text-muted-foreground">Sem Atendimento (3d+)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Em Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.valorTotalProposta)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fechado</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.valorTotalFechado)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
