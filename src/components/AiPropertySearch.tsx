import { useState } from "react";
import { Sparkles, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/pixel-tracker";

export interface AiSearchFilters {
  property_type: string | null;
  subtype: string | null;
  purpose: string | null;
  condominium: boolean;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking: number | null;
  min_area: number | null;
  min_price: number | null;
  max_price: number | null;
  location: string | null;
  amenities: string[];
  keywords: string[];
  sort: "relevance" | "price_asc" | "price_desc";
}

const EMPTY_FILTERS: AiSearchFilters = {
  property_type: null, subtype: null, purpose: null, condominium: false,
  bedrooms: null, suites: null, bathrooms: null, parking: null,
  min_area: null, min_price: null, max_price: null, location: null,
  amenities: [], keywords: [], sort: "relevance",
};

const EXAMPLES = [
  "Sobrado em condomínio até R$ 1 milhão",
  "Casa com 3 quartos e 2 suítes até R$ 800 mil",
  "Apartamento de 2 quartos entre R$ 400 mil e R$ 600 mil",
];

const TYPE_LABEL: Record<string, string> = {
  house: "Casa", apartment: "Apartamento", commercial: "Comercial", land: "Terreno", rural: "Rural",
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

type ChipKey = keyof AiSearchFilters | `amenity:${string}`;

function buildChips(f: AiSearchFilters): { key: ChipKey; label: string }[] {
  const chips: { key: ChipKey; label: string }[] = [];
  if (f.property_type) chips.push({ key: "property_type", label: TYPE_LABEL[f.property_type] || f.property_type });
  if (f.subtype) chips.push({ key: "subtype", label: f.subtype.charAt(0).toUpperCase() + f.subtype.slice(1) });
  if (f.purpose) chips.push({ key: "purpose", label: f.purpose === "rent" ? "Aluguel" : "Venda" });
  if (f.condominium) chips.push({ key: "condominium", label: "Condomínio" });
  if (f.bedrooms) chips.push({ key: "bedrooms", label: `${f.bedrooms}+ quartos` });
  if (f.suites) chips.push({ key: "suites", label: `${f.suites}+ suítes` });
  if (f.bathrooms) chips.push({ key: "bathrooms", label: `${f.bathrooms}+ banheiros` });
  if (f.parking) chips.push({ key: "parking", label: `${f.parking}+ vagas` });
  if (f.min_area) chips.push({ key: "min_area", label: `A partir de ${f.min_area}m²` });
  if (f.min_price) chips.push({ key: "min_price", label: `A partir de ${brl(f.min_price)}` });
  if (f.max_price) chips.push({ key: "max_price", label: `Até ${brl(f.max_price)}` });
  if (f.location) chips.push({ key: "location", label: f.location.charAt(0).toUpperCase() + f.location.slice(1) });
  f.amenities.forEach((a) => chips.push({ key: `amenity:${a}` as ChipKey, label: a.charAt(0).toUpperCase() + a.slice(1) }));
  return chips;
}

interface Props {
  origin?: string;
  onResults: (
    results: any[] | null,
    meta: { total: number; message: string | null; isSuggestion: boolean } | null,
  ) => void;
}

export const AiPropertySearch = ({ origin = "vitrine", onResults }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AiSearchFilters>(EMPTY_FILTERS);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (text: string, baseFilters: AiSearchFilters, opts?: { filtersOnly?: boolean }) => {
    setLoading(true);
    try {
      trackEvent("search_performed", { type: "ai_property_search_started", query: text || "(chips)" });

      const { data, error } = await supabase.functions.invoke("ai-property-search", {
        body: {
          query: opts?.filtersOnly ? "" : text,
          filters: baseFilters,
          origin,
          page_url: window.location.href,
          session_id: sessionStorage.getItem("supreme_session_id"),
        },
      });

      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error || "Falha na busca");

      setFilters({ ...EMPTY_FILTERS, ...res.filters });
      setActive(true);

      if (res.total > 0) {
        setMessage(`Encontramos ${res.total} ${res.total === 1 ? "imóvel" : "imóveis"} para sua busca.`);
        onResults(res.results, { total: res.total, message: null, isSuggestion: false });
      } else if ((res.suggestions?.length ?? 0) > 0) {
        setMessage(res.suggestionMessage);
        onResults(res.suggestions, {
          total: res.suggestions.length,
          message: res.suggestionMessage,
          isSuggestion: true,
        });
      } else {
        setMessage(res.suggestionMessage || "Nenhum imóvel encontrado para esses critérios.");
        onResults([], { total: 0, message: res.suggestionMessage, isSuggestion: false });
      }
    } catch (e: any) {
      console.error("[AiPropertySearch]", e);
      trackEvent("search_performed", { type: "ai_property_search_error" });
      toast({
        title: "Busca inteligente indisponível",
        description: "Você pode continuar navegando pelos imóveis normalmente.",
        variant: "destructive",
      });
      onResults(null, null);
      setActive(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = query.trim();
    if (text.length < 3) {
      toast({ title: "Descreva melhor sua busca", description: "Ex.: Casa em condomínio com 3 quartos até 900 mil" });
      return;
    }
    run(text, filters);
    setQuery("");
  };

  const removeChip = (key: ChipKey) => {
    const next = { ...filters };
    if (typeof key === "string" && key.startsWith("amenity:")) {
      next.amenities = next.amenities.filter((a) => a !== key.slice(8));
    } else if (key === "condominium") {
      next.condominium = false;
    } else {
      (next as any)[key] = null;
    }
    setFilters(next);
    run("", next, { filtersOnly: true });
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setActive(false);
    setMessage(null);
    setQuery("");
    onResults(null, null);
  };

  const chips = buildChips(filters);

  return (
    <div className="max-w-3xl mx-auto mb-10">
      <div className="rounded-2xl border border-accent/30 bg-card shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-primary">Busca inteligente</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={active ? "Refine sua busca... Ex.: agora somente com piscina" : "Descreva o imóvel que você procura..."}
            className="h-12 text-base"
            aria-label="Busca inteligente de imóveis"
          />
          <Button type="submit" disabled={loading} className="h-12 px-6 bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            <span className="ml-2">Buscar</span>
          </Button>
        </form>

        {!active && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setQuery(""); run(ex, EMPTY_FILTERS); }}
                className="text-xs text-muted-foreground hover:text-accent border border-border rounded-full px-3 py-1 transition-colors"
              >
                Ex.: {ex}
              </button>
            ))}
          </div>
        )}

        {active && chips.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Entendi que você procura:</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <Badge key={String(c.key)} variant="secondary" className="pl-3 pr-1 py-1 text-sm">
                  {c.label}
                  <button
                    type="button"
                    onClick={() => removeChip(c.key)}
                    className="ml-1 rounded-full hover:bg-muted p-1"
                    aria-label={`Remover filtro ${c.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                Limpar busca
              </Button>
            </div>
          </div>
        )}

        {active && message && (
          <p className="mt-4 text-sm font-medium text-primary">{message}</p>
        )}
      </div>
    </div>
  );
};
