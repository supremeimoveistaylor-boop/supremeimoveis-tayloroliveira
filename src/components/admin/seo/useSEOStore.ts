import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SEOGlobalConfig, SEOPageConfig } from './types';
import { toast } from 'sonner';

const DEFAULT_GLOBAL: SEOGlobalConfig = {
  siteName: "Supreme Empreendimentos",
  defaultTitle: "Supreme Empreendimentos - Imóveis de Alto Padrão em Goiânia",
  defaultDescription: "Encontre imóveis de alto padrão em Goiânia. Casas em condomínios fechados, apartamentos premium e oportunidades exclusivas de investimento.",
  keywords: ["imóveis goiânia", "alto padrão goiânia", "condomínio fechado goiânia", "casa luxo goiânia", "apartamento premium goiânia"],
  city: "Goiânia",
  state: "GO",
  phone: "(62) 99991-8353",
  companyName: "Supreme Empreendimentos Imobiliários",
  canonicalBase: "https://supremeempreendimentos.com",
};

const EXAMPLE_PAGE: SEOPageConfig = {
  id: "casa-alto-padrao",
  slug: "/casa-alto-padrao-goiania",
  metaTitle: "Casa Alto Padrão em Goiânia | Condomínios Fechados Exclusivos",
  metaDescription: "Encontre casa alto padrão em Goiânia nos melhores condomínios fechados. Segurança, exclusividade e alto potencial de valorização.",
  h1: "Casa Alto Padrão em Goiânia nos Melhores Condomínios Fechados",
  h2List: [
    "Melhores Regiões para Alto Padrão em Goiânia",
    "Por que investir em imóvel de alto padrão em Goiânia?",
    "Condomínios Fechados Mais Procurados",
  ],
  bodyText: "Goiânia se destaca como uma das capitais com maior crescimento imobiliário do Brasil. O mercado de alto padrão na cidade oferece oportunidades exclusivas em condomínios horizontais fechados, com segurança 24h, infraestrutura completa e alto potencial de valorização.",
  faqItems: [
    { question: "Qual o valor médio de uma casa alto padrão em Goiânia?", answer: "O valor médio varia entre R$ 2 milhões e R$ 8 milhões, dependendo da localização e metragem." },
    { question: "Quais bairros são mais valorizados?", answer: "Setor Marista, Jardins Munique, Alphaville Goiânia e Aldeia do Vale são os mais procurados." },
    { question: "Vale a pena investir em condomínio fechado?", answer: "Sim. Condomínios fechados em Goiânia apresentam valorização constante de 8-15% ao ano." },
    { question: "Goiânia é segura para morar em alto padrão?", answer: "Sim, especialmente em condomínios fechados que oferecem segurança 24h com monitoramento avançado." },
  ],
  neighborhood: "Setor Marista",
  region: "Região Sul",
  propertyType: "Casa Alto Padrão",
  priceRange: "Acima de R$ 2 milhões",
  focusKeyword: "casa alto padrão goiânia",
};

export function useSEOStore() {
  const [globalConfig, setGlobalConfig] = useState<SEOGlobalConfig>(DEFAULT_GLOBAL);
  const [pages, setPages] = useState<SEOPageConfig[]>([EXAMPLE_PAGE]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const loadedRef = useRef(false);

  // Load from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('seo_configs')
        .select('*');

      if (error) {
        console.error('Error loading SEO configs:', error);
        return;
      }

      if (data && data.length > 0) {
        const globalRow = data.find((r: any) => r.config_type === 'global' && r.config_key === 'global');
        if (globalRow) {
          setGlobalConfig(globalRow.config_data as SEOGlobalConfig);
        }

        const pageRows = data.filter((r: any) => r.config_type === 'page');
        if (pageRows.length > 0) {
          setPages(pageRows.map((r: any) => r.config_data as SEOPageConfig));
        }
      }
      loadedRef.current = true;
    } catch (e) {
      console.error('Failed to load SEO configs:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save global config
  const saveGlobalConfig = useCallback(async (config: SEOGlobalConfig) => {
    setGlobalConfig(config);
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('seo_configs')
        .upsert({
          config_type: 'global',
          config_key: 'global',
          config_data: config,
        }, { onConflict: 'config_type,config_key' });

      if (error) {
        console.error('Error saving global SEO config:', error);
        toast.error('Erro ao salvar configurações globais');
      } else {
        toast.success('Configurações globais salvas!');
      }
    } catch (e) {
      console.error('Failed to save global config:', e);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Save all pages
  const savePages = useCallback(async (pageList: SEOPageConfig[]) => {
    setPages(pageList);
    setIsSaving(true);
    try {
      // Delete existing page configs then re-insert
      await (supabase as any)
        .from('seo_configs')
        .delete()
        .eq('config_type', 'page');

      if (pageList.length > 0) {
        const rows = pageList.map(p => ({
          config_type: 'page',
          config_key: p.id,
          config_data: p,
        }));

        const { error } = await (supabase as any)
          .from('seo_configs')
          .insert(rows);

        if (error) {
          console.error('Error saving SEO pages:', error);
          toast.error('Erro ao salvar páginas SEO');
          return;
        }
      }
      toast.success('Páginas SEO salvas!');
    } catch (e) {
      console.error('Failed to save pages:', e);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Save single page update
  const savePage = useCallback(async (page: SEOPageConfig) => {
    const updatedPages = pages.map(p => p.id === page.id ? page : p);
    setPages(updatedPages);
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('seo_configs')
        .upsert({
          config_type: 'page',
          config_key: page.id,
          config_data: page,
        }, { onConflict: 'config_type,config_key' });

      if (error) {
        console.error('Error saving page:', error);
        toast.error('Erro ao salvar página');
      }
    } catch (e) {
      console.error('Failed to save page:', e);
    } finally {
      setIsSaving(false);
    }
  }, [pages]);

  const addPage = useCallback((page: SEOPageConfig) => {
    const updated = [...pages, page];
    setPages(updated);
    // Auto-save new page
    (async () => {
      try {
        await (supabase as any)
          .from('seo_configs')
          .insert({
            config_type: 'page',
            config_key: page.id,
            config_data: page,
          });
      } catch (e) {
        console.error('Failed to save new page:', e);
      }
    })();
    return updated;
  }, [pages]);

  return {
    globalConfig,
    pages,
    isLoading,
    isSaving,
    setGlobalConfig,
    setPages,
    saveGlobalConfig,
    savePages,
    savePage,
    addPage,
  };
}
