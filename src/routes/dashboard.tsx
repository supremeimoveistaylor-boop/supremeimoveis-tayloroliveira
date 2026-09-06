import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Corretor | Supreme" },
      { name: "description", content: "Painel de gestão de imóveis e atendimentos da Supreme Empreendimentos." },
      { property: "og:title", content: "Painel do Corretor | Supreme" },
      { property: "og:description", content: "Painel de gestão de imóveis e atendimentos da Supreme Empreendimentos." },
    ],
  }),
  component: Dashboard,
});
