// Parser for the official Mochido course import format. Accepts either a
// full <mochido><courses><course>...</course></courses></mochido> document
// or just the inner <course> block(s) pasted on their own. Designed to be
// forgiving: only <code>, <title>, <units>, <level>, <semester> are
// required - everything else (description, department, faculty, lecturer,
// materials) is optional and silently omitted if missing, so a lecturer can
// paste a five-tag course and have it work.

export interface ParsedMaterial {
  title: string;
  type: string; // raw string from the XML, e.g. "PDF", "VIDEO" - mapped later
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
  materials: ParsedMaterial[];
}

export interface ImportIssue {
  index: number;       // 1-based position among <course> nodes found
  code?: string;        // course code, if it was readable
  message: string;
}

export interface ParseResult {
  courses: ParsedCourse[];
  issues: ImportIssue[];
}

function text(el: Element, tag: string): string {
  // Direct child lookup first (avoids grabbing a same-named tag nested
  // deeper, e.g. a <title> inside <materials><material>).
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === tag) {
      return child.textContent?.trim() ?? '';
    }
  }
  return '';
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

    const description = text(node, 'description') || undefined;
    const department = text(node, 'department') || undefined;
    const faculty = text(node, 'faculty') || undefined;

    const lecturerNode = Array.from(node.children).find(c => c.tagName.toLowerCase() === 'lecturer');
    const lecturerName = lecturerNode ? text(lecturerNode, 'name') || undefined : undefined;
    const lecturerEmail = lecturerNode ? text(lecturerNode, 'email') || undefined : undefined;

    const materials: ParsedMaterial[] = Array.from(node.querySelectorAll('materials > material'))
      .map(m => ({
        title: text(m, 'title') || 'Untitled material',
        type: text(m, 'type') || 'link',
        url: text(m, 'url') || ''
      }))
      .filter(m => m.url); // a material without a url isn't usable - drop it quietly

    courses.push({ code, title, units, level, semester, description, department, faculty, lecturerName, lecturerEmail, materials });
  });

  return { courses, issues };
}

// Short-form template - the version meant for quick copy/paste/fill-in.
// Matches the "official Mochido course import template" minimum fields.
export const MOCHIDO_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<mochido>
    <courses>

        <course>
            <code>CSC401</code>
            <title>Software Engineering</title>
            <units>3</units>
            <level>400</level>
            <semester>First</semester>
        </course>

        <course>
            <code>CSC402</code>
            <title>Database Systems</title>
            <units>3</units>
            <level>400</level>
            <semester>First</semester>
        </course>

    </courses>
</mochido>
`;
