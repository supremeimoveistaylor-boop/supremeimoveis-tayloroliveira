import { createFileRoute } from "@tanstack/react-router";
import ShareTarget from "@/pages/ShareTarget";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Compartilhar | Supreme" },
      { name: "description", content: "Recebimento de conteúdo compartilhado para o painel Supreme." },
      { property: "og:title", content: "Compartilhar | Supreme" },
      { property: "og:description", content: "Recebimento de conteúdo compartilhado para o painel Supreme." },
    ],
  }),
  component: ShareTarget,
});
