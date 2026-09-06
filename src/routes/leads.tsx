import { createFileRoute } from "@tanstack/react-router";
import LeadsManagement from "@/pages/LeadsManagement";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Gestão de Leads | Supreme" },
      { name: "description", content: "Acompanhe e organize os leads e oportunidades da Supreme Empreendimentos." },
      { property: "og:title", content: "Gestão de Leads | Supreme" },
      { property: "og:description", content: "Acompanhe e organize os leads e oportunidades da Supreme Empreendimentos." },
    ],
  }),
  component: LeadsManagement,
});
