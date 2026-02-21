import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOGlobalConfig, SEOPageConfig } from "@/components/admin/seo/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Phone, MapPin, Home, TrendingUp, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SEOLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SEOPageConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<SEOGlobalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadSEOData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("seo_configs")
          .select("*");

        if (error) {
          console.error("Error loading SEO data:", error);
          setNotFound(true);
          return;
        }

        // Find global config
        const globalRow = data?.find(
          (r: any) => r.config_type === "global" && r.config_key === "global"
        );
        if (globalRow) {
          setGlobalConfig(globalRow.config_data as SEOGlobalConfig);
        }

        // Find matching page by slug
        const targetSlug = `/${slug}`;
        const pageRow = data?.find(
          (r: any) =>
            r.config_type === "page" &&
            (r.config_data as SEOPageConfig).slug === targetSlug
        );

        if (pageRow) {
          setPage(pageRow.config_data as SEOPageConfig);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error("Failed to load SEO data:", e);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadSEOData();
    }
  }, [slug]);

  // Update document head with SEO meta
  useEffect(() => {
    if (!page) return;

    document.title = page.metaTitle;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", page.metaDescription);
    setMeta("keywords", page.focusKeyword);
    setMeta("og:title", page.metaTitle, "property");
    setMeta("og:description", page.metaDescription, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:title", page.metaTitle, "name");
    setMeta("twitter:description", page.metaDescription, "name");
    setMeta("twitter:card", "summary_large_image", "name");

    // Inject JSON-LD Schema
    const existingSchema = document.getElementById("seo-landing-schema");
    if (existingSchema) existingSchema.remove();

    const schemas: any[] = [];

    // LocalBusiness Schema
    if (globalConfig) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        name: globalConfig.companyName,
        telephone: globalConfig.phone,
        address: {
          "@type": "PostalAddress",
          addressLocality: globalConfig.city,
          addressRegion: globalConfig.state,
          addressCountry: "BR",
        },
        url: globalConfig.canonicalBase,
        areaServed: {
          "@type": "City",
          name: globalConfig.city,
        },
      });
    }

    // FAQ Schema
    if (page.faqItems && page.faqItems.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqItems.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      });
    }

    // BreadcrumbList Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: globalConfig?.canonicalBase || "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.h1,
          item: `${globalConfig?.canonicalBase || ""}${page.slug}`,
        },
      ],
    });

    const script = document.createElement("script");
    script.id = "seo-landing-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schemas);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("seo-landing-schema");
      if (el) el.remove();
    };
  }, [page, globalConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-40 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Página não encontrada</h1>
          <p className="text-muted-foreground mb-8">
            A página que você procura não existe ou foi removida.
          </p>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const whatsappNumber = globalConfig?.phone?.replace(/\D/g, "") || "";
  const whatsappMessage = encodeURIComponent(
    `Olá! Tenho interesse em ${page.propertyType} em ${page.neighborhood || globalConfig?.city}. Vi no site e gostaria de mais informações.`
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Breadcrumb */}
        <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            </li>
            <ChevronRight className="w-3 h-3" />
            <li className="text-foreground font-medium">{page.h1}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">
                {page.h1}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
                {page.metaDescription}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={`https://wa.me/55${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="gap-2 text-base">
                    <Phone className="w-5 h-5" />
                    Fale com Especialista
                  </Button>
                </a>
                <Link to="/comprar">
                  <Button size="lg" variant="outline" className="gap-2 text-base">
                    <Home className="w-5 h-5" />
                    Ver Imóveis
                  </Button>
                </Link>
              </div>

              {/* Local tags */}
              <div className="flex flex-wrap gap-2 mt-8">
                {page.neighborhood && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <MapPin className="w-3 h-3" /> {page.neighborhood}
                  </span>
                )}
                {page.region && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    {page.region}
                  </span>
                )}
                {page.priceRange && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                    <TrendingUp className="w-3 h-3" /> {page.priceRange}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Body Content */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
            {page.bodyText.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed text-lg mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* H2 Sections */}
        {page.h2List && page.h2List.length > 0 && (
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto grid gap-10">
                {page.h2List.map((h2, index) => (
                  <article key={index} className="bg-card border border-border rounded-xl p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-card-foreground mb-3">
                          {h2}
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                          {index === 0 &&
                            `${globalConfig?.city || "A cidade"} oferece bairros nobres como ${page.neighborhood || "setores valorizados"}, com infraestrutura completa, segurança e alto potencial de valorização para quem busca ${page.propertyType?.toLowerCase() || "imóveis de qualidade"}.`}
                          {index === 1 &&
                            `Investir em ${page.propertyType?.toLowerCase() || "imóveis"} em ${globalConfig?.city || "cidades em crescimento"} é sinônimo de segurança patrimonial, qualidade de vida e valorização constante acima da média nacional.`}
                          {index === 2 &&
                            `Os condomínios mais procurados da ${page.region || "região"} oferecem lazer completo, áreas verdes preservadas e um perfil seleto de moradores que garantem tranquilidade e convivência harmoniosa.`}
                          {index > 2 && `Descubra mais sobre ${h2.toLowerCase()} e as oportunidades exclusivas disponíveis na ${page.region || globalConfig?.city || "região"}.`}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {page.faqItems && page.faqItems.length > 0 && (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
                Perguntas Frequentes sobre {page.propertyType} em {globalConfig?.city || "Goiânia"}
              </h2>
              <div className="grid gap-4">
                {page.faqItems.map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-card border border-border rounded-xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between cursor-pointer p-6 text-card-foreground font-medium text-lg hover:bg-muted/50 transition-colors">
                      <span>{faq.question}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-6 pb-6 pt-2 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-primary py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <Shield className="w-12 h-12 text-primary-foreground mx-auto mb-6 opacity-80" />
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                Fale com Especialista em {page.propertyType} em {globalConfig?.city || "Goiânia"}
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Nossa equipe está pronta para ajudar você a encontrar o imóvel ideal com
                exclusividade e segurança.
              </p>
              <a
                href={`https://wa.me/55${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 text-base font-semibold"
                >
                  <Phone className="w-5 h-5" />
                  Falar Agora pelo WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SEOLanding;
