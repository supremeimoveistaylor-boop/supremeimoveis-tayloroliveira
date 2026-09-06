import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Supreme" },
      { name: "description", content: "Área administrativa da Supreme Empreendimentos." },
      { property: "og:title", content: "Administração | Supreme" },
      { property: "og:description", content: "Área administrativa da Supreme Empreendimentos." },
    ],
  }),
  component: Admin,
});
