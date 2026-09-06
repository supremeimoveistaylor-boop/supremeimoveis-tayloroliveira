import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentProps } from "react";

type Props = ComponentProps<typeof import("./PropertyMapImpl").PropertyMap>;

const LazyPropertyMap = lazy(() =>
  import("./PropertyMapImpl").then((m) => ({ default: m.PropertyMap })),
);

export function PropertyMap(props: Props) {
  return (
    <ClientOnly fallback={<div className="h-full w-full rounded-lg bg-muted" />}>
      <Suspense fallback={<div className="h-full w-full rounded-lg bg-muted" />}>
        <LazyPropertyMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export default PropertyMap;
