// lib/notifications/reminderScheduler.ts

import { Task } from '@/lib/db/schema';
import { getItems, updateItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/auth/pinAuth';
import { queueNotification } from './notificationQueue';
import { calculateUrgency } from '@/lib/intelligence/taskIntelligence';

// Priority-based reminder times (in minutes before due)
const REMINDER_SCHEDULES = {
  high: [1440, 360, 60, 30, 10], // 1d, 6h, 1h, 30m, 10m
  medium: [1440, 120, 30], // 1d, 2h, 30m
  low: [720, 60] // 12h, 1h
};

// Check if task needs a new reminder
export async function scheduleTaskReminders(task: Task): Promise<void> {
  if (task.isDone || task.status === 'completed') return;
  
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
  
  if (minutesUntilDue < 0) return; // Already overdue
  
  const schedule = REMINDER_SCHEDULES[task.priority];
  const lastNotified = task.lastNotifiedAt ? new Date(task.lastNotifiedAt) : null;
  
  for (const reminderMinute of schedule) {
    // Check if this reminder time is now or in the past
    if (minutesUntilDue <= reminderMinute) {
      // Check if we've already sent this reminder
      if (lastNotified) {
        const minutesSinceLastNotify = (now.getTime() - lastNotified.getTime()) / (1000 * 60);
        // Don't send another reminder if we sent one recently (within 30 min)
        if (minutesSinceLastNotify < 30) continue;
      }
      
      // Queue the notification
      const urgency = calculateUrgency(task);
      const urgencyLevel = urgency > 70 ? '🔥 URGENT - ' : '';
      
      await queueNotification({
        title: `${urgencyLevel}Deadline Approaching`,
        body: `"${task.title}" is due in ${formatReminderTime(reminderMinute)}`,
        scheduledFor: new Date().toISOString(),
        priority: task.priority,
        tag: `task-${task.id}`,
        data: { taskId: task.id, type: 'deadline' }
      });
      
      // Update last notified time
      await updateItem(STORES.tasks, task.id, { lastNotifiedAt: now.toISOString() });
      break; // Only send one reminder per check
    }
  }
}

// Format reminder time for display
function formatReminderTime(minutes: number): string {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) === 1 ? '' : 's'}`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? '' : 's'}`;
  if (minutes === 30) return '30 minutes';
  if (minutes === 10) return '10 minutes';
  return `${minutes} minutes`;
}

// Schedule reminders for all pending tasks
export async function scheduleAllReminders(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  
  const tasks = await getItems<Task>(STORES.tasks, 'userId', userId);
  
  for (const task of tasks) {
    if (!task.isDone && task.status !== 'completed') {
      await scheduleTaskReminders(task);
    }
  }
}

// Run reminder scheduler periodically
export function startReminderScheduler(intervalMinutes: number = 15): NodeJS.Timeout {
  // Run immediately
  scheduleAllReminders();
  
  // Then run on interval
  return setInterval(() => {
    scheduleAllReminders();
  }, intervalMinutes * 60 * 1000);
}