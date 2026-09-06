import { createFileRoute } from "@tanstack/react-router";
import PropertyDetails from "@/pages/PropertyDetails";
import { fetchPropertyForSsr, buildPropertyHead } from "@/lib/property-ssr";

export const Route = createFileRoute("/property/$id")({
  loader: async ({ params }) => ({ property: await fetchPropertyForSsr(params.id) }),
  head: ({ loaderData, params }) =>
    buildPropertyHead(loaderData?.property ?? null, `/imovel/${params.id}`),
  component: PropertyRoute,
});

function PropertyRoute() {
  const { property } = Route.useLoaderData();
  return <PropertyDetails initialProperty={property} />;
}
