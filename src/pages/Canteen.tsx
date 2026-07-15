import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  UtensilsCrossed, Plus, Edit2, Trash2, Users, X, ChefHat, ClipboardList,
  Truck, Star, History, Printer, ArrowLeftRight,
} from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import { staff as staffList } from '@/lib/dummy-data';
import {
  useDiningHalls, useCanteenStaff, useMeals, useCanteenTransfers,
  useCanteenRequisitions, useCanteenReviews, useCanteenAudit,
  createHall, updateHall, deleteHall,
  assignStaff, removeStaff,
  addMeal, updateMeal, deleteMeal,
  createTransfer, receiveTransfer, rejectTransfer,
  createCanteenRequisition, setRequisitionStatus,
  deleteReview,
  getAverageRating,
  type DiningHall, type MealSlot, type CanteenStaffCategory,
} from '@/lib/canteen-store';

type Tab = 'dashboard' | 'halls' | 'meals' | 'staff' | 'transfers' | 'requisitions' | 'reviews' | 'audit';
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'halls',        label: 'Dining Halls' },
  { id: 'meals',        label: 'Meals Chart' },
  { id: 'staff',        label: 'Staff' },
  { id: 'transfers',    label: 'Stock Transfers' },
  { id: 'requisitions', label: 'Requisitions' },
  { id: 'reviews',      label: 'Reviews' },
  { id: 'audit',        label: 'Audit Trail' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CATEGORIES: CanteenStaffCategory[] = ['Manager', 'Chef', 'Cook', 'Server', 'Cleaner', 'Cashier', 'Storekeeper'];

const staffName = (id: string) => {
  const s = staffList.find(x => x.id === id);
  return s ? `${s.firstName} ${s.lastName}` : `#${id}`;
};

export default function Canteen() {
  const location = useLocation();
  const hash = location.hash.replace('#', '') as Tab;
  const [tab, setTab] = useState<Tab>(TABS.find(t => t.id === hash)?.id ?? 'dashboard');
  const halls = useDiningHalls();
  const [activeHallId, setActiveHallId] = useState<string>(halls[0]?.id ?? '');

  // keep activeHallId valid
  React.useEffect(() => {
    if (!halls.find(h => h.id === activeHallId)) setActiveHallId(halls[0]?.id ?? '');
  }, [halls, activeHallId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed size={24} /> Canteen Management
          </h1>
          <p className="text-sm text-muted-foreground">Independent dining halls, meals, staff, stock and student reviews</p>
        </div>
        {tab !== 'dashboard' && tab !== 'halls' && tab !== 'audit' && halls.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Active hall:</label>
            <select value={activeHallId} onChange={e => setActiveHallId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab halls={halls} />}
      {tab === 'halls' && <HallsTab />}
      {tab === 'meals' && activeHallId && <MealsTab hallId={activeHallId} />}
      {tab === 'staff' && activeHallId && <StaffTab hallId={activeHallId} />}
      {tab === 'transfers' && activeHallId && <TransfersTab hallId={activeHallId} />}
      {tab === 'requisitions' && activeHallId && <RequisitionsTab hallId={activeHallId} />}
      {tab === 'reviews' && activeHallId && <ReviewsTab hallId={activeHallId} />}
      {tab === 'audit' && <AuditTab />}

      {(tab === 'meals' || tab === 'staff' || tab === 'transfers' || tab === 'requisitions' || tab === 'reviews') && !activeHallId && (
        <p className="text-sm text-muted-foreground">Create a dining hall first.</p>
      )}
    </div>
  );
}

// ---------- Dashboard --------------------------------------------------

function DashboardTab({ halls }: { halls: DiningHall[] }) {
  const meals = useMeals();
  const staff = useCanteenStaff();
  const reviews = useCanteenReviews();
  const transfers = useCanteenTransfers();

  const totals = {
    halls: halls.length,
    staff: staff.length,
    meals: meals.length,
    pendingTransfers: transfers.filter(t => t.status === 'Pending').length,
    reviews: reviews.length,
    avgRating: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Halls', value: totals.halls },
          { label: 'Staff', value: totals.staff },
          { label: 'Meals', value: totals.meals },
          { label: 'Pending Transfers', value: totals.pendingTransfers },
          { label: 'Reviews', value: totals.reviews },
          { label: 'Avg Rating', value: totals.avgRating },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-card">
        <h3 className="font-display font-semibold mb-3">Halls at a Glance</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Hall', 'Location', 'Capacity', 'Meals', 'Staff', 'Avg Rating', 'Status'].map(h => (
                <th key={h} className="px-3 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {halls.map(h => {
              const mCount = meals.filter(m => m.hallId === h.id).length;
              const sCount = staff.filter(s => s.hallId === h.id).length;
              const avg = getAverageRating(h.id);
              return (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{h.name}</td>
                  <td className="px-3 py-2">{h.location}</td>
                  <td className="px-3 py-2">{h.capacity}</td>
                  <td className="px-3 py-2">{mCount}</td>
                  <td className="px-3 py-2">{sCount}</td>
                  <td className="px-3 py-2">{avg ? avg.toFixed(1) + ' ★' : '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.active ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {h.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {halls.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No dining halls yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Halls ------------------------------------------------------

function HallsTab() {
  const halls = useDiningHalls();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<DiningHall | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
          <Plus size={16} /> New Hall
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Name', 'Location', 'Capacity', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {halls.map(h => (
              <tr key={h.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{h.name}</td>
                <td className="px-4 py-2">{h.location}</td>
                <td className="px-4 py-2">{h.capacity}</td>
                <td className="px-4 py-2">
                  <button onClick={() => updateHall(h.id, { active: !h.active })}
                    className={`text-xs px-2 py-0.5 rounded-full ${h.active ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {h.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing(h)} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Edit2 size={12}/> Edit</button>
                  <button onClick={() => confirm('Delete this hall?') && deleteHall(h.id)} className="text-xs text-destructive hover:underline inline-flex items-center gap-1"><Trash2 size={12}/> Delete</button>
                </td>
              </tr>
            ))}
            {halls.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No halls</td></tr>}
          </tbody>
        </table>
      </div>
      {(show || editing) && <HallDialog hall={editing ?? undefined} onClose={() => { setShow(false); setEditing(null); }} />}
    </div>
  );
}

function HallDialog({ hall, onClose }: { hall?: DiningHall; onClose: () => void }) {
  const isEdit = !!hall;
  const [name, setName] = useState(hall?.name ?? '');
  const [location, setLocation] = useState(hall?.location ?? '');
  const [capacity, setCapacity] = useState(hall?.capacity ?? 100);
  const [active, setActive] = useState(hall?.active ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (isEdit) updateHall(hall!.id, { name, location, capacity, active });
    else createHall({ name, location, capacity, active });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">{isEdit ? 'Edit Hall' : 'New Dining Hall'}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="block text-sm font-medium">Name
          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
        </label>
        <label className="block text-sm font-medium">Location
          <input value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <label className="block text-sm font-medium">Capacity
          <input type="number" min={1} value={capacity} onChange={e => setCapacity(+e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Meals ------------------------------------------------------

function MealsTab({ hallId }: { hallId: string }) {
  const meals = useMeals().filter(m => m.hallId === hallId);
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><ChefHat size={16}/> Weekly meals chart</p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm"><Printer size={14}/> Print</button>
          <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold"><Plus size={16}/> Add Meal</button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Slot</th>
              {DAYS.map(d => <th key={d} className="px-3 py-2 font-medium text-muted-foreground">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{slot}</td>
                {DAYS.map(day => {
                  const items = meals.filter(m => m.day === day && m.slot === slot);
                  return (
                    <td key={day} className="px-3 py-2">
                      {items.map(it => (
                        <div key={it.id} className="mb-2 group">
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <p className={`text-xs font-medium ${!it.available ? 'line-through text-muted-foreground' : ''}`}>{it.name}</p>
                              {it.calories && <p className="text-[10px] text-muted-foreground">{it.calories} kcal</p>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 print:hidden">
                              <button onClick={() => updateMeal(it.id, { available: !it.available })} className="text-[10px] text-primary">{it.available ? 'Hide' : 'Show'}</button>
                              <button onClick={() => deleteMeal(it.id)} className="text-[10px] text-destructive">×</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && <MealDialog hallId={hallId} onClose={() => setShow(false)} />}
    </div>
  );
}

function MealDialog({ hallId, onClose }: { hallId: string; onClose: () => void }) {
  const [day, setDay] = useState<typeof DAYS[number]>('Mon');
  const [slot, setSlot] = useState<MealSlot>('Lunch');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState<number>(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!name) return;
    addMeal({ hallId, day, slot, name, description, calories: calories || undefined });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">Add Meal</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Day
            <select value={day} onChange={e => setDay(e.target.value as any)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">Slot
            <select value={slot} onChange={e => setSlot(e.target.value as MealSlot)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {SLOTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">Meal name
          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
        </label>
        <label className="block text-sm">Description
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <label className="block text-sm">Calories (kcal)
          <input type="number" min={0} value={calories} onChange={e => setCalories(+e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Add</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Staff ------------------------------------------------------

function StaffTab({ hallId }: { hallId: string }) {
  const canteenStaff = useCanteenStaff().filter(s => s.hallId === hallId);
  const [staffId, setStaffId] = useState('');
  const [category, setCategory] = useState<CanteenStaffCategory>('Cook');
  const activeStaff = staffList.filter(s => s.status === 'Active');

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-card">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Users size={16}/> Assign Staff</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">Staff member
            <select value={staffId} onChange={e => setStaffId(e.target.value)} className="min-w-[220px] mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm block">
              <option value="">— select —</option>
              {activeStaff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} · {s.role}</option>)}
            </select>
          </label>
          <label className="text-sm">Category
            <select value={category} onChange={e => setCategory(e.target.value as CanteenStaffCategory)} className="mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm block">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button
            onClick={() => { if (staffId) { assignStaff(hallId, staffId, category); setStaffId(''); } }}
            className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Assign</button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Name', 'Role', 'Category', 'Assigned', ''].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {canteenStaff.map(a => {
              const s = staffList.find(x => x.id === a.staffId);
              return (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{s ? `${s.firstName} ${s.lastName}` : `#${a.staffId}`}</td>
                  <td className="px-4 py-2">{s?.role || '—'}</td>
                  <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.category}</span></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(a.assignedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeStaff(a.id)} className="text-xs text-destructive hover:underline">Remove</button>
                  </td>
                </tr>
              );
            })}
            {canteenStaff.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No staff assigned</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Transfers -------------------------------------------------

function TransfersTab({ hallId }: { hallId: string }) {
  const transfers = useCanteenTransfers().filter(t => t.hallId === hallId);
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
          <ArrowLeftRight size={16}/> New Transfer
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Ref', 'Items', 'Created', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{t.reference}</td>
                <td className="px-4 py-2 text-xs">{t.items.map(i => `${i.productName} × ${i.quantity} ${i.unit}`).join(', ')}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'Received' ? 'bg-green-500/15 text-green-600' :
                    t.status === 'Rejected' ? 'bg-destructive/15 text-destructive' :
                    'bg-amber-500/15 text-amber-600'}`}>{t.status}</span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {t.status === 'Pending' && <>
                    <button onClick={() => receiveTransfer(t.id)} className="text-xs text-primary hover:underline">Receive</button>
                    <button onClick={() => { const r = prompt('Reject reason?') || 'No reason'; rejectTransfer(t.id, r); }} className="text-xs text-destructive hover:underline">Reject</button>
                  </>}
                </td>
              </tr>
            ))}
            {transfers.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No transfers</td></tr>}
          </tbody>
        </table>
      </div>
      {show && <TransferDialog hallId={hallId} onClose={() => setShow(false)} />}
    </div>
  );
}

function TransferDialog({ hallId, onClose }: { hallId: string; onClose: () => void }) {
  const [items, setItems] = useState([{ productName: '', quantity: 1, unit: 'EA' }]);
  const [notes, setNotes] = useState('');
  const update = (i: number, patch: Partial<typeof items[0]>) => setItems(items.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = items.filter(i => i.productName && i.quantity > 0);
    if (clean.length === 0) return;
    createTransfer({ hallId, items: clean, notes });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-card rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">New Stock Transfer from Inventory</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input placeholder="Product name" value={it.productName} onChange={e => update(i, { productName: e.target.value })} className="col-span-6 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <input type="number" min={1} value={it.quantity} onChange={e => update(i, { quantity: +e.target.value })} className="col-span-3 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <input placeholder="Unit" value={it.unit} onChange={e => update(i, { unit: e.target.value })} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="col-span-1 text-destructive text-sm">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { productName: '', quantity: 1, unit: 'EA' }])} className="text-xs text-primary hover:underline">+ Add item</button>
        </div>
        <label className="block text-sm">Notes
          <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Create</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Requisitions ----------------------------------------------

function RequisitionsTab({ hallId }: { hallId: string }) {
  const list = useCanteenRequisitions().filter(r => r.hallId === hallId);
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
          <ClipboardList size={16}/> New Requisition
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Ref', 'Requested by', 'Items', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{r.reference}</td>
                <td className="px-4 py-2">{r.requestedBy}</td>
                <td className="px-4 py-2 text-xs">{r.items.map(i => `${i.name} × ${i.quantity} ${i.unit}`).join(', ')}</td>
                <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.status}</span></td>
                <td className="px-4 py-2 text-right space-x-2">
                  {r.status === 'Submitted' && <>
                    <button onClick={() => setRequisitionStatus(r.id, 'Approved')} className="text-xs text-primary hover:underline">Approve</button>
                    <button onClick={() => setRequisitionStatus(r.id, 'Rejected')} className="text-xs text-destructive hover:underline">Reject</button>
                  </>}
                  {r.status === 'Approved' && <button onClick={() => setRequisitionStatus(r.id, 'Fulfilled')} className="text-xs text-primary hover:underline">Fulfill</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No requisitions</td></tr>}
          </tbody>
        </table>
      </div>
      {show && <RequisitionDialog hallId={hallId} onClose={() => setShow(false)} />}
    </div>
  );
}

function RequisitionDialog({ hallId, onClose }: { hallId: string; onClose: () => void }) {
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState([{ name: '', quantity: 1, unit: 'EA' }]);
  const [notes, setNotes] = useState('');
  const update = (i: number, patch: Partial<typeof items[0]>) => setItems(items.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = items.filter(i => i.name && i.quantity > 0);
    if (!requestedBy || clean.length === 0) return;
    createCanteenRequisition({ hallId, requestedBy, items: clean, notes });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-card rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">New Canteen Requisition</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="block text-sm">Requested by
          <input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
        </label>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input placeholder="Item" value={it.name} onChange={e => update(i, { name: e.target.value })} className="col-span-6 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <input type="number" min={1} value={it.quantity} onChange={e => update(i, { quantity: +e.target.value })} className="col-span-3 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <input placeholder="Unit" value={it.unit} onChange={e => update(i, { unit: e.target.value })} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
              <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="col-span-1 text-destructive text-sm">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, unit: 'EA' }])} className="text-xs text-primary hover:underline">+ Add item</button>
        </div>
        <label className="block text-sm">Notes
          <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Submit</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Reviews ---------------------------------------------------

function ReviewsTab({ hallId }: { hallId: string }) {
  const reviews = useCanteenReviews().filter(r => r.hallId === hallId);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Average Rating</p>
          <p className="font-display text-3xl font-bold flex items-center gap-2">{avg ? avg.toFixed(1) : '—'} <Star size={22} className="text-amber-500 fill-amber-500" /></p>
        </div>
        <p className="text-sm text-muted-foreground">{reviews.length} review(s)</p>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Student', 'Meal', 'Rating', 'Comment', 'When', ''].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-4 py-2">{r.studentName || r.studentId}</td>
                <td className="px-4 py-2 text-xs">{r.mealSlot ? `${r.mealSlot} · ${r.mealName || ''}` : '—'}</td>
                <td className="px-4 py-2"><span className="text-amber-500">{'★'.repeat(r.rating)}</span><span className="text-muted-foreground">{'★'.repeat(5 - r.rating)}</span></td>
                <td className="px-4 py-2 text-xs">{r.comment || '—'}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => deleteReview(r.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No reviews yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Audit -----------------------------------------------------

function AuditTab() {
  const events = useCanteenAudit();
  const halls = useDiningHalls();
  const hallName = (id?: string) => id ? (halls.find(h => h.id === id)?.name || `#${id}`) : '—';
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><History size={16}/> {events.length} event(s)</p>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm"><Printer size={14}/> Print</button>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden print:shadow-none print:border-0">
        <div className="p-4 print:block hidden"><ReportHeader reportTitle="Canteen Audit Trail" subtitle={new Date().toLocaleDateString()} /></div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['When', 'Actor', 'Hall', 'Action', 'Detail'].map(h => (
                <th key={h} className="px-3 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.at).toLocaleString()}</td>
                <td className="px-3 py-2">{e.actor}</td>
                <td className="px-3 py-2 text-xs">{hallName(e.hallId)}</td>
                <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{e.action}</span></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.detail || '—'}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No events</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
