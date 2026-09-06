import { createFileRoute } from "@tanstack/react-router";
import Chat from "@/pages/Chat";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Atendimento Online | Supreme Empreendimentos" },
      { name: "description", content: "Converse com nossa equipe e receba recomendações de imóveis de alto padrão em Goiânia." },
      { property: "og:title", content: "Atendimento Online | Supreme Empreendimentos" },
      { property: "og:description", content: "Converse com nossa equipe e receba recomendações de imóveis de alto padrão em Goiânia." },
    ],
  }),
  component: Chat,
});
