import { createFileRoute } from "@tanstack/react-router";
import AddProperty from "@/pages/AddProperty";

export const Route = createFileRoute("/add-property")({
  head: () => ({
    meta: [
      { title: "Cadastrar Imóvel | Painel Supreme" },
      { name: "description", content: "Cadastre um novo imóvel no portfólio da Supreme Empreendimentos." },
      { property: "og:title", content: "Cadastrar Imóvel | Painel Supreme" },
      { property: "og:description", content: "Cadastre um novo imóvel no portfólio da Supreme Empreendimentos." },
    ],
  }),
  component: AddProperty,
});
