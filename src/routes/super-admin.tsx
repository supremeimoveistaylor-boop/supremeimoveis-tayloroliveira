import { createFileRoute } from "@tanstack/react-router";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

export const Route = createFileRoute("/super-admin")({
  head: () => ({
    meta: [
      { title: "Painel Master | Supreme" },
      { name: "description", content: "Painel de administração geral da plataforma Supreme Empreendimentos." },
      { property: "og:title", content: "Painel Master | Supreme" },
      { property: "og:description", content: "Painel de administração geral da plataforma Supreme Empreendimentos." },
    ],
  }),
  component: SuperAdminDashboard,
});
