import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, MessageCircle, FileText, Eye, Loader2 } from 'lucide-react';

const CONVERSION_EVENTS = ['whatsapp_click', 'contact_form_submitted', 'lead_generated'];

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

interface PageRow {
  path: string;
  label: string;
  views: number;
  whatsapp: number;
  forms: number;
  total: number;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function toPath(url: string | null): string {
  if (!url) return '(desconhecida)';
  try {
    const u = new URL(url);
    return (u.pathname + (u.hash.startsWith('#/') ? u.hash.slice(1) : '')) || '/';
  } catch {
    return url;
  }
}

export function PageConversionsPanel() {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - Number(period));

      const collected: { event_type: string; page_url: string | null; metadata: any }[] = [];
      for (let page = 0; page < 5; page++) {
        const { data, error } = await supabase
          .from('event_tracking')
          .select('event_type, page_url, metadata')
          .in('event_type', [...CONVERSION_EVENTS, 'page_view', 'property_viewed'])
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .range(page * 1000, page * 1000 + 999);
        if (error) break;
        collected.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }

      const map = new Map<string, PageRow>();
      const propertyIds = new Set<string>();

      for (const ev of collected) {
        const path = toPath(ev.page_url);
        const propId =
          (ev.metadata && typeof ev.metadata === 'object' && (ev.metadata as any).property_id) ||
          path.match(UUID_RE)?.[0] ||
          null;
        if (propId) propertyIds.add(propId);

        const row = map.get(path) ?? { path, label: path, views: 0, whatsapp: 0, forms: 0, total: 0 };
        if (ev.event_type === 'whatsapp_click') {
          row.whatsapp++;
          row.total++;
        } else if (ev.event_type === 'contact_form_submitted' || ev.event_type === 'lead_generated') {
          row.forms++;
          row.total++;
        } else {
          row.views++;
        }
        map.set(path, row);
      }

      let titles: Record<string, string> = {};
      if (propertyIds.size > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', Array.from(propertyIds));
        titles = Object.fromEntries((props ?? []).map((p) => [p.id, p.title]));
      }

      const result = Array.from(map.values())
        .map((r) => {
          const id = r.path.match(UUID_RE)?.[0];
          return { ...r, label: (id && titles[id]) || r.path };
        })
        .sort((a, b) => b.total - a.total || b.views - a.views);

      if (!cancelled) {
        setRows(result);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          views: acc.views + r.views,
          whatsapp: acc.whatsapp + r.whatsapp,
          forms: acc.forms + r.forms,
        }),
        { views: 0, whatsapp: 0, forms: 0 },
      ),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Conversões por página
          </h2>
          <p className="text-sm text-muted-foreground">
            Cliques no WhatsApp e envios de formulário gerados em cada página.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Visualizações
            </CardDescription>
            <CardTitle className="text-2xl">{totals.views}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Cliques no WhatsApp
            </CardDescription>
            <CardTitle className="text-2xl">{totals.whatsapp}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Formulários enviados
            </CardDescription>
            <CardTitle className="text-2xl">{totals.forms}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhe por página</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum dado registrado neste período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Página</th>
                    <th className="py-2 px-3 font-medium text-right">Visitas</th>
                    <th className="py-2 px-3 font-medium text-right">WhatsApp</th>
                    <th className="py-2 px-3 font-medium text-right">Formulários</th>
                    <th className="py-2 pl-3 font-medium text-right">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.path} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium truncate max-w-[320px]">{r.label}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[320px]">{r.path}</div>
                      </td>
                      <td className="py-2 px-3 text-right">{r.views}</td>
                      <td className="py-2 px-3 text-right">{r.whatsapp}</td>
                      <td className="py-2 px-3 text-right">{r.forms}</td>
                      <td className="py-2 pl-3 text-right">
                        <Badge variant={r.total > 0 ? 'default' : 'secondary'}>
                          {r.views > 0 ? `${Math.round((r.total / r.views) * 100)}%` : r.total > 0 ? '—' : '0%'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PageConversionsPanel;
