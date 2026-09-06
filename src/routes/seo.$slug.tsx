import { createFileRoute } from "@tanstack/react-router";
import SEOLanding from "@/pages/SEOLanding";

export const Route = createFileRoute("/seo/$slug")({
  head: () => ({
    meta: [
      { title: "Imóveis em Goiânia | Supreme Empreendimentos" },
      { name: "description", content: "Página especial com imóveis selecionados em Goiânia pela Supreme Empreendimentos." },
      { property: "og:title", content: "Imóveis em Goiânia | Supreme Empreendimentos" },
      { property: "og:description", content: "Página especial com imóveis selecionados em Goiânia pela Supreme Empreendimentos." },
    ],
  }),
  component: SEOLanding,
});
