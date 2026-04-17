import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, RefreshCw, Phone, CheckCircle2, XCircle, Send } from "lucide-react";

interface BrokerNotification {
  id: string;
  lead_id: string | null;
  broker_phone: string;
  lead_name: string;
  lead_phone: string;
  lead_interest: string | null;
  origin: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export const BrokerNotificationsPanel = () => {
  const [items, setItems] = useState<BrokerNotification[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_lead_notifications" as any)
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setItems((data as unknown as BrokerNotification[]) || []);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((n) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return (
      n.lead_name.toLowerCase().includes(t) ||
      n.lead_phone.includes(t) ||
      (n.lead_interest || "").toLowerCase().includes(t)
    );
  });

  const sentCount = items.filter((i) => i.status === "sent").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-sm text-muted-foreground">Total Enviado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Sucesso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-sm text-muted-foreground">Falhas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leads Enviados ao Corretor</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou interesse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum lead enviado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Interesse</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.lead_name}</TableCell>
                      <TableCell>
                        <a
                          href={`https://wa.me/55${n.lead_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {n.lead_phone}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {n.lead_interest || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{n.origin || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {n.status === "sent" ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" title={n.error_message || ""}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Falhou
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(n.sent_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
