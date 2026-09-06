import { createFileRoute } from "@tanstack/react-router";
import PropertyDetails from "@/pages/PropertyDetails";
import { fetchPropertyForSsr, buildPropertyHead } from "@/lib/property-ssr";

export const Route = createFileRoute("/imovel/$id")({
  loader: async ({ params }) => ({ property: await fetchPropertyForSsr(params.id) }),
  head: ({ loaderData, params }) =>
    buildPropertyHead(loaderData?.property ?? null, `/imovel/${params.id}`),
  component: ImovelRoute,
});

function ImovelRoute() {
  const { property } = Route.useLoaderData();
  return <PropertyDetails initialProperty={property} />;
}
