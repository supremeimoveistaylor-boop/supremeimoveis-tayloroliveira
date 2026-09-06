import { createFileRoute } from "@tanstack/react-router";
import FinancingAdmin from "@/pages/FinancingAdmin";

export const Route = createFileRoute("/financing-admin")({
  head: () => ({
    meta: [
      { title: "Administração de Financiamento | Supreme" },
      { name: "description", content: "Gerencie taxas e parâmetros do simulador de financiamento da Supreme." },
      { property: "og:title", content: "Administração de Financiamento | Supreme" },
      { property: "og:description", content: "Gerencie taxas e parâmetros do simulador de financiamento da Supreme." },
    ],
  }),
  component: FinancingAdmin,
});
