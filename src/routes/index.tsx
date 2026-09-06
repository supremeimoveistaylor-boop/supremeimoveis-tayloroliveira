import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casa Alto Padrão Goiânia | Condomínios Fechados Supreme" },
      { name: "description", content: "Casa alto padrão em Goiânia: condomínios fechados nos setores Marista, Bueno e Jardim Goiás. Segurança, exclusividade e valorização garantida." },
      { property: "og:title", content: "Casa Alto Padrão Goiânia | Condomínios Fechados Supreme" },
      { property: "og:description", content: "Casa alto padrão em Goiânia: condomínios fechados nos setores Marista, Bueno e Jardim Goiás. Segurança, exclusividade e valorização garantida." },
    ],
  }),
  component: Index,
});
