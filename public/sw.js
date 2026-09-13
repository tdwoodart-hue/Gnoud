self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Lịch Sống', {
    body: data.body || 'Bạn có một việc cần xử lý.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'lich-song-reminder',
    renotify: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(targetUrl);
      return existing.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});
