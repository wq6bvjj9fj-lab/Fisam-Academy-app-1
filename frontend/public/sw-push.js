self.addEventListener('push', function(event) {
  let data = { title: 'FISAM Academy', body: 'Nuova notifica' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Nuova notifica';
  }

  const options = {
    body: data.body,
    icon: '/logo_fisam.png',
    badge: '/logo_fisam.png',
    vibrate: [200, 100, 200],
    tag: 'fisam-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
