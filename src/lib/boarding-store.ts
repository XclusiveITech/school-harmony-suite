// Boarding facility store
// Manages hostels, rooms, beds and student allocations.
// Auto-allocates a free bed in a hostel matching the student's gender + level.

export type HostelCategory = 'Boys' | 'Girls';

export interface HostelRoom {
  id: string;
  hostelId: string;
  number: string;       // e.g. "R-01"
  capacity: number;     // number of beds
}

export interface Hostel {
  id: string;
  name: string;
  category: HostelCategory;
  levels: string[];           // e.g. ['Form 1','Form 2']
  warden?: string;
  rooms: HostelRoom[];
}

export interface BoardingAllocation {
  id: string;
  studentId: string;       // registration / unique id of student
  studentName?: string;
  gender: HostelCategory;
  level: string;
  hostelId: string;
  roomId: string;
  bedNumber: number;       // 1..room.capacity
  allocatedAt: string;
  active: boolean;
}

// ---------- Seed --------------------------------------------------------

const seedHostels: Hostel[] = [
  {
    id: 'h1', name: 'Mukuvisi Boys Hostel', category: 'Boys',
    levels: ['Form 1', 'Form 2'], warden: 'Mr. Moyo',
    rooms: Array.from({ length: 8 }, (_, i) => ({
      id: `h1-r${i + 1}`, hostelId: 'h1',
      number: `B${String(i + 1).padStart(2, '0')}`, capacity: 4,
    })),
  },
  {
    id: 'h2', name: 'Save Boys Hostel', category: 'Boys',
    levels: ['Form 3', 'Form 4'], warden: 'Mr. Dube',
    rooms: Array.from({ length: 6 }, (_, i) => ({
      id: `h2-r${i + 1}`, hostelId: 'h2',
      number: `S${String(i + 1).padStart(2, '0')}`, capacity: 4,
    })),
  },
  {
    id: 'h3', name: 'Zambezi Girls Hostel', category: 'Girls',
    levels: ['Form 1', 'Form 2', 'Form 3', 'Form 4'], warden: 'Mrs. Ncube',
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
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const useHostels = () => useSyncExternalStore(subscribe, () => hostels, () => hostels);
export const useAllocations = () => useSyncExternalStore(subscribe, () => allocations, () => allocations);

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

// ---------- Mutations ---------------------------------------------------

export const createHostel = (data: Omit<Hostel, 'id' | 'rooms'> & { roomCount: number; roomCapacity: number; prefix?: string }) => {
  const id = `h${Date.now()}`;
  const prefix = data.prefix || data.name.charAt(0).toUpperCase();
  const rooms: HostelRoom[] = Array.from({ length: data.roomCount }, (_, i) => ({
    id: `${id}-r${i + 1}`, hostelId: id,
    number: `${prefix}${String(i + 1).padStart(2, '0')}`, capacity: data.roomCapacity,
  }));
  hostels = [...hostels, { id, name: data.name, category: data.category, levels: data.levels, warden: data.warden, rooms }];
  emit();
};

export const updateHostel = (id: string, patch: Partial<Pick<Hostel, 'name' | 'category' | 'levels' | 'warden'>>) => {
  hostels = hostels.map(h => h.id === id ? { ...h, ...patch } : h);
  emit();
};

export const deleteHostel = (id: string) => {
  hostels = hostels.filter(h => h.id !== id);
  allocations = allocations.filter(a => a.hostelId !== id);
  emit();
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
}) => {
  // remove existing allocation for student
  allocations = allocations.filter(a => !(a.studentId === input.studentId && a.active));
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
  return alloc;
};

export const releaseAllocation = (id: string) => {
  allocations = allocations.map(a => a.id === id ? { ...a, active: false } : a);
  emit();
};

// snapshot helpers (non-hook)
export const getHostels = () => hostels;
export const getAllocations = () => allocations;
