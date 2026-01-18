import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Phone, User, TrendingUp, Target, BarChart3 } from "lucide-react";

interface ConversionMetric {
  date: string;
  conversion_type: string;
  total_conversions: number;
  unique_leads: number;
}

interface ConversionSummary {
  type: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  color: string;
}

export function ChatConversionsPanel() {
  const [metrics, setMetrics] = useState<ConversionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ConversionSummary[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Carregar métricas agregadas
      const { data: conversions, error } = await supabase
        .from("chat_conversions")
        .select("conversion_type, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calcular sumário
      const counts: Record<string, number> = {};
      conversions?.forEach(c => {
        counts[c.conversion_type] = (counts[c.conversion_type] || 0) + 1;
      });

      const summaryData: ConversionSummary[] = [
        {
          type: "agendamento_solicitado",
          label: "Agendamentos",
          icon: <CalendarCheck className="h-5 w-5" />,
          total: counts["agendamento_solicitado"] || 0,
          color: "bg-green-500"
        },
        {
          type: "telefone_coletado",
          label: "Telefones Coletados",
          icon: <Phone className="h-5 w-5" />,
          total: counts["telefone_coletado"] || 0,
          color: "bg-blue-500"
        },
        {
          type: "nome_coletado",
          label: "Nomes Coletados",
          icon: <User className="h-5 w-5" />,
          total: counts["nome_coletado"] || 0,
          color: "bg-purple-500"
        },
        {
          type: "interesse_qualificado",
          label: "Interesse Qualificado",
          icon: <TrendingUp className="h-5 w-5" />,
          total: counts["interesse_qualificado"] || 0,
          color: "bg-orange-500"
        }
      ];

      setSummary(summaryData);

      // Agrupar por data para gráfico
      const byDate: Record<string, Record<string, number>> = {};
      conversions?.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString("pt-BR");
        if (!byDate[date]) byDate[date] = {};
        byDate[date][c.conversion_type] = (byDate[date][c.conversion_type] || 0) + 1;
      });

      const metricsData: ConversionMetric[] = [];
      Object.entries(byDate).forEach(([date, types]) => {
        Object.entries(types).forEach(([type, count]) => {
          metricsData.push({
            date,
            conversion_type: type,
            total_conversions: count,
            unique_leads: count
          });
        });
      });

      setMetrics(metricsData);
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalConversions = summary.reduce((acc, s) => acc + s.total, 0);
  const conversionRate = summary.find(s => s.type === "agendamento_solicitado")?.total || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Métricas de Conversão do Chat</h2>
        <Badge variant="outline" className="ml-2">Últimos 30 dias</Badge>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item) => (
          <Card key={item.type}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-bold">{item.total}</p>
                </div>
                <div className={`p-3 rounded-full ${item.color} text-white`}>
                  {item.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card de Taxa de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Taxa de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-green-600">
              {totalConversions > 0 
                ? Math.round((conversionRate / totalConversions) * 100) 
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              {conversionRate} agendamentos de {totalConversions} interações qualificadas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Conversões por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Conversões por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conversão registrada ainda. As conversões serão rastreadas automaticamente durante as conversas no chat.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(
                metrics.reduce((acc, m) => {
                  if (!acc[m.date]) acc[m.date] = [];
                  acc[m.date].push(m);
                  return acc;
                }, {} as Record<string, ConversionMetric[]>)
              ).slice(0, 7).map(([date, dayMetrics]) => (
                <div key={date} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{date}</span>
                  <div className="flex gap-2">
                    {dayMetrics.map((m) => (
                      <Badge key={m.conversion_type} variant="secondary">
                        {m.conversion_type.replace(/_/g, " ")}: {m.total_conversions}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
