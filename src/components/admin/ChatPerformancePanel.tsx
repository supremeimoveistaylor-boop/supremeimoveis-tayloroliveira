import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Phone, UserCheck, TrendingUp, 
  AlertTriangle, Clock, BarChart3, Users
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface ChatStats {
  totalSessions: number;
  sessionsWithLead: number;
  conversionRate: number;
  avgMessages: number;
  abandonRate: number;
  categoryCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  recentLeads: any[];
  goldAlerts: any[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'alto_padrao': '#22c55e',
  'medio_padrao': '#3b82f6',
  'economico': '#eab308',
  'investidor': '#a855f7',
  'avaliacao': '#f97316',
  'curioso': '#ef4444',
};

const CATEGORY_LABELS: Record<string, string> = {
  'alto_padrao': '🟢 Alto Padrão (2M+)',
  'medio_padrao': '🔵 Médio Padrão (800k-2M)',
  'economico': '🟡 Econômico (até 800k)',
  'investidor': '🟣 Investidor',
  'avaliacao': '🟠 Avaliação',
  'curioso': '🔴 Curioso',
};

export const ChatPerformancePanel = () => {
  const [stats, setStats] = useState<ChatStats>({
    totalSessions: 0,
    sessionsWithLead: 0,
    conversionRate: 0,
    avgMessages: 0,
    abandonRate: 0,
    categoryCounts: {},
    budgetCounts: {},
    recentLeads: [],
    goldAlerts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch chat sessions
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("id, lead_id, status, started_at, finished_at, summary")
        .order("created_at", { ascending: false })
        .limit(500);

      // Fetch leads with categories
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, phone, lead_category, budget_range, lead_score, qualification, created_at, last_interaction_at, intent")
        .order("created_at", { ascending: false })
        .limit(500);

      // Fetch message counts per lead
      const { data: messageCounts } = await supabase
        .from("chat_messages")
        .select("lead_id")
        .limit(1000);

      const totalSessions = sessions?.length || 0;
      const sessionsWithLead = sessions?.filter(s => s.lead_id).length || 0;
      const finishedSessions = sessions?.filter(s => s.status === 'finished').length || 0;
      const conversionRate = totalSessions > 0 ? (sessionsWithLead / totalSessions) * 100 : 0;
      const abandonRate = totalSessions > 0 ? ((totalSessions - finishedSessions) / totalSessions) * 100 : 0;

      // Count messages per lead for average
      const msgPerLead: Record<string, number> = {};
      messageCounts?.forEach(m => {
        msgPerLead[m.lead_id] = (msgPerLead[m.lead_id] || 0) + 1;
      });
      const msgCounts = Object.values(msgPerLead);
      const avgMessages = msgCounts.length > 0 
        ? msgCounts.reduce((a, b) => a + b, 0) / msgCounts.length 
        : 0;

      // Category counts
      const categoryCounts: Record<string, number> = {};
      const budgetCounts: Record<string, number> = {};
      leads?.forEach(lead => {
        if (lead.lead_category) {
          categoryCounts[lead.lead_category] = (categoryCounts[lead.lead_category] || 0) + 1;
        }
        if (lead.budget_range) {
          budgetCounts[lead.budget_range] = (budgetCounts[lead.budget_range] || 0) + 1;
        }
      });

      // Gold alerts: luxury leads inactive 48h+
      const now = new Date();
      const goldAlerts = (leads || []).filter(lead => {
        if (!lead.last_interaction_at) return false;
        const lastInteraction = new Date(lead.last_interaction_at);
        const hoursInactive = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
        const isLuxury = lead.lead_category === 'alto_padrao' || lead.qualification === 'quente' || lead.qualification === 'muito_quente';
        const isCondominio = lead.intent?.toLowerCase().includes('condomínio') || lead.intent?.toLowerCase().includes('condominio');
        const isFinanciamento = lead.intent?.toLowerCase().includes('financiamento');
        return (isLuxury && hoursInactive >= 48) || (isCondominio && hoursInactive >= 72) || (isFinanciamento && hoursInactive >= 48);
      }).map(lead => ({
        ...lead,
        hoursInactive: Math.round((now.getTime() - new Date(lead.last_interaction_at!).getTime()) / (1000 * 60 * 60)),
        alertType: lead.lead_category === 'alto_padrao' ? '🏆 Lead Luxo' 
          : lead.intent?.toLowerCase().includes('condom') ? '🏡 Condomínio Fechado'
          : '💰 Financiamento',
      }));

      setStats({
        totalSessions,
        sessionsWithLead,
        conversionRate,
        avgMessages: Math.round(avgMessages * 10) / 10,
        abandonRate,
        categoryCounts,
        budgetCounts,
        recentLeads: (leads || []).slice(0, 20),
        goldAlerts,
      });
    } catch (error) {
      console.error("Error fetching chat stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const categoryData = Object.entries(stats.categoryCounts).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || '#888',
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-amber-500 animate-pulse mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Carregando métricas do chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gold Alerts */}
      {stats.goldAlerts.length > 0 && (
        <Card className="bg-amber-900/30 border-amber-600/50">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              🚨 Alertas de Ouro — {stats.goldAlerts.length} Lead(s) em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.goldAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-950/50 rounded-lg p-3 border border-amber-700/30">
                  <div>
                    <p className="text-white font-medium">{alert.name || 'Sem nome'}</p>
                    <p className="text-amber-300 text-sm">{alert.alertType} • {alert.phone || 'Sem telefone'}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="bg-red-600">
                      <Clock className="w-3 h-3 mr-1" />
                      {alert.hoursInactive}h inativo
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      Score: {alert.lead_score || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                <p className="text-sm text-slate-400">Chats Iniciados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sessionsWithLead}</p>
                <p className="text-sm text-slate-400">Viraram Lead</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-slate-400">Conversão Chat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.abandonRate.toFixed(1)}%</p>
                <p className="text-sm text-slate-400">Taxa Abandono</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Leads por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500">
                Nenhum lead classificado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads with Category */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Últimos Leads do Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {stats.recentLeads.slice(0, 15).map((lead, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-900/50 rounded p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{lead.name || 'Anônimo'}</p>
                    <p className="text-slate-400 text-xs">{lead.phone || 'Sem telefone'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.lead_category && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: CATEGORY_COLORS[lead.lead_category] || '#888', color: CATEGORY_COLORS[lead.lead_category] || '#888' }}
                      >
                        {CATEGORY_LABELS[lead.lead_category]?.split(' ').slice(1).join(' ') || lead.lead_category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      Score: {lead.lead_score || 0}
                    </Badge>
                  </div>
                </div>
              ))}
              {stats.recentLeads.length === 0 && (
                <p className="text-slate-500 text-center py-4">Nenhum lead encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Messages Stat */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-amber-400">{stats.avgMessages}</p>
              <p className="text-sm text-slate-400">Msgs/Lead (média)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400">{stats.categoryCounts['alto_padrao'] || 0}</p>
              <p className="text-sm text-slate-400">Leads Alto Padrão</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-400">{stats.categoryCounts['medio_padrao'] || 0}</p>
              <p className="text-sm text-slate-400">Leads Médio Padrão</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">{stats.categoryCounts['economico'] || 0}</p>
              <p className="text-sm text-slate-400">Leads Econômico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
