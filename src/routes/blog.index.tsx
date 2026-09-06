import { createFileRoute } from "@tanstack/react-router";
import Blog from "@/pages/Blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog Supreme | Mercado Imobiliário de Goiânia" },
      { name: "description", content: "Notícias, tendências e dicas sobre o mercado imobiliário de alto padrão em Goiânia." },
      { property: "og:title", content: "Blog Supreme | Mercado Imobiliário de Goiânia" },
      { property: "og:description", content: "Notícias, tendências e dicas sobre o mercado imobiliário de alto padrão em Goiânia." },
    ],
  }),
  component: Blog,
});
