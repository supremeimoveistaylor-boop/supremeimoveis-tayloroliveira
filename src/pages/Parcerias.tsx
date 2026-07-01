import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Home, Building2, TreePine, Search, Filter, X, Link, Check, FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generatePropertyPdf } from "@/lib/generatePropertyPdf";
import { toast } from "@/hooks/use-toast";

interface PartnerProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  property_type: string;
  purpose: string;
  images: string[] | null;
  area: number | null;
  bedrooms: number | null;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "Casa",
  apartment: "Apartamento",
  commercial: "Comercial",
  land: "Terreno",
};

const PROPERTY_TYPE_ICONS: Record<string, React.ReactNode> = {
  house: <Home className="h-4 w-4" />,
  apartment: <Building2 className="h-4 w-4" />,
  land: <TreePine className="h-4 w-4" />,
  commercial: <Building2 className="h-4 w-4" />,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function Parcerias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PartnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter state from URL
  const tipo = searchParams.get("tipo") || "";
  const cidade = searchParams.get("cidade") || "";
  const precoMin = searchParams.get("preco_min") || "";
  const precoMax = searchParams.get("preco_max") || "";

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get_public_properties", {
          body: { is_public: true, limit: 200 },
        });
        if (!error && data?.data) {
          setProperties(data.data);
        }
      } catch (e) {
        console.error("Error fetching partner properties:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filtered = useMemo(() => {
    let result = properties;
    if (tipo) result = result.filter((p) => p.property_type === tipo);
    if (cidade) result = result.filter((p) => p.location.toLowerCase().includes(cidade.toLowerCase()));
    if (precoMin) result = result.filter((p) => p.price >= Number(precoMin));
    if (precoMax) result = result.filter((p) => p.price <= Number(precoMax));
    return result;
  }, [properties, tipo, cidade, precoMin, precoMax]);

  // Dynamic SEO
  useEffect(() => {
    const parts: string[] = [];
    if (tipo) parts.push(PROPERTY_TYPE_LABELS[tipo] || tipo);
    if (cidade) parts.push(`em ${cidade}`);
    if (precoMax) parts.push(`até ${formatCurrency(Number(precoMax))}`);
    const suffix = parts.length > 0 ? ` - ${parts.join(" ")}` : "";
    document.title = `Vitrine de Parcerias${suffix} | Supreme Empreendimentos`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = `Imóveis disponíveis para parcerias${suffix}. Confira as melhores oportunidades do mercado imobiliário.`;
    if (metaDesc) metaDesc.setAttribute("content", desc);
    else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = desc;
      document.head.appendChild(meta);
    }
  }, [tipo, cidade, precoMax]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearFilters = () => setSearchParams({});

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/parcerias/imovel/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownloadPdf = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDownloadingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("get_public_properties", {
        body: { id, is_public: true },
      });
      const full = data?.data?.[0];
      if (error || !full) throw new Error("Não foi possível carregar o imóvel");
      await generatePropertyPdf(full);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const hasFilters = tipo || cidade || precoMin || precoMax;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Vitrine de Parcerias</h1>
            <p className="text-sm text-muted-foreground">Imóveis disponíveis para divulgação</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
            <Filter className="h-4 w-4 mr-1" /> Filtros
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className={`mb-6 bg-card border rounded-lg p-4 ${showFilters ? "block" : "hidden md:block"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
              <Select value={tipo} onValueChange={(v) => updateFilter("tipo", v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
              <Input placeholder="Ex: Goiânia" value={cidade} onChange={(e) => updateFilter("cidade", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço mín.</label>
              <Input type="number" placeholder="R$ 0" value={precoMin} onChange={(e) => updateFilter("preco_min", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço máx.</label>
              <Input type="number" placeholder="Sem limite" value={precoMax} onChange={(e) => updateFilter("preco_max", e.target.value)} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? "Carregando..." : `${filtered.length} imóvel(is) encontrado(s)`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><Skeleton className="h-48 w-full rounded-t-lg" /><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum imóvel encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate(`/parcerias/imovel/${p.id}`)}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Home className="h-12 w-12" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs">
                    {PROPERTY_TYPE_ICONS[p.property_type]} {PROPERTY_TYPE_LABELS[p.property_type] || p.property_type}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{p.title}</h3>
                  <p className="text-primary font-bold text-lg mt-1">{formatCurrency(p.price)}</p>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{p.location}</span>
                  </div>
                  {(p.area || p.bedrooms) && (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {p.bedrooms && <span>{p.bedrooms} quarto(s)</span>}
                      {p.area && <span>{p.area}m²</span>}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={(e) => handleCopyLink(e, p.id)}
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Link copiado!
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Copiar link
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Supreme Empreendimentos · Vitrine de Parcerias</p>
      </footer>
    </div>
  );
}
