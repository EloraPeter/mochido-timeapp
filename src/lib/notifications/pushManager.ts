// lib/notifications/pushManager.ts

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  vibrate?: number[];
}

// Request permission for notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Send a push notification (works offline if already cached)
export async function sendNotification(payload: PushNotificationPayload): Promise<void> {
  if (!('Notification' in window)) return;
  
  const permission = Notification.permission as NotificationPermission;
  
  if (permission === 'granted') {
    const notificationOptions: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/mochi-happy-192.png',
      badge: payload.badge || '/icons/mochi-happy-192.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction || false,
      ...(payload.vibrate && { vibrate: payload.vibrate as any })
    };
    
    const notification = new Notification(payload.title, notificationOptions);
    
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
      notification.close();
    };
  } else if (permission === 'default') {
    await requestNotificationPermission();
    if (Notification.permission === 'granted') {
      await sendNotification(payload);
    }
  }
}

// Check if notifications are supported
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Get subscription for push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;
  
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: null
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}