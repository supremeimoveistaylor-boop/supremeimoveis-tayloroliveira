import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Instagram, MessageCircle, Phone, TrendingUp, BarChart3, Filter } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface SourceData {
  source: string;
  count: number;
}

interface CampaignData {
  campaign: string;
  count: number;
}

const SOURCE_COLORS: Record<string, string> = {
  instagram: 'hsl(330, 70%, 55%)',
  whatsapp: 'hsl(142, 70%, 45%)',
  messenger: 'hsl(217, 91%, 60%)',
  google_ads: 'hsl(45, 93%, 47%)',
  meta_ads: 'hsl(217, 91%, 60%)',
  chat: 'hsl(262, 83%, 58%)',
  site: 'hsl(200, 80%, 50%)',
  direto: 'hsl(0, 0%, 50%)',
  google: 'hsl(45, 93%, 47%)',
  facebook: 'hsl(217, 91%, 60%)',
  referral: 'hsl(170, 60%, 50%)',
};

const SOURCE_ICONS: Record<string, typeof Globe> = {
  instagram: Instagram,
  whatsapp: Phone,
  messenger: MessageCircle,
};

const chartConfig: ChartConfig = {
  count: { label: 'Leads', color: 'hsl(var(--primary))' },
};

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo período' },
];

export function SourceAnalyticsPanel() {
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [period, setPeriod] = useState('30');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [period, sourceFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      let query = supabase.from('leads').select('source, campaign, medium, origin, created_at');

      if (period !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      const { data: leads } = await query;
      if (!leads) return;

      setTotalLeads(leads.length);

      // Count by source (use `source` column, fallback to `origin`)
      const sourceCounts: Record<string, number> = {};
      const campaignCounts: Record<string, number> = {};

      for (const lead of leads) {
        const src = lead.source || lead.origin || 'não identificado';
        
        if (sourceFilter !== 'all' && src !== sourceFilter) continue;
        
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;

        if (lead.campaign) {
          campaignCounts[lead.campaign] = (campaignCounts[lead.campaign] || 0) + 1;
        }
      }

      const sources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      const campaigns = Object.entries(campaignCounts)
        .map(([campaign, count]) => ({ campaign, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setSourceData(sources);
      setCampaignData(campaigns);

      // Get all unique sources for filter
      const allSources = [...new Set(leads.map(l => l.source || l.origin).filter(Boolean))] as string[];
      setAvailableSources(allSources.sort());
    } catch (error) {
      console.error('Erro ao carregar analytics de origem:', error);
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
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Origem dos Leads</h2>
          <p className="text-muted-foreground">De onde vêm seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {availableSources.map(src => (
                <SelectItem key={src} value={src}>{src}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sourceData.slice(0, 4).map((item) => {
          const Icon = SOURCE_ICONS[item.source] || Globe;
          const color = SOURCE_COLORS[item.source] || 'hsl(var(--primary))';
          const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
          return (
            <Card key={item.source} className="border" style={{ borderColor: `${color}30` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                  {item.source}
                </CardTitle>
                <Icon className="h-5 w-5" style={{ color }} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{item.count}</div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% do total</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Leads por Origem */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Leads por Origem</CardTitle>
            </div>
            <CardDescription>{totalLeads} leads no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="source" fontSize={12} tickLine={false} axisLine={false} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sourceData.map((entry) => (
                    <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribuição */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Distribuição por Canal</CardTitle>
            </div>
            <CardDescription>Proporção de cada origem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={sourceData}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {sourceData.map((entry) => (
                      <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || 'hsl(var(--primary))'} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-2">
                {sourceData.map((item) => (
                  <div key={item.source} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[item.source] || 'hsl(var(--primary))' }} />
                    <span className="text-sm capitalize">{item.source}</span>
                    <Badge variant="secondary" className="ml-auto">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Table */}
      {campaignData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Campanha</CardTitle>
            <CardDescription>Performance das campanhas de tráfego pago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaignData.map((item, i) => {
                const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
                return (
                  <div key={item.campaign} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.campaign}</span>
                        <Badge variant="outline">{item.count} leads</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${Math.min(pct * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
