// Shared types and normalization helpers used by every course-import path
// (XML upload/paste, CSV upload, XLSX upload). Kept in one place so a day
// like "Weds" or a time like "9am" is interpreted identically no matter
// which format the lecturer used.
//
// IMPORTANT: Mochido is a class-reminder app - a course with no schedule
// can't produce reminders, so schedule data (day, startTime, endTime,
// location) is mandatory here, unlike the optional `location` on the
// LecturerCourse DB record. We enforce it at import time regardless.

export interface ParsedSchedule {
  day: string;        // normalized lowercase full weekday name, e.g. "monday"
  startTime: string;  // "HH:MM", 24-hour
  endTime: string;    // "HH:MM", 24-hour
  location: string;
}

export interface ParsedMaterial {
  title: string;
  type: string; // raw string, e.g. "PDF", "VIDEO" - mapped to MaterialType at import time
  url: string;
}

export interface ParsedCourse {
  code: string;
  title: string;
  units: number;
  level: string;
  semester: string;
  description?: string;
  department?: string;
  faculty?: string;
  lecturerName?: string;
  lecturerEmail?: string;
  schedules: ParsedSchedule[]; // always >= 1 by the time a course reaches ParseResult.courses
  materials: ParsedMaterial[];
}

export interface ImportIssue {
  index: number;    // 1-based position (course # or row #) for reference
  code?: string;
  message: string;
}

export interface ParseResult {
  courses: ParsedCourse[];
  issues: ImportIssue[];
}

// One merged block of time+location shared by one or more days - this is
// exactly the shape of a manually-created LecturerCourse row.
export interface ScheduleGroup {
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
}

const DAY_ALIASES: Record<string, string> = {
  mon: 'monday', monday: 'monday',
  tue: 'tuesday', tues: 'tuesday', tuesday: 'tuesday',
  wed: 'wednesday', weds: 'wednesday', wednesday: 'wednesday',
  thu: 'thursday', thur: 'thursday', thurs: 'thursday', thursday: 'thursday',
  fri: 'friday', friday: 'friday',
  sat: 'saturday', saturday: 'saturday',
  sun: 'sunday', sunday: 'sunday',
};

/** Normalizes a single day token to a lowercase full weekday name, or null if unrecognized. */
export function normalizeDay(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return DAY_ALIASES[key] ?? null;
}

/** Splits a cell like "Mon/Wed/Fri" or "Monday, Wednesday and Friday" into individual day tokens. */
export function splitDays(raw: string): string[] {
  return raw
    .split(/,|\/|&|\band\b/i)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Normalizes "9:00", "09:00", "9am", "9:00 AM", "14:00", or an Excel time-fraction number to "HH:MM". */
export function normalizeTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Excel sometimes gives a raw time-of-day as a fraction of a day (0-1).
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum) && asNum >= 0 && asNum < 1) {
    const totalMinutes = Math.round(asNum * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const s = trimmed.toLowerCase().replace(/\s+/g, '');

  // 24-hour HH:MM or H:MM
  let m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m && !/am|pm/.test(s)) {
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }

  // 12-hour with am/pm, minutes optional
  m = s.match(/^(\d{1,2})(?::([0-5]\d))?(am|pm)$/);
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    const min = m[2] ?? '00';
    if (m[3] === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${min}`;
  }

  return null;
}

/**
 * Groups atomic (day, startTime, endTime, location) schedule entries into
 * the fewest LecturerCourse-shaped rows - entries sharing the same time and
 * location get merged into one row with multiple days, exactly matching
 * what the manual "New Course" form produces for a Mon/Wed/Fri class.
 */
export function groupSchedules(schedules: ParsedSchedule[]): ScheduleGroup[] {
  const map = new Map<string, ScheduleGroup>();
  for (const s of schedules) {
    const key = `${s.startTime}|${s.endTime}|${s.location}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.days.includes(s.day)) existing.days.push(s.day);
    } else {
      map.set(key, { days: [s.day], startTime: s.startTime, endTime: s.endTime, location: s.location });
    }
  }
  return Array.from(map.values());
}