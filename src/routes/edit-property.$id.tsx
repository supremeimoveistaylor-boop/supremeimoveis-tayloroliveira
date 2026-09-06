import { createFileRoute } from "@tanstack/react-router";
import EditProperty from "@/pages/EditProperty";

export const Route = createFileRoute("/edit-property/$id")({
  head: () => ({
    meta: [
      { title: "Editar Imóvel | Painel Supreme" },
      { name: "description", content: "Atualize as informações, fotos e status de um imóvel do portfólio Supreme." },
      { property: "og:title", content: "Editar Imóvel | Painel Supreme" },
      { property: "og:description", content: "Atualize as informações, fotos e status de um imóvel do portfólio Supreme." },
    ],
  }),
  component: EditProperty,
});
