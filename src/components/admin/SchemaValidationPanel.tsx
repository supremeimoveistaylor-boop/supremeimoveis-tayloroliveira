import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { runSchemaCheck, type SchemaIssue } from "@/lib/schema-check.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface CheckRow {
  id: string;
  checked_at: string;
  total_pages: number;
  valid_pages: number;
  issues: SchemaIssue[];
}

const DAY = 24 * 60 * 60 * 1000;
const pct = (r: CheckRow) => (r.total_pages ? Math.round((r.valid_pages / r.total_pages) * 100) : 0);

export function SchemaValidationPanel() {
  const run = useServerFn(runSchemaCheck);
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("schema_validation_checks")
      .select("id, checked_at, total_pages, valid_pages, issues")
      .order("checked_at", { ascending: false })
      .limit(14);
    if (error) setError("Não foi possível carregar o histórico.");
    setRows((data as CheckRow[]) ?? []);
    setLoading(false);
    return (data as CheckRow[]) ?? [];
  }, []);

  const check = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await run();
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("schema_validation_checks").insert({
        total_pages: r.total,
        valid_pages: r.valid,
        issues: r.issues,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      await load();
    } catch {
      setError("A verificação falhou. Tente novamente em alguns minutos.");
    } finally {
      setRunning(false);
    }
  }, [run, load]);

  useEffect(() => {
    load().then((data) => {
      if (autoRan.current) return;
      autoRan.current = true;
      if (!data.length || Date.now() - new Date(data[0].checked_at).getTime() > DAY) check();
    });
  }, [load, check]);

  const latest = rows[0];
  const previous = rows[1];
  const dropped =
    latest && previous && (latest.valid_pages < previous.valid_pages || pct(latest) < pct(previous));
  const hasIssues = latest && latest.issues?.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Ficha dos imóveis no Google (dados estruturados)</CardTitle>
          <Button size="sm" onClick={check} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            {running ? "Verificando..." : "Verificar agora"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verificação automática uma vez por dia (ao abrir o painel) de todas as páginas de imóvel publicadas.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !latest ? (
            <p className="text-sm text-muted-foreground">Nenhuma verificação ainda.</p>
          ) : (
            <>
              {dropped && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <span>
                    <strong>Queda detectada:</strong> {previous!.valid_pages} → {latest.valid_pages} páginas corretas
                    ({pct(previous!)}% → {pct(latest)}%).
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                {hasIssues ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
                <span>
                  {latest.valid_pages} de {latest.total_pages} páginas corretas ({pct(latest)}%) —{" "}
                  {new Date(latest.checked_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {hasIssues && (
                <ul className="space-y-2">
                  {latest.issues.map((i) => (
                    <li key={i.id} className="rounded-md border p-2 text-sm">
                      <a href={i.url} target="_blank" rel="noreferrer" className="font-medium underline">
                        {i.title || i.id}
                      </a>
                      <div className="text-muted-foreground">{i.problems.join(" · ")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {rows.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico (últimas verificações)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex justify-between py-2">
                  <span>{new Date(r.checked_at).toLocaleString("pt-BR")}</span>
                  <span>
                    {r.valid_pages}/{r.total_pages} ({pct(r)}%)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
