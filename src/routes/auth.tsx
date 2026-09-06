import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso à Conta | Supreme Empreendimentos" },
      { name: "description", content: "Área de acesso para clientes e corretores da Supreme Empreendimentos." },
      { property: "og:title", content: "Acesso à Conta | Supreme Empreendimentos" },
      { property: "og:description", content: "Área de acesso para clientes e corretores da Supreme Empreendimentos." },
    ],
  }),
  component: Auth,
});
