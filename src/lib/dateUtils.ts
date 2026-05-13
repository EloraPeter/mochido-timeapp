// lib/dateUtils.ts - COMPLETE REWRITE

/**
 * Get user's local timezone offset in minutes
 */
export function getLocalTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Convert UTC date string to user's local time
 */
export function toLocalDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Return the date as-is - JavaScript already handles local timezone
  return d;
}

/**
 * Create a local date from year, month, day, hour, minute
 * This stores the date in local timezone, not UTC
 */
export function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number = 23,
  minute: number = 59
): Date {
  // Create date in local timezone
  return new Date(year, month, day, hour, minute);
}

/**
 * Format due date for display (relative time in local timezone)
 */
export function formatDueDateRelative(dueDateStr: string): string {
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  
  // Calculate difference in milliseconds
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 3600));
  const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));
  
  // Overdue
  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 1) return 'Just now';
    if (overdueHours === 1) return '1 hour ago';
    if (overdueHours < 24) return `${overdueHours} hours ago`;
    const overdueDays = Math.abs(diffDays);
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} ago`;
  }
  
  // Due soon
  if (diffMins < 60) {
    if (diffMins === 0) return 'Due now!';
    if (diffMins === 1) return '1 minute left';
    return `${diffMins} minutes left`;
  }
  
  if (diffHours < 24) {
    if (diffHours === 1) return '1 hour left';
    return `${diffHours} hours left`;
  }
  
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days left`;
  
  // Format date for display
  return dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Get hours remaining (for urgency scoring)
 */
export function getHoursRemaining(dueDateStr: string): number {
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 3600));
}

/**
 * Check if task is overdue
 */
export function isOverdue(dueDateStr: string): boolean {
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  return dueDate.getTime() < now.getTime();
}

/**
 * Format due date for input field (YYYY-MM-DDThh:mm)
 */
export function formatForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get today's date in local timezone (for comparisons)
 */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}