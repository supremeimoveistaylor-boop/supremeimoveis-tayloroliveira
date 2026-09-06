import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BuscaMapa = lazy(() => import("@/pages/BuscaMapa"));

export const Route = createFileRoute("/busca-mapa")({
  head: () => ({
    meta: [
      { title: "Busca no Mapa | Imóveis em Goiânia — Supreme" },
      {
        name: "description",
        content:
          "Explore imóveis de alto padrão em Goiânia diretamente no mapa e descubra as melhores regiões da cidade.",
      },
      { property: "og:title", content: "Busca no Mapa | Imóveis em Goiânia — Supreme" },
      {
        property: "og:description",
        content: "Explore imóveis de alto padrão em Goiânia diretamente no mapa interativo.",
      },
    ],
  }),
  component: BuscaMapaRoute,
});

function BuscaMapaRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen" />}>
      <Suspense fallback={<div className="min-h-screen" />}>
        <BuscaMapa />
      </Suspense>
    </ClientOnly>
  );
}
