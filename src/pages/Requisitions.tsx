import React, { useMemo, useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Send, Check, X, Package, Printer, FileText, Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import {
  useRequisitions, createRequisition, updateRequisition, deleteRequisition,
  submitRequisition, approveRequisition, rejectRequisition, issueRequisition, closeRequisition,
  type Requisition, type RequisitionLine, type RequisitionPriority, type RequisitionStatus,
} from '@/lib/requisitions-store';
import { useInventory } from '@/lib/inventory-store';
import { exportCSV, exportPDF } from '@/lib/report-export';

const STATUSES: RequisitionStatus[] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Issued', 'Closed'];
const PRIORITIES: RequisitionPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

const STATUS_STYLE: Record<RequisitionStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Submitted: 'bg-info/10 text-info',
  Approved: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
  Issued: 'bg-primary/10 text-primary',
  Closed: 'bg-secondary text-secondary-foreground',
};

export default function Requisitions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSchoolSettings();
  const requisitions = useRequisitions(s => s.requisitions);
  const warehouses = useInventory(s => s.warehouses);
  const products = useInventory(s => s.products);

  const [statusFilter, setStatusFilter] = useState<'All' | RequisitionStatus>('All');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Requisition | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => requisitions.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.ref.toLowerCase().includes(q)
        && !r.requestedBy.toLowerCase().includes(q)
        && !r.department.toLowerCase().includes(q)
        && !r.reason.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [requisitions, statusFilter, from, to, search]);

  const counts = useMemo(() => ({
    total: requisitions.length,
    submitted: requisitions.filter(r => r.status === 'Submitted').length,
    approved: requisitions.filter(r => r.status === 'Approved').length,
    issued: requisitions.filter(r => r.status === 'Issued').length,
    valueOpen: requisitions.filter(r => ['Submitted', 'Approved'].includes(r.status))
      .reduce((s, r) => s + r.lines.reduce((ss, l) => ss + (l.estimatedCost ?? 0) * l.quantity, 0), 0),
  }), [requisitions]);

  const head = ['Ref', 'Date', 'Requested By', 'Department', 'Priority', 'Lines', 'Est. Cost', 'Status'];
  const body = filtered.map(r => [
    r.ref, r.date, r.requestedBy, r.department, r.priority,
    r.lines.length,
    `$${r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0).toFixed(2)}`,
    r.status,
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Requisitions</h1>
          <p className="text-sm text-muted-foreground">Internal purchase requests · approval workflow · issue from stores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('requisitions', head, body)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted">
            <FileText size={18} /> CSV
          </button>
          <button onClick={() => exportPDF({ filename: 'requisitions', title: 'Requisitions Register', subtitle: from || to ? `${from || '...'} to ${to || '...'}` : `As at ${new Date().toLocaleDateString()}`, filters: { Status: statusFilter, Search: search || undefined }, head, body, schoolName: settings.name })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted">
            <Printer size={18} /> PDF
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">
            <Plus size={18} /> New Requisition
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total" value={String(counts.total)} />
        <Stat label="Submitted" value={String(counts.submitted)} />
        <Stat label="Approved" value={String(counts.approved)} />
        <Stat label="Issued" value={String(counts.issued)} />
        <Stat label="Open value" value={`$${counts.valueOpen.toFixed(2)}`} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end print:hidden">
        <div className="col-span-2 md:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ref, requester, department"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option>All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="block text-xs text-muted-foreground mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {head.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2 font-mono text-xs text-primary cursor-pointer" onClick={() => setViewing(r)}>{r.ref}</td>
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.requestedBy}</td>
                <td className="px-3 py-2">{r.department}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-muted">{r.priority}</span></td>
                <td className="px-3 py-2">{r.lines.length}</td>
                <td className="px-3 py-2">${r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0).toFixed(2)}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-end">
                    {r.status === 'Draft' && (
                      <>
                        <button title="Submit" onClick={() => { submitRequisition(r.id); toast({ title: 'Submitted', description: r.ref }); }} className="p-1.5 rounded hover:bg-info/10 text-info"><Send size={14} /></button>
                        <button title="Edit" onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted">Edit</button>
                        <button title="Delete" onClick={() => { if (confirm('Delete requisition?')) deleteRequisition(r.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                      </>
                    )}
                    {r.status === 'Submitted' && (
                      <>
                        <button title="Approve" onClick={() => { approveRequisition(r.id, user?.name ?? 'Approver'); toast({ title: 'Approved', description: r.ref }); }} className="p-1.5 rounded hover:bg-success/10 text-success"><Check size={14} /></button>
                        <button title="Reject" onClick={() => { setRejectingId(r.id); setRejectReason(''); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><X size={14} /></button>
                      </>
                    )}
                    {r.status === 'Approved' && (
                      <button title="Issue from store" onClick={() => { issueRequisition(r.id); toast({ title: 'Issued', description: `${r.ref} marked as issued from store` }); }} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Package size={14} /></button>
                    )}
                    {r.status === 'Issued' && (
                      <button title="Close" onClick={() => { closeRequisition(r.id); toast({ title: 'Closed', description: r.ref }); }} className="p-1.5 rounded hover:bg-muted">Close</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No requisitions match the filters</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RequisitionForm
          initial={editing}
          warehouses={warehouses}
          products={products}
          requester={user?.name ?? ''}
          onClose={() => setShowForm(false)}
          onSave={(data, andSubmit) => {
            if (editing) {
              updateRequisition(editing.id, data);
              if (andSubmit) submitRequisition(editing.id);
            } else {
              const created = createRequisition({ ...data, status: andSubmit ? 'Submitted' : 'Draft' });
              toast({ title: andSubmit ? 'Submitted' : 'Saved as draft', description: created.ref });
            }
            setShowForm(false);
          }}
        />
      )}

      {viewing && <RequisitionView req={viewing} warehouses={warehouses} onClose={() => setViewing(null)} />}

      {rejectingId && (
        <Modal title="Reject requisition" onClose={() => setRejectingId(null)}>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm h-24" />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setRejectingId(null)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
            <button onClick={() => { rejectRequisition(rejectingId, rejectReason || 'Not specified'); toast({ title: 'Rejected' }); setRejectingId(null); }}
              className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm">Confirm reject</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-foreground">{value}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function RequisitionForm({ initial, warehouses, products, requester, onClose, onSave }: {
  initial: Requisition | null;
  warehouses: any[]; products: any[]; requester: string;
  onClose: () => void;
  onSave: (data: Omit<Requisition, 'id' | 'ref' | 'status'>, submit: boolean) => void;
}) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = useState(initial?.requestedBy ?? requester);
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [warehouseId, setWarehouseId] = useState(initial?.warehouseId ?? warehouses[0]?.id ?? '');
  const [priority, setPriority] = useState<RequisitionPriority>(initial?.priority ?? 'Normal');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lines, setLines] = useState<RequisitionLine[]>(initial?.lines ?? [
    { id: Math.random().toString(36).slice(2), description: '', unit: 'EA', quantity: 1, estimatedCost: 0 },
  ]);

  const updateLine = (id: string, patch: Partial<RequisitionLine>) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { id: Math.random().toString(36).slice(2), description: '', unit: 'EA', quantity: 1, estimatedCost: 0 }]);
  const removeLine = (id: string) => setLines(ls => ls.filter(l => l.id !== id));

  const total = lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);

  const buildPayload = () => ({
    date, requestedBy, department, warehouseId, priority, reason, notes,
    lines: lines.filter(l => l.description.trim() && l.quantity > 0),
  });

  const valid = requestedBy && department && reason && lines.some(l => l.description && l.quantity > 0);

  return (
    <Modal title={initial ? `Edit ${initial.ref}` : 'New Requisition'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Priority">
          <select value={priority} onChange={e => setPriority(e.target.value as any)} className={inputCls}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Requested by"><input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className={inputCls} /></Field>
        <Field label="Department"><input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Science" className={inputCls} /></Field>
        <Field label="Deliver to (warehouse)" full>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls}>
            <option value="">— Not specified —</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="Reason / justification" full>
          <textarea value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} h-16`} />
        </Field>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">Items</span>
          <button onClick={addLine} className="text-xs px-2 py-1 rounded border border-border flex items-center gap-1"><Plus size={12} /> Add line</button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Description / Product</th>
                <th className="px-2 py-1.5 w-16">Unit</th>
                <th className="px-2 py-1.5 w-20">Qty</th>
                <th className="px-2 py-1.5 w-24">Est. cost</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-2 py-1">
                    <input list="req-products" value={l.description}
                      onChange={e => {
                        const value = e.target.value;
                        const matched = products.find((p: any) => p.name === value);
                        updateLine(l.id, matched
                          ? { description: matched.name, productId: matched.id, unit: matched.unit }
                          : { description: value, productId: undefined });
                      }}
                      className="w-full px-2 py-1 rounded border border-input bg-background" />
                  </td>
                  <td className="px-2 py-1"><input value={l.unit} onChange={e => updateLine(l.id, { unit: e.target.value })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input type="number" min={0} value={l.quantity} onChange={e => updateLine(l.id, { quantity: Number(e.target.value) })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input type="number" min={0} step="0.01" value={l.estimatedCost ?? 0} onChange={e => updateLine(l.id, { estimatedCost: Number(e.target.value) })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1 text-center"><button onClick={() => removeLine(l.id)} className="text-destructive"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="req-products">
          {products.map((p: any) => <option key={p.id} value={p.name} />)}
        </datalist>
        <div className="text-right text-sm mt-2 font-medium">Estimated total: ${total.toFixed(2)}</div>
      </div>

      <Field label="Notes (optional)" full><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} h-16`} /></Field>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button disabled={!valid} onClick={() => onSave(buildPayload(), false)} className="px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-50">Save draft</button>
        <button disabled={!valid} onClick={() => onSave(buildPayload(), true)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Save & submit</button>
      </div>
    </Modal>
  );
}

function RequisitionView({ req, warehouses, onClose }: { req: Requisition; warehouses: any[]; onClose: () => void }) {
  const wh = warehouses.find((w: any) => w.id === req.warehouseId);
  const total = req.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
  return (
    <Modal title={`${req.ref} · ${req.status}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">Date:</span> {req.date}</div>
        <div><span className="text-muted-foreground">Priority:</span> {req.priority}</div>
        <div><span className="text-muted-foreground">Requested by:</span> {req.requestedBy}</div>
        <div><span className="text-muted-foreground">Department:</span> {req.department}</div>
        <div className="col-span-2"><span className="text-muted-foreground">Deliver to:</span> {wh?.name ?? '—'}</div>
        <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {req.reason}</div>
        {req.approvedBy && <div className="col-span-2"><span className="text-muted-foreground">Approved by:</span> {req.approvedBy} on {req.approvedAt?.slice(0, 10)}</div>}
        {req.rejectedReason && <div className="col-span-2 text-destructive">Rejected: {req.rejectedReason}</div>}
      </div>
      <table className="w-full text-xs mt-3 border border-border rounded">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr><th className="px-2 py-1.5 text-left">Item</th><th>Unit</th><th>Qty</th><th>Est. cost</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          {req.lines.map(l => (
            <tr key={l.id} className="border-t border-border">
              <td className="px-2 py-1.5 text-left">{l.description}</td>
              <td className="text-center">{l.unit}</td>
              <td className="text-center">{l.quantity}</td>
              <td className="text-center">${(l.estimatedCost ?? 0).toFixed(2)}</td>
              <td className="text-center">${((l.estimatedCost ?? 0) * l.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="bg-muted/30 font-medium"><td className="px-2 py-1.5" colSpan={4}>Total</td><td className="text-center">${total.toFixed(2)}</td></tr></tfoot>
      </table>
      {req.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {req.notes}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2"><Printer size={14} /> Print</button>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm';
