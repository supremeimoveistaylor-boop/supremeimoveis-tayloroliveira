import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { captureUTMParams } from "@/lib/utm-capture";
import { initGlobalTracker } from "@/lib/pixel-tracker";
import NotFound from "@/pages/NotFound";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "author", content: "Supreme Negócios Imobiliários" },
      { name: "theme-color", content: "#d4af37" },
      { name: "msapplication-TileColor", content: "#000000" },
      { name: "msapplication-TileImage", content: "/favicon-192x192.png" },
      { name: "google-site-verification", content: "N2n_nQJ9_zJFqWJ..." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Supreme Negócios Imobiliários" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@supremeimoveis" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48x48.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192x192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
    scripts: [
      { src: "https://www.googletagmanager.com/gtag/js?id=G-S0S0PG91SK", async: true },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-S0S0PG91SK');`,
      },
      {
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1565894884246112');fbq('track','PageView');`,
      },
      {
        children: `(function(){try{var path=window.location.pathname||"/";if(path==="/api/meta/oauth/callback"||path==="/api/meta/webhook"){var params=new URLSearchParams(window.location.search);var code=params.get("code");if(code){if(window.opener){try{window.opener.postMessage({type:"META_OAUTH_CALLBACK",code:code},"*");setTimeout(function(){window.close();},1500);document.title="Conectando WhatsApp...";return;}catch(e){}}window.location.replace(window.location.origin+"/admin-master-login?oauth_code="+encodeURIComponent(code));return;}window.location.replace(window.location.origin+"/");}}catch(e){}})();`,
      },
    ],
  }),
  notFoundComponent: NotFound,
  component: RootComponent,
});

function Bootstrap() {
  usePushNotifications();
  useEffect(() => {
    captureUTMParams();
    initGlobalTracker();
  }, []);
  return null;
}

function RootComponent() {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Bootstrap />
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
