import { memo, useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Target, TrendingUp, Clock, Zap, BarChart3, Users
} from 'lucide-react';
import { CRMCard, CRMMetrics, KANBAN_COLUMNS, CLASSIFICACAO_CONFIG, KanbanData } from './types';
import { supabase } from '@/integrations/supabase/client';

interface AIAnalyticsPanelProps {
  metrics: CRMMetrics;
  allCards: CRMCard[];
  kanbanData: KanbanData;
}

export const AIAnalyticsPanel = memo(function AIAnalyticsPanel({ metrics, allCards, kanbanData }: AIAnalyticsPanelProps) {
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await (supabase as any)
        .from('crm_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setRecentEvents(data || []);
    };
    fetchEvents();
  }, [allCards]);

  const formatCurrency = (v: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
    } catch { return `R$ ${v}`; }
  };

  // Classification breakdown
  const classBreakdown = useMemo(() => {
    const active = allCards.filter(c => c.coluna !== 'fechado' && c.coluna !== 'sem_interesse');
    return {
      quente: active.filter(c => c.classificacao === 'quente').length,
      morno: active.filter(c => c.classificacao === 'morno').length,
      frio: active.filter(c => c.classificacao === 'frio').length,
      total: active.length,
    };
  }, [allCards]);

  // Top leads by probability
  const topLeads = useMemo(() => {
    return allCards
      .filter(c => c.coluna !== 'fechado' && c.coluna !== 'sem_interesse' && c.probabilidade_fechamento > 0)
      .sort((a, b) => b.probabilidade_fechamento - a.probabilidade_fechamento)
      .slice(0, 5);
  }, [allCards]);

  // Average time per stage
  const stageStats = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
      ...col,
      count: kanbanData[col.key]?.length || 0,
      avgScore: (() => {
        const cards = kanbanData[col.key] || [];
        if (cards.length === 0) return 0;
        return Math.round(cards.reduce((s, c) => s + (c.lead_score || 0), 0) / cards.length);
      })(),
    }));
  }, [kanbanData]);

  // Pipeline value
  const pipelineValue = useMemo(() => {
    const active = allCards.filter(c => c.coluna !== 'fechado' && c.coluna !== 'sem_interesse');
    return active.reduce((s, c) => s + (c.valor_estimado || 0) * ((c.probabilidade_fechamento || 10) / 100), 0);
  }, [allCards]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Prob. Média</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{metrics.probabilidadeMedia}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-red-500" />
              <span className="text-xs text-muted-foreground">Leads Quentes</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{metrics.leadsQuentes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-xs text-muted-foreground">Pipeline Ponderado</span>
            </div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(pipelineValue)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Sem Atendimento</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{metrics.leadsSemAtendimento}</div>
          </CardContent>
        </Card>
      </div>

      {/* Classification + Top Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classification breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Classificação dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['quente', 'morno', 'frio'] as const).map(cls => {
              const config = CLASSIFICACAO_CONFIG[cls];
              const count = classBreakdown[cls];
              const pct = classBreakdown.total > 0 ? Math.round((count / classBreakdown.total) * 100) : 0;
              return (
                <div key={cls} className="flex items-center gap-3">
                  <span className="text-sm w-20">{config.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cls === 'quente' ? 'bg-red-500' : cls === 'morno' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top leads by probability */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Top Leads (Probabilidade)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Analise leads com IA para ver o ranking
              </p>
            ) : (
              <div className="space-y-2">
                {topLeads.map((lead, i) => (
                  <div key={lead.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{lead.cliente}</div>
                      <div className="text-xs text-muted-foreground">
                        {KANBAN_COLUMNS.find(c => c.key === lead.coluna)?.label}
                      </div>
                    </div>
                    <Badge className={`text-xs ${
                      lead.probabilidade_fechamento >= 70 ? 'bg-green-500' :
                      lead.probabilidade_fechamento >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
                    } text-white border-0`}>
                      {lead.probabilidade_fechamento}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel by stage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Funil por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stageStats.map((stage) => {
              const maxCount = Math.max(...stageStats.map(s => s.count), 1);
              const pct = Math.round((stage.count / maxCount) * 100);
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-36">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="text-xs truncate">{stage.label}</span>
                  </div>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className={`h-full ${stage.color} rounded transition-all flex items-center justify-end pr-1`} style={{ width: `${Math.max(pct, 5)}%` }}>
                      <span className="text-[10px] text-white font-bold">{stage.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-14 text-right">
                    Score: {stage.avgScore}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent AI Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" /> Eventos Recentes da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum evento registrado ainda
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">
                    {event.event_type?.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {event.old_value && event.new_value && (
                      <span>{event.old_value} → {event.new_value}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">
                    {new Date(event.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Values summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.valorTotalProposta)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fechado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.valorTotalFechado)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
