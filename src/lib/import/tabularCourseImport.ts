// CSV / Excel (.xlsx) course import. Designed around how institution
// timetables are usually exported: one row per class session, with the
// course code repeated across rows for a course that meets more than once
// a week. Rows sharing a code are merged into a single course with
// multiple schedule entries.
//
// Required columns: code, title, units, level, semester, day, startTime,
// endTime, location. Column names are matched case-insensitively and are
// tolerant of common variants (see HEADER_ALIASES).

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  type ParsedCourse,
  type ImportIssue,
  type ParseResult,
  normalizeDay,
  normalizeTime,
  splitDays,
} from './importShared';

type CanonicalField =
  | 'code' | 'title' | 'units' | 'level' | 'semester'
  | 'description' | 'department' | 'faculty'
  | 'day' | 'startTime' | 'endTime' | 'location';

const REQUIRED_FIELDS: CanonicalField[] = [
  'code', 'title', 'units', 'level', 'semester', 'day', 'startTime', 'endTime', 'location'
];

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  code: ['code', 'coursecode'],
  title: ['title', 'coursetitle', 'name', 'coursename'],
  units: ['units', 'unit', 'creditunits', 'credithours', 'credits'],
  level: ['level'],
  semester: ['semester', 'sem'],
  description: ['description', 'desc'],
  department: ['department', 'dept'],
  faculty: ['faculty', 'college', 'school'],
  day: ['day', 'days', 'classday', 'classdays'],
  startTime: ['starttime', 'start'],
  endTime: ['endtime', 'end'],
  location: ['location', 'venue', 'room', 'classroom'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]/g, '');
}

interface HeaderMapResult {
  map: Partial<Record<CanonicalField, string>>; // canonical -> actual raw header key
  missing: CanonicalField[];
}

function buildHeaderMap(rawHeaders: string[]): HeaderMapResult {
  const normalizedToRaw = new Map<string, string>();
  for (const h of rawHeaders) {
    normalizedToRaw.set(normalizeHeader(h), h);
  }

  const map: Partial<Record<CanonicalField, string>> = {};
  (Object.keys(HEADER_ALIASES) as CanonicalField[]).forEach(field => {
    for (const alias of HEADER_ALIASES[field]) {
      const rawKey = normalizedToRaw.get(alias);
      if (rawKey !== undefined) {
        map[field] = rawKey;
        break;
      }
    }
  });

  const missing = REQUIRED_FIELDS.filter(f => !map[f]);
  return { map, missing };
}

interface CourseAccumulator {
  code: string;
  title?: string;
  units?: number;
  level?: string;
  semester?: string;
  description?: string;
  department?: string;
  faculty?: string;
  schedules: { day: string; startTime: string; endTime: string; location: string }[];
}

/**
 * Turns already-parsed spreadsheet rows (array of {header: value} objects,
 * as produced by Papa.parse or XLSX.utils.sheet_to_json) into ParsedCourse[].
 */
export function buildCoursesFromRows(rawHeaders: string[], rows: Record<string, string>[]): ParseResult {
  const { map, missing } = buildHeaderMap(rawHeaders);

  if (missing.length > 0) {
    return {
      courses: [],
      issues: [{
        index: 0,
        message: `Missing required column(s): ${missing.join(', ')}. Check the column headers against the template.`
      }]
    };
  }

  const issues: ImportIssue[] = [];
  const groups = new Map<string, CourseAccumulator>();
  const order: string[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // +1 for 0-index, +1 for header row
    const get = (f: CanonicalField) => String(row[map[f]!] ?? '').trim();

    const code = get('code').toUpperCase();
    if (!code) {
      issues.push({ index: rowNum, message: `Row ${rowNum}: missing course code - row skipped.` });
      return;
    }

    let acc = groups.get(code);
    if (!acc) {
      acc = { code, schedules: [] };
      groups.set(code, acc);
      order.push(code);
    }

    // Course-level fields: fill in whichever haven't been captured yet
    // (institution exports usually repeat these on every row, but only
    // the first non-empty value encountered is needed).
    if (acc.title === undefined) {
      const v = get('title');
      if (v) acc.title = v;
    }
    if (acc.units === undefined) {
      const raw = get('units');
      if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) acc.units = n;
        else issues.push({ index: rowNum, code, message: `Row ${rowNum} (${code}): "units" value "${raw}" isn't a number - ignored.` });
      }
    }
    if (acc.level === undefined) {
      const v = get('level');
      if (v) acc.level = v;
    }
    if (acc.semester === undefined) {
      const v = get('semester');
      if (v) acc.semester = v;
    }
    if (acc.description === undefined) {
      const v = get('description');
      if (v) acc.description = v;
    }
    if (acc.department === undefined) {
      const v = get('department');
      if (v) acc.department = v;
    }
    if (acc.faculty === undefined) {
      const v = get('faculty');
      if (v) acc.faculty = v;
    }

    // Schedule for this row
    const dayRaw = get('day');
    const startRaw = get('startTime');
    const endRaw = get('endTime');
    const location = get('location');

    const sMissing: string[] = [];
    if (!dayRaw) sMissing.push('day');
    if (!startRaw) sMissing.push('startTime');
    if (!endRaw) sMissing.push('endTime');
    if (!location) sMissing.push('location');
    if (sMissing.length > 0) {
      issues.push({ index: rowNum, code, message: `Row ${rowNum} (${code}): missing ${sMissing.join(', ')} - row skipped.` });
      return;
    }

    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);
    if (!startTime || !endTime) {
      issues.push({ index: rowNum, code, message: `Row ${rowNum} (${code}): couldn't understand the time ("${startRaw}" - "${endRaw}") - row skipped.` });
      return;
    }

    const dayTokens = splitDays(dayRaw);
    if (dayTokens.length === 0) {
      issues.push({ index: rowNum, code, message: `Row ${rowNum} (${code}): no day value - row skipped.` });
      return;
    }

    for (const token of dayTokens) {
      const day = normalizeDay(token);
      if (!day) {
        issues.push({ index: rowNum, code, message: `Row ${rowNum} (${code}): unrecognized day "${token}" - skipped.` });
        continue;
      }
      acc.schedules.push({ day, startTime, endTime, location });
    }
  });

  const courses: ParsedCourse[] = [];

  for (const code of order) {
    const acc = groups.get(code)!;
    const missingFields: string[] = [];
    if (!acc.title) missingFields.push('title');
    if (acc.units === undefined) missingFields.push('units');
    if (!acc.level) missingFields.push('level');
    if (!acc.semester) missingFields.push('semester');

    if (missingFields.length > 0) {
      issues.push({ index: 0, code, message: `Course ${code}: missing required field(s) ${missingFields.join(', ')} on every row - rejected.` });
      continue;
    }

    if (acc.schedules.length === 0) {
      issues.push({ index: 0, code, message: `Course ${code}: no valid schedule rows - rejected. Mochido needs a schedule to create reminders.` });
      continue;
    }

    courses.push({
      code: acc.code,
      title: acc.title!,
      units: acc.units!,
      level: acc.level!,
      semester: acc.semester!,
      description: acc.description,
      department: acc.department,
      faculty: acc.faculty,
      schedules: acc.schedules,
      materials: [], // materials aren't part of the CSV/XLSX format - XML only
    });
  }

  return { courses, issues };
}

export function parseCsvText(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const headers = result.meta.fields ?? [];
  return buildCoursesFromRows(headers, result.data);
}

export function parseXlsxBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { courses: [], issues: [{ index: 0, message: 'This workbook has no sheets.' }] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return buildCoursesFromRows(headers, rows);
}

// ---- Templates ----

const TEMPLATE_ROWS = [
  { code: 'CSC401', title: 'Software Engineering', units: 3, level: 400, semester: 'First', day: 'Monday', startTime: '09:00', endTime: '11:00', location: 'LT1' },
  { code: 'CSC401', title: 'Software Engineering', units: 3, level: 400, semester: 'First', day: 'Thursday', startTime: '14:00', endTime: '16:00', location: 'Lab 2' },
  { code: 'CSC402', title: 'Database Systems', units: 3, level: 400, semester: 'First', day: 'Monday, Wednesday, Friday', startTime: '09:00', endTime: '10:00', location: 'LT2' },
];

const TEMPLATE_HEADERS = ['code', 'title', 'units', 'level', 'semester', 'day', 'startTime', 'endTime', 'location'];

export const CSV_TEMPLATE = [
  TEMPLATE_HEADERS.join(','),
  ...TEMPLATE_ROWS.map(r => TEMPLATE_HEADERS.map(h => (r as any)[h]).join(','))
].join('\n');

export function buildXlsxTemplateBlob(): Blob {
  const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: TEMPLATE_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}