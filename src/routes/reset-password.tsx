import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Recuperar Senha | Supreme Empreendimentos" },
      { name: "description", content: "Redefina a senha da sua conta Supreme Empreendimentos com segurança." },
      { property: "og:title", content: "Recuperar Senha | Supreme Empreendimentos" },
      { property: "og:description", content: "Redefina a senha da sua conta Supreme Empreendimentos com segurança." },
    ],
  }),
  component: ResetPassword,
});
