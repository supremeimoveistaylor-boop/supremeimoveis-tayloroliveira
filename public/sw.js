// Supreme Empreendimentos - Service Worker (Push Notifications)
const SW_VERSION = "v1.0.0";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Nova notificação", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Supreme Empreendimentos";
  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon-192x192.png",
    badge: data.badge || "/favicon-192x192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "supreme-notification",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
