// Parser for the official Mochido XML course import format. Accepts either
// a full <mochido><courses><course>...</course></courses></mochido>
// document or just the inner <course> block(s) pasted on their own.
//
// Required per course: <code>, <title>, <units>, <level>, <semester>, and
// at least one valid <schedule> (day + startTime + endTime + location).
// Mochido is a class-reminder app, so a course with no schedule can't
// generate reminders - it's rejected during preview rather than imported
// with an empty timetable.
//
// A course can repeat <schedule> for multiple class sessions per week
// (e.g. a lecture on Monday and a lab on Thursday in a different room).

import {
  type ParsedCourse,
  type ParsedMaterial,
  type ParsedSchedule,
  type ImportIssue,
  type ParseResult,
  normalizeDay,
  normalizeTime,
  splitDays,
} from './importShared';

function text(el: Element, tag: string): string {
  // Direct child lookup only (avoids grabbing a same-named tag nested
  // deeper, e.g. a <title> inside <materials><material>).
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === tag) {
      return child.textContent?.trim() ?? '';
    }
  }
  return '';
}

function directChild(el: Element, tag: string): Element | undefined {
  return Array.from(el.children).find(c => c.tagName.toLowerCase() === tag);
}

export function parseMochidoXml(xmlString: string): ParseResult {
  const trimmed = xmlString.trim();
  if (!trimmed) {
    return { courses: [], issues: [{ index: 0, message: 'Nothing to parse - the file or pasted text is empty.' }] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return {
      courses: [],
      issues: [{ index: 0, message: "This isn't well-formed XML - check for a missing closing tag or stray character." }]
    };
  }

  let courseNodes = Array.from(doc.querySelectorAll('mochido > courses > course'));
  if (courseNodes.length === 0) {
    // Allow pasting just the <course>...</course> block(s) without the
    // surrounding <mochido><courses> wrapper.
    courseNodes = Array.from(doc.querySelectorAll('course'));
  }

  if (courseNodes.length === 0) {
    return {
      courses: [],
      issues: [{ index: 0, message: 'No <course> entries found. Make sure the XML follows the Mochido import template.' }]
    };
  }

  const courses: ParsedCourse[] = [];
  const issues: ImportIssue[] = [];

  courseNodes.forEach((node, i) => {
    const index = i + 1;
    const code = text(node, 'code').toUpperCase();
    const title = text(node, 'title');
    const unitsRaw = text(node, 'units');
    const level = text(node, 'level');
    const semester = text(node, 'semester');

    const missing: string[] = [];
    if (!code) missing.push('code');
    if (!title) missing.push('title');
    if (!unitsRaw) missing.push('units');
    if (!level) missing.push('level');
    if (!semester) missing.push('semester');

    if (missing.length > 0) {
      issues.push({
        index,
        code: code || undefined,
        message: `Course #${index}${code ? ` (${code})` : ''} is missing required field(s): ${missing.join(', ')}. Skipped.`
      });
      return;
    }

    const units = parseInt(unitsRaw, 10);
    if (Number.isNaN(units)) {
      issues.push({ index, code, message: `Course #${index} (${code}) has a non-numeric <units> value ("${unitsRaw}"). Skipped.` });
      return;
    }

    // ---- Schedule (required) ----
    const schedules: ParsedSchedule[] = [];
    const scheduleNodes = Array.from(node.querySelectorAll('schedules > schedule'));

    scheduleNodes.forEach((sNode, sIdx) => {
      const dayRaw = text(sNode, 'day');
      const startRaw = text(sNode, 'startTime') || text(sNode, 'starttime');
      const endRaw = text(sNode, 'endTime') || text(sNode, 'endtime');
      const location = text(sNode, 'location');

      const sMissing: string[] = [];
      if (!dayRaw) sMissing.push('day');
      if (!startRaw) sMissing.push('startTime');
      if (!endRaw) sMissing.push('endTime');
      if (!location) sMissing.push('location');
      if (sMissing.length > 0) {
        issues.push({
          index,
          code,
          message: `Course ${code}, schedule #${sIdx + 1}: missing ${sMissing.join(', ')}. That session was skipped.`
        });
        return;
      }

      const startTime = normalizeTime(startRaw);
      const endTime = normalizeTime(endRaw);
      if (!startTime || !endTime) {
        issues.push({
          index,
          code,
          message: `Course ${code}, schedule #${sIdx + 1}: couldn't understand the time ("${startRaw}" - "${endRaw}"). That session was skipped.`
        });
        return;
      }

      const dayTokens = splitDays(dayRaw);
      for (const token of dayTokens) {
        const day = normalizeDay(token);
        if (!day) {
          issues.push({ index, code, message: `Course ${code}, schedule #${sIdx + 1}: unrecognized day "${token}" - skipped.` });
          continue;
        }
        schedules.push({ day, startTime, endTime, location });
      }
    });

    if (schedules.length === 0) {
      issues.push({
        index,
        code,
        message: `Course #${index} (${code}) has no valid <schedule> (day, startTime, endTime, location) - rejected. Mochido needs a schedule to create reminders.`
      });
      return;
    }

    const description = text(node, 'description') || undefined;
    const department = text(node, 'department') || undefined;
    const faculty = text(node, 'faculty') || undefined;

    const lecturerNode = directChild(node, 'lecturer');
    const lecturerName = lecturerNode ? text(lecturerNode, 'name') || undefined : undefined;
    const lecturerEmail = lecturerNode ? text(lecturerNode, 'email') || undefined : undefined;

    const materials: ParsedMaterial[] = Array.from(node.querySelectorAll('materials > material'))
      .map(m => ({
        title: text(m, 'title') || 'Untitled material',
        type: text(m, 'type') || 'link',
        url: text(m, 'url') || ''
      }))
      .filter(m => m.url); // a material without a url isn't usable - drop it quietly

    courses.push({ code, title, units, level, semester, description, department, faculty, lecturerName, lecturerEmail, schedules, materials });
  });

  return { courses, issues };
}

// Short-form template - the version meant for quick copy/paste/fill-in.
// One <schedule> per class session; add more <schedule> blocks for
// courses that meet more than once a week (different day/time/location).
export const MOCHIDO_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<mochido>
    <courses>

        <course>
            <code>CSC401</code>
            <title>Software Engineering</title>
            <units>3</units>
            <level>400</level>
            <semester>First</semester>
            <schedules>
                <schedule>
                    <day>Monday</day>
                    <startTime>09:00</startTime>
                    <endTime>11:00</endTime>
                    <location>LT1</location>
                </schedule>
                <schedule>
                    <day>Thursday</day>
                    <startTime>14:00</startTime>
                    <endTime>16:00</endTime>
                    <location>Lab 2</location>
                </schedule>
            </schedules>
        </course>

        <course>
            <code>CSC402</code>
            <title>Database Systems</title>
            <units>3</units>
            <level>400</level>
            <semester>First</semester>
            <schedules>
                <schedule>
                    <day>Monday, Wednesday, Friday</day>
                    <startTime>09:00</startTime>
                    <endTime>10:00</endTime>
                    <location>LT2</location>
                </schedule>
            </schedules>
        </course>

    </courses>
</mochido>
`;