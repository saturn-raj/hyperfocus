import { it, expect } from 'vitest';
import { createState } from '../domain/seed';
import { parseBackup } from './storage';
import { exportCalendar } from './calendar';
it('round-trips a validated backup and rejects malformed or oversized input', () => {
  const s = createState();
  expect(parseBackup(JSON.stringify(s))).toEqual(s);
  expect(() => parseBackup('{')).toThrow();
  expect(() => parseBackup('{"version":2}')).toThrow();
  expect(() => parseBackup(' '.repeat(10_000_001))).toThrow('10 MB');
});
it('exports UTC calendar events with escaping, CRLF and folded lines', () => {
  const s = createState();
  s.blocks[0].title = 'Notes, ideas; a backslash \\ and a newline\n' + 'Long text '.repeat(20);
  const ics = exportCalendar(s.blocks);
  expect(ics).toContain('BEGIN:VCALENDAR\r\n');
  expect(ics).toContain('Notes\\, ideas\\;');
  expect(ics).toContain('\\n');
  expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(ics).toContain('\r\n ');
  expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
});
