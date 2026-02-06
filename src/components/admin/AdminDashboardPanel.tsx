import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Phone, TrendingUp, Calendar, CheckCircle, Clock,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon
} from 'lucide-react';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig 
} from '@/components/ui/chart';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface DashboardStats {
  totalLeads: number;
  leadsWithPhone: number;
  conversionRate: number;
  totalVisitsCreated: number;
  futureVisits: number;
  completedVisits: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
}

interface LeadTrendData {
  date: string;
  leads: number;
}

interface VisitsByPeriodData {
  period: string;
  agendadas: number;
}

interface VisitStatusData {
  status: string;
  value: number;
  fill: string;
}

const chartConfig: ChartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
  agendadas: {
    label: "Agendadas",
    color: "hsl(var(--primary))",
  },
  agendada: {
    label: "Agendada",
    color: "hsl(217, 91%, 60%)",
  },
  realizada: {
    label: "Realizada",
    color: "hsl(142, 76%, 36%)",
  },
  cancelada: {
    label: "Cancelada",
    color: "hsl(0, 84%, 60%)",
  },
};

const VISIT_STATUS_COLORS = {
  agendada: 'hsl(217, 91%, 60%)',
  realizada: 'hsl(142, 76%, 36%)',
  cancelada: 'hsl(0, 84%, 60%)',
};

export function AdminDashboardPanel() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsWithPhone: 0,
    conversionRate: 0,
    totalVisitsCreated: 0,
    futureVisits: 0,
    completedVisits: 0,
    leadsToday: 0,
    leadsThisWeek: 0,
    leadsThisMonth: 0,
  });
  const [leadTrend, setLeadTrend] = useState<LeadTrendData[]>([]);
  const [visitsByPeriod, setVisitsByPeriod] = useState<VisitsByPeriodData[]>([]);
  const [visitStatus, setVisitStatus] = useState<VisitStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch leads statistics
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, phone, created_at');

      if (leadsError) throw leadsError;

      const totalLeads = leadsData?.length || 0;
      const leadsWithPhone = leadsData?.filter(l => l.phone && l.phone.trim() !== '').length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((leadsWithPhone / totalLeads) * 100) : 0;

      const leadsToday = leadsData?.filter(l => new Date(l.created_at) >= today).length || 0;
      const leadsThisWeek = leadsData?.filter(l => new Date(l.created_at) >= weekAgo).length || 0;
      const leadsThisMonth = leadsData?.filter(l => new Date(l.created_at) >= monthAgo).length || 0;

      // Fetch visits statistics
      const { data: visitsData, error: visitsError } = await supabase
        .from('scheduled_visits')
        .select('id, status, visit_date, created_at');

      const totalVisitsCreated = visitsData?.length || 0;
      const futureVisits = visitsData?.filter(v => 
        v.status === 'agendada' && new Date(v.visit_date) >= today
      ).length || 0;
      const completedVisits = visitsData?.filter(v => v.status === 'realizada').length || 0;

      setStats({
        totalLeads,
        leadsWithPhone,
        conversionRate,
        totalVisitsCreated,
        futureVisits,
        completedVisits,
        leadsToday,
        leadsThisWeek,
        leadsThisMonth,
      });

      // Generate lead trend data (last 7 days)
      const trendData: LeadTrendData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const count = leadsData?.filter(l => {
          const created = new Date(l.created_at);
          return created >= date && created < nextDate;
        }).length || 0;
        trendData.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          leads: count,
        });
      }
      setLeadTrend(trendData);

      // Generate visits by period (last 4 weeks)
      const periodData: VisitsByPeriodData[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const count = visitsData?.filter(v => {
          const created = new Date(v.created_at);
          return created >= weekStart && created < weekEnd;
        }).length || 0;
        periodData.push({
          period: `Sem ${4 - i}`,
          agendadas: count,
        });
      }
      setVisitsByPeriod(periodData);

      // Generate visit status distribution
      const statusCount = {
        agendada: visitsData?.filter(v => v.status === 'agendada').length || 0,
        realizada: visitsData?.filter(v => v.status === 'realizada').length || 0,
        cancelada: visitsData?.filter(v => v.status === 'cancelada').length || 0,
      };
      setVisitStatus([
        { status: 'Agendada', value: statusCount.agendada, fill: VISIT_STATUS_COLORS.agendada },
        { status: 'Realizada', value: statusCount.realizada, fill: VISIT_STATUS_COLORS.realizada },
        { status: 'Cancelada', value: statusCount.cancelada, fill: VISIT_STATUS_COLORS.cancelada },
      ]);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
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
          <h2 className="text-2xl font-bold">Dashboard Estratégico</h2>
          <p className="text-muted-foreground">Visão geral de leads e agendamentos</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Atualizado agora
        </Badge>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Totais
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Capturados via chat
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads c/ Telefone
            </CardTitle>
            <Phone className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.leadsWithPhone}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa: {stats.conversionRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lead → Telefone
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Criados
            </CardTitle>
            <Calendar className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVisitsCreated}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de visitas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visitas Futuras
            </CardTitle>
            <Clock className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.futureVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Agendadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visitas Realizadas
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.leadsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Esta Semana / Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.leadsThisWeek}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-xl font-semibold text-muted-foreground">{stats.leadsThisMonth}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Semana / 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Leads ao longo do tempo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Leads por Dia</CardTitle>
            </div>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={leadTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Agendamentos por período */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Agendamentos por Semana</CardTitle>
            </div>
            <CardDescription>Últimas 4 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={visitsByPeriod} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="period" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="agendadas" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart - Status das visitas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Status das Visitas</CardTitle>
          </div>
          <CardDescription>Distribuição por status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={visitStatus}
                  dataKey="value"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {visitStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            
            <div className="flex flex-col gap-3">
              {visitStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm font-medium">{item.status}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
