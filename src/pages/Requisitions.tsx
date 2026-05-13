// Enterprise Requisition & Procurement Module
// Tabs: Dashboard · Requisitions · Approvals · Suppliers · Quotations · Purchase Orders · GRN · Budgets · Audit Log
import React, { useMemo, useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Send, Check, X, Package, Printer, FileText, Search,
  Building2, Receipt, ShoppingBag, FileCheck2, Wallet, History, AlertTriangle,
  Star, Copy, Eye, ArrowRightCircle, ListChecks, Truck, BarChart3, Paperclip,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import {
  useRequisitions, createRequisition, updateRequisition, deleteRequisition, cloneRequisition,
  submitRequisition, decideApproval, issueRequisition, closeRequisition, cancelRequisition,
  createSupplier, updateSupplier, deleteSupplier,
  createQuotation, selectQuotation, createPurchaseOrder, createGRN,
  upsertBudget, checkBudget, addAttachment, canDo,
  type Requisition, type RequisitionLine, type RequisitionPriority, type RequisitionStatus,
  type Supplier, type Quotation, type PurchaseOrder, type Budget, type ApprovalStep,
} from '@/lib/requisitions-store';
import { useInventory } from '@/lib/inventory-store';
import { exportCSV, exportPDF } from '@/lib/report-export';

const PRIORITIES: RequisitionPriority[] = ['Low', 'Normal', 'High', 'Urgent', 'Emergency'];
const ALL_STATUSES: RequisitionStatus[] = [
  'Draft', 'Submitted', 'PendingApproval', 'UnderReview', 'Approved', 'Rejected', 'Returned',
  'Procurement', 'Ordered', 'Delivered', 'Received', 'Issued', 'Closed', 'Cancelled',
];

const STATUS_STYLE: Record<RequisitionStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Submitted: 'bg-info/10 text-info',
  UnderReview: 'bg-info/10 text-info',
  PendingApproval: 'bg-amber-500/10 text-amber-600',
  Approved: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
  Returned: 'bg-orange-500/10 text-orange-600',
  Procurement: 'bg-primary/10 text-primary',
  Ordered: 'bg-primary/10 text-primary',
  Delivered: 'bg-info/10 text-info',
  Received: 'bg-success/10 text-success',
  Issued: 'bg-primary/10 text-primary',
  Closed: 'bg-secondary text-secondary-foreground',
  Cancelled: 'bg-destructive/10 text-destructive',
};

type Tab = 'dashboard' | 'requisitions' | 'approvals' | 'suppliers' | 'quotations' | 'purchase-orders' | 'grn' | 'budgets' | 'audit';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
  { id: 'requisitions', label: 'Requisitions', icon: <ClipboardList size={16} /> },
  { id: 'approvals', label: 'Approvals', icon: <FileCheck2 size={16} /> },
  { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={16} /> },
  { id: 'quotations', label: 'Quotations', icon: <Receipt size={16} /> },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: <ShoppingBag size={16} /> },
  { id: 'grn', label: 'Goods Received', icon: <Truck size={16} /> },
  { id: 'budgets', label: 'Budgets', icon: <Wallet size={16} /> },
  { id: 'audit', label: 'Audit Log', icon: <History size={16} /> },
];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm';

export default function Requisitions() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-foreground">Requisition & Procurement</h1>
        <p className="text-sm text-muted-foreground">
          Multi-level approvals · suppliers · purchase orders · GRN · budgets · audit trail
          {user && <span className="ml-2 px-2 py-0.5 rounded bg-muted text-xs uppercase">{user.role}</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border print:hidden">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'requisitions' && <RequisitionsTab />}
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'quotations' && <QuotationsTab />}
      {tab === 'purchase-orders' && <PurchaseOrdersTab />}
      {tab === 'grn' && <GrnTab />}
      {tab === 'budgets' && <BudgetsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardTab() {
  const reqs = useRequisitions(s => s.requisitions);
  const pos = useRequisitions(s => s.purchaseOrders);
  const budgets = useRequisitions(s => s.budgets);
  const suppliers = useRequisitions(s => s.suppliers);

  const totals = useMemo(() => {
    const open = reqs.filter(r => !['Closed', 'Cancelled', 'Rejected'].includes(r.status));
    const value = (rs: Requisition[]) => rs.reduce((s, r) => s + r.lines.reduce((ss, l) => ss + (l.estimatedCost ?? 0) * l.quantity, 0), 0);
    return {
      total: reqs.length,
      pending: reqs.filter(r => r.status === 'PendingApproval').length,
      approved: reqs.filter(r => r.status === 'Approved').length,
      emergency: reqs.filter(r => r.priority === 'Emergency' || r.emergency).length,
      openValue: value(open),
      poValue: pos.reduce((s, p) => s + p.lines.reduce((ss, l) => ss + l.unitPrice * l.quantity, 0), 0),
      avgApprovalHours: (() => {
        const decided = reqs.filter(r => r.approvedAt);
        if (!decided.length) return 0;
        const hrs = decided.reduce((s, r) => s + (new Date(r.approvedAt!).getTime() - new Date(r.createdAt).getTime()) / 3.6e6, 0) / decided.length;
        return Math.round(hrs * 10) / 10;
      })(),
    };
  }, [reqs, pos]);

  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    reqs.forEach(r => {
      const v = r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
      map.set(r.department, (map.get(r.department) ?? 0) + v);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [reqs]);

  const topItems = useMemo(() => {
    const map = new Map<string, number>();
    reqs.flatMap(r => r.lines).forEach(l => map.set(l.description, (map.get(l.description) ?? 0) + l.quantity));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [reqs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Requisitions" value={String(totals.total)} icon={<ClipboardList size={18} />} />
        <Stat label="Pending Approval" value={String(totals.pending)} accent="amber" icon={<FileCheck2 size={18} />} />
        <Stat label="Approved" value={String(totals.approved)} accent="success" icon={<Check size={18} />} />
        <Stat label="Emergency" value={String(totals.emergency)} accent="destructive" icon={<AlertTriangle size={18} />} />
        <Stat label="Open Value" value={`$${totals.openValue.toFixed(2)}`} icon={<Wallet size={18} />} />
        <Stat label="PO Value" value={`$${totals.poValue.toFixed(2)}`} icon={<ShoppingBag size={18} />} />
        <Stat label="Avg Approval (hrs)" value={String(totals.avgApprovalHours)} icon={<History size={18} />} />
        <Stat label="Active Suppliers" value={String(suppliers.filter(s => s.status !== 'Blacklisted').length)} icon={<Building2 size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Spending by Department">
          {byDept.length ? (
            <div className="space-y-2">
              {byDept.map(([d, v]) => {
                const max = byDept[0][1] || 1;
                return (
                  <div key={d}>
                    <div className="flex justify-between text-xs mb-1"><span>{d}</span><span className="font-medium">${v.toFixed(2)}</span></div>
                    <div className="h-2 bg-muted rounded"><div className="h-2 rounded gradient-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <Empty msg="No data" />}
        </Card>
        <Card title="Top Requested Items">
          {topItems.length ? (
            <table className="w-full text-sm">
              <tbody>
                {topItems.map(([n, q]) => (
                  <tr key={n} className="border-t border-border first:border-0"><td className="py-2">{n}</td><td className="py-2 text-right font-medium">{q}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty msg="No data" />}
        </Card>
        <Card title="Budget Utilization">
          {budgets.length ? (
            <div className="space-y-3">
              {budgets.map(b => {
                const used = b.spent + b.committed;
                const pct = Math.min(100, (used / b.allocated) * 100);
                const danger = pct > 90;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{b.department} · {b.category}</span>
                      <span className={danger ? 'text-destructive font-medium' : ''}>${used.toFixed(0)} / ${b.allocated}</span>
                    </div>
                    <div className="h-2 bg-muted rounded">
                      <div className={`h-2 rounded ${danger ? 'bg-destructive' : 'gradient-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty msg="No budgets" />}
        </Card>
        <Card title="Approval Bottlenecks">
          <table className="w-full text-sm">
            <tbody>
              {reqs.filter(r => r.status === 'PendingApproval').slice(0, 6).map(r => {
                const next = r.approvals.find(a => a.decision === 'Pending');
                return (
                  <tr key={r.id} className="border-t border-border first:border-0">
                    <td className="py-2 font-mono text-xs">{r.ref}</td>
                    <td className="py-2">{r.department}</td>
                    <td className="py-2 text-right text-xs"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">{next?.role ?? '—'}</span></td>
                  </tr>
                );
              })}
              {!reqs.some(r => r.status === 'PendingApproval') && <tr><td className="py-3 text-muted-foreground text-center">No pending approvals</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// REQUISITIONS
// ============================================================
function RequisitionsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSchoolSettings();
  const requisitions = useRequisitions(s => s.requisitions);
  const warehouses = useInventory(s => s.warehouses);
  const products = useInventory(s => s.products);
  const suppliers = useRequisitions(s => s.suppliers);

  const [statusFilter, setStatusFilter] = useState<'All' | RequisitionStatus>('All');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Requisition | null>(null);

  const filtered = useMemo(() => requisitions.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.ref.toLowerCase().includes(q) && !r.requestedBy.toLowerCase().includes(q)
          && !r.department.toLowerCase().includes(q) && !r.reason.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [requisitions, statusFilter, from, to, search]);

  const head = ['Ref', 'Date', 'Requested By', 'Department', 'Priority', 'Lines', 'Est. Cost', 'Status'];
  const body = filtered.map(r => [
    r.ref, r.date, r.requestedBy, r.department, r.priority, r.lines.length,
    `$${r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0).toFixed(2)}`, r.status,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex gap-2">
          <button onClick={() => exportCSV('requisitions', head, body)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted"><FileText size={16} /> CSV</button>
          <button onClick={() => exportPDF({ filename: 'requisitions', title: 'Requisition Register', subtitle: `${from || '...'} to ${to || '...'}`, filters: { Status: statusFilter, Search: search || undefined }, head, body, schoolName: settings.name })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted"><Printer size={16} /> PDF</button>
        </div>
        {canDo(user?.role, 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
            <Plus size={16} /> New Requisition
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end print:hidden">
        <div className="col-span-2"><label className="block text-xs text-muted-foreground mb-1">Search</label>
          <div className="relative"><Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ref, requester, department" className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        </div>
        <div><label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={inputCls}>
            <option>All</option>{ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className="block text-xs text-muted-foreground mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            {head.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
            <th className="px-3 py-2 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const total = r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs text-primary cursor-pointer" onClick={() => setViewing(r)}>{r.ref}</td>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.requestedBy}</td>
                  <td className="px-3 py-2">{r.department}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${r.priority === 'Emergency' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>{r.priority}</span></td>
                  <td className="px-3 py-2">{r.lines.length}</td>
                  <td className="px-3 py-2">${total.toFixed(2)}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <button title="View" onClick={() => setViewing(r)} className="p-1.5 rounded hover:bg-muted"><Eye size={14} /></button>
                      <button title="Clone" onClick={() => { cloneRequisition(r.id, user?.name); toast({ title: 'Cloned' }); }} className="p-1.5 rounded hover:bg-muted"><Copy size={14} /></button>
                      {r.status === 'Draft' && canDo(user?.role, 'create') && (
                        <>
                          <button title="Submit" onClick={() => { submitRequisition(r.id, user?.name); toast({ title: 'Submitted', description: r.ref }); }} className="p-1.5 rounded hover:bg-info/10 text-info"><Send size={14} /></button>
                          <button title="Edit" onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted text-xs">Edit</button>
                          {canDo(user?.role, 'delete') && <button title="Delete" onClick={() => { if (confirm('Delete?')) deleteRequisition(r.id, user?.name); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>}
                        </>
                      )}
                      {r.status === 'Approved' && canDo(user?.role, 'procure') && (
                        <button title="Issue from store" onClick={() => { issueRequisition(r.id, user?.name); toast({ title: 'Issued' }); }} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Package size={14} /></button>
                      )}
                      {r.status === 'Issued' && <button title="Close" onClick={() => closeRequisition(r.id, user?.name)} className="p-1.5 rounded hover:bg-muted text-xs">Close</button>}
                      {!['Closed', 'Cancelled', 'Rejected'].includes(r.status) && canDo(user?.role, 'edit') && (
                        <button title="Cancel" onClick={() => { if (confirm('Cancel this requisition?')) cancelRequisition(r.id, user?.name); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive text-xs">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No requisitions</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RequisitionForm
          initial={editing} warehouses={warehouses} products={products} suppliers={suppliers}
          requester={user?.name ?? ''} requesterRole={user?.role}
          onClose={() => setShowForm(false)}
          onSave={(data, andSubmit) => {
            if (editing) {
              updateRequisition(editing.id, data, user?.name);
              if (andSubmit) submitRequisition(editing.id, user?.name);
              toast({ title: 'Updated', description: editing.ref });
            } else {
              const created = createRequisition({ ...data }, user?.name);
              if (andSubmit) submitRequisition(created.id, user?.name);
              toast({ title: andSubmit ? 'Submitted' : 'Saved as draft', description: created.ref });
            }
            setShowForm(false);
          }} />
      )}

      {viewing && <RequisitionView req={viewing} warehouses={warehouses} suppliers={suppliers} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ============================================================
// APPROVALS
// ============================================================
function ApprovalsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const reqs = useRequisitions(s => s.requisitions);
  const [comment, setComment] = useState<Record<string, string>>({});
  const pending = useMemo(() => reqs.filter(r => r.status === 'PendingApproval'), [reqs]);

  if (!canDo(user?.role, 'approve')) {
    return <Empty msg="Your role does not have approval permission" />;
  }

  return (
    <div className="space-y-3">
      {!pending.length && <Empty msg="No pending approvals" />}
      {pending.map(r => {
        const step = r.approvals.find(a => a.decision === 'Pending');
        const total = r.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
        return (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2"><span className="font-mono text-sm text-primary">{r.ref}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-600">Awaiting: {step?.role}</span>
                </div>
                <p className="text-sm font-medium mt-1">{r.reason}</p>
                <p className="text-xs text-muted-foreground">{r.requestedBy} · {r.department} · {r.date}</p>
              </div>
              <div className="text-right"><div className="text-xs text-muted-foreground">Total</div><div className="font-display font-bold">${total.toFixed(2)}</div></div>
            </div>

            <ApprovalTimeline approvals={r.approvals} />

            <div className="border-t border-border pt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={comment[r.id] ?? ''} onChange={e => setComment(c => ({ ...c, [r.id]: e.target.value }))}
                placeholder="Comment / signature note" className="md:col-span-3 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <button onClick={() => { decideApproval(r.id, step!.id, 'Approved', user!.name, comment[r.id]); toast({ title: 'Approved' }); }}
                className="px-3 py-2 rounded-lg bg-success text-white text-sm font-medium inline-flex items-center justify-center gap-2"><Check size={14} /> Approve</button>
              <button onClick={() => { decideApproval(r.id, step!.id, 'Returned', user!.name, comment[r.id] || 'Returned for correction'); toast({ title: 'Returned' }); }}
                className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2"><ArrowRightCircle size={14} /> Return</button>
              <button onClick={() => { decideApproval(r.id, step!.id, 'Rejected', user!.name, comment[r.id] || 'Rejected'); toast({ title: 'Rejected' }); }}
                className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium inline-flex items-center justify-center gap-2"><X size={14} /> Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApprovalTimeline({ approvals }: { approvals: ApprovalStep[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {approvals.map((a, i) => {
        const color = a.decision === 'Approved' ? 'bg-success text-white' :
          a.decision === 'Rejected' ? 'bg-destructive text-white' :
          a.decision === 'Returned' ? 'bg-orange-500 text-white' :
          a.decision === 'Pending' ? 'bg-muted text-muted-foreground' : 'bg-secondary';
        return (
          <React.Fragment key={a.id}>
            <div className="flex flex-col items-center min-w-[110px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>{a.level}</div>
              <div className="text-xs font-medium mt-1">{a.role}</div>
              <div className="text-[10px] text-muted-foreground">{a.decision}</div>
              {a.approver && <div className="text-[10px] text-muted-foreground">{a.approver}</div>}
            </div>
            {i < approvals.length - 1 && <div className="h-px w-6 bg-border" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================
// SUPPLIERS
// ============================================================
function SuppliersTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const suppliers = useRequisitions(s => s.suppliers);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => suppliers.filter(s => !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-3">
        <div className="relative w-64"><Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers" className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"><Plus size={16} /> Add Supplier</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(s => (
          <div key={s.id} className={`bg-card border rounded-xl p-4 space-y-2 ${s.status === 'Blacklisted' ? 'border-destructive/40' : 'border-border'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display font-semibold">{s.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{s.code}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                s.status === 'Preferred' ? 'bg-success/10 text-success' :
                s.status === 'Blacklisted' ? 'bg-destructive/10 text-destructive' :
                s.status === 'Suspended' ? 'bg-orange-500/10 text-orange-600' : 'bg-muted'
              }`}>{s.status}</span>
            </div>
            <div className="text-xs text-muted-foreground">{s.category}</div>
            <div className="flex items-center gap-1 text-xs">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= Math.round(s.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted'} />)}
              <span className="ml-1">{s.rating.toFixed(1)}</span>
            </div>
            {s.contactPerson && <div className="text-xs">{s.contactPerson}</div>}
            {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
            {s.phone && <div className="text-xs text-muted-foreground">{s.phone}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setEditing(s); setShowForm(true); }} className="flex-1 px-2 py-1 rounded border border-border text-xs hover:bg-muted">Edit</button>
              {canDo(user?.role, 'delete') && <button onClick={() => { if (confirm('Delete supplier?')) { deleteSupplier(s.id, user?.name); toast({ title: 'Deleted' }); } }} className="px-2 py-1 rounded border border-destructive/40 text-destructive text-xs">Delete</button>}
            </div>
          </div>
        ))}
        {!filtered.length && <Empty msg="No suppliers" />}
      </div>
      {showForm && <SupplierForm initial={editing} onClose={() => setShowForm(false)} onSave={data => {
        if (editing) { updateSupplier(editing.id, data, user?.name); toast({ title: 'Updated' }); }
        else { createSupplier(data, user?.name); toast({ title: 'Supplier added' }); }
        setShowForm(false);
      }} />}
    </div>
  );
}

function SupplierForm({ initial, onClose, onSave }: { initial: Supplier | null; onClose: () => void; onSave: (s: Omit<Supplier, 'id' | 'code' | 'createdAt'>) => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? '', category: initial?.category ?? '',
    contactPerson: initial?.contactPerson ?? '', email: initial?.email ?? '', phone: initial?.phone ?? '',
    address: initial?.address ?? '', taxId: initial?.taxId ?? '', bank: initial?.bank ?? '', accountNo: initial?.accountNo ?? '',
    rating: initial?.rating ?? 3, status: (initial?.status ?? 'Active') as Supplier['status'], notes: initial?.notes ?? '',
  });
  const update = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }));
  return (
    <Modal title={initial ? 'Edit Supplier' : 'New Supplier'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><input value={f.name} onChange={e => update('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Category *"><input value={f.category} onChange={e => update('category', e.target.value)} className={inputCls} /></Field>
        <Field label="Contact Person"><input value={f.contactPerson} onChange={e => update('contactPerson', e.target.value)} className={inputCls} /></Field>
        <Field label="Email"><input value={f.email} onChange={e => update('email', e.target.value)} className={inputCls} /></Field>
        <Field label="Phone"><input value={f.phone} onChange={e => update('phone', e.target.value)} className={inputCls} /></Field>
        <Field label="Tax ID"><input value={f.taxId} onChange={e => update('taxId', e.target.value)} className={inputCls} /></Field>
        <Field label="Address" full><input value={f.address} onChange={e => update('address', e.target.value)} className={inputCls} /></Field>
        <Field label="Bank"><input value={f.bank} onChange={e => update('bank', e.target.value)} className={inputCls} /></Field>
        <Field label="Account No"><input value={f.accountNo} onChange={e => update('accountNo', e.target.value)} className={inputCls} /></Field>
        <Field label="Rating (0-5)"><input type="number" min={0} max={5} step={0.1} value={f.rating} onChange={e => update('rating', +e.target.value)} className={inputCls} /></Field>
        <Field label="Status">
          <select value={f.status} onChange={e => update('status', e.target.value)} className={inputCls}>
            {['Active', 'Preferred', 'Blacklisted', 'Suspended'].map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Notes" full><textarea value={f.notes} onChange={e => update('notes', e.target.value)} className={`${inputCls} h-16`} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button disabled={!f.name || !f.category} onClick={() => onSave(f)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Save</button>
      </div>
    </Modal>
  );
}

// ============================================================
// QUOTATIONS
// ============================================================
function QuotationsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const quotations = useRequisitions(s => s.quotations);
  const suppliers = useRequisitions(s => s.suppliers);
  const reqs = useRequisitions(s => s.requisitions);
  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Quotation[]>();
    quotations.forEach(q => { const k = q.requisitionId ?? '__'; map.set(k, [...(map.get(k) ?? []), q]); });
    return map;
  }, [quotations]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h3 className="font-display font-semibold">Supplier Quotations</h3>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"><Plus size={16} /> Record Quotation</button>
      </div>
      {!quotations.length && <Empty msg="No quotations recorded yet" />}
      {[...grouped.entries()].map(([reqId, qs]) => {
        const req = reqs.find(r => r.id === reqId);
        return (
          <div key={reqId} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">{req ? <><span className="font-mono text-primary">{req.ref}</span> · {req.reason}</> : <span className="text-muted-foreground">Standalone quotations</span>}</div>
              <div className="text-xs text-muted-foreground">{qs.length} quote{qs.length > 1 ? 's' : ''}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left py-1">Ref</th><th className="text-left">Supplier</th><th className="text-right">Total</th><th className="text-right">Status</th><th></th></tr></thead>
              <tbody>{qs.map(q => {
                const sup = suppliers.find(s => s.id === q.supplierId);
                const total = q.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * (1 + (q.taxRate ?? 0) / 100);
                return (
                  <tr key={q.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{q.ref}</td>
                    <td className="py-2">{sup?.name ?? '—'}</td>
                    <td className="py-2 text-right font-medium">${total.toFixed(2)}</td>
                    <td className="py-2 text-right"><span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'Selected' ? 'bg-success/10 text-success' : q.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>{q.status}</span></td>
                    <td className="py-2 text-right">
                      {q.status !== 'Selected' && <button onClick={() => { selectQuotation(q.id, user?.name); toast({ title: 'Selected' }); }} className="px-2 py-1 rounded border border-border text-xs hover:bg-muted">Select</button>}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        );
      })}
      {showForm && <QuotationForm onClose={() => setShowForm(false)} suppliers={suppliers} reqs={reqs} onSave={d => {
        createQuotation(d, user?.name); toast({ title: 'Quotation recorded' }); setShowForm(false);
      }} />}
    </div>
  );
}

function QuotationForm({ suppliers, reqs, onClose, onSave }: { suppliers: Supplier[]; reqs: Requisition[]; onClose: () => void; onSave: (q: Omit<Quotation, 'id' | 'ref'>) => void }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [requisitionId, setRequisitionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState(15);
  const [lines, setLines] = useState([{ description: '', unit: 'EA', quantity: 1, unitPrice: 0 }]);
  return (
    <Modal title="Record Quotation" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier"><select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls}>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Linked Requisition"><select value={requisitionId} onChange={e => setRequisitionId(e.target.value)} className={inputCls}><option value="">— None —</option>{reqs.map(r => <option key={r.id} value={r.id}>{r.ref} · {r.reason.slice(0, 30)}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Tax %"><input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input placeholder="Description" value={l.description} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="col-span-5 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input placeholder="Unit" value={l.unit} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input type="number" placeholder="Qty" value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input type="number" placeholder="Price" value={l.unitPrice} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="col-span-1 text-destructive"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => setLines(ls => [...ls, { description: '', unit: 'EA', quantity: 1, unitPrice: 0 }])} className="text-xs px-2 py-1 rounded border border-border">+ Line</button>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button onClick={() => onSave({ supplierId, requisitionId: requisitionId || undefined, date, taxRate, lines: lines.filter(l => l.description), status: 'Received' })}
          disabled={!supplierId || !lines.some(l => l.description)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Save</button>
      </div>
    </Modal>
  );
}

// ============================================================
// PURCHASE ORDERS
// ============================================================
function PurchaseOrdersTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const pos = useRequisitions(s => s.purchaseOrders);
  const suppliers = useRequisitions(s => s.suppliers);
  const reqs = useRequisitions(s => s.requisitions);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h3 className="font-display font-semibold">Purchase Orders</h3>
        {canDo(user?.role, 'procure') && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"><Plus size={16} /> New PO</button>}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="px-3 py-2 text-left">Ref</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Supplier</th><th className="px-3 py-2 text-left">Linked Req</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Status</th>
          </tr></thead>
          <tbody>
            {pos.map(po => {
              const sup = suppliers.find(s => s.id === po.supplierId);
              const req = reqs.find(r => r.id === po.requisitionId);
              const total = po.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * (1 + po.taxRate / 100);
              return (
                <tr key={po.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-primary">{po.ref}</td>
                  <td className="px-3 py-2">{po.date}</td>
                  <td className="px-3 py-2">{sup?.name ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{req?.ref ?? '—'}</td>
                  <td className="px-3 py-2 text-right">${total.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right"><span className={`px-2 py-0.5 rounded-full text-xs ${po.status === 'Received' ? 'bg-success/10 text-success' : po.status === 'PartiallyReceived' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted'}`}>{po.status}</span></td>
                </tr>
              );
            })}
            {!pos.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No purchase orders</td></tr>}
          </tbody>
        </table>
      </div>
      {showForm && <POForm suppliers={suppliers} reqs={reqs} onClose={() => setShowForm(false)} onSave={data => {
        createPurchaseOrder(data, user?.name); toast({ title: 'PO created' }); setShowForm(false);
      }} />}
    </div>
  );
}

function POForm({ suppliers, reqs, onClose, onSave }: { suppliers: Supplier[]; reqs: Requisition[]; onClose: () => void; onSave: (po: Omit<PurchaseOrder, 'id' | 'ref' | 'createdAt' | 'status'>) => void }) {
  const approvedReqs = reqs.filter(r => r.status === 'Approved');
  const [requisitionId, setRequisitionId] = useState(approvedReqs[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxRate, setTaxRate] = useState(15);
  const req = reqs.find(r => r.id === requisitionId);
  const [lines, setLines] = useState(req?.lines.map(l => ({ id: l.id, description: l.description, unit: l.unit, quantity: l.quantity, unitPrice: l.estimatedCost ?? 0, receivedQty: 0, productId: l.productId })) ?? []);
  React.useEffect(() => {
    if (req) setLines(req.lines.map(l => ({ id: l.id, description: l.description, unit: l.unit, quantity: l.quantity, unitPrice: l.estimatedCost ?? 0, receivedQty: 0, productId: l.productId })));
  }, [requisitionId]); // eslint-disable-line

  return (
    <Modal title="New Purchase Order" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From Requisition"><select value={requisitionId} onChange={e => setRequisitionId(e.target.value)} className={inputCls}><option value="">— Standalone —</option>{approvedReqs.map(r => <option key={r.id} value={r.id}>{r.ref} · {r.reason.slice(0, 30)}</option>)}</select></Field>
        <Field label="Supplier"><select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls}>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Delivery Date"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Payment Terms"><input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={inputCls} /></Field>
        <Field label="Tax %"><input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input placeholder="Description" value={l.description} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="col-span-5 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input placeholder="Unit" value={l.unit} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input type="number" value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <input type="number" value={l.unitPrice} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value } : x))} className="col-span-2 px-2 py-1.5 rounded border border-input bg-background text-sm" />
            <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="col-span-1 text-destructive"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => setLines(ls => [...ls, { id: Math.random().toString(36).slice(2), description: '', unit: 'EA', quantity: 1, unitPrice: 0, receivedQty: 0 }])} className="text-xs px-2 py-1 rounded border border-border">+ Line</button>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button onClick={() => onSave({ requisitionId: requisitionId || undefined, supplierId, date, deliveryDate, paymentTerms, taxRate, lines: lines.filter(l => l.description) })}
          disabled={!supplierId || !lines.some(l => l.description)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Create PO</button>
      </div>
    </Modal>
  );
}

// ============================================================
// GRN
// ============================================================
function GrnTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const grns = useRequisitions(s => s.grns);
  const pos = useRequisitions(s => s.purchaseOrders);
  const warehouses = useInventory(s => s.warehouses);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h3 className="font-display font-semibold">Goods Received Notes</h3>
        {canDo(user?.role, 'receive') && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"><Plus size={16} /> Receive Goods</button>}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="px-3 py-2 text-left">Ref</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">PO</th><th className="px-3 py-2 text-left">Received By</th><th className="px-3 py-2 text-right">Lines</th>
          </tr></thead>
          <tbody>
            {grns.map(g => (
              <tr key={g.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs text-primary">{g.ref}</td>
                <td className="px-3 py-2">{g.date}</td>
                <td className="px-3 py-2 font-mono text-xs">{pos.find(p => p.id === g.poId)?.ref ?? '—'}</td>
                <td className="px-3 py-2">{g.receivedBy}</td>
                <td className="px-3 py-2 text-right">{g.lines.length}</td>
              </tr>
            ))}
            {!grns.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No GRNs</td></tr>}
          </tbody>
        </table>
      </div>
      {showForm && <GRNForm pos={pos.filter(p => p.status !== 'Received' && p.status !== 'Cancelled')} warehouses={warehouses} onClose={() => setShowForm(false)} onSave={d => {
        createGRN(d, user?.name); toast({ title: 'Goods received' }); setShowForm(false);
      }} />}
    </div>
  );
}

function GRNForm({ pos, warehouses, onClose, onSave }: { pos: PurchaseOrder[]; warehouses: any[]; onClose: () => void; onSave: (g: any) => void }) {
  const { user } = useAuth();
  const [poId, setPoId] = useState(pos[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const po = pos.find(p => p.id === poId);
  const [lines, setLines] = useState<{ poLineId: string; description: string; quantity: number; condition: 'Good' | 'Damaged' | 'Partial' }[]>([]);
  React.useEffect(() => {
    if (po) setLines(po.lines.map(l => ({ poLineId: l.id, description: l.description, quantity: Math.max(0, l.quantity - l.receivedQty), condition: 'Good' as const })));
  }, [poId]); // eslint-disable-line
  if (!pos.length) return <Modal title="Receive Goods" onClose={onClose}><Empty msg="No open purchase orders" /></Modal>;
  return (
    <Modal title="Receive Goods" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="PO"><select value={poId} onChange={e => setPoId(e.target.value)} className={inputCls}>{pos.map(p => <option key={p.id} value={p.id}>{p.ref}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Warehouse"><select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls}><option value="">—</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
      </div>
      <div className="mt-3 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs"><tr><th className="px-2 py-1 text-left">Item</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1">Condition</th></tr></thead>
          <tbody>{lines.map((l, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-2 py-1">{l.description}</td>
              <td className="px-2 py-1"><input type="number" value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x))} className="w-20 px-2 py-1 rounded border border-input bg-background text-sm" /></td>
              <td className="px-2 py-1"><select value={l.condition} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, condition: e.target.value as any } : x))} className="px-2 py-1 rounded border border-input bg-background text-sm">{['Good', 'Damaged', 'Partial'].map(o => <option key={o}>{o}</option>)}</select></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button onClick={() => onSave({ poId, date, warehouseId, receivedBy: user?.name ?? 'Receiver', lines: lines.filter(l => l.quantity > 0) })}
          disabled={!poId || !lines.some(l => l.quantity > 0)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Receive</button>
      </div>
    </Modal>
  );
}

// ============================================================
// BUDGETS
// ============================================================
function BudgetsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const budgets = useRequisitions(s => s.budgets);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h3 className="font-display font-semibold">Budget Allocations</h3>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"><Plus size={16} /> Add Budget</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {budgets.map(b => {
          const used = b.spent + b.committed;
          const remaining = b.allocated - used;
          const pct = Math.min(100, (used / b.allocated) * 100);
          const danger = pct > 90;
          return (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><div><div className="font-display font-semibold">{b.department}</div><div className="text-xs text-muted-foreground">{b.category} · FY{b.fiscalYear}</div></div>
                <button onClick={() => { setEditing(b); setShowForm(true); }} className="text-xs px-2 py-1 rounded border border-border">Edit</button>
              </div>
              <div className="h-2 bg-muted rounded"><div className={`h-2 rounded ${danger ? 'bg-destructive' : 'gradient-primary'}`} style={{ width: `${pct}%` }} /></div>
              <div className="grid grid-cols-3 text-xs gap-2">
                <div><div className="text-muted-foreground">Allocated</div><div className="font-medium">${b.allocated.toFixed(0)}</div></div>
                <div><div className="text-muted-foreground">Spent</div><div className="font-medium">${b.spent.toFixed(0)}</div></div>
                <div><div className="text-muted-foreground">Remaining</div><div className={`font-medium ${remaining < 0 ? 'text-destructive' : ''}`}>${remaining.toFixed(0)}</div></div>
              </div>
            </div>
          );
        })}
        {!budgets.length && <Empty msg="No budgets" />}
      </div>
      {showForm && <BudgetForm initial={editing} onClose={() => setShowForm(false)} onSave={d => {
        upsertBudget({ ...d, ...(editing ? { id: editing.id } : {}) }, user?.name); toast({ title: 'Saved' }); setShowForm(false);
      }} />}
    </div>
  );
}

function BudgetForm({ initial, onClose, onSave }: { initial: Budget | null; onClose: () => void; onSave: (b: Omit<Budget, 'id'>) => void }) {
  const [f, setF] = useState({
    department: initial?.department ?? '', category: initial?.category ?? '',
    fiscalYear: initial?.fiscalYear ?? new Date().getFullYear().toString(),
    allocated: initial?.allocated ?? 0, committed: initial?.committed ?? 0, spent: initial?.spent ?? 0,
  });
  const u = (k: keyof typeof f, v: any) => setF(s => ({ ...s, [k]: v }));
  return (
    <Modal title={initial ? 'Edit Budget' : 'New Budget'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Department"><input value={f.department} onChange={e => u('department', e.target.value)} className={inputCls} /></Field>
        <Field label="Category"><input value={f.category} onChange={e => u('category', e.target.value)} className={inputCls} /></Field>
        <Field label="Fiscal Year"><input value={f.fiscalYear} onChange={e => u('fiscalYear', e.target.value)} className={inputCls} /></Field>
        <Field label="Allocated"><input type="number" value={f.allocated} onChange={e => u('allocated', +e.target.value)} className={inputCls} /></Field>
        <Field label="Committed"><input type="number" value={f.committed} onChange={e => u('committed', +e.target.value)} className={inputCls} /></Field>
        <Field label="Spent"><input type="number" value={f.spent} onChange={e => u('spent', +e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button onClick={() => onSave(f)} disabled={!f.department || !f.category} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50">Save</button>
      </div>
    </Modal>
  );
}

// ============================================================
// AUDIT LOG
// ============================================================
function AuditTab() {
  const { settings } = useSchoolSettings();
  const audit = useRequisitions(s => s.audit);
  const head = ['Time', 'User', 'Action', 'Entity', 'Ref', 'Details'];
  const body = audit.map(a => [new Date(a.ts).toLocaleString(), a.user, a.action, a.entity, a.entityRef, a.details ?? '']);
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button onClick={() => exportCSV('audit-log', head, body)} className="px-3 py-2 rounded-lg border border-input text-sm inline-flex items-center gap-2"><FileText size={14} /> CSV</button>
        <button onClick={() => exportPDF({ filename: 'audit-log', title: 'Procurement Audit Log', head, body, schoolName: settings.name })} className="px-3 py-2 rounded-lg border border-input text-sm inline-flex items-center gap-2"><Printer size={14} /> PDF</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{head.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {audit.map(a => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs">{new Date(a.ts).toLocaleString()}</td>
                <td className="px-3 py-2">{a.user}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs bg-muted">{a.action}</span></td>
                <td className="px-3 py-2">{a.entity}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.entityRef}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.details}</td>
              </tr>
            ))}
            {!audit.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No activity</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// REQUISITION FORM & VIEW
// ============================================================
function RequisitionForm({ initial, warehouses, products, suppliers, requester, requesterRole, onClose, onSave }: {
  initial: Requisition | null; warehouses: any[]; products: any[]; suppliers: Supplier[];
  requester: string; requesterRole?: string;
  onClose: () => void;
  onSave: (data: Omit<Requisition, 'id' | 'ref' | 'status' | 'approvals' | 'attachments' | 'createdAt'>, submit: boolean) => void;
}) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = useState(initial?.requestedBy ?? requester);
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [warehouseId, setWarehouseId] = useState(initial?.warehouseId ?? warehouses[0]?.id ?? '');
  const [budgetCode, setBudgetCode] = useState(initial?.budgetCode ?? '');
  const [priority, setPriority] = useState<RequisitionPriority>(initial?.priority ?? 'Normal');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [requiredBy, setRequiredBy] = useState(initial?.requiredBy ?? '');
  const [supplierSuggestionId, setSupplierSuggestionId] = useState(initial?.supplierSuggestionId ?? '');
  const [lines, setLines] = useState<RequisitionLine[]>(initial?.lines ?? [
    { id: Math.random().toString(36).slice(2), description: '', unit: 'EA', quantity: 1, estimatedCost: 0 },
  ]);

  const updateLine = (id: string, patch: Partial<RequisitionLine>) => setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { id: Math.random().toString(36).slice(2), description: '', unit: 'EA', quantity: 1, estimatedCost: 0 }]);
  const removeLine = (id: string) => setLines(ls => ls.filter(l => l.id !== id));

  const total = lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
  const budgetCheck = department ? checkBudget(department, lines[0]?.category ?? 'General', total) : null;

  const buildPayload = () => ({
    date, requestedBy, requestedByRole: requesterRole, department, warehouseId, budgetCode, priority,
    emergency: priority === 'Emergency', reason, notes, requiredBy,
    supplierSuggestionId: supplierSuggestionId || undefined,
    lines: lines.filter(l => l.description.trim() && l.quantity > 0),
  });
  const valid = requestedBy && department && reason && lines.some(l => l.description && l.quantity > 0);

  return (
    <Modal title={initial ? `Edit ${initial.ref}` : 'New Requisition'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Priority">
          <select value={priority} onChange={e => setPriority(e.target.value as any)} className={inputCls}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
        </Field>
        <Field label="Requested by"><input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className={inputCls} /></Field>
        <Field label="Department"><input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Science" className={inputCls} /></Field>
        <Field label="Budget code"><input value={budgetCode} onChange={e => setBudgetCode(e.target.value)} placeholder="e.g. SCI-CONS-26" className={inputCls} /></Field>
        <Field label="Required by"><input type="date" value={requiredBy} onChange={e => setRequiredBy(e.target.value)} className={inputCls} /></Field>
        <Field label="Deliver to (warehouse)">
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls}>
            <option value="">— Not specified —</option>{warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="Suggested supplier">
          <select value={supplierSuggestionId} onChange={e => setSupplierSuggestionId(e.target.value)} className={inputCls}>
            <option value="">— None —</option>{suppliers.filter(s => s.status !== 'Blacklisted').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Reason / justification" full><textarea value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} h-16`} /></Field>
        <Field label="Notes" full><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} h-12`} /></Field>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">Items</span>
          <button onClick={addLine} className="text-xs px-2 py-1 rounded border border-border flex items-center gap-1"><Plus size={12} /> Add line</button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground"><tr>
              <th className="px-2 py-1.5 text-left">Description / Product</th>
              <th className="px-2 py-1.5 w-20">Category</th>
              <th className="px-2 py-1.5 w-16">Unit</th>
              <th className="px-2 py-1.5 w-20">Qty</th>
              <th className="px-2 py-1.5 w-24">Est. cost</th>
              <th className="px-2 py-1.5 w-8"></th>
            </tr></thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-2 py-1"><input list="req-products" value={l.description}
                    onChange={e => { const v = e.target.value; const m = products.find((p: any) => p.name === v);
                      updateLine(l.id, m ? { description: m.name, productId: m.id, unit: m.unit } : { description: v, productId: undefined }); }}
                    className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input value={l.category ?? ''} onChange={e => updateLine(l.id, { category: e.target.value })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input value={l.unit} onChange={e => updateLine(l.id, { unit: e.target.value })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input type="number" value={l.quantity} onChange={e => updateLine(l.id, { quantity: +e.target.value })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1"><input type="number" value={l.estimatedCost ?? 0} onChange={e => updateLine(l.id, { estimatedCost: +e.target.value })} className="w-full px-2 py-1 rounded border border-input bg-background" /></td>
                  <td className="px-2 py-1 text-center">{lines.length > 1 && <button onClick={() => removeLine(l.id)} className="text-destructive"><Trash2 size={12} /></button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-muted/40 font-medium"><td colSpan={4} className="px-2 py-1.5 text-right">Total estimate</td><td className="px-2 py-1.5">${total.toFixed(2)}</td><td></td></tr></tfoot>
          </table>
        </div>
        <datalist id="req-products">{products.map((p: any) => <option key={p.id} value={p.name} />)}</datalist>
      </div>

      {budgetCheck && budgetCheck.remaining !== Infinity && (
        <div className={`mt-3 p-2 rounded-lg text-xs ${!budgetCheck.ok ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info'}`}>
          {budgetCheck.ok
            ? <>Budget OK · ${budgetCheck.remaining.toFixed(2)} remaining</>
            : <><AlertTriangle size={12} className="inline mr-1" /> Exceeds available budget by ${(total - budgetCheck.remaining).toFixed(2)}</>}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
        <button disabled={!valid} onClick={() => onSave(buildPayload(), false)} className="px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-50">Save Draft</button>
        <button disabled={!valid} onClick={() => onSave(buildPayload(), true)} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm disabled:opacity-50 inline-flex items-center gap-2"><Send size={14} /> Submit</button>
      </div>
    </Modal>
  );
}

function RequisitionView({ req, warehouses, suppliers, onClose }: { req: Requisition; warehouses: any[]; suppliers: Supplier[]; onClose: () => void }) {
  const total = req.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
  const sup = suppliers.find(s => s.id === req.supplierSuggestionId);
  return (
    <Modal title={`${req.ref} — ${req.status}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Date">{req.date}</Info>
        <Info label="Priority">{req.priority}</Info>
        <Info label="Requested by">{req.requestedBy}</Info>
        <Info label="Department">{req.department}</Info>
        <Info label="Budget code">{req.budgetCode || '—'}</Info>
        <Info label="Required by">{req.requiredBy || '—'}</Info>
        <Info label="Warehouse">{warehouses.find((w: any) => w.id === req.warehouseId)?.name || '—'}</Info>
        <Info label="Suggested supplier">{sup?.name || '—'}</Info>
      </div>
      <div className="mt-3"><div className="text-xs text-muted-foreground">Reason</div><div className="text-sm">{req.reason}</div></div>
      {req.notes && <div className="mt-2"><div className="text-xs text-muted-foreground">Notes</div><div className="text-sm">{req.notes}</div></div>}

      <div className="mt-4">
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><ListChecks size={14} /> Approval workflow</h4>
        <ApprovalTimeline approvals={req.approvals} />
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-sm mb-2">Items</h4>
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">Description</th><th className="px-2 py-1">Unit</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1">Cost</th><th className="px-2 py-1">Total</th></tr></thead>
          <tbody>{req.lines.map(l => (
            <tr key={l.id} className="border-t border-border"><td className="px-2 py-1">{l.description}</td><td className="px-2 py-1 text-center">{l.unit}</td><td className="px-2 py-1 text-center">{l.quantity}</td><td className="px-2 py-1 text-right">${(l.estimatedCost ?? 0).toFixed(2)}</td><td className="px-2 py-1 text-right">${((l.estimatedCost ?? 0) * l.quantity).toFixed(2)}</td></tr>
          ))}</tbody>
          <tfoot><tr className="bg-muted/40 font-medium"><td colSpan={4} className="px-2 py-1 text-right">Total</td><td className="px-2 py-1 text-right">${total.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>

      {req.attachments.length > 0 && (
        <div className="mt-4"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Paperclip size={14} /> Attachments</h4>
          <ul className="text-xs space-y-1">{req.attachments.map(a => <li key={a.id}>· {a.name} <span className="text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span></li>)}</ul>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// SHARED HELPERS
// ============================================================
function Stat({ label, value, icon, accent }: { label: string; value: string; icon?: React.ReactNode; accent?: 'success' | 'amber' | 'destructive' }) {
  const accentCls = accent === 'success' ? 'text-success' : accent === 'amber' ? 'text-amber-600' : accent === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">{label}</div>{icon && <span className="text-muted-foreground">{icon}</span>}</div>
      <div className={`font-display font-bold text-lg ${accentCls}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl p-4"><h3 className="font-display font-semibold text-sm mb-3">{title}</h3>{children}</div>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={full ? 'col-span-2' : ''}><label className="block text-xs text-muted-foreground mb-1">{label}</label>{children}</div>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{children}</div></div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
