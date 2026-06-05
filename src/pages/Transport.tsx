import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bus, Plus, Printer, MapPin, Users, AlertTriangle, CheckCircle2, X, DollarSign, Trash2, Edit2, Clock, Calendar, FileText, LogIn, LogOut } from 'lucide-react';
import { students, staff, assets } from '@/lib/dummy-data';
import ReportHeader from '@/components/ReportHeader';
import {
  initialRoutes, initialSubscriptions, initialTrips,
  initialSchedules, initialBoardingEvents, initialTransportInvoices, initialAuditTrail,
  type TransportRoute, type TransportSubscription, type TransportTrip,
  type TransportSchedule, type BoardingEvent, type TransportInvoice, type Weekday,
  type TransportAuditEntry, type AuditAction,
  WEEKDAYS, currentMonth, deriveStatus, monthsOwed, addMonths, hasAccess,
  generateTermInvoice, applyInvoicePayment, dayKey, TRANSPORT_GL_CODE,
} from '@/lib/transport-store';
import { academicTerms } from '@/lib/fees-structure-store';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'dashboard' | 'routes' | 'subscriptions' | 'schedule' | 'trips' | 'attendance' | 'billing' | 'access' | 'audit' | 'report';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'routes', label: 'Routes & Vehicles' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'schedule', label: 'Schedule & Timetable' },
  { id: 'trips', label: 'Trips & Boarding' },
  { id: 'attendance', label: 'Attendance Report' },
  { id: 'billing', label: 'Term Billing' },
  { id: 'access', label: 'Access Control' },
  { id: 'audit', label: 'Audit Trail' },
  { id: 'report', label: 'Printable Report' },
];


const statusColors: Record<string, string> = {
  Paid: 'bg-success/15 text-success',
  Pending: 'bg-warning/15 text-warning',
  Overdue: 'bg-destructive/15 text-destructive',
  Suspended: 'bg-muted text-muted-foreground',
};

export default function Transport() {
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('dashboard');
  useEffect(() => {
    const h = location.hash.replace('#', '') as Tab;
    if (TABS.some(t => t.id === h)) setTab(h);
  }, [location.hash]);

  const [routes, setRoutes] = useState<TransportRoute[]>(initialRoutes);
  const [subs, setSubs] = useState<TransportSubscription[]>(initialSubscriptions);
  const [trips, setTrips] = useState<TransportTrip[]>(initialTrips);
  const [schedules, setSchedules] = useState<TransportSchedule[]>(initialSchedules);
  const [boardings, setBoardings] = useState<BoardingEvent[]>(initialBoardingEvents);
  const [invoices, setInvoices] = useState<TransportInvoice[]>(initialTransportInvoices);
  const [audit, setAudit] = useState<TransportAuditEntry[]>(initialAuditTrail);
  const { user } = useAuth();
  const actorName = user?.name ?? 'System';

  // ----- Audit Logger -----
  const logAudit = (entry: Omit<TransportAuditEntry, 'id' | 'timestamp' | 'actor'> & { actor?: string }) => {
    setAudit(prev => [...prev, {
      id: `AU-${Date.now()}-${prev.length + 1}`,
      timestamp: new Date().toISOString(),
      actor: entry.actor ?? actorName,
      ...entry,
    }]);
  };

  // ----- Attendance Report filters -----
  const [filtRoute, setFiltRoute] = useState<string>('All');
  const [filtTerm, setFiltTerm] = useState<string>('All');
  const [filtFrom, setFiltFrom] = useState<string>('');
  const [filtTo, setFiltTo] = useState<string>('');

  const vehicles = useMemo(() => assets.filter(a => a.category === 'Vehicles'), []);
  const drivers = useMemo(
    () => staff.filter(s => /driver|transport/i.test(s.role) || /transport/i.test(s.department)),
    [],
  );
  const allStaff = staff;

  // Forms
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState<Partial<TransportRoute> & { stopsText?: string }>({});

  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedForm, setSchedForm] = useState<Partial<TransportSchedule>>({});
  const [boardingTripId, setBoardingTripId] = useState<string | null>(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [tripForm, setTripForm] = useState<Partial<TransportTrip> & { scheduleId?: string }>({});



  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState<Partial<TransportSubscription>>({});

  // ---------- KPIs ----------
  const totalSubscribed = subs.length;
  const month = currentMonth();
  const enrichedSubs = subs.map(s => ({ ...s, derived: deriveStatus(s, month), owed: monthsOwed(s, month) }));
  const paidCount = enrichedSubs.filter(s => s.derived === 'Paid').length;
  const overdueCount = enrichedSubs.filter(s => s.derived === 'Overdue').length;
  const pendingCount = enrichedSubs.filter(s => s.derived === 'Pending').length;
  const monthlyRevenuePotential = subs.reduce((sum, s) => sum + s.monthlyFee, 0);
  const collectedThisMonth = enrichedSubs
    .filter(s => s.derived === 'Paid')
    .reduce((sum, s) => sum + s.monthlyFee, 0);
  const outstandingAmount = enrichedSubs
    .reduce((sum, s) => sum + s.owed * s.monthlyFee, 0);

  // ---------- Helpers ----------
  const studentName = (id: string) => {
    const s = students.find(x => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : 'Unknown';
  };
  const studentReg = (id: string) => students.find(x => x.id === id)?.regNumber ?? '-';
  const staffName = (id?: string) => {
    if (!id) return '-';
    const s = staff.find(x => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : '-';
  };
  const vehicleName = (id: string) => assets.find(a => a.id === id)?.name ?? 'Unassigned';
  const routeById = (id: string) => routes.find(r => r.id === id);

  // ---------- Route CRUD ----------
  const openNewRoute = () => {
    setEditingRoute(null);
    setRouteForm({ code: '', name: '', stopsText: '', distanceKm: 0, monthlyFee: 0,
      vehicleAssetId: vehicles[0]?.id ?? '', driverStaffId: '', active: true });
    setShowRouteForm(true);
  };
  const openEditRoute = (r: TransportRoute) => {
    setEditingRoute(r.id);
    setRouteForm({ ...r, stopsText: r.stops.join('\n') });
    setShowRouteForm(true);
  };
  const saveRoute = () => {
    if (!routeForm.code || !routeForm.name || !routeForm.vehicleAssetId || !routeForm.driverStaffId) return;
    const stops = (routeForm.stopsText ?? '').split('\n').map(s => s.trim()).filter(Boolean);
    if (editingRoute) {
      setRoutes(prev => prev.map(r => r.id === editingRoute
        ? { ...r, ...routeForm, stops } as TransportRoute : r));
    } else {
      const id = `RT-${String(routes.length + 1).padStart(3, '0')}`;
      setRoutes(prev => [...prev, { id, ...routeForm, stops, active: true } as TransportRoute]);
    }
    setShowRouteForm(false);
  };
  const deleteRoute = (id: string) => {
    if (subs.some(s => s.routeId === id)) {
      alert('Cannot delete: route has active student subscriptions.');
      return;
    }
    setRoutes(prev => prev.filter(r => r.id !== id));
  };

  // ---------- Subscription CRUD ----------
  const openNewSub = () => {
    setSubForm({ studentId: '', routeId: routes[0]?.id ?? '', pickupStop: '',
      startDate: new Date().toISOString().slice(0, 10),
      monthlyFee: routes[0]?.monthlyFee ?? 0, status: 'Pending' });
    setShowSubForm(true);
  };
  const saveSub = () => {
    if (!subForm.studentId || !subForm.routeId || !subForm.pickupStop) return;
    if (subs.some(s => s.studentId === subForm.studentId && s.routeId === subForm.routeId)) {
      alert('Student is already subscribed to this route.');
      return;
    }
    const r = routes.find(x => x.id === subForm.routeId);
    const id = `TS-${String(subs.length + 1).padStart(3, '0')}`;
    setSubs(prev => [...prev, {
      id, ...subForm, monthlyFee: r?.monthlyFee ?? subForm.monthlyFee ?? 0,
    } as TransportSubscription]);
    logAudit({ source: 'User', action: 'SubscribeStudent', entity: 'Subscription', entityId: id,
      studentId: subForm.studentId, details: `Subscribed to route ${r?.code} at ${subForm.pickupStop}` });
    setShowSubForm(false);
  };
  const removeSub = (id: string) => {
    setSubs(prev => prev.filter(s => s.id !== id));
    logAudit({ source: 'User', action: 'Edit', entity: 'Subscription', entityId: id, details: 'Subscription removed' });
  };

  const recordPayment = (id: string) => {
    setSubs(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next = s.paidThroughMonth ? addMonths(s.paidThroughMonth, 1) : currentMonth();
      logAudit({ source: 'Finance', action: 'FinanceUnlock', entity: 'Subscription', entityId: id,
        studentId: s.studentId, details: `Manual +1 month payment. Access extended to ${next}.` });
      return { ...s, lastPaidMonth: currentMonth(), paidThroughMonth: next, status: 'Paid' };
    }));
  };
  const toggleSuspend = (id: string) => {
    setSubs(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next: TransportSubscription = { ...s, status: s.status === 'Suspended' ? 'Pending' : 'Suspended' };
      logAudit({ source: 'User', action: next.status === 'Suspended' ? 'Suspend' : 'Activate',
        entity: 'Subscription', entityId: id, studentId: s.studentId,
        details: `Subscription ${next.status === 'Suspended' ? 'suspended' : 'reactivated'}` });
      return next;
    }));
  };

  // ---------- Schedule CRUD ----------
  const openNewSchedule = (routeId?: string) => {
    const r = routes.find(x => x.id === (routeId ?? routes[0]?.id));
    setSchedForm({
      routeId: r?.id ?? '', direction: 'Pickup', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      departTime: '06:30',
      stopTimes: (r?.stops ?? []).map(s => ({ stop: s, time: '06:30' })),
      effectiveFrom: new Date().toISOString().slice(0, 10), active: true,
    });
    setShowSchedForm(true);
  };
  const saveSchedule = () => {
    if (!schedForm.routeId || !schedForm.departTime || !(schedForm.days ?? []).length) return;
    const id = `SCH-${String(schedules.length + 1).padStart(3, '0')}`;
    setSchedules(prev => [...prev, { id, ...schedForm } as TransportSchedule]);
    setShowSchedForm(false);
  };
  const deleteSchedule = (id: string) => setSchedules(prev => prev.filter(s => s.id !== id));

  // ---------- Trip from Schedule ----------
  const openNewTrip = () => {
    const sch = schedules[0];
    const r = routes.find(x => x.id === sch?.routeId);
    setTripForm({
      scheduleId: sch?.id,
      routeId: r?.id ?? routes[0]?.id ?? '',
      direction: sch?.direction ?? 'Pickup',
      date: new Date().toISOString().slice(0, 10),
      driverStaffId: r?.driverStaffId ?? '',
      attendantStaffId: r?.attendantStaffId,
      vehicleAssetId: r?.vehicleAssetId ?? '',
    });
    setShowTripForm(true);
  };
  const saveTrip = () => {
    if (!tripForm.routeId || !tripForm.date) return;
    const id = `TR-${String(trips.length + 1).padStart(3, '0')}`;
    const newTrip = { id, ...tripForm } as TransportTrip;
    setTrips(prev => [...prev, newTrip]);
    setShowTripForm(false);
    setBoardingTripId(id); // open boarding sheet immediately
  };

  // ---------- Boarding / Attendance ----------
  const tripBoardings = (tripId: string) => boardings.filter(b => b.tripId === tripId);
  const recordBoarding = (trip: TransportTrip, sub: TransportSubscription, action: 'Board' | 'Drop') => {
    const granted = action === 'Drop' ? true : hasAccess(sub, currentMonth());
    const reason = !granted ? `Access denied — payment not current (paid through ${sub.paidThroughMonth ?? 'n/a'})` : undefined;
    const ev: BoardingEvent = {
      id: `BE-${Date.now()}-${sub.studentId}-${action}`,
      tripId: trip.id, studentId: sub.studentId, stop: sub.pickupStop,
      time: new Date().toISOString(), action, granted, reason,
    };
    setBoardings(prev => [...prev.filter(b => !(b.tripId === trip.id && b.studentId === sub.studentId && b.action === action)), ev]);
    logAudit({
      source: 'System', action: action === 'Board' ? 'Boarding' : 'Dropoff',
      entity: 'Boarding', entityId: ev.id, tripId: trip.id, studentId: sub.studentId,
      details: `${action} @ ${sub.pickupStop} — ${granted ? 'Granted' : 'Denied'}${reason ? ` (${reason})` : ''}`,
    });
  };

  // ---------- Term Billing ----------
  const runTermBilling = (termId: string) => {
    const term = academicTerms.find(t => t.id === termId);
    if (!term) return;
    const newInvoices: TransportInvoice[] = [];
    subs.forEach((sub, i) => {
      const route = routes.find(r => r.id === sub.routeId);
      if (!route) return;
      const exists = invoices.some(inv => inv.subscriptionId === sub.id && inv.termId === term.id);
      if (exists) return;
      newInvoices.push(generateTermInvoice(sub, route, term, invoices.length + i + 1));
    });
    if (newInvoices.length === 0) {
      alert('No new invoices generated (all subscriptions already billed for this term).');
      return;
    }
    setInvoices(prev => [...prev, ...newInvoices]);
    newInvoices.forEach(inv => logAudit({
      source: 'Finance', action: 'InvoicePosted', entity: 'Invoice', entityId: inv.id,
      studentId: inv.studentId, details: `Posted ${inv.invoiceNumber} ($${inv.amount.toFixed(2)}) for ${inv.termName} → GL ${inv.glAccountCode}`,
    }));
    alert(`${newInvoices.length} invoice(s) posted to Fees Structure & Billing (GL ${TRANSPORT_GL_CODE}).`);
  };
  const markInvoicePaid = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === 'Paid') return;
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'Paid', paidAt: new Date().toISOString() } : i));
    setSubs(prev => prev.map(s => s.id === inv.subscriptionId ? applyInvoicePayment(s, inv) : s));
    logAudit({ source: 'Finance', action: 'InvoicePaid', entity: 'Invoice', entityId: inv.id,
      studentId: inv.studentId, details: `${inv.invoiceNumber} marked paid; access extended ${inv.monthsCovered} month(s).` });
    logAudit({ source: 'Finance', action: 'FinanceUnlock', entity: 'Subscription', entityId: inv.subscriptionId,
      studentId: inv.studentId, details: `Auto-unlocked transport access via invoice ${inv.invoiceNumber}.` });
  };



  // -------------------------------- UI -------------------------------
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bus className="text-primary" /> Transport Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage student ferrying — linked to Students, Assets (vehicles), Staff (drivers) & Finance.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI icon={<Users className="text-primary" />} label="Subscribed Students" value={totalSubscribed} />
            <KPI icon={<CheckCircle2 className="text-success" />} label="Paid (Active Access)" value={paidCount} />
            <KPI icon={<AlertTriangle className="text-destructive" />} label="Overdue" value={overdueCount} />
            <KPI icon={<DollarSign className="text-info" />} label="Collected / Month" value={`$${collectedThisMonth.toFixed(2)}`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Routes" value={routes.length} subtitle={`${routes.filter(r => r.active).length} active`} />
            <Card title="Fleet (Vehicles)" value={vehicles.length}
              subtitle={<Link to="/assets#register" className="text-primary text-xs underline">Manage in Assets</Link>} />
            <Card title="Outstanding (cum.)" value={`$${outstandingAmount.toFixed(2)}`} subtitle="All months owed" />
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-semibold mb-3">Routes Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2">Route</th><th>Vehicle</th><th>Driver</th>
                    <th>Stops</th><th>Subscribed</th><th>Monthly Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(r => {
                    const count = subs.filter(s => s.routeId === r.id).length;
                    return (
                      <tr key={r.id} className="border-b border-border/50">
                        <td className="py-2 font-medium">{r.code} — {r.name}</td>
                        <td>{vehicleName(r.vehicleAssetId)}</td>
                        <td>{staffName(r.driverStaffId)}</td>
                        <td>{r.stops.length}</td>
                        <td>{count}</td>
                        <td>${r.monthlyFee.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROUTES */}
      {tab === 'routes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Each route is linked to a vehicle (Assets) and a driver (Staff).</p>
            <button onClick={openNewRoute} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus size={16} /> New Route
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {routes.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-semibold">{r.code} — {r.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} /> {r.distanceKm} km · {r.stops.length} stops
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditRoute(r)} className="p-1.5 rounded hover:bg-muted"><Edit2 size={14} /></button>
                    <button onClick={() => deleteRoute(r.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Vehicle" value={vehicleName(r.vehicleAssetId)} />
                  <Info label="Driver" value={staffName(r.driverStaffId)} />
                  <Info label="Attendant" value={staffName(r.attendantStaffId)} />
                  <Info label="Monthly Fee" value={`$${r.monthlyFee.toFixed(2)}`} />
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Stops: </span>
                  {r.stops.join(' → ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Assign students to routes. Payment status determines access.</p>
            <button onClick={openNewSub} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus size={16} /> Subscribe Student
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Reg #</th><th>Student</th><th>Route</th>
                  <th>Pickup</th><th>Fee</th><th>Paid Through</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrichedSubs.map(s => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">{studentReg(s.studentId)}</td>
                    <td>{studentName(s.studentId)}</td>
                    <td>{routeById(s.routeId)?.code}</td>
                    <td>{s.pickupStop}</td>
                    <td>${s.monthlyFee.toFixed(2)}</td>
                    <td>{s.paidThroughMonth ?? '—'}</td>
                    <td><span className={`px-2 py-1 rounded text-xs ${statusColors[s.derived]}`}>{s.derived}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => recordPayment(s.id)} title="Record monthly payment"
                          className="px-2 py-1 text-xs rounded bg-success/15 text-success">+1 Mo Paid</button>
                        <button onClick={() => toggleSuspend(s.id)} className="px-2 py-1 text-xs rounded bg-muted">
                          {s.status === 'Suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button onClick={() => removeSub(s.id)} className="p-1 text-destructive hover:bg-muted rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {enrichedSubs.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No subscriptions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE & TIMETABLE */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center print:hidden">
            <p className="text-sm text-muted-foreground">Recurring timetables per route with per-stop ETAs.</p>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium">
                <Printer size={16} /> Print Timetable
              </button>
              <button onClick={() => openNewSchedule()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Plus size={16} /> New Schedule
              </button>
            </div>
          </div>
          <div className="hidden print:block">
            <ReportHeader reportTitle="Transport Schedule & Timetable" subtitle={`As at ${new Date().toLocaleDateString()}`} />
          </div>
          {routes.map(r => {
            const rs = schedules.filter(s => s.routeId === r.id);
            return (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{r.code} — {r.name}</h4>
                  <button onClick={() => openNewSchedule(r.id)} className="text-xs text-primary inline-flex items-center gap-1">
                    <Plus size={12} /> Add timetable
                  </button>
                </div>
                {rs.length === 0 && <p className="text-xs text-muted-foreground">No schedules.</p>}
                <div className="grid md:grid-cols-2 gap-3">
                  {rs.map(s => (
                    <div key={s.id} className="border border-border rounded-lg p-3 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">
                            <Clock size={12} /> {s.direction} · {s.departTime}
                          </p>
                          <p className="text-muted-foreground">{s.days.join(', ')}</p>
                        </div>
                        <button onClick={() => deleteSchedule(s.id)} className="text-destructive p-1 hover:bg-muted rounded"><Trash2 size={12} /></button>
                      </div>
                      <table className="w-full">
                        <tbody>
                          {s.stopTimes.map((st, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1">{st.stop}</td>
                              <td className="py-1 text-right font-mono">{st.time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TRIPS & BOARDING */}
      {tab === 'trips' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Each trip auto-generates student attendance via boarding / dropoff events.</p>
            <button onClick={openNewTrip} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus size={16} /> New Trip
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Date</th><th>Route</th><th>Direction</th>
                  <th>Vehicle</th><th>Driver</th><th>Attendant</th>
                  <th>Attendance</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => {
                  const bevs = tripBoardings(t.id);
                  const boarded = bevs.filter(b => b.action === 'Board' && b.granted).length;
                  const dropped = bevs.filter(b => b.action === 'Drop').length;
                  const denied = bevs.filter(b => !b.granted).length;
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="p-3">{t.date}</td>
                      <td>{routeById(t.routeId)?.code}</td>
                      <td>{t.direction}</td>
                      <td>{vehicleName(t.vehicleAssetId)}</td>
                      <td>{staffName(t.driverStaffId)}</td>
                      <td>{staffName(t.attendantStaffId)}</td>
                      <td className="text-xs">
                        <span className="text-success">{boarded} on</span>
                        {' · '}<span className="text-info">{dropped} off</span>
                        {denied > 0 && <> · <span className="text-destructive">{denied} denied</span></>}
                      </td>
                      <td>
                        <button onClick={() => setBoardingTripId(t.id)}
                          className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground inline-flex items-center gap-1">
                          <Users size={12} /> Boarding Sheet
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {trips.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No trips logged.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attendance roll-up */}
          {boardings.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><FileText size={14} /> Recent Attendance Events</h3>
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="p-2">Time</th><th>Student</th><th>Trip</th><th>Stop</th><th>Action</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {[...boardings].slice(-15).reverse().map(b => (
                    <tr key={b.id} className="border-t border-border/50">
                      <td className="p-2 font-mono">{new Date(b.time).toLocaleTimeString()}</td>
                      <td>{studentName(b.studentId)}</td>
                      <td>{b.tripId}</td>
                      <td>{b.stop}</td>
                      <td>{b.action}</td>
                      <td className={b.granted ? 'text-success' : 'text-destructive'}>
                        {b.granted ? 'Granted' : 'Denied'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE REPORT (printable, filterable) */}
      {tab === 'attendance' && (() => {
        const term = academicTerms.find(t => t.id === filtTerm);
        const tFrom = filtFrom || (term?.startDate ?? '');
        const tTo = filtTo || (term?.endDate ?? '');
        const filteredTrips = trips.filter(t => {
          if (filtRoute !== 'All' && t.routeId !== filtRoute) return false;
          if (tFrom && t.date < tFrom) return false;
          if (tTo && t.date > tTo) return false;
          return true;
        });
        const totalBoarded = filteredTrips.reduce((sum, t) =>
          sum + boardings.filter(b => b.tripId === t.id && b.action === 'Board' && b.granted).length, 0);
        const totalDropped = filteredTrips.reduce((sum, t) =>
          sum + boardings.filter(b => b.tripId === t.id && b.action === 'Drop').length, 0);
        const totalDenied = filteredTrips.reduce((sum, t) =>
          sum + boardings.filter(b => b.tripId === t.id && !b.granted).length, 0);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end print:hidden">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Route</label>
                <select value={filtRoute} onChange={e => setFiltRoute(e.target.value)} className="input">
                  <option value="All">All Routes</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Term</label>
                <select value={filtTerm} onChange={e => setFiltTerm(e.target.value)} className="input">
                  <option value="All">All Terms</option>
                  {academicTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date From</label>
                <input type="date" value={filtFrom} onChange={e => setFiltFrom(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date To</label>
                <input type="date" value={filtTo} onChange={e => setFiltTo(e.target.value)} className="input" />
              </div>
              <button onClick={() => { setFiltRoute('All'); setFiltTerm('All'); setFiltFrom(''); setFiltTo(''); }}
                className="px-3 py-2 rounded-lg border border-border text-sm">Reset</button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Printer size={16} /> Print Report
              </button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 print:border-0">
              <ReportHeader
                reportTitle="Boarding & Drop-off Attendance Report"
                subtitle={`${filtRoute === 'All' ? 'All Routes' : routeById(filtRoute)?.name} · ${term ? term.name : 'All Terms'} · ${tFrom || 'any'} → ${tTo || 'any'}`} />
              <div className="grid grid-cols-4 gap-2 text-center mb-4 text-xs">
                <div className="border border-border rounded p-2"><p className="text-muted-foreground">Trips</p><p className="font-bold text-lg">{filteredTrips.length}</p></div>
                <div className="border border-border rounded p-2"><p className="text-muted-foreground">Boarded</p><p className="font-bold text-lg text-success">{totalBoarded}</p></div>
                <div className="border border-border rounded p-2"><p className="text-muted-foreground">Dropped</p><p className="font-bold text-lg text-info">{totalDropped}</p></div>
                <div className="border border-border rounded p-2"><p className="text-muted-foreground">Denied</p><p className="font-bold text-lg text-destructive">{totalDenied}</p></div>
              </div>

              {filteredTrips.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">No trips match the selected filters.</p>
              )}

              {filteredTrips.map(t => {
                const route = routeById(t.routeId);
                const routeSubs = subs.filter(s => s.routeId === t.routeId);
                const evs = boardings.filter(b => b.tripId === t.id);
                return (
                  <div key={t.id} className="mb-6 break-inside-avoid">
                    <div className="border-b border-border pb-1 mb-2">
                      <p className="font-semibold text-sm">
                        {t.date} · {route?.code} — {route?.name} · {t.direction}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vehicle: {vehicleName(t.vehicleAssetId)} · Driver: {staffName(t.driverStaffId)} · Attendant: {staffName(t.attendantStaffId)}
                      </p>
                    </div>
                    <table className="w-full text-xs border border-border">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="p-2">Reg #</th><th>Student</th><th>Stop</th>
                          <th>Board Time</th><th>Drop Time</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routeSubs.map(s => {
                          const be = evs.find(e => e.studentId === s.studentId && e.action === 'Board');
                          const de = evs.find(e => e.studentId === s.studentId && e.action === 'Drop');
                          const status = be?.granted ? 'Boarded' : be && !be.granted ? 'Denied' : 'Absent';
                          return (
                            <tr key={s.id} className="border-t border-border">
                              <td className="p-2">{studentReg(s.studentId)}</td>
                              <td>{studentName(s.studentId)}</td>
                              <td>{s.pickupStop}</td>
                              <td className="font-mono">{be ? new Date(be.time).toLocaleTimeString() : '—'}</td>
                              <td className="font-mono">{de ? new Date(de.time).toLocaleTimeString() : '—'}</td>
                              <td className={
                                status === 'Boarded' ? 'text-success' :
                                status === 'Denied' ? 'text-destructive' : 'text-muted-foreground'
                              }>{status}</td>
                            </tr>
                          );
                        })}
                        {routeSubs.length === 0 && (
                          <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No subscribers on this route.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* AUDIT TRAIL */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center print:hidden">
            <p className="text-sm text-muted-foreground">
              Records every attendance creation, finance unlock, edit and invoice action with timestamp and actor.
            </p>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium">
              <Printer size={16} /> Print
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 print:border-0">
            <div className="hidden print:block">
              <ReportHeader reportTitle="Transport Audit Trail" subtitle={`As at ${new Date().toLocaleString()}`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground bg-muted/50">
                  <tr>
                    <th className="p-2">Timestamp</th><th>Actor</th><th>Source</th>
                    <th>Action</th><th>Entity</th><th>Student</th><th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {[...audit].reverse().map(a => (
                    <tr key={a.id} className="border-t border-border/50">
                      <td className="p-2 font-mono whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                      <td>{a.actor}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          a.source === 'Finance' ? 'bg-info/15 text-info' :
                          a.source === 'System' ? 'bg-muted text-muted-foreground' :
                          'bg-primary/15 text-primary'
                        }`}>{a.source}</span>
                      </td>
                      <td className="font-medium">{a.action}</td>
                      <td>{a.entity} <span className="text-muted-foreground">({a.entityId.slice(0, 12)})</span></td>
                      <td>{a.studentId ? studentName(a.studentId) : '—'}</td>
                      <td className="text-muted-foreground">{a.details}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No audit entries yet. Record boarding/drop-off or finance actions to populate this trail.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* TERM BILLING (links Fees Structure & Billing) */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-info/5 border border-info/30 rounded-lg p-4 text-sm">
            <p className="font-medium text-info flex items-center gap-2"><DollarSign size={14} /> Linked to Fees Structure & Billing</p>
            <p className="text-muted-foreground">
              Generate per-term transport invoices for every active subscription. Invoices are posted to GL{' '}
              <strong>{TRANSPORT_GL_CODE}</strong> and appear in{' '}
              <Link to="/finance/fees-structure" className="text-primary underline">Fees Structure & Billing</Link>{' '}
              and on{' '}
              <Link to="/finance/debtors" className="text-primary underline">Debtors (AR)</Link>.
              Marking an invoice paid advances the subscription's access window automatically.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><Calendar size={14} /> Run Term Billing</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {academicTerms.map(term => {
                const count = invoices.filter(i => i.termId === term.id).length;
                return (
                  <div key={term.id} className="border border-border rounded-lg p-3 space-y-2">
                    <p className="font-medium">{term.name}</p>
                    <p className="text-xs text-muted-foreground">{term.startDate} → {term.endDate}</p>
                    <p className="text-xs">Invoices: <strong>{count}</strong></p>
                    <button onClick={() => runTermBilling(term.id)}
                      className="w-full px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground">
                      Generate Invoices
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Invoice #</th><th>Student</th><th>Route</th>
                  <th>Term</th><th>Months</th><th>Amount</th>
                  <th>Due</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td>{studentName(inv.studentId)}</td>
                    <td>{routeById(inv.routeId)?.code}</td>
                    <td>{inv.termName}</td>
                    <td>{inv.monthsCovered}</td>
                    <td>${inv.amount.toFixed(2)}</td>
                    <td>{inv.dueDate}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        inv.status === 'Paid' ? 'bg-success/15 text-success' :
                        inv.status === 'Cancelled' ? 'bg-muted text-muted-foreground' :
                        'bg-warning/15 text-warning'
                      }`}>{inv.status}</span>
                    </td>
                    <td>
                      {inv.status === 'Posted' && (
                        <button onClick={() => markInvoicePaid(inv.id)}
                          className="px-2 py-1 text-xs rounded bg-success/15 text-success">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No invoices yet. Run a term billing above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* ACCESS / FINANCE LINK */}
      {tab === 'access' && (
        <div className="space-y-4">
          <div className="bg-info/5 border border-info/30 rounded-lg p-4 text-sm">
            <p className="font-medium text-info">Finance Link</p>
            <p className="text-muted-foreground">
              Only students with <strong>Paid</strong> status (subscription fee settled for the current month)
              are permitted to board. Update payments in the Subscriptions tab — these post against the student's
              transport fee balance and reflect on{' '}
              <Link to="/finance/debtors" className="text-primary underline">Debtors (AR)</Link>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AccessList title="Permitted to Board (Paid)" tone="success"
              rows={enrichedSubs.filter(s => hasAccess(s, month))}
              studentName={studentName} routeCode={(id) => routeById(id)?.code ?? ''} />
            <AccessList title="Denied (Overdue / Suspended)" tone="destructive"
              rows={enrichedSubs.filter(s => !hasAccess(s, month))}
              studentName={studentName} routeCode={(id) => routeById(id)?.code ?? ''}
              showOwed />
          </div>
        </div>
      )}

      {/* REPORT */}
      {tab === 'report' && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Printer size={16} /> Print
            </button>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 print:border-0 print:shadow-none">
            <ReportHeader reportTitle="Transport Module — Master Report"
              subtitle={`As at ${new Date().toLocaleDateString()}`} />
            <h3 className="font-semibold mt-4 mb-2">Routes & Fleet</h3>
            <table className="w-full text-sm border border-border mb-4">
              <thead className="bg-muted/50"><tr>
                <th className="p-2 text-left">Code</th><th className="text-left">Route</th>
                <th className="text-left">Vehicle</th><th className="text-left">Driver</th>
                <th className="text-right">Fee</th><th className="text-right">Riders</th>
              </tr></thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{r.code}</td><td>{r.name}</td>
                    <td>{vehicleName(r.vehicleAssetId)}</td><td>{staffName(r.driverStaffId)}</td>
                    <td className="text-right">${r.monthlyFee.toFixed(2)}</td>
                    <td className="text-right">{subs.filter(s => s.routeId === r.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-semibold mt-4 mb-2">Student Subscriptions</h3>
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/50"><tr>
                <th className="p-2 text-left">Reg</th><th className="text-left">Student</th>
                <th className="text-left">Route</th><th className="text-left">Status</th>
                <th className="text-right">Paid Through</th><th className="text-right">Owed</th>
              </tr></thead>
              <tbody>
                {enrichedSubs.map(s => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2">{studentReg(s.studentId)}</td>
                    <td>{studentName(s.studentId)}</td>
                    <td>{routeById(s.routeId)?.code}</td>
                    <td>{s.derived}</td>
                    <td className="text-right">{s.paidThroughMonth ?? '—'}</td>
                    <td className="text-right">${(s.owed * s.monthlyFee).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border font-semibold">
                <tr>
                  <td colSpan={5} className="p-2 text-right">Total Outstanding</td>
                  <td className="p-2 text-right">${outstandingAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Route Modal */}
      {showRouteForm && (
        <Modal title={editingRoute ? 'Edit Route' : 'New Route'} onClose={() => setShowRouteForm(false)}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Code"><input className="input" value={routeForm.code ?? ''}
              onChange={e => setRouteForm({ ...routeForm, code: e.target.value })} /></Field>
            <Field label="Name"><input className="input" value={routeForm.name ?? ''}
              onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} /></Field>
            <Field label="Vehicle (Asset)">
              <select className="input" value={routeForm.vehicleAssetId ?? ''}
                onChange={e => setRouteForm({ ...routeForm, vehicleAssetId: e.target.value })}>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Driver (Staff)">
              <select className="input" value={routeForm.driverStaffId ?? ''}
                onChange={e => setRouteForm({ ...routeForm, driverStaffId: e.target.value })}>
                <option value="">Select driver…</option>
                {(drivers.length ? drivers : allStaff).map(s =>
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.role}</option>)}
              </select>
            </Field>
            <Field label="Attendant / Teacher in Charge">
              <select className="input" value={routeForm.attendantStaffId ?? ''}
                onChange={e => setRouteForm({ ...routeForm, attendantStaffId: e.target.value || undefined })}>
                <option value="">(optional)</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </Field>
            <Field label="Distance (km)"><input type="number" className="input"
              value={routeForm.distanceKm ?? 0}
              onChange={e => setRouteForm({ ...routeForm, distanceKm: +e.target.value })} /></Field>
            <Field label="Monthly Fee (USD)"><input type="number" className="input"
              value={routeForm.monthlyFee ?? 0}
              onChange={e => setRouteForm({ ...routeForm, monthlyFee: +e.target.value })} /></Field>
            <Field label="Stops (one per line)" full>
              <textarea className="input min-h-[100px]" value={routeForm.stopsText ?? ''}
                onChange={e => setRouteForm({ ...routeForm, stopsText: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowRouteForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
            <button onClick={saveRoute} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Route</button>
          </div>
        </Modal>
      )}

      {/* Sub Modal */}
      {showSubForm && (
        <Modal title="Subscribe Student to Route" onClose={() => setShowSubForm(false)}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Student" full>
              <select className="input" value={subForm.studentId ?? ''}
                onChange={e => setSubForm({ ...subForm, studentId: e.target.value })}>
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.regNumber} — {s.firstName} {s.lastName} ({s.className})</option>)}
              </select>
            </Field>
            <Field label="Route">
              <select className="input" value={subForm.routeId ?? ''}
                onChange={e => {
                  const r = routes.find(x => x.id === e.target.value);
                  setSubForm({ ...subForm, routeId: e.target.value, monthlyFee: r?.monthlyFee ?? 0, pickupStop: '' });
                }}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
              </select>
            </Field>
            <Field label="Pickup Stop">
              <select className="input" value={subForm.pickupStop ?? ''}
                onChange={e => setSubForm({ ...subForm, pickupStop: e.target.value })}>
                <option value="">Select stop…</option>
                {routes.find(r => r.id === subForm.routeId)?.stops.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" className="input" value={subForm.startDate ?? ''}
                onChange={e => setSubForm({ ...subForm, startDate: e.target.value })} />
            </Field>
            <Field label="Monthly Fee">
              <input type="number" className="input" value={subForm.monthlyFee ?? 0}
                onChange={e => setSubForm({ ...subForm, monthlyFee: +e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowSubForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
            <button onClick={saveSub} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Subscribe</button>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {showSchedForm && (
        <Modal title="New Schedule" onClose={() => setShowSchedForm(false)}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Route">
              <select className="input" value={schedForm.routeId ?? ''}
                onChange={e => {
                  const r = routes.find(x => x.id === e.target.value);
                  setSchedForm({ ...schedForm, routeId: e.target.value,
                    stopTimes: (r?.stops ?? []).map(s => ({ stop: s, time: schedForm.departTime ?? '06:30' })) });
                }}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select className="input" value={schedForm.direction ?? 'Pickup'}
                onChange={e => setSchedForm({ ...schedForm, direction: e.target.value as 'Pickup' | 'Dropoff' })}>
                <option>Pickup</option><option>Dropoff</option>
              </select>
            </Field>
            <Field label="Depart Time">
              <input type="time" className="input" value={schedForm.departTime ?? '06:30'}
                onChange={e => setSchedForm({ ...schedForm, departTime: e.target.value })} />
            </Field>
            <Field label="Effective From">
              <input type="date" className="input" value={schedForm.effectiveFrom ?? ''}
                onChange={e => setSchedForm({ ...schedForm, effectiveFrom: e.target.value })} />
            </Field>
            <Field label="Days" full>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map(d => {
                  const active = (schedForm.days ?? []).includes(d);
                  return (
                    <button key={d} type="button"
                      onClick={() => {
                        const cur = schedForm.days ?? [];
                        setSchedForm({ ...schedForm, days: active ? cur.filter(x => x !== d) : [...cur, d] as Weekday[] });
                      }}
                      className={`px-3 py-1 text-xs rounded ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Stop Times" full>
              <div className="space-y-1">
                {(schedForm.stopTimes ?? []).map((st, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input className="input flex-1" value={st.stop} readOnly />
                    <input type="time" className="input w-32" value={st.time}
                      onChange={e => {
                        const next = [...(schedForm.stopTimes ?? [])];
                        next[idx] = { ...next[idx], time: e.target.value };
                        setSchedForm({ ...schedForm, stopTimes: next });
                      }} />
                  </div>
                ))}
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowSchedForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
            <button onClick={saveSchedule} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Schedule</button>
          </div>
        </Modal>
      )}

      {/* Trip Modal */}
      {showTripForm && (
        <Modal title="New Trip" onClose={() => setShowTripForm(false)}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="From Schedule (optional)" full>
              <select className="input" value={tripForm.scheduleId ?? ''}
                onChange={e => {
                  const sch = schedules.find(s => s.id === e.target.value);
                  const r = routes.find(x => x.id === sch?.routeId);
                  setTripForm({
                    ...tripForm, scheduleId: e.target.value,
                    routeId: sch?.routeId ?? tripForm.routeId,
                    direction: sch?.direction ?? tripForm.direction,
                    driverStaffId: r?.driverStaffId ?? tripForm.driverStaffId,
                    attendantStaffId: r?.attendantStaffId,
                    vehicleAssetId: r?.vehicleAssetId ?? tripForm.vehicleAssetId,
                  });
                }}>
                <option value="">— ad hoc —</option>
                {schedules.map(s => {
                  const r = routes.find(x => x.id === s.routeId);
                  return <option key={s.id} value={s.id}>{r?.code} · {s.direction} · {s.departTime} ({s.days.join('/')})</option>;
                })}
              </select>
            </Field>
            <Field label="Route">
              <select className="input" value={tripForm.routeId ?? ''}
                onChange={e => {
                  const r = routes.find(x => x.id === e.target.value);
                  setTripForm({ ...tripForm, routeId: e.target.value,
                    driverStaffId: r?.driverStaffId ?? '', vehicleAssetId: r?.vehicleAssetId ?? '' });
                }}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select className="input" value={tripForm.direction ?? 'Pickup'}
                onChange={e => setTripForm({ ...tripForm, direction: e.target.value as 'Pickup' | 'Dropoff' })}>
                <option>Pickup</option><option>Dropoff</option>
              </select>
            </Field>
            <Field label="Date">
              <input type="date" className="input" value={tripForm.date ?? ''}
                onChange={e => setTripForm({ ...tripForm, date: e.target.value })} />
            </Field>
            <Field label="Vehicle">
              <select className="input" value={tripForm.vehicleAssetId ?? ''}
                onChange={e => setTripForm({ ...tripForm, vehicleAssetId: e.target.value })}>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Driver">
              <select className="input" value={tripForm.driverStaffId ?? ''}
                onChange={e => setTripForm({ ...tripForm, driverStaffId: e.target.value })}>
                {(drivers.length ? drivers : allStaff).map(s =>
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </Field>
            <Field label="Attendant">
              <select className="input" value={tripForm.attendantStaffId ?? ''}
                onChange={e => setTripForm({ ...tripForm, attendantStaffId: e.target.value || undefined })}>
                <option value="">(optional)</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </Field>
            <Field label="Odometer Start">
              <input type="number" className="input" value={tripForm.odometerStart ?? ''}
                onChange={e => setTripForm({ ...tripForm, odometerStart: +e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowTripForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
            <button onClick={saveTrip} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Start Trip & Open Boarding</button>
          </div>
        </Modal>
      )}

      {/* Boarding Sheet */}
      {boardingTripId && (() => {
        const trip = trips.find(t => t.id === boardingTripId);
        if (!trip) return null;
        const route = routes.find(r => r.id === trip.routeId);
        const routeSubs = subs.filter(s => s.routeId === trip.routeId);
        return (
          <Modal title={`Boarding Sheet — ${route?.code} · ${trip.direction} · ${trip.date}`} onClose={() => setBoardingTripId(null)}>
            <p className="text-xs text-muted-foreground mb-3">
              Tap Board / Drop. Boarding is auto-denied for students whose transport fee is not current.
              Each tap is recorded as an attendance event.
            </p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {routeSubs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No students subscribed to this route.</p>
              )}
              {routeSubs.map(s => {
                const access = hasAccess(s, currentMonth());
                const events = boardings.filter(b => b.tripId === trip.id && b.studentId === s.studentId);
                const onBoard = events.some(b => b.action === 'Board' && b.granted);
                const offBoard = events.some(b => b.action === 'Drop');
                return (
                  <div key={s.id} className="flex items-center justify-between border border-border rounded p-2 text-sm">
                    <div>
                      <p className="font-medium">{studentName(s.studentId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {studentReg(s.studentId)} · {s.pickupStop} ·{' '}
                        <span className={access ? 'text-success' : 'text-destructive'}>
                          {access ? 'Access OK' : `Denied (paid: ${s.paidThroughMonth ?? '—'})`}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => recordBoarding(trip, s, 'Board')}
                        className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${
                          onBoard ? 'bg-success text-success-foreground' : access ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                        }`}>
                        <LogIn size={12} /> {onBoard ? 'Boarded' : 'Board'}
                      </button>
                      <button onClick={() => recordBoarding(trip, s, 'Drop')}
                        className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${
                          offBoard ? 'bg-info text-info-foreground' : 'bg-info/15 text-info'
                        }`}>
                        <LogOut size={12} /> {offBoard ? 'Dropped' : 'Drop'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setBoardingTripId(null)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Done</button>
            </div>
          </Modal>
        );
      })()}

      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border:1px solid hsl(var(--border));border-radius:0.5rem;background:hsl(var(--background));font-size:0.875rem;}`}</style>
    </div>

  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-lg">{value}</p>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function AccessList({
  title, tone, rows, studentName, routeCode, showOwed,
}: {
  title: string;
  tone: 'success' | 'destructive';
  rows: (TransportSubscription & { derived: string; owed: number })[];
  studentName: (id: string) => string;
  routeCode: (id: string) => string;
  showOwed?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className={`px-4 py-2 text-sm font-medium ${tone === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
        {title} · {rows.length}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr>
          <th className="p-2">Student</th><th>Route</th><th>Status</th>{showOwed && <th>Amount Owed</th>}
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-2">{studentName(r.studentId)}</td>
              <td>{routeCode(r.routeId)}</td>
              <td>{r.derived}</td>
              {showOwed && <td>${(r.owed * r.monthlyFee).toFixed(2)}</td>}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={showOwed ? 4 : 3} className="p-4 text-center text-muted-foreground">None</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
