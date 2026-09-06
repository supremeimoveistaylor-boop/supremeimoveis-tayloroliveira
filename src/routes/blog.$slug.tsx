import { createFileRoute } from "@tanstack/react-router";
import BlogPost from "@/pages/BlogPost";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Artigo | Blog Supreme Empreendimentos" },
      { name: "description", content: "Leia o artigo completo do blog da Supreme sobre o mercado imobiliário de Goiânia." },
      { property: "og:title", content: "Artigo | Blog Supreme Empreendimentos" },
      { property: "og:description", content: "Leia o artigo completo do blog da Supreme sobre o mercado imobiliário de Goiânia." },
    ],
  }),
  component: BlogPost,
});
