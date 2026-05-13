// lib/notifications/notificationQueue.ts

import { getDB } from '@/lib/db/indexedDB';

export interface QueuedNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: string; // ISO date
  priority: 'high' | 'medium' | 'low';
  tag?: string;
  data?: Record<string, any>;
  createdAt: string;
  sent: boolean;
}

const NOTIFICATION_QUEUE_STORE = 'notificationQueue';

// Ensure store exists
async function ensureStore() {
  const db = await getDB();
  if (!db.objectStoreNames.contains(NOTIFICATION_QUEUE_STORE)) {
    // Will be added in next DB version
    console.warn('Notification queue store not found - create in next DB upgrade');
  }
}

// Queue a notification for later
export async function queueNotification(
  notification: Omit<QueuedNotification, 'id' | 'createdAt' | 'sent'>
): Promise<string> {
  await ensureStore();
  
  const db = await getDB();
  const id = crypto.randomUUID();
  const queued: QueuedNotification = {
    ...notification,
    id,
    createdAt: new Date().toISOString(),
    sent: false
  };
  
  try {
    await db.add(NOTIFICATION_QUEUE_STORE, queued);
    return id;
  } catch (error) {
    console.error('Failed to queue notification:', error);
    return '';
  }
}

// Get all pending notifications
export async function getPendingNotifications(): Promise<QueuedNotification[]> {
  await ensureStore();
  
  const db = await getDB();
  try {
    const all = await db.getAll(NOTIFICATION_QUEUE_STORE);
    return all.filter(n => !n.sent && new Date(n.scheduledFor) <= new Date());
  } catch {
    return [];
  }
}

// Mark notification as sent
export async function markNotificationSent(id: string): Promise<void> {
  await ensureStore();
  
  const db = await getDB();
  try {
    const notification = await db.get(NOTIFICATION_QUEUE_STORE, id);
    if (notification) {
      await db.put(NOTIFICATION_QUEUE_STORE, { ...notification, sent: true });
    }
  } catch (error) {
    console.error('Failed to mark notification as sent:', error);
  }
}

// Clean up old notifications (older than 7 days)
export async function cleanupOldNotifications(): Promise<void> {
  await ensureStore();
  
  const db = await getDB();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  try {
    const all = await db.getAll(NOTIFICATION_QUEUE_STORE);
    const toDelete = all.filter(n => 
      new Date(n.createdAt) < sevenDaysAgo && n.sent
    );
    
    for (const notification of toDelete) {
      await db.delete(NOTIFICATION_QUEUE_STORE, notification.id);
    }
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
  }
}

// Process notification queue (call when online or periodically)
export async function processNotificationQueue(): Promise<void> {
  const pending = await getPendingNotifications();
  
  for (const notification of pending) {
    // Import dynamically to avoid circular deps
    const { sendNotification } = await import('./pushManager');
    
    await sendNotification({
      title: notification.title,
      body: notification.body,
      tag: notification.tag,
      data: notification.data
    });
    
    await markNotificationSent(notification.id);
  }
}