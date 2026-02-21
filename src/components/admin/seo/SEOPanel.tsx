import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOScoreIndicator } from "./SEOScoreIndicator";
import { 
  SEOPageConfig, 
  generateDynamicTitle, generateDynamicDescription 
} from "./types";
import { 
  Globe, FileText, MapPin, Eye, Plus, Trash2, Copy, Code, Search, Save, Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSEOStore } from "./useSEOStore";

export function SEOPanel() {
  const {
    globalConfig, pages, isLoading, isSaving,
    setGlobalConfig, setPages,
    saveGlobalConfig, savePages, savePage, addPage,
  } = useSEOStore();

  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState("global");

  const selectedPage = pages[selectedPageIdx] || pages[0];

  const updateGlobal = (field: keyof typeof globalConfig, value: string | string[]) => {
    setGlobalConfig(prev => ({ ...prev, [field]: value }));
  };

  const updatePage = (field: keyof SEOPageConfig, value: any) => {
    setPages(prev => prev.map((p, i) => i === selectedPageIdx ? { ...p, [field]: value } : p));
  };

  const addFaq = () => {
    updatePage("faqItems", [...(selectedPage?.faqItems || []), { question: "", answer: "" }]);
  };

  const removeFaq = (idx: number) => {
    updatePage("faqItems", (selectedPage?.faqItems || []).filter((_, i) => i !== idx));
  };

  const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
    const updated = (selectedPage?.faqItems || []).map((f, i) => i === idx ? { ...f, [field]: value } : f);
    updatePage("faqItems", updated);
  };

  const addNewPage = () => {
    const newPage: SEOPageConfig = {
      id: `page-${Date.now()}`,
      slug: "/nova-pagina",
      metaTitle: "",
      metaDescription: "",
      h1: "",
      h2List: [],
      bodyText: "",
      faqItems: [],
      neighborhood: "",
      region: "",
      propertyType: "",
      priceRange: "",
      focusKeyword: "",
    };
    addPage(newPage);
    setSelectedPageIdx(pages.length);
  };

  const handleSaveGlobal = () => saveGlobalConfig(globalConfig);
  const handleSavePage = () => {
    if (selectedPage) savePage(selectedPage);
  };

  // Generate Schema markup
  const schemaLocalBusiness = useMemo(() => JSON.stringify({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": globalConfig.companyName,
    "telephone": globalConfig.phone,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": globalConfig.city,
      "addressRegion": globalConfig.state,
      "addressCountry": "BR"
    },
    "url": globalConfig.canonicalBase,
  }, null, 2), [globalConfig]);

  const schemaFAQ = useMemo(() => JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (selectedPage?.faqItems || []).filter(f => f.question && f.answer).map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  }, null, 2), [selectedPage?.faqItems]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="ml-3 text-slate-400">Carregando configurações SEO...</span>
      </div>
    );
  }

  const SaveButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <Button 
      onClick={onClick} 
      disabled={isSaving}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-slate-700/50 border border-slate-600">
          <TabsTrigger value="global" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Globe className="w-4 h-4 mr-2" />
            Configurações Globais
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            SEO por Página
          </TabsTrigger>
          <TabsTrigger value="local" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <MapPin className="w-4 h-4 mr-2" />
            SEO Local
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Eye className="w-4 h-4 mr-2" />
            Preview & Schema
          </TabsTrigger>
        </TabsList>

        {/* ========== GLOBAL CONFIG ========== */}
        <TabsContent value="global" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">⚙️ Configurações Globais de SEO</CardTitle>
                  <CardDescription className="text-slate-400">
                    Dados padrão para title, description, Open Graph e Schema
                  </CardDescription>
                </div>
                <SaveButton onClick={handleSaveGlobal} label="Salvar Global" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Nome da Imobiliária</label>
                  <Input
                    value={globalConfig.companyName}
                    onChange={e => updateGlobal("companyName", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Telefone</label>
                  <Input
                    value={globalConfig.phone}
                    onChange={e => updateGlobal("phone", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Cidade Principal</label>
                  <Input
                    value={globalConfig.city}
                    onChange={e => updateGlobal("city", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Estado</label>
                  <Input
                    value={globalConfig.state}
                    onChange={e => updateGlobal("state", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">URL Canônica Base</label>
                <Input
                  value={globalConfig.canonicalBase}
                  onChange={e => updateGlobal("canonicalBase", e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="https://seusite.com.br"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">
                  Título Padrão do Site
                  <span className="ml-2 text-xs text-slate-500">({globalConfig.defaultTitle.length}/60 chars)</span>
                </label>
                <Input
                  value={globalConfig.defaultTitle}
                  onChange={e => updateGlobal("defaultTitle", e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  maxLength={60}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">
                  Meta Description Padrão
                  <span className="ml-2 text-xs text-slate-500">({globalConfig.defaultDescription.length}/160 chars)</span>
                </label>
                <Textarea
                  value={globalConfig.defaultDescription}
                  onChange={e => updateGlobal("defaultDescription", e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  maxLength={160}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Palavras-chave Principais (separadas por vírgula)</label>
                <Input
                  value={globalConfig.keywords.join(", ")}
                  onChange={e => updateGlobal("keywords", e.target.value.split(",").map(k => k.trim()).filter(Boolean))}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {globalConfig.keywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>

              {/* Auto-generated preview */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">🔍 Preview Google</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-blue-400 text-lg hover:underline cursor-pointer truncate">
                      {globalConfig.defaultTitle}
                    </p>
                    <p className="text-emerald-500 text-sm">{globalConfig.canonicalBase}</p>
                    <p className="text-slate-400 text-sm line-clamp-2">{globalConfig.defaultDescription}</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== PER-PAGE SEO ========== */}
        <TabsContent value="pages" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {pages.map((page, i) => (
              <Button
                key={page.id}
                variant={i === selectedPageIdx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPageIdx(i)}
                className={i === selectedPageIdx
                  ? "bg-emerald-600 text-white"
                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                }
              >
                {page.slug || "Nova Página"}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={addNewPage} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Plus className="w-4 h-4 mr-1" /> Nova Página
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">📝 SEO da Página</CardTitle>
                    <SaveButton onClick={handleSavePage} label="Salvar Página" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Slug (URL)</label>
                      <Input
                        value={selectedPage?.slug || ''}
                        onChange={e => updatePage("slug", e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                        placeholder="/casa-alto-padrao-goiania"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Palavra-chave Foco</label>
                      <Input
                        value={selectedPage?.focusKeyword || ''}
                        onChange={e => updatePage("focusKeyword", e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                        placeholder="casa alto padrão goiânia"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Meta Title
                      <span className="ml-2 text-xs text-slate-500">({(selectedPage?.metaTitle || '').length}/60)</span>
                    </label>
                    <Input
                      value={selectedPage?.metaTitle || ''}
                      onChange={e => updatePage("metaTitle", e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      maxLength={60}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Meta Description
                      <span className="ml-2 text-xs text-slate-500">({(selectedPage?.metaDescription || '').length}/160)</span>
                    </label>
                    <Textarea
                      value={selectedPage?.metaDescription || ''}
                      onChange={e => updatePage("metaDescription", e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      maxLength={160}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">H1 Principal</label>
                    <Input
                      value={selectedPage?.h1 || ''}
                      onChange={e => updatePage("h1", e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">H2 Secundários (um por linha)</label>
                    <Textarea
                      value={(selectedPage?.h2List || []).join("\n")}
                      onChange={e => updatePage("h2List", e.target.value.split("\n").filter(Boolean))}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      rows={3}
                      placeholder="Melhores Regiões para Alto Padrão&#10;Por que investir em Goiânia?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Texto Otimizado (corpo da página)</label>
                    <Textarea
                      value={selectedPage?.bodyText || ''}
                      onChange={e => updatePage("bodyText", e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      rows={5}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    ❓ FAQ Estruturado
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                      {(selectedPage?.faqItems || []).length} perguntas
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    FAQs geram Schema FAQ automaticamente para rich snippets no Google
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(selectedPage?.faqItems || []).map((faq, i) => (
                    <div key={i} className="space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={faq.question}
                            onChange={e => updateFaq(i, "question", e.target.value)}
                            placeholder="Pergunta..."
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                          />
                          <Textarea
                            value={faq.answer}
                            onChange={e => updateFaq(i, "answer", e.target.value)}
                            placeholder="Resposta..."
                            className="bg-slate-700/50 border-slate-600 text-white text-sm"
                            rows={2}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-300 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addFaq} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar FAQ
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Score sidebar */}
            <div className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">📊 Score SEO</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPage && <SEOScoreIndicator page={selectedPage} />}
                </CardContent>
              </Card>

              {/* Google Preview */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">🔍 Preview Google</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-blue-400 text-base hover:underline cursor-pointer truncate">
                      {selectedPage?.metaTitle || generateDynamicTitle(globalConfig, selectedPage)}
                    </p>
                    <p className="text-emerald-500 text-xs">
                      {globalConfig.canonicalBase}{selectedPage?.slug}
                    </p>
                    <p className="text-slate-400 text-xs line-clamp-2">
                      {selectedPage?.metaDescription || generateDynamicDescription(globalConfig, selectedPage)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========== LOCAL SEO ========== */}
        <TabsContent value="local" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">📍 SEO Local Avançado</CardTitle>
                  <CardDescription className="text-slate-400">
                    Otimize para buscas locais em Goiânia e região
                  </CardDescription>
                </div>
                <SaveButton onClick={handleSavePage} label="Salvar Local" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Bairro</label>
                  <Input
                    value={selectedPage?.neighborhood || ''}
                    onChange={e => updatePage("neighborhood", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Setor Marista"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Região</label>
                  <Input
                    value={selectedPage?.region || ''}
                    onChange={e => updatePage("region", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Região Sul"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Tipo de Imóvel</label>
                  <Input
                    value={selectedPage?.propertyType || ''}
                    onChange={e => updatePage("propertyType", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Casa Alto Padrão"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Faixa de Valor</label>
                  <Input
                    value={selectedPage?.priceRange || ''}
                    onChange={e => updatePage("priceRange", e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Acima de R$ 2 milhões"
                  />
                </div>
              </div>

              {/* Auto-generated title preview */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">✨ Title Gerado Automaticamente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-400">
                    {selectedPage?.propertyType
                      ? `${selectedPage.propertyType}${selectedPage.neighborhood ? ` no ${selectedPage.neighborhood}` : ""} em ${globalConfig.city} | ${globalConfig.companyName}`
                      : "Preencha o tipo de imóvel para gerar"
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Suggested keywords */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300">🔑 Keywords Sugeridas (SEO Local)</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    selectedPage?.propertyType && selectedPage?.neighborhood
                      ? `${selectedPage.propertyType.toLowerCase()} ${selectedPage.neighborhood.toLowerCase()}`
                      : null,
                    selectedPage?.propertyType
                      ? `${selectedPage.propertyType.toLowerCase()} ${globalConfig.city.toLowerCase()}`
                      : null,
                    selectedPage?.neighborhood
                      ? `imóveis ${selectedPage.neighborhood.toLowerCase()} ${globalConfig.city.toLowerCase()}`
                      : null,
                    `condomínio fechado ${globalConfig.city.toLowerCase()}`,
                    `imóveis alto padrão ${globalConfig.city.toLowerCase()}`,
                    `casas luxo ${globalConfig.city.toLowerCase()}`,
                  ].filter(Boolean).map((kw, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 text-xs cursor-pointer hover:bg-emerald-500/10"
                      onClick={() => {
                        updatePage("focusKeyword", kw);
                        toast({ title: "Keyword definida", description: `"${kw}" definida como palavra-chave foco.` });
                      }}
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== PREVIEW & SCHEMA ========== */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Schema LocalBusiness */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code className="w-5 h-5" /> Schema LocalBusiness
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(schemaLocalBusiness, "Schema LocalBusiness")} className="border-slate-600 text-slate-300">
                    <Copy className="w-4 h-4 mr-1" /> Copiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 rounded-lg p-4 text-xs text-emerald-400 overflow-auto max-h-60">
                  {schemaLocalBusiness}
                </pre>
              </CardContent>
            </Card>

            {/* Schema FAQ */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code className="w-5 h-5" /> Schema FAQ
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(schemaFAQ, "Schema FAQ")} className="border-slate-600 text-slate-300">
                    <Copy className="w-4 h-4 mr-1" /> Copiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 rounded-lg p-4 text-xs text-emerald-400 overflow-auto max-h-60">
                  {schemaFAQ}
                </pre>
              </CardContent>
            </Card>

            {/* Open Graph Preview */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">🌐 Open Graph Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900/80 rounded-lg border border-slate-600 overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-emerald-900/30 to-slate-800 flex items-center justify-center">
                    <Search className="w-12 h-12 text-slate-600" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs text-slate-500 uppercase">{globalConfig.canonicalBase.replace('https://', '')}</p>
                    <p className="text-sm text-white font-medium truncate">
                      {selectedPage?.metaTitle || globalConfig.defaultTitle}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {selectedPage?.metaDescription || globalConfig.defaultDescription}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta Tags Generated */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code className="w-5 h-5" /> Meta Tags HTML
                  </CardTitle>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => copyToClipboard(
                      `<title>${selectedPage?.metaTitle || globalConfig.defaultTitle}</title>\n<meta name="description" content="${selectedPage?.metaDescription || globalConfig.defaultDescription}">\n<link rel="canonical" href="${globalConfig.canonicalBase}${selectedPage?.slug}">\n<meta property="og:title" content="${selectedPage?.metaTitle || globalConfig.defaultTitle}">\n<meta property="og:description" content="${selectedPage?.metaDescription || globalConfig.defaultDescription}">\n<meta property="og:url" content="${globalConfig.canonicalBase}${selectedPage?.slug}">\n<meta property="og:type" content="website">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${selectedPage?.metaTitle || globalConfig.defaultTitle}">\n<meta name="twitter:description" content="${selectedPage?.metaDescription || globalConfig.defaultDescription}">`,
                      "Meta Tags"
                    )}
                    className="border-slate-600 text-slate-300"
                  >
                    <Copy className="w-4 h-4 mr-1" /> Copiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 rounded-lg p-4 text-xs text-blue-400 overflow-auto max-h-60 whitespace-pre-wrap">
{`<title>${selectedPage?.metaTitle || globalConfig.defaultTitle}</title>
<meta name="description" content="${selectedPage?.metaDescription || globalConfig.defaultDescription}">
<link rel="canonical" href="${globalConfig.canonicalBase}${selectedPage?.slug}">
<meta property="og:title" content="${selectedPage?.metaTitle || globalConfig.defaultTitle}">
<meta property="og:description" content="${selectedPage?.metaDescription || globalConfig.defaultDescription}">
<meta property="og:url" content="${globalConfig.canonicalBase}${selectedPage?.slug}">
<meta name="twitter:card" content="summary_large_image">`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
