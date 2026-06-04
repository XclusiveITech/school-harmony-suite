// Transport module store
// Links students <-> vehicles (Assets category 'Vehicles') <-> staff (drivers / teachers-in-charge)
// Finance link: subscription payment status gates access.

import { assets } from './dummy-data';

export interface TransportRoute {
  id: string;
  code: string;
  name: string;
  stops: string[];          // pickup points
  distanceKm: number;
  monthlyFee: number;       // per student
  vehicleAssetId: string;   // vehicle (Assets module, category Vehicles)
  driverStaffId: string;    // driver
  attendantStaffId?: string; // teacher in charge / monitor
  active: boolean;
}

export type SubscriptionStatus = 'Paid' | 'Pending' | 'Overdue' | 'Suspended';

export interface TransportSubscription {
  id: string;
  studentId: string;
  routeId: string;
  pickupStop: string;
  startDate: string;
  endDate?: string;
  monthlyFee: number;
  lastPaidMonth?: string;   // YYYY-MM
  paidThroughMonth?: string; // YYYY-MM (access granted up to)
  status: SubscriptionStatus;
}

export interface TransportTrip {
  id: string;
  routeId: string;
  date: string;
  direction: 'Pickup' | 'Dropoff';
  driverStaffId: string;
  attendantStaffId?: string;
  vehicleAssetId: string;
  odometerStart?: number;
  odometerEnd?: number;
  notes?: string;
}

export interface TransportAttendance {
  id: string;
  tripId: string;
  studentId: string;
  boarded: boolean;
  stop: string;
  time: string;
}

// ---- Seed data ---------------------------------------------------------

const vehicleAssets = assets.filter(a => a.category === 'Vehicles');
const primaryVehicleId = vehicleAssets[0]?.id ?? '2';

export const initialRoutes: TransportRoute[] = [
  {
    id: 'RT-001', code: 'RT-N', name: 'Northern Suburbs Route',
    stops: ['Borrowdale Shops', 'Greendale Mall', 'Highlands Park', 'School Gate'],
    distanceKm: 22, monthlyFee: 45, vehicleAssetId: primaryVehicleId,
    driverStaffId: '1', attendantStaffId: '2', active: true,
  },
  {
    id: 'RT-002', code: 'RT-S', name: 'Southern Suburbs Route',
    stops: ['Waterfalls', 'Hatfield', 'Eastlea', 'School Gate'],
    distanceKm: 18, monthlyFee: 40, vehicleAssetId: primaryVehicleId,
    driverStaffId: '1', active: true,
  },
];

export const initialSubscriptions: TransportSubscription[] = [
  { id: 'TS-001', studentId: '1', routeId: 'RT-001', pickupStop: 'Borrowdale Shops',
    startDate: '2026-01-15', monthlyFee: 45, lastPaidMonth: '2026-05',
    paidThroughMonth: '2026-06', status: 'Paid' },
  { id: 'TS-002', studentId: '2', routeId: 'RT-001', pickupStop: 'Greendale Mall',
    startDate: '2026-01-15', monthlyFee: 45, lastPaidMonth: '2026-04',
    paidThroughMonth: '2026-04', status: 'Overdue' },
  { id: 'TS-003', studentId: '3', routeId: 'RT-002', pickupStop: 'Hatfield',
    startDate: '2026-02-01', monthlyFee: 40, status: 'Pending' },
];

export const initialTrips: TransportTrip[] = [
  { id: 'TR-001', routeId: 'RT-001', date: '2026-06-02', direction: 'Pickup',
    driverStaffId: '1', attendantStaffId: '2', vehicleAssetId: primaryVehicleId,
    odometerStart: 45230, odometerEnd: 45252 },
];

// ---- Helpers -----------------------------------------------------------

export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function hasAccess(sub: TransportSubscription, asOf = currentMonth()): boolean {
  if (sub.status === 'Suspended') return false;
  if (!sub.paidThroughMonth) return false;
  return sub.paidThroughMonth >= asOf;
}

export function deriveStatus(sub: TransportSubscription, asOf = currentMonth()): SubscriptionStatus {
  if (sub.status === 'Suspended') return 'Suspended';
  if (!sub.paidThroughMonth) return 'Pending';
  if (sub.paidThroughMonth >= asOf) return 'Paid';
  return 'Overdue';
}

export function monthsOwed(sub: TransportSubscription, asOf = currentMonth()): number {
  if (!sub.paidThroughMonth) {
    const [sy, sm] = sub.startDate.slice(0, 7).split('-').map(Number);
    const [ay, am] = asOf.split('-').map(Number);
    return Math.max(0, (ay - sy) * 12 + (am - sm) + 1);
  }
  if (sub.paidThroughMonth >= asOf) return 0;
  const [py, pm] = sub.paidThroughMonth.split('-').map(Number);
  const [ay, am] = asOf.split('-').map(Number);
  return (ay - py) * 12 + (am - pm);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---- Scheduling --------------------------------------------------------
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface StopTime {
  stop: string;
  time: string; // HH:MM
}

export interface TransportSchedule {
  id: string;
  routeId: string;
  direction: 'Pickup' | 'Dropoff';
  days: Weekday[];          // recurring days
  departTime: string;       // HH:MM
  stopTimes: StopTime[];    // per-stop ETA
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}

export const initialSchedules: TransportSchedule[] = [
  {
    id: 'SCH-001', routeId: 'RT-001', direction: 'Pickup',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], departTime: '06:30',
    stopTimes: [
      { stop: 'Borrowdale Shops', time: '06:30' },
      { stop: 'Greendale Mall', time: '06:45' },
      { stop: 'Highlands Park', time: '07:00' },
      { stop: 'School Gate', time: '07:20' },
    ],
    effectiveFrom: '2026-01-13', active: true,
  },
  {
    id: 'SCH-002', routeId: 'RT-001', direction: 'Dropoff',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], departTime: '16:00',
    stopTimes: [
      { stop: 'School Gate', time: '16:00' },
      { stop: 'Highlands Park', time: '16:20' },
      { stop: 'Greendale Mall', time: '16:35' },
      { stop: 'Borrowdale Shops', time: '16:50' },
    ],
    effectiveFrom: '2026-01-13', active: true,
  },
  {
    id: 'SCH-003', routeId: 'RT-002', direction: 'Pickup',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], departTime: '06:40',
    stopTimes: [
      { stop: 'Waterfalls', time: '06:40' },
      { stop: 'Hatfield', time: '06:55' },
      { stop: 'Eastlea', time: '07:10' },
      { stop: 'School Gate', time: '07:25' },
    ],
    effectiveFrom: '2026-01-13', active: true,
  },
];

// ---- Boarding / Attendance --------------------------------------------
export interface BoardingEvent {
  id: string;
  tripId: string;
  studentId: string;
  stop: string;
  time: string;       // ISO timestamp
  action: 'Board' | 'Drop';
  granted: boolean;   // finance gate result
  reason?: string;
}

export const initialBoardingEvents: BoardingEvent[] = [];

// ---- Term Billing (links to Fees Structure & Billing) -----------------
export interface TransportInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  subscriptionId: string;
  routeId: string;
  termId: string;
  termName: string;
  monthsCovered: number;
  monthlyFee: number;
  amount: number;
  date: string;
  dueDate: string;
  status: 'Posted' | 'Paid' | 'Cancelled';
  glAccountCode: string;
  paidAt?: string;
  postedToFeesStructure: boolean;
}

export const initialTransportInvoices: TransportInvoice[] = [];

// Default revenue GL account for transport (mirrors Fees Structure & Billing)
export const TRANSPORT_GL_CODE = '4300';

export function generateTermInvoice(
  sub: TransportSubscription,
  route: TransportRoute,
  term: { id: string; name: string; startDate: string; endDate: string; billingDate: string },
  seq: number,
): TransportInvoice {
  const start = new Date(term.startDate);
  const end = new Date(term.endDate);
  const months = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
  );
  const amount = months * route.monthlyFee;
  const due = new Date(term.startDate);
  due.setDate(due.getDate() + 14);
  return {
    id: `TI-${Date.now()}-${seq}`,
    invoiceNumber: `TRX-${term.id.toUpperCase()}-${String(seq).padStart(4, '0')}`,
    studentId: sub.studentId,
    subscriptionId: sub.id,
    routeId: route.id,
    termId: term.id,
    termName: term.name,
    monthsCovered: months,
    monthlyFee: route.monthlyFee,
    amount,
    date: term.billingDate,
    dueDate: due.toISOString().slice(0, 10),
    status: 'Posted',
    glAccountCode: TRANSPORT_GL_CODE,
    postedToFeesStructure: true,
  };
}

// Advance paidThroughMonth by invoice.monthsCovered when paid.
export function applyInvoicePayment(
  sub: TransportSubscription,
  invoice: TransportInvoice,
): TransportSubscription {
  const base = sub.paidThroughMonth && sub.paidThroughMonth >= currentMonth()
    ? sub.paidThroughMonth
    : addMonths(currentMonth(), -1);
  const newThrough = addMonths(base, invoice.monthsCovered);
  return {
    ...sub,
    lastPaidMonth: currentMonth(),
    paidThroughMonth: newThrough,
    status: 'Paid',
  };
}

export function dayKey(dateISO: string): Weekday {
  const d = new Date(dateISO);
  return WEEKDAYS[(d.getDay() + 6) % 7];
}
