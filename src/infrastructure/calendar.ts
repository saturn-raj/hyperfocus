import type { Block } from '../domain/model';
const escape = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function stamp(block: Block, end = false) {
  const d = new Date(`${block.date}T00:00:00`);
  d.setMinutes(block.start + (end ? block.duration : 0));
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
function fold(line: string) {
  const result: string[] = [];
  let current = '';
  let length = 0;
  for (const c of line) {
    const bytes = new TextEncoder().encode(c).length;
    if (length + bytes > 73) {
      result.push(current);
      current = ' ';
      length = 1;
    }
    current += c;
    length += bytes;
  }
  result.push(current);
  return result.join('\r\n');
}
export function exportCalendar(blocks: Block[]): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hyperfocus//Planner//EN',
      'CALSCALE:GREGORIAN',
      ...blocks.flatMap((b) => [
        'BEGIN:VEVENT',
        `UID:${escape(b.id)}@hyperfocus.local`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(b)}`,
        `DTEND:${stamp(b, true)}`,
        `SUMMARY:${escape(b.title)}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
