import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, MapPin, TrendingUp, Trees, Building2, CheckCircle2, Sparkles } from "lucide-react";
import heroProperty from "@/assets/hero-property.jpg";

const CitageSanteUrbanismo = () => {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // SEO: title + meta tags
    const prevTitle = document.title;
    document.title = "Lotes Alto Padrão em Goiânia | Citage Santé Urbanismo";

    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    setMeta(
      "name",
      "description",
      "Garanta seu lote em condomínio fechado de alto padrão na região sul de Goiânia, próximo ao Shopping Flamboyant. Exclusividade, segurança e valorização. Cadastre-se."
    );
    setMeta(
      "name",
      "keywords",
      "lotes em goiânia, condomínio fechado goiânia, lotes alto padrão goiânia, terrenos luxo goiânia, citage santé urbanismo, lotes sul goiânia, próximo flamboyant"
    );
    setMeta("name", "robots", "index, follow");
    setMeta("property", "og:title", "Citage Santé Urbanismo | Lançamento Alto Padrão Goiânia");
    setMeta(
      "property",
      "og:description",
      "Lotes exclusivos em condomínio fechado. Localização privilegiada e alta valorização."
    );
    setMeta("property", "og:type", "website");
    setMeta(
      "property",
      "og:url",
      "https://supremeempreendimentos.com/citage-sante-urbanismo"
    );
    setMeta("property", "og:locale", "pt_BR");

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.href;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://supremeempreendimentos.com/citage-sante-urbanismo";

    // JSON-LD schemas
    const schemaListing = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Citage Santé Urbanismo - Lotes Alto Padrão Goiânia",
      description:
        "Lançamento de lotes em condomínio fechado de alto padrão na região sul de Goiânia, próximo ao Shopping Flamboyant. Segurança 24h, infraestrutura completa e alto potencial de valorização.",
      brand: { "@type": "Brand", name: "Supreme Empreendimentos" },
      category: "Imóveis / Lotes / Condomínio Fechado",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        availability: "https://schema.org/PreOrder",
        seller: {
          "@type": "RealEstateAgent",
          name: "Supreme Negócios Imobiliários",
          telephone: "+55-62-99991-8353",
        },
      },
    };
    const schemaPlace = {
      "@context": "https://schema.org",
      "@type": "Place",
      name: "Citage Santé Urbanismo",
      description: "Condomínio fechado de lotes alto padrão em Goiânia - Região Sul",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Goiânia",
        addressRegion: "GO",
        addressCountry: "BR",
      },
    };
    const s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.text = JSON.stringify(schemaListing);
    s1.dataset.lpCitage = "1";
    document.head.appendChild(s1);
    const s2 = document.createElement("script");
    s2.type = "application/ld+json";
    s2.text = JSON.stringify(schemaPlace);
    s2.dataset.lpCitage = "1";
    document.head.appendChild(s2);

    // Track LP view
    try {
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "page_view", {
          event_category: "lp_citage",
          event_label: "citage_sante_urbanismo",
        });
      }
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "ViewContent", {
          content_name: "Citage Santé Urbanismo",
          content_category: "Lançamento Lotes",
        });
      }
    } catch {}

    return () => {
      document.title = prevTitle;
      if (canonical && prevCanonical) canonical.href = prevCanonical;
      document
        .querySelectorAll('script[data-lp-citage="1"]')
        .forEach((n) => n.parentNode?.removeChild(n));
    };
  }, []);

  const sanitizePhone = (v: string) => v.replace(/\D/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      toast({
        title: "Preencha seus dados",
        description: "Nome e telefone são obrigatórios para garantir seu acesso antecipado.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = sanitizePhone(telefone);
      const { error } = await supabase.from("leads_imobiliarios").insert({
        nome: nome.trim(),
        telefone: cleanPhone,
        email: email.trim() || null,
        origem: "lp_citage_sante_urbanismo",
        pagina_origem: window.location.href,
        tipo_imovel: "lote",
        finalidade: "comprar",
        descricao: "Interesse no lançamento Citage Santé Urbanismo - Acesso antecipado",
        lead_category: "alto_padrao",
        status: "novo",
      });
      if (error) throw error;

      // Tracking conversões
      try {
        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "generate_lead", {
            event_category: "lp_citage",
            event_label: "acesso_antecipado",
            value: 1,
          });
        }
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "Lead", {
            content_name: "Citage Santé Urbanismo",
            content_category: "Lote Alto Padrão",
          });
        }
      } catch {}

      // Notifica corretor via edge function (mesmo fluxo dos demais leads)
      try {
        await supabase.functions.invoke("real_estate_leads", {
          body: {
            clientName: nome.trim(),
            clientPhone: cleanPhone,
            clientEmail: email.trim() || null,
            interest: "Lançamento Citage Santé Urbanismo - Lotes Alto Padrão",
            origin: "lp_citage_sante_urbanismo",
            pageUrl: window.location.href,
          },
        });
      } catch (notifyErr) {
        console.warn("[Citage LP] Notification failed (non-blocking):", notifyErr);
      }

      toast({
        title: "✅ Cadastro confirmado!",
        description: "Em breve nosso especialista entrará em contato com informações exclusivas.",
      });
      setNome("");
      setTelefone("");
      setEmail("");
    } catch (err: any) {
      console.error("[Citage LP] Submit error:", err);
      toast({
        title: "Erro ao enviar cadastro",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // JSON-LD: RealEstateListing + Product
  const schemaListing = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Citage Santé Urbanismo - Lotes Alto Padrão Goiânia",
    description:
      "Lançamento de lotes em condomínio fechado de alto padrão na região sul de Goiânia, próximo ao Shopping Flamboyant. Segurança 24h, infraestrutura completa e alto potencial de valorização.",
    brand: { "@type": "Brand", name: "Supreme Empreendimentos" },
    category: "Imóveis / Lotes / Condomínio Fechado",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      availability: "https://schema.org/PreOrder",
      seller: {
        "@type": "RealEstateAgent",
        name: "Supreme Negócios Imobiliários",
        telephone: "+55-62-99991-8353",
      },
    },
  };

  const schemaPlace = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Citage Santé Urbanismo",
    description: "Condomínio fechado de lotes alto padrão em Goiânia - Região Sul",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Goiânia",
      addressRegion: "GO",
      addressCountry: "BR",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Lotes Alto Padrão em Goiânia | Citage Santé Urbanismo</title>
        <meta
          name="description"
          content="Garanta seu lote em condomínio fechado de alto padrão na região sul de Goiânia, próximo ao Shopping Flamboyant. Exclusividade, segurança e valorização. Cadastre-se."
        />
        <meta
          name="keywords"
          content="lotes em goiânia, condomínio fechado goiânia, lotes alto padrão goiânia, terrenos luxo goiânia, citage santé urbanismo, lotes sul goiânia, próximo flamboyant"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://supremeempreendimentos.com/citage-sante-urbanismo" />

        <meta property="og:title" content="Citage Santé Urbanismo | Lançamento Alto Padrão Goiânia" />
        <meta
          property="og:description"
          content="Lotes exclusivos em condomínio fechado. Localização privilegiada e alta valorização."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://supremeempreendimentos.com/citage-sante-urbanismo" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:image" content="https://supremeempreendimentos.com/favicon-512x512.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Citage Santé Urbanismo | Lançamento Alto Padrão" />
        <meta
          name="twitter:description"
          content="Lotes exclusivos em condomínio fechado de alto padrão em Goiânia. Cadastre-se para acesso antecipado."
        />

        <script type="application/ld+json">{JSON.stringify(schemaListing)}</script>
        <script type="application/ld+json">{JSON.stringify(schemaPlace)}</script>
      </Helmet>

      <Header />

      {/* HERO + Form acima da dobra */}
      <section
        className="relative min-h-[90vh] flex items-center"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.85), rgba(123,75,42,0.6)), url(${heroProperty})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Conteúdo */}
            <div className="text-white-soft">
              <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-accent text-sm font-semibold tracking-wide">
                  LANÇAMENTO EXCLUSIVO
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Lotes em <span className="text-accent">Condomínio Fechado</span> de Alto Padrão em Goiânia
              </h1>

              <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
                Citage Santé Urbanismo: lotes exclusivos na região sul de Goiânia, próximos ao
                Shopping Flamboyant, com infraestrutura completa, segurança 24h e altíssimo
                potencial de valorização.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-accent flex-shrink-0" />
                  <span className="text-sm">Segurança 24h</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-accent flex-shrink-0" />
                  <span className="text-sm">Próx. Flamboyant</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-accent flex-shrink-0" />
                  <span className="text-sm">Alta Valorização</span>
                </div>
                <div className="flex items-center gap-3">
                  <Trees className="h-6 w-6 text-accent flex-shrink-0" />
                  <span className="text-sm">Áreas Verdes</span>
                </div>
              </div>
            </div>

            {/* Formulário acima da dobra */}
            <Card className="p-6 md:p-8 bg-white-soft/95 backdrop-blur-sm shadow-2xl border-2 border-accent/40">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  Acesso Antecipado
                </h2>
                <p className="text-muted-foreground">
                  Cadastre-se e receba <strong>condições exclusivas</strong> antes do lançamento
                  oficial
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">WhatsApp *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(62) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base"
                >
                  {loading ? "Enviando..." : "🔓 Quero Acesso Antecipado"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Atendimento exclusivo Supreme Empreendimentos · CRECI 20.316
                </p>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* H2 - Lançamento Exclusivo na Região Sul */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Lançamento Exclusivo na <span className="text-accent">Região Sul</span> de Goiânia
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
            Um empreendimento de alto padrão pensado para quem busca <strong>investimento sólido</strong>,{" "}
            <strong>valorização garantida</strong> e qualidade de vida em condomínio fechado.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-xl transition-shadow border-l-4 border-accent">
              <Building2 className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Infraestrutura Completa</h3>
              <p className="text-muted-foreground">
                Ruas pavimentadas, iluminação LED, rede subterrânea de energia, água e esgoto, fibra
                óptica e drenagem pluvial.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-shadow border-l-4 border-accent">
              <Shield className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Segurança 24h</h3>
              <p className="text-muted-foreground">
                Portaria controlada, monitoramento por câmeras, ronda contínua e acesso biométrico
                para moradores e visitantes.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-shadow border-l-4 border-accent">
              <MapPin className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Localização Privilegiada</h3>
              <p className="text-muted-foreground">
                A poucos minutos do <strong>Shopping Flamboyant</strong>, das melhores escolas,
                hospitais e do principal corredor empresarial de Goiânia.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* H2 - Próximo ao Shopping Flamboyant */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                <span className="text-accent">Próximo</span> ao Shopping Flamboyant
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Localização estratégica na região sul de Goiânia, considerada a área de maior
                valorização da capital. Acesso rápido aos principais centros comerciais, gastronômicos
                e de serviços.
              </p>
              <ul className="space-y-3">
                {[
                  "Shopping Flamboyant a 10 minutos",
                  "Acesso direto à Marginal Botafogo",
                  "Próximo às melhores escolas particulares",
                  "Hospitais de referência em até 15 min",
                  "Aeroporto de Goiânia a 20 minutos",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <img
                src={heroProperty}
                alt="Lote alto padrão Goiânia - Citage Santé Urbanismo região sul próximo Flamboyant"
                loading="lazy"
                className="rounded-lg shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* H2 - Alto Potencial de Valorização */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Alto Potencial de <span className="text-accent">Valorização</span>
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
            Investir em <strong>lotes alto padrão em Goiânia</strong>, especialmente em condomínios
            fechados na região sul, oferece um dos melhores retornos do mercado imobiliário do
            Centro-Oeste.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <Card className="p-6">
              <div className="text-4xl font-bold text-accent mb-2">+18%</div>
              <p className="text-muted-foreground">Valorização média anual da região sul de Goiânia</p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl font-bold text-accent mb-2">100%</div>
              <p className="text-muted-foreground">Documentação aprovada e regularizada</p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl font-bold text-accent mb-2">24/7</div>
              <p className="text-muted-foreground">Segurança e portaria controlada</p>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-10"
              onClick={() => {
                document
                  .querySelector("form")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Cadastre-se para Acesso Antecipado
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CitageSanteUrbanismo;
