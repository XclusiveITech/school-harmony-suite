import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Plus, Edit2, Trash2, Bed, Users, X, Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import {
  useHostels, useAllocations,
  createHostel, updateHostel, deleteHostel,
  addRoom, updateRoom, deleteRoom,
  hostelCapacity, hostelOccupancy, roomOccupancy, occupiedBedsInRoom,
  releaseAllocation,
  type HostelCategory, type Hostel,
} from '@/lib/boarding-store';

const LEVELS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
type Tab = 'dashboard' | 'hostels' | 'rooms' | 'allocations' | 'report';
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'hostels', label: 'Hostels' },
  { id: 'rooms', label: 'Rooms & Beds' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'report', label: 'Printable Report' },
];

export default function Boarding() {
  const location = useLocation();
  const hash = location.hash.replace('#', '') as Tab;
  const [tab, setTab] = useState<Tab>(TABS.find(t => t.id === hash)?.id ?? 'dashboard');
  const hostels = useHostels();
  const allocations = useAllocations();

  const totals = useMemo(() => {
    const cap = hostels.reduce((s, h) => s + hostelCapacity(h), 0);
    const occ = allocations.filter(a => a.active).length;
    return { cap, occ, free: cap - occ, hostels: hostels.length, rooms: hostels.reduce((s, h) => s + h.rooms.length, 0) };
  }, [hostels, allocations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><Building2 size={24} /> Boarding Facility</h1>
          <p className="text-sm text-muted-foreground">Manage hostels, rooms, capacity and student bed allocations</p>
        </div>
      </div>

      {/* tabs */}
      <div className="border-b border-border flex gap-1 overflow-x-auto print:hidden">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard totals={totals} hostels={hostels} />}
      {tab === 'hostels' && <HostelsTab />}
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'allocations' && <AllocationsTab />}
      {tab === 'report' && <ReportTab hostels={hostels} />}
    </div>
  );
}

// ---------- Dashboard --------------------------------------------------

function Dashboard({ totals, hostels }: { totals: any; hostels: Hostel[] }) {
  const cards = [
    { label: 'Hostels', value: totals.hostels },
    { label: 'Rooms', value: totals.rooms },
    { label: 'Total Capacity', value: totals.cap },
    { label: 'Occupied', value: totals.occ },
    { label: 'Vacant', value: totals.free },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="font-display text-2xl font-bold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <h3 className="font-display font-semibold mb-4">Hostel Occupancy</h3>
        <div className="space-y-3">
          {hostels.map(h => {
            const cap = hostelCapacity(h); const occ = hostelOccupancy(h);
            const pct = cap ? Math.round((occ / cap) * 100) : 0;
            return (
              <div key={h.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{h.name} <span className="text-xs text-muted-foreground">({h.category} · {h.levels.join(', ')})</span></span>
                  <span className="text-muted-foreground">{occ}/{cap} ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Hostels Tab ------------------------------------------------

function HostelsTab() {
  const hostels = useHostels();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Hostel | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
          <Plus size={16} /> New Hostel
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Name', 'Category', 'Levels', 'Warden', 'Rooms', 'Capacity', 'Occupied', 'Vacant', ''].map(h => (
                <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hostels.map(h => {
              const cap = hostelCapacity(h); const occ = hostelOccupancy(h);
              return (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{h.name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${h.category === 'Boys' ? 'bg-blue-500/15 text-blue-600' : 'bg-pink-500/15 text-pink-600'}`}>{h.category}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{h.levels.join(', ')}</td>
                  <td className="px-4 py-2">{h.warden || '—'}</td>
                  <td className="px-4 py-2">{h.rooms.length}</td>
                  <td className="px-4 py-2">{cap}</td>
                  <td className="px-4 py-2">{occ}</td>
                  <td className="px-4 py-2">{cap - occ}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditing(h)} className="p-1 hover:text-primary"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm(`Delete ${h.name}?`)) deleteHostel(h.id); }} className="p-1 hover:text-destructive"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {hostels.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">No hostels yet</td></tr>}
          </tbody>
        </table>
      </div>
      {showAdd && <HostelDialog onClose={() => setShowAdd(false)} />}
      {editing && <HostelDialog hostel={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function HostelDialog({ hostel, onClose }: { hostel?: Hostel; onClose: () => void }) {
  const isEdit = !!hostel;
  const [name, setName] = useState(hostel?.name ?? '');
  const [category, setCategory] = useState<HostelCategory>(hostel?.category ?? 'Boys');
  const [levels, setLevels] = useState<string[]>(hostel?.levels ?? ['Form 1']);
  const [warden, setWarden] = useState(hostel?.warden ?? '');
  const [roomCount, setRoomCount] = useState(8);
  const [roomCapacity, setRoomCapacity] = useState(4);
  const [prefix, setPrefix] = useState('');

  const toggleLevel = (lv: string) => setLevels(prev => prev.includes(lv) ? prev.filter(x => x !== lv) : [...prev, lv]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || levels.length === 0) return;
    if (isEdit) {
      updateHostel(hostel!.id, { name, category, levels, warden });
    } else {
      createHostel({ name, category, levels, warden, roomCount, roomCapacity, prefix });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-card rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold">{isEdit ? 'Edit Hostel' : 'New Hostel'}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div>
          <label className="text-sm font-medium">Hostel Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as HostelCategory)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option>Boys</option><option>Girls</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Warden</label>
            <input value={warden} onChange={e => setWarden(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Levels (select one or more)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {LEVELS.map(lv => (
              <button type="button" key={lv} onClick={() => toggleLevel(lv)}
                className={`px-3 py-1 rounded-full text-xs border ${levels.includes(lv) ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                {lv}
              </button>
            ))}
          </div>
        </div>
        {!isEdit && (
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <label className="text-sm font-medium">Rooms</label>
              <input type="number" min={1} value={roomCount} onChange={e => setRoomCount(+e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Beds / Room</label>
              <input type="number" min={1} value={roomCapacity} onChange={e => setRoomCapacity(+e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Room Prefix</label>
              <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="auto" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Rooms Tab --------------------------------------------------

function RoomsTab() {
  const hostels = useHostels();
  const [selected, setSelected] = useState(hostels[0]?.id ?? '');
  const hostel = hostels.find(h => h.id === selected);
  const [showAdd, setShowAdd] = useState(false);
  const [newNum, setNewNum] = useState(''); const [newCap, setNewCap] = useState(4);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Hostel</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        {hostel && <button onClick={() => setShowAdd(true)} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold"><Plus size={16} /> Add Room</button>}
      </div>
      {hostel && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {hostel.rooms.map(r => {
            const occ = roomOccupancy(r.id);
            const beds = Array.from({ length: r.capacity }, (_, i) => i + 1);
            const taken = new Set(occupiedBedsInRoom(r.id));
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 shadow-card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-display font-semibold">Room {r.number}</div>
                    <div className="text-xs text-muted-foreground">{occ}/{r.capacity} beds occupied</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const num = prompt('Room number', r.number); if (!num) return;
                      const cap = +(prompt('Capacity', String(r.capacity)) || r.capacity);
                      updateRoom(hostel.id, r.id, { number: num, capacity: cap });
                    }} className="p-1 hover:text-primary"><Edit2 size={12} /></button>
                    <button onClick={() => { if (confirm(`Delete room ${r.number}?`)) deleteRoom(hostel.id, r.id); }} className="p-1 hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {beds.map(b => (
                    <div key={b} className={`w-7 h-7 rounded flex items-center justify-center text-xs border ${taken.has(b) ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground'}`} title={taken.has(b) ? 'Occupied' : 'Vacant'}>
                      <Bed size={12} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAdd && hostel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="font-display font-semibold">Add Room to {hostel.name}</h3>
            <input value={newNum} onChange={e => setNewNum(e.target.value)} placeholder="Room number" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="number" value={newCap} onChange={e => setNewCap(+e.target.value)} placeholder="Capacity" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-input text-sm">Cancel</button>
              <button onClick={() => { if (newNum) { addRoom(hostel.id, newNum, newCap); setShowAdd(false); setNewNum(''); } }} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Allocations Tab --------------------------------------------

function AllocationsTab() {
  const allocations = useAllocations();
  const hostels = useHostels();
  const lookup = (id: string) => {
    for (const h of hostels) {
      const r = h.rooms.find(r => r.id === id);
      if (r) return { hostel: h, room: r };
    }
    return null;
  };
  const active = allocations.filter(a => a.active);
  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            {['Student', 'Gender', 'Level', 'Hostel', 'Room', 'Bed', 'Allocated', ''].map(h => (
              <th key={h} className="px-4 py-2 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.map(a => {
            const lk = lookup(a.roomId);
            return (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{a.studentName || a.studentId}</td>
                <td className="px-4 py-2">{a.gender}</td>
                <td className="px-4 py-2">{a.level}</td>
                <td className="px-4 py-2">{lk?.hostel.name}</td>
                <td className="px-4 py-2">{lk?.room.number}</td>
                <td className="px-4 py-2">#{a.bedNumber}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(a.allocatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => { if (confirm('Release this allocation?')) releaseAllocation(a.id); }} className="text-xs text-destructive hover:underline">Release</button>
                </td>
              </tr>
            );
          })}
          {active.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No active allocations</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Printable Report ------------------------------------------

function ReportTab({ hostels }: { hostels: Hostel[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm"><Printer size={16} /> Print</button>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 shadow-card print:shadow-none print:border-0">
        <ReportHeader title="Boarding Facility Occupancy Report" subtitle={new Date().toLocaleDateString()} />
        <table className="w-full text-sm mt-4">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {['Hostel', 'Category', 'Levels', 'Rooms', 'Capacity', 'Occupied', 'Vacant', 'Utilisation'].map(h => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hostels.map(h => {
              const cap = hostelCapacity(h); const occ = hostelOccupancy(h);
              return (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{h.name}</td>
                  <td className="px-3 py-2">{h.category}</td>
                  <td className="px-3 py-2">{h.levels.join(', ')}</td>
                  <td className="px-3 py-2">{h.rooms.length}</td>
                  <td className="px-3 py-2">{cap}</td>
                  <td className="px-3 py-2">{occ}</td>
                  <td className="px-3 py-2">{cap - occ}</td>
                  <td className="px-3 py-2">{cap ? Math.round((occ / cap) * 100) : 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
