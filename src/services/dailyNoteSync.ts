import type { DailyHourlyNote } from '../types';

export interface PendingDailyNotes {
  upserts: DailyHourlyNote[];
  deletes: string[];
}

export function mergeDailyNotesSnapshot(
  remote: DailyHourlyNote[],
  pending: PendingDailyNotes,
): DailyHourlyNote[] {
  const deleted = new Set(pending.deletes);
  const byId = new Map<string, DailyHourlyNote>();

  remote.forEach((note) => {
    if (!deleted.has(note.id)) byId.set(note.id, note);
  });

  pending.upserts.forEach((note) => {
    if (!deleted.has(note.id)) byId.set(note.id, note);
  });

  return [...byId.values()];
}

export function mergeDailyNotesForFirstMigration(
  remote: DailyHourlyNote[],
  local: DailyHourlyNote[],
): DailyHourlyNote[] {
  const byId = new Map(remote.map((note) => [note.id, note]));
  local.forEach((note) => {
    const current = byId.get(note.id);
    if (!current || (note.updatedAt || note.createdAt || '') > (current.updatedAt || current.createdAt || '')) {
      byId.set(note.id, note);
    }
  });
  return [...byId.values()];
}
