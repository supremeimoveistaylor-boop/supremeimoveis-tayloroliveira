import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Target, List, HelpCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FlowMetric {
  id: string;
  flow_type: 'specific' | 'listing' | 'general';
  lead_id: string | null;
  property_id: string | null;
  page_context: string | null;
  page_url: string | null;
  origin: string | null;
  properties_shown: number;
  created_at: string;
}

interface FlowStats {
  specific: number;
  listing: number;
  general: number;
  total: number;
}

const FLOW_COLORS = {
  specific: '#10b981', // green
  listing: '#3b82f6',  // blue  
  general: '#f59e0b',  // amber
};

const FLOW_LABELS = {
  specific: 'Imóvel Específico',
  listing: 'Página de Listagem',
  general: 'Atendimento Geral',
};

const FLOW_ICONS = {
  specific: Target,
  listing: List,
  general: HelpCircle,
};

export const ChatFlowMetricsPanel = () => {
  const [metrics, setMetrics] = useState<FlowMetric[]>([]);
  const [stats, setStats] = useState<FlowStats>({ specific: 0, listing: 0, general: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('chat_flow_metrics')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      const now = new Date();
      if (dateRange === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', todayStart);
      } else if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', sevenDaysAgo);
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      const metricsData = (data || []) as FlowMetric[];
      setMetrics(metricsData);

      // Calculate stats
      const flowStats: FlowStats = {
        specific: metricsData.filter(m => m.flow_type === 'specific').length,
        listing: metricsData.filter(m => m.flow_type === 'listing').length,
        general: metricsData.filter(m => m.flow_type === 'general').length,
        total: metricsData.length,
      };
      setStats(flowStats);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar métricas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const pieChartData = [
    { name: FLOW_LABELS.specific, value: stats.specific, color: FLOW_COLORS.specific },
    { name: FLOW_LABELS.listing, value: stats.listing, color: FLOW_COLORS.listing },
    { name: FLOW_LABELS.general, value: stats.general, color: FLOW_COLORS.general },
  ].filter(d => d.value > 0);

  const barChartData = [
    { name: 'Específico', value: stats.specific, fill: FLOW_COLORS.specific },
    { name: 'Listagem', value: stats.listing, fill: FLOW_COLORS.listing },
    { name: 'Geral', value: stats.general, fill: FLOW_COLORS.general },
  ];

  // Group by date for trend analysis
  const groupByDate = () => {
    const grouped: Record<string, { specific: number; listing: number; general: number }> = {};
    
    metrics.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('pt-BR');
      if (!grouped[date]) {
        grouped[date] = { specific: 0, listing: 0, general: 0 };
      }
      grouped[date][m.flow_type]++;
    });

    return Object.entries(grouped)
      .map(([date, counts]) => ({ date, ...counts }))
      .reverse()
      .slice(-7);
  };

  const trendData = groupByDate();

  const getPercentage = (value: number) => {
    if (stats.total === 0) return '0%';
    return `${((value / stats.total) * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Métricas de Fluxo de Chat</h2>
          <p className="text-muted-foreground text-sm">
            Acompanhe qual fluxo de decisão está sendo mais utilizado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Interações</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>No período selecionado</span>
            </div>
          </CardContent>
        </Card>

        {(['specific', 'listing', 'general'] as const).map((flowType) => {
          const Icon = FLOW_ICONS[flowType];
          return (
            <Card key={flowType}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {FLOW_LABELS[flowType]}
                </CardDescription>
                <CardTitle className="text-3xl" style={{ color: FLOW_COLORS[flowType] }}>
                  {stats[flowType]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: `${FLOW_COLORS[flowType]}20`,
                    color: FLOW_COLORS[flowType]
                  }}
                >
                  {getPercentage(stats[flowType])}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fluxo</CardTitle>
            <CardDescription>Proporção de cada tipo de fluxo</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo de Fluxos</CardTitle>
            <CardDescription>Volume de interações por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendência por Data</CardTitle>
            <CardDescription>Evolução dos fluxos nos últimos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="specific" name="Específico" fill={FLOW_COLORS.specific} stackId="a" />
                <Bar dataKey="listing" name="Listagem" fill={FLOW_COLORS.listing} stackId="a" />
                <Bar dataKey="general" name="Geral" fill={FLOW_COLORS.general} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas interações registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Data/Hora</th>
                    <th className="text-left py-2 px-2">Fluxo</th>
                    <th className="text-left py-2 px-2">Contexto</th>
                    <th className="text-left py-2 px-2">Origem</th>
                    <th className="text-left py-2 px-2">Imóveis Mostrados</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 20).map((metric) => (
                    <tr key={metric.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        {new Date(metric.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-2">
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${FLOW_COLORS[metric.flow_type]}20`,
                            color: FLOW_COLORS[metric.flow_type]
                          }}
                        >
                          {FLOW_LABELS[metric.flow_type]}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {metric.page_context || '-'}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {metric.origin || 'Direto'}
                      </td>
                      <td className="py-2 px-2">
                        {metric.properties_shown > 0 ? metric.properties_shown : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma métrica registrada ainda. Interações com o chat serão rastreadas aqui.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
