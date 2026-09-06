import { createFileRoute } from "@tanstack/react-router";
import PoliticaPrivacidade from "@/pages/PoliticaPrivacidade";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Supreme Empreendimentos" },
      { name: "description", content: "Saiba como a Supreme Empreendimentos coleta, usa e protege seus dados pessoais." },
      { property: "og:title", content: "Política de Privacidade | Supreme Empreendimentos" },
      { property: "og:description", content: "Saiba como a Supreme Empreendimentos coleta, usa e protege seus dados pessoais." },
    ],
  }),
  component: PoliticaPrivacidade,
});
