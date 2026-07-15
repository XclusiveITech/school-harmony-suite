// Boarding facility store
// Manages hostels, rooms, beds, student allocations and audit trail.

export type HostelCategory = 'Boys' | 'Girls';

export interface HostelRoom {
  id: string;
  hostelId: string;
  number: string;
  capacity: number;
}

export interface Hostel {
  id: string;
  name: string;
  category: HostelCategory;
  levels: string[];
  wardenIds: string[];        // linked to Staff.id (multi-warden)
  warden?: string;            // legacy free-text (kept for back-compat)
  rooms: HostelRoom[];
}

export interface BoardingAllocation {
  id: string;
  studentId: string;
  studentName?: string;
  gender: HostelCategory;
  level: string;
  hostelId: string;
  roomId: string;
  bedNumber: number;
  allocatedAt: string;
  active: boolean;
}

export type BoardingAuditAction =
  | 'AUTO_ALLOCATE' | 'MANUAL_ALLOCATE' | 'BED_CHANGE' | 'RELEASE'
  | 'HOSTEL_CREATE' | 'HOSTEL_UPDATE' | 'HOSTEL_DELETE'
  | 'WARDEN_ASSIGN' | 'WARDEN_REMOVE';

export interface BoardingAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: BoardingAuditAction;
  studentId?: string;
  studentName?: string;
  fromHostelId?: string;
  fromRoomId?: string;
  fromBed?: number;
  toHostelId?: string;
  toRoomId?: string;
  toBed?: number;
  hostelId?: string;
  reason?: string;
  detail?: string;
}

// ---------- Seed --------------------------------------------------------

const seedHostels: Hostel[] = [
  {
    id: 'h1', name: 'Mukuvisi Boys Hostel', category: 'Boys',
    levels: ['Form 1', 'Form 2'], wardenIds: [], warden: 'Mr. Moyo',
    rooms: Array.from({ length: 8 }, (_, i) => ({
      id: `h1-r${i + 1}`, hostelId: 'h1',
      number: `B${String(i + 1).padStart(2, '0')}`, capacity: 4,
    })),
  },
  {
    id: 'h2', name: 'Save Boys Hostel', category: 'Boys',
    levels: ['Form 3', 'Form 4'], wardenIds: [], warden: 'Mr. Dube',
    rooms: Array.from({ length: 6 }, (_, i) => ({
      id: `h2-r${i + 1}`, hostelId: 'h2',
      number: `S${String(i + 1).padStart(2, '0')}`, capacity: 4,
    })),
  },
  {
    id: 'h3', name: 'Zambezi Girls Hostel', category: 'Girls',
    levels: ['Form 1', 'Form 2', 'Form 3', 'Form 4'], wardenIds: [], warden: 'Mrs. Ncube',
    rooms: Array.from({ length: 10 }, (_, i) => ({
      id: `h3-r${i + 1}`, hostelId: 'h3',
      number: `G${String(i + 1).padStart(2, '0')}`, capacity: 4,
    })),
  },
];

// ---------- Reactive store ----------------------------------------------
import { useSyncExternalStore } from 'react';

let hostels: Hostel[] = [...seedHostels];
let allocations: BoardingAllocation[] = [];
let audit: BoardingAuditEvent[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const useHostels = () => useSyncExternalStore(subscribe, () => hostels, () => hostels);
export const useAllocations = () => useSyncExternalStore(subscribe, () => allocations, () => allocations);
export const useBoardingAudit = () => useSyncExternalStore(subscribe, () => audit, () => audit);

// ---------- Audit -------------------------------------------------------

const currentActor = () => {
  try {
    const s = localStorage.getItem('brainstar_user');
    if (s) return JSON.parse(s).name || 'System';
  } catch {}
  return 'System';
};

export const logBoardingAudit = (e: Omit<BoardingAuditEvent, 'id' | 'at' | 'actor'> & { actor?: string }) => {
  audit = [{
    id: `au${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: e.actor || currentActor(),
    ...e,
  }, ...audit];
  emit();
};

// ---------- Helpers -----------------------------------------------------

export const hostelCapacity = (h: Hostel) => h.rooms.reduce((s, r) => s + r.capacity, 0);
export const hostelOccupancy = (h: Hostel) =>
  allocations.filter(a => a.active && a.hostelId === h.id).length;

export const roomOccupancy = (roomId: string) =>
  allocations.filter(a => a.active && a.roomId === roomId).length;

export const occupiedBedsInRoom = (roomId: string) =>
  allocations.filter(a => a.active && a.roomId === roomId).map(a => a.bedNumber);

export const findFreeBed = (
  gender: HostelCategory, level: string,
): { hostel: Hostel; room: HostelRoom; bedNumber: number } | null => {
  for (const h of hostels) {
    if (h.category !== gender) continue;
    if (!h.levels.includes(level)) continue;
    for (const r of h.rooms) {
      const taken = new Set(occupiedBedsInRoom(r.id));
      for (let b = 1; b <= r.capacity; b++) {
        if (!taken.has(b)) return { hostel: h, room: r, bedNumber: b };
      }
    }
  }
  return null;
};

export const listVacantBeds = (gender: HostelCategory, level: string) => {
  const out: { hostel: Hostel; room: HostelRoom; bedNumber: number }[] = [];
  for (const h of hostels) {
    if (h.category !== gender || !h.levels.includes(level)) continue;
    for (const r of h.rooms) {
      const taken = new Set(occupiedBedsInRoom(r.id));
      for (let b = 1; b <= r.capacity; b++) {
        if (!taken.has(b)) out.push({ hostel: h, room: r, bedNumber: b });
      }
    }
  }
  return out;
};

/** Staff IDs already assigned as warden to any hostel */
export const assignedWardenStaffIds = (excludeHostelId?: string): string[] => {
  const set = new Set<string>();
  for (const h of hostels) {
    if (excludeHostelId && h.id === excludeHostelId) continue;
    h.wardenIds?.forEach(id => set.add(id));
  }
  return [...set];
};

// ---------- Mutations ---------------------------------------------------

export const createHostel = (data: Omit<Hostel, 'id' | 'rooms' | 'wardenIds'> & {
  roomCount: number; roomCapacity: number; prefix?: string; wardenIds?: string[];
}) => {
  const id = `h${Date.now()}`;
  const prefix = data.prefix || data.name.charAt(0).toUpperCase();
  const rooms: HostelRoom[] = Array.from({ length: data.roomCount }, (_, i) => ({
    id: `${id}-r${i + 1}`, hostelId: id,
    number: `${prefix}${String(i + 1).padStart(2, '0')}`, capacity: data.roomCapacity,
  }));
  hostels = [...hostels, {
    id, name: data.name, category: data.category, levels: data.levels,
    wardenIds: data.wardenIds || [], warden: data.warden, rooms,
  }];
  emit();
  logBoardingAudit({ action: 'HOSTEL_CREATE', hostelId: id, detail: data.name });
};

export const updateHostel = (id: string, patch: Partial<Pick<Hostel, 'name' | 'category' | 'levels' | 'warden' | 'wardenIds'>>) => {
  const before = hostels.find(h => h.id === id);
  hostels = hostels.map(h => h.id === id ? { ...h, ...patch } : h);
  emit();
  if (patch.wardenIds && before) {
    const added = patch.wardenIds.filter(w => !before.wardenIds?.includes(w));
    const removed = (before.wardenIds || []).filter(w => !patch.wardenIds!.includes(w));
    added.forEach(w => logBoardingAudit({ action: 'WARDEN_ASSIGN', hostelId: id, detail: `Warden staff #${w}` }));
    removed.forEach(w => logBoardingAudit({ action: 'WARDEN_REMOVE', hostelId: id, detail: `Warden staff #${w}` }));
  } else {
    logBoardingAudit({ action: 'HOSTEL_UPDATE', hostelId: id, detail: JSON.stringify(patch) });
  }
};

export const deleteHostel = (id: string) => {
  hostels = hostels.filter(h => h.id !== id);
  allocations = allocations.filter(a => a.hostelId !== id);
  emit();
  logBoardingAudit({ action: 'HOSTEL_DELETE', hostelId: id });
};

export const addRoom = (hostelId: string, number: string, capacity: number) => {
  hostels = hostels.map(h => h.id === hostelId
    ? { ...h, rooms: [...h.rooms, { id: `${hostelId}-r${Date.now()}`, hostelId, number, capacity }] }
    : h);
  emit();
};

export const updateRoom = (hostelId: string, roomId: string, patch: Partial<Pick<HostelRoom, 'number' | 'capacity'>>) => {
  hostels = hostels.map(h => h.id === hostelId
    ? { ...h, rooms: h.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r) }
    : h);
  emit();
};

export const deleteRoom = (hostelId: string, roomId: string) => {
  hostels = hostels.map(h => h.id === hostelId
    ? { ...h, rooms: h.rooms.filter(r => r.id !== roomId) }
    : h);
  allocations = allocations.filter(a => a.roomId !== roomId);
  emit();
};

export const allocateBed = (input: {
  studentId: string; studentName?: string; gender: HostelCategory; level: string;
  hostelId: string; roomId: string; bedNumber: number;
  source?: 'auto' | 'manual';
  reason?: string;
}) => {
  const existing = allocations.find(a => a.studentId === input.studentId && a.active);
  const isChange = !!existing;
  if (existing) {
    allocations = allocations.filter(a => a.id !== existing.id);
  }
  const alloc: BoardingAllocation = {
    id: `a${Date.now()}`,
    studentId: input.studentId,
    studentName: input.studentName,
    gender: input.gender,
    level: input.level,
    hostelId: input.hostelId,
    roomId: input.roomId,
    bedNumber: input.bedNumber,
    allocatedAt: new Date().toISOString(),
    active: true,
  };
  allocations = [...allocations, alloc];
  emit();
  logBoardingAudit({
    action: isChange ? 'BED_CHANGE' : (input.source === 'auto' ? 'AUTO_ALLOCATE' : 'MANUAL_ALLOCATE'),
    studentId: input.studentId,
    studentName: input.studentName,
    fromHostelId: existing?.hostelId, fromRoomId: existing?.roomId, fromBed: existing?.bedNumber,
    toHostelId: input.hostelId, toRoomId: input.roomId, toBed: input.bedNumber,
    reason: input.reason,
  });
  return alloc;
};

export const releaseAllocation = (id: string, reason?: string) => {
  const a = allocations.find(x => x.id === id);
  allocations = allocations.map(x => x.id === id ? { ...x, active: false } : x);
  emit();
  if (a) logBoardingAudit({
    action: 'RELEASE', studentId: a.studentId, studentName: a.studentName,
    fromHostelId: a.hostelId, fromRoomId: a.roomId, fromBed: a.bedNumber, reason,
  });
};

export const getHostels = () => hostels;
export const getAllocations = () => allocations;
export const getBoardingAudit = () => audit;
