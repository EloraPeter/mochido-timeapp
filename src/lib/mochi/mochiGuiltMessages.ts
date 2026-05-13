// lib/mochi/mochiGuiltMessages.ts

export type GuiltLevel = 'gentle' | 'concerned' | 'disappointed' | 'desperate' | 'passive_aggressive';

export interface GuiltMessage {
  id: string;
  level: GuiltLevel;
  message: string;
  notificationText: string;
  minDelayHours?: number; // Minimum hours since last login
}

export const GUILT_MESSAGES: GuiltMessage[] = [
  // Gentle nudges
  {
    id: 'gentle_1',
    level: 'gentle',
    message: "Mochi noticed you have some tasks due soon... Just saying. 🐹",
    notificationText: "📚 Some deadlines are approaching!",
    minDelayHours: 12
  },
  {
    id: 'gentle_2',
    level: 'gentle',
    message: "Hey! Your hamster buddy misses you. Any tasks to check off? ✨",
    notificationText: "🕐 Mochi misses you! Check your tasks?",
    minDelayHours: 24
  },
  
  // Concerned messages
  {
    id: 'concerned_1',
    level: 'concerned',
    message: "Mochi is getting worried. You haven't opened the app in 2 days... 😟",
    notificationText: "😟 Mochi is worried about your deadlines!",
    minDelayHours: 48
  },
  {
    id: 'concerned_2',
    level: 'concerned',
    message: "Your tasks are piling up! Mochi believes in you! 🐹💪",
    notificationText: "📋 You have pending tasks! Mochi believes in you!",
    minDelayHours: 36
  },
  
  // Disappointed messages
  {
    id: 'disappointed_1',
    level: 'disappointed',
    message: "Mochi is disappointed... You had 3 overdue tasks. Let's fix this? 😢",
    notificationText: "😢 3 overdue tasks. Mochi is disappointed but still believes in you!",
    minDelayHours: 72
  },
  {
    id: 'disappointed_2',
    level: 'disappointed',
    message: "Remember when you had a 5-day streak? Mochi remembers. 🐹💔",
    notificationText: "💔 Your streak is gone. Come back?",
    minDelayHours: 96
  },
  
  // Desperate messages
  {
    id: 'desperate_1',
    level: 'desperate',
    message: "MOCHI IS LONELY! Please open the app just once? 😭🐹",
    notificationText: "😭🐹 Mochi is lonely! Please check your deadlines!",
    minDelayHours: 120
  },
  {
    id: 'desperate_2',
    level: 'desperate',
    message: "It's been a week. Your assignments miss you. Mochi REALLY misses you... 💔",
    notificationText: "💔 ONE WEEK! Your assignments are waiting! Mochi misses you!",
    minDelayHours: 168
  },
  
  // Passive-aggressive (The Duolingo special)
  {
    id: 'passive_1',
    level: 'passive_aggressive',
    message: "Oh, you're back? Mochi wasn't waiting or anything... 😒",
    notificationText: "😒 Oh, you remember Mochi exists?",
    minDelayHours: 48
  },
  {
    id: 'passive_2',
    level: 'passive_aggressive',
    message: "It's fine. Mochi will just sit here. Alone. With your overdue tasks. 🐹",
    notificationText: "🐹 Mochi is waiting. Alone. With your tasks.",
    minDelayHours: 72
  },
  {
    id: 'passive_3',
    level: 'passive_aggressive',
    message: "Must be nice having no deadlines. Must be REAL nice. 😤",
    notificationText: "😤 Must be nice ignoring deadlines...",
    minDelayHours: 96
  },
  {
    id: 'passive_4',
    level: 'passive_aggressive',
    message: "Mochi sees you ignoring notifications. The hamster is not amused. 🐹🔪",
    notificationText: "🐹🔪 Mochi is NOT amused by your ignorance.",
    minDelayHours: 120
  }
];

export function getGuiltMessage(level: GuiltLevel, lastLoginDays: number): GuiltMessage {
  const eligibleMessages = GUILT_MESSAGES.filter(m => {
    if (m.level !== level) return false;
    if (m.minDelayHours && lastLoginDays * 24 < m.minDelayHours) return false;
    return true;
  });
  
  if (eligibleMessages.length === 0) {
    return GUILT_MESSAGES[0];
  }
  
  const randomIndex = Math.floor(Math.random() * eligibleMessages.length);
  return eligibleMessages[randomIndex];
}