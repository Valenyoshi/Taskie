self.addEventListener("push", (event) => {
  let payload = { title: "Racha", body: "Tenés tareas pendientes.", url: "/inicio" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // El aviso igual se muestra con el texto de respaldo.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/inicio" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/inicio";
  event.waitUntil(clients.openWindow(url));
});
