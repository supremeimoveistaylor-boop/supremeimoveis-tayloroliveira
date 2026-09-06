import { createFileRoute } from "@tanstack/react-router";
import Conversas from "@/pages/Conversas";

export const Route = createFileRoute("/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas | Painel Supreme" },
      { name: "description", content: "Central de mensagens e atendimentos da Supreme Empreendimentos." },
      { property: "og:title", content: "Conversas | Painel Supreme" },
      { property: "og:description", content: "Central de mensagens e atendimentos da Supreme Empreendimentos." },
    ],
  }),
  component: Conversas,
});
