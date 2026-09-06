import { createFileRoute } from "@tanstack/react-router";
import SuperAdminLogin from "@/pages/SuperAdminLogin";

export const Route = createFileRoute("/admin-master-login")({
  head: () => ({
    meta: [
      { title: "Acesso Master | Supreme" },
      { name: "description", content: "Login restrito para administradores da plataforma Supreme." },
      { property: "og:title", content: "Acesso Master | Supreme" },
      { property: "og:description", content: "Login restrito para administradores da plataforma Supreme." },
    ],
  }),
  component: SuperAdminLogin,
});
