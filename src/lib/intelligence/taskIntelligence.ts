import { Task } from '@/lib/db/schema';

// Core urgency calculation
export function calculateUrgency(task: Task): number {
  if (task.isDone) return 0;
  
  const now = new Date().getTime();
  const due = new Date(task.dueDate).getTime();
  const diffHours = (due - now) / (1000 * 60 * 60);
  
  // Overdue
  if (diffHours < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours > 48) return 100; // Critical
    if (overdueHours > 24) return 95;
    return 90 + (overdueHours / 24) * 10;
  }
  
  // Urgency tiers based on time remaining
  if (diffHours < 2) return 90 + (2 - diffHours) * 5; // 90-100
  if (diffHours < 6) return 70 + ((6 - diffHours) / 4) * 20; // 70-90
  if (diffHours < 24) return 50 + ((24 - diffHours) / 18) * 20; // 50-70
  if (diffHours < 72) return 30 + ((72 - diffHours) / 48) * 20; // 30-50
  if (diffHours < 168) return 15 + ((168 - diffHours) / 96) * 15; // 15-30
  
  return 10; // Far future tasks
}

// Get priority-based reminder times
export function getReminderTimes(priority: Task['priority']): number[] {
  const baseReminders = {
    high: [1440, 360, 60, 30, 10, 0], // 1 day, 6h, 1h, 30m, 10m, now
    medium: [1440, 120, 30, 0], // 1 day, 2h, 30m, now
    low: [720, 60, 0] // 12h, 1h, now
  };
  return baseReminders[priority];
}

// Check if task needs notification
export function shouldNotify(task: Task): { should: boolean; minutesUntilDue: number } {
  if (task.isDone) return { should: false, minutesUntilDue: Infinity };
  if (task.status === 'completed') return { should: false, minutesUntilDue: Infinity };
  
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
  
  if (minutesUntilDue < 0) {
    task.status = 'overdue';
    return { should: true, minutesUntilDue };
  }
  
  // Check if any reminder time has been crossed
  for (const reminderMinute of task.reminderMinutes) {
    if (minutesUntilDue <= reminderMinute && minutesUntilDue > reminderMinute - 5) {
      // Check if we've notified recently (within last hour)
      if (task.lastNotifiedAt) {
        const lastNotified = new Date(task.lastNotifiedAt);
        const hoursSinceNotify = (now.getTime() - lastNotified.getTime()) / (1000 * 3600);
        if (hoursSinceNotify < 1) continue;
      }
      return { should: true, minutesUntilDue };
    }
  }
  
  return { should: false, minutesUntilDue };
}

// Update task status based on due date and completion
export function updateTaskStatus(task: Task): Task {
  const updated = { ...task };
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  
  if (task.isDone) {
    updated.status = 'completed';
    if (!updated.completedAt) updated.completedAt = now.toISOString();
    updated.completedLate = now > dueDate;
  } else if (now > dueDate) {
    updated.status = 'overdue';
  } else {
    updated.status = 'pending';
  }
  
  updated.urgencyScore = calculateUrgency(updated);
  return updated;
}

// Get behavioral insights (for Mochi)
export function getBehavioralInsights(tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => t.status === 'overdue' && !t.isDone);
  const completedLate = tasks.filter(t => t.completedLate === true);
  
  const onTimeRate = completedTasks.length > 0 
    ? ((completedTasks.length - completedLate.length) / completedTasks.length) * 100
    : 0;
  
  const averageCompletionDelta = completedTasks
    .filter(t => t.completedAt)
    .map(t => {
      const due = new Date(t.dueDate).getTime();
      const completed = new Date(t.completedAt!).getTime();
      return (completed - due) / (1000 * 3600); // Hours late/early
    })
    .reduce((a, b) => a + b, 0) / (completedTasks.length || 1);
  
  return {
    onTimeRate,
    averageCompletionDelta,
    overdueCount: overdueTasks.length,
    totalCompleted: completedTasks.length,
    consistencyScore: Math.min(100, Math.max(0, onTimeRate * 0.7 + (100 - Math.abs(averageCompletionDelta) * 2)))
  };
}

// Sort tasks by intelligent priority
export function sortTasksByIntelligence(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Overdue first
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    
    // Then by urgency score
    const urgencyA = a.urgencyScore || calculateUrgency(a);
    const urgencyB = b.urgencyScore || calculateUrgency(b);
    if (urgencyA !== urgencyB) return urgencyB - urgencyA;
    
    // Then by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

// Get Mochi's emotional response based on user behavior
export function getMochiReaction(insights: ReturnType<typeof getBehavioralInsights>, urgentCount: number) {
  if (urgentCount > 0) {
    return {
      emoji: '🚨🐹🔥',
      message: `CRITICAL! ${urgentCount} ${urgentCount === 1 ? 'task is' : 'tasks are'} URGENT! Focus NOW!`,
      action: 'urgent'
    };
  }
  
  if (insights.onTimeRate >= 80) {
    return {
      emoji: '🏆🐹💪',
      message: `LEGEND! ${Math.round(insights.onTimeRate)}% on-time completion! New streak? 🔥`,
      action: 'celebration'
    };
  }
  
  if (insights.onTimeRate >= 60) {
    return {
      emoji: '📈🐹✨',
      message: `Solid ${Math.round(insights.onTimeRate)}% on-time! ${insights.overdueCount} ${insights.overdueCount === 1 ? 'task needs' : 'tasks need'} attention`,
      action: 'encouragement'
    };
  }
  
  if (insights.overdueCount > 3) {
    return {
      emoji: '😰🐹',
      message: `${insights.overdueCount} overdue ${insights.overdueCount === 1 ? 'task' : 'tasks'}. Let's fix this together! Set smaller goals?`,
      action: 'support'
    };
  }
  
  return {
    emoji: '🐹💭',
    message: `${insights.totalCompleted} ${insights.totalCompleted === 1 ? 'task' : 'tasks'} done. ${insights.overdueCount} pending. You've got this!`,
    action: 'neutral'
  };
}