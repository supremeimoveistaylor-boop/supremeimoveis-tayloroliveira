import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentProps } from "react";

type Props = ComponentProps<typeof import("./MapSelectorImpl").MapSelector>;

const LazyMapSelector = lazy(() =>
  import("./MapSelectorImpl").then((m) => ({ default: m.MapSelector })),
);

export function MapSelector(props: Props) {
  return (
    <ClientOnly fallback={<div className="h-64 w-full rounded-lg bg-muted" />}>
      <Suspense fallback={<div className="h-64 w-full rounded-lg bg-muted" />}>
        <LazyMapSelector {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export default MapSelector;
