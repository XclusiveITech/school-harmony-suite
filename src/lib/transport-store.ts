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
