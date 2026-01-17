import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, FunnelChart, Funnel, LabelList
} from "recharts";
import { TrendingUp, Users, CalendarCheck, Target, GitBranch } from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  intent: string | null;
  origin: string | null;
  visit_requested: boolean;
  property_id: string | null;
  broker_id: string | null;
  created_at: string;
  lead_score: number | null;
  score_breakdown: Record<string, number> | null;
  qualification: string | null;
  message_count: number | null;
}

interface LeadsDashboardProps {
  leads: Lead[];
}

const QUALIFICATION_COLORS = {
  frio: "#3b82f6",
  morno: "#eab308",
  quente: "#f97316",
  muito_quente: "#ef4444",
};

const LeadsDashboard = ({ leads }: LeadsDashboardProps) => {
  // Leads por dia (últimos 30 dias)
  const leadsByDay = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    const counts = last30Days.map((day) => {
      const count = leads.filter(
        (lead) => lead.created_at.split("T")[0] === day
      ).length;
      return {
        date: new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        leads: count,
      };
    });

    return counts;
  }, [leads]);

  // Distribuição por qualificação
  const qualificationDistribution = useMemo(() => {
    const distribution = {
      frio: 0,
      morno: 0,
      quente: 0,
      muito_quente: 0,
    };

    leads.forEach((lead) => {
      const qual = lead.qualification || "frio";
      if (qual in distribution) {
        distribution[qual as keyof typeof distribution]++;
      }
    });

    return [
      { name: "Frio", value: distribution.frio, color: QUALIFICATION_COLORS.frio },
      { name: "Morno", value: distribution.morno, color: QUALIFICATION_COLORS.morno },
      { name: "Quente", value: distribution.quente, color: QUALIFICATION_COLORS.quente },
      { name: "Muito Quente", value: distribution.muito_quente, color: QUALIFICATION_COLORS.muito_quente },
    ].filter((item) => item.value > 0);
  }, [leads]);

  // Taxa de agendamento de visitas
  const visitStats = useMemo(() => {
    const total = leads.length;
    const withVisit = leads.filter((lead) => lead.visit_requested).length;
    const rate = total > 0 ? ((withVisit / total) * 100).toFixed(1) : "0";

    return { total, withVisit, rate };
  }, [leads]);

  // Score médio
  const avgScore = useMemo(() => {
    const withScore = leads.filter((lead) => lead.lead_score !== null);
    if (withScore.length === 0) return 0;
    const sum = withScore.reduce((acc, lead) => acc + (lead.lead_score || 0), 0);
    return Math.round(sum / withScore.length);
  }, [leads]);

  // Leads qualificados (quente + muito_quente)
  const qualifiedCount = useMemo(() => {
    return leads.filter(
      (lead) => lead.qualification === "quente" || lead.qualification === "muito_quente"
    ).length;
  }, [leads]);

  // Taxa de conversão por origem
  const conversionByOrigin = useMemo(() => {
    const origins: Record<string, { total: number; qualified: number }> = {};
    
    leads.forEach((lead) => {
      const origin = lead.origin || "Direto";
      if (!origins[origin]) {
        origins[origin] = { total: 0, qualified: 0 };
      }
      origins[origin].total++;
      if (lead.qualification === "quente" || lead.qualification === "muito_quente") {
        origins[origin].qualified++;
      }
    });

    return Object.entries(origins).map(([origin, stats]) => ({
      origin,
      total: stats.total,
      qualified: stats.qualified,
      taxa: stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0,
    }));
  }, [leads]);

  // Funnel data - conversão de leads
  const funnelData = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter(
      (lead) => lead.qualification === "quente" || lead.qualification === "muito_quente" || 
                lead.status === "qualificado" || lead.status === "visita_solicitada" || lead.status === "encerrado"
    ).length;
    const visitRequested = leads.filter(
      (lead) => lead.visit_requested || lead.status === "visita_solicitada" || lead.status === "encerrado"
    ).length;
    const closed = leads.filter((lead) => lead.status === "encerrado").length;

    return [
      { name: "Novos Leads", value: total, fill: "#3b82f6" },
      { name: "Qualificados", value: qualified, fill: "#eab308" },
      { name: "Visita Solicitada", value: visitRequested, fill: "#f97316" },
      { name: "Fechados", value: closed, fill: "#22c55e" },
    ];
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">
              {qualifiedCount} qualificados ({leads.length > 0 ? Math.round((qualifiedCount / leads.length) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}/100</div>
            <p className="text-xs text-muted-foreground">
              Pontuação média dos leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Solicitadas</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitStats.withVisit}</div>
            <p className="text-xs text-muted-foreground">
              Taxa: {visitStats.rate}% dos leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Quentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{qualifiedCount}</div>
            <p className="text-xs text-muted-foreground">
              Quente + Muito Quente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leads por Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por Dia (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "hsl(var(--accent))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Qualificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Qualificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {qualificationDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualificationDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {qualificationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum lead para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Funil de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {leads.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number, name: string) => {
                        const total = funnelData[0].value;
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return [`${value} (${percent}%)`, name];
                      }}
                    />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                    >
                      <LabelList 
                        position="right" 
                        fill="hsl(var(--foreground))" 
                        stroke="none" 
                        dataKey="name" 
                        fontSize={12}
                      />
                      <LabelList 
                        position="center" 
                        fill="#fff" 
                        stroke="none" 
                        dataKey="value"
                        fontSize={14}
                        fontWeight="bold"
                      />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum lead para exibir
                </div>
              )}
            </div>
            {/* Funnel Stats */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              {funnelData.map((stage, index) => {
                const prevValue = index === 0 ? stage.value : funnelData[index - 1].value;
                const conversionRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(0) : 0;
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="font-medium" style={{ color: stage.fill }}>{stage.value}</div>
                    <div className="text-muted-foreground truncate">{stage.name}</div>
                    {index > 0 && (
                      <div className="text-muted-foreground">↓ {conversionRate}%</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Conversão por Origem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Qualificação por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {conversionByOrigin.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionByOrigin} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-muted-foreground" />
                    <YAxis 
                      type="category" 
                      dataKey="origin" 
                      width={100}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "taxa") return [`${value}%`, "Taxa Qualificação"];
                        if (name === "total") return [value, "Total de Leads"];
                        if (name === "qualified") return [value, "Qualificados"];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="total" 
                      fill="hsl(var(--muted-foreground))" 
                      name="Total"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar 
                      dataKey="qualified" 
                      fill="hsl(var(--accent))" 
                      name="Qualificados"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum lead para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadsDashboard;
