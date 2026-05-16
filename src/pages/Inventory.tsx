import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, AlertTriangle, Warehouse as WarehouseIcon, Truck, RotateCcw, ArrowLeftRight,
  PackageOpen, Undo2, ListChecks, Activity, ScanBarcode, Printer, X, Search, FileText
} from 'lucide-react';
import {
  useInventory, getStockOnHand, getProductValuation,
  dispatchDeliveryNote, postCreditNote, postTransfer, postIssue, postIssueReturn, postStockTake,
  addProduct, addWarehouse,
  type MovementType,
} from '@/lib/inventory-store';
import { useToast } from '@/hooks/use-toast';

type TabKey =
  | 'items' | 'delivery' | 'credit' | 'transfer'
  | 'issue' | 'return' | 'movements' | 'stocktake' | 'alerts';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'items',     label: 'Items',           icon: <PackageOpen size={16} /> },
  { key: 'delivery',  label: 'Delivery Notes',  icon: <Truck size={16} /> },
  { key: 'credit',    label: 'Credit Notes',    icon: <RotateCcw size={16} /> },
  { key: 'transfer',  label: 'Transfers',       icon: <ArrowLeftRight size={16} /> },
  { key: 'issue',     label: 'Issuing',         icon: <FileText size={16} /> },
  { key: 'return',    label: 'Issue Returns',   icon: <Undo2 size={16} /> },
  { key: 'movements', label: 'Stock Movements', icon: <Activity size={16} /> },
  { key: 'stocktake', label: 'Stock Take',      icon: <ListChecks size={16} /> },
  { key: 'alerts',    label: 'Low Stock',       icon: <AlertTriangle size={16} /> },
];

export default function Inventory() {
  const [tab, setTab] = useState<TabKey>('items');
  const products    = useInventory(s => s.products);
  const warehouses  = useInventory(s => s.warehouses);
  const movements   = useInventory(s => s.movements);
  const deliveryNotes = useInventory(s => s.deliveryNotes);
  const creditNotes = useInventory(s => s.creditNotes);
  const transfers   = useInventory(s => s.transfers);
  const issues      = useInventory(s => s.issues);
  const issueReturns = useInventory(s => s.issueReturns);
  const stockTakes  = useInventory(s => s.stockTakes);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const whMap = useMemo(() => Object.fromEntries(warehouses.map(w => [w.id, w])), [warehouses]);

  const lowStock = useMemo(() => products
    .map(p => ({ p, qty: getStockOnHand(p.id) }))
    .filter(x => x.qty <= x.p.reorderLevel), [products, movements]);

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + getProductValuation(p.id), 0),
    [products, movements]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} products · {warehouses.length} warehouses · ${totalValue.toFixed(2)} on-hand value
          </p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted">
          <Printer size={16} /> Print
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3 print:hidden">
          <AlertTriangle size={20} className="text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Low Stock Alert</p>
            <p className="text-xs text-muted-foreground">
              {lowStock.map(x => `${x.p.name} (${x.qty}/${x.p.reorderLevel})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border print:hidden">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'items'     && <ItemsTab products={products} warehouses={warehouses} />}
      {tab === 'delivery'  && <DeliveryTab products={products} warehouses={warehouses} deliveryNotes={deliveryNotes} productMap={productMap} whMap={whMap} />}
      {tab === 'credit'    && <CreditTab products={products} warehouses={warehouses} creditNotes={creditNotes} productMap={productMap} whMap={whMap} />}
      {tab === 'transfer'  && <TransferTab products={products} warehouses={warehouses} transfers={transfers} productMap={productMap} whMap={whMap} />}
      {tab === 'issue'     && <IssueTab products={products} warehouses={warehouses} issues={issues} productMap={productMap} whMap={whMap} />}
      {tab === 'return'    && <ReturnTab products={products} warehouses={warehouses} issues={issues} returns={issueReturns} productMap={productMap} whMap={whMap} />}
      {tab === 'movements' && <MovementsTab movements={movements} products={products} warehouses={warehouses} productMap={productMap} whMap={whMap} />}
      {tab === 'stocktake' && <StockTakeTab products={products} warehouses={warehouses} stockTakes={stockTakes} productMap={productMap} whMap={whMap} />}
      {tab === 'alerts'    && <AlertsTab products={products} warehouses={warehouses} />}
    </div>
  );
}

// =============== Shared UI ===============
const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity';
const btnGhost = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted';
const card = 'bg-card rounded-xl shadow-card border border-border';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 print:hidden">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-card border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function DateRangeFilters({ from, to, setFrom, setTo, extra }:{
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-end print:hidden">
      <div><label className="block text-xs text-muted-foreground mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></div>
      <div><label className="block text-xs text-muted-foreground mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></div>
      {extra}
    </div>
  );
}

// =============== Items Tab ===============
function ItemsTab({ products, warehouses }: any) {
  const [show, setShow] = useState(false);
  const [showWh, setShowWh] = useState(false);
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('');
  const { toast } = useToast();

  const filtered = products.filter((p: any) =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search) || (p.barcode ?? '').includes(search))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end print:hidden">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, barcode" className={`${inputCls} pl-9 w-64`} />
        </div>
        <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' w-48'}>
          <option value="">All warehouses</option>
          {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowWh(true)} className={btnGhost}><WarehouseIcon size={16} /> New Warehouse</button>
        <button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Product</button>
      </div>

      <div className={card + ' overflow-hidden'}>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Barcode</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">On Hand</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reorder</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value ($)</th>
          </tr></thead>
          <tbody>
            {filtered.map((p: any) => {
              const qty = getStockOnHand(p.id, whFilter || undefined);
              const val = getProductValuation(p.id, whFilter || undefined);
              const low = qty <= p.reorderLevel;
              return (
                <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5"><ScanBarcode size={14} />{p.barcode}</td>
                  <td className={`px-4 py-3 text-right font-medium ${low ? 'text-destructive' : 'text-foreground'}`}>{qty}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{p.reorderLevel}</td>
                  <td className="px-4 py-3 text-right text-foreground">${val.toFixed(2)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No products</td></tr>}
          </tbody>
        </table>
      </div>

      {show && <ProductForm warehouses={warehouses} onClose={() => setShow(false)} onSaved={() => { setShow(false); toast({ title: 'Product added' }); }} />}
      {showWh && <WarehouseForm onClose={() => setShowWh(false)} onSaved={() => { setShowWh(false); toast({ title: 'Warehouse added' }); }} />}
    </div>
  );
}

function ProductForm({ warehouses, onClose, onSaved }: any) {
  const [form, setForm] = useState({ sku: '', barcode: '', name: '', category: '', unit: 'EA', reorderLevel: 0 });
  return (
    <Modal title="New Product" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">SKU</label><input className={inputCls} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Barcode</label><input className={inputCls} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
        <div className="col-span-2"><label className="block text-xs text-muted-foreground mb-1">Name</label><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Category</label><input className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Unit</label><input className={inputCls} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Reorder level</label><input type="number" className={inputCls} value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: +e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => { addProduct(form); onSaved(); }} disabled={!form.name || !form.sku}>Save</button>
      </div>
    </Modal>
  );
}

function WarehouseForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState({ name: '', location: '' });
  return (
    <Modal title="New Warehouse" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Name</label><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Location</label><input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => { addWarehouse(form); onSaved(); }} disabled={!form.name}>Save</button>
      </div>
    </Modal>
  );
}

// =============== Lines editor (shared) ===============
function LinesEditor({ products, lines, setLines, withPrice, withReason, withCondition, warehouseIdForStock }: any) {
  const addLine = () => setLines([...lines, { productId: products[0]?.id ?? '', quantity: 1, unitPrice: 0, reason: '', condition: 'Good', unitCost: 0 }]);
  const update = (i: number, patch: any) => setLines(lines.map((l: any, idx: number) => idx === i ? { ...l, ...patch } : l));
  const remove = (i: number) => setLines(lines.filter((_: any, idx: number) => idx !== i));
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Lines</div>
      {lines.map((ln: any, i: number) => {
        const stock = warehouseIdForStock ? getStockOnHand(ln.productId, warehouseIdForStock) : null;
        return (
          <div key={i} className="flex flex-wrap gap-2 items-end p-2 bg-muted/40 rounded-lg">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-muted-foreground mb-1">Product {stock != null && <span className="text-foreground">({stock} in stock)</span>}</label>
              <select className={inputCls} value={ln.productId} onChange={e => update(i, { productId: e.target.value })}>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="w-24"><label className="block text-xs text-muted-foreground mb-1">Qty</label><input type="number" min={1} className={inputCls} value={ln.quantity} onChange={e => update(i, { quantity: +e.target.value })} /></div>
            {withPrice && <div className="w-28"><label className="block text-xs text-muted-foreground mb-1">Unit Price</label><input type="number" step="0.01" className={inputCls} value={ln.unitPrice} onChange={e => update(i, { unitPrice: +e.target.value })} /></div>}
            {withReason && <div className="w-40"><label className="block text-xs text-muted-foreground mb-1">Reason</label><input className={inputCls} value={ln.reason} onChange={e => update(i, { reason: e.target.value })} /></div>}
            {withCondition && <div className="w-32"><label className="block text-xs text-muted-foreground mb-1">Condition</label>
              <select className={inputCls} value={ln.condition} onChange={e => update(i, { condition: e.target.value })}>
                <option>Good</option><option>Damaged</option>
              </select></div>}
            {(withReason || withCondition) && <div className="w-28"><label className="block text-xs text-muted-foreground mb-1">Unit Cost</label><input type="number" step="0.01" className={inputCls} value={ln.unitCost} onChange={e => update(i, { unitCost: +e.target.value })} /></div>}
            <button onClick={() => remove(i)} className="text-destructive p-2"><X size={16} /></button>
          </div>
        );
      })}
      <button onClick={addLine} className={btnGhost}><Plus size={14} /> Add line</button>
    </div>
  );
}

// =============== Delivery Notes Tab ===============
function DeliveryTab({ products, warehouses, deliveryNotes, productMap, whMap }: any) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [whF, setWhF] = useState('');
  const filtered = deliveryNotes.filter((d: any) =>
    (!from || d.date >= from) && (!to || d.date <= to) && (!whF || d.warehouseId === whF));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-end">
        <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} extra={
          <select value={whF} onChange={e => setWhF(e.target.value)} className={inputCls + ' w-48'}>
            <option value="">All warehouses</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        } />
        <button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Delivery Note</button>
      </div>
      <RegisterTable
        title="Delivery Note Register"
        cols={['Ref', 'Date', 'Customer', 'Warehouse', 'Lines', 'Total Qty', 'Status']}
        rows={filtered.map((d: any) => [
          d.ref, d.date, d.customer, whMap[d.warehouseId]?.name ?? '-',
          d.lines.length, d.lines.reduce((s: number, l: any) => s + l.quantity, 0),
          d.status,
        ])}
      />
      {show && <DeliveryForm products={products} warehouses={warehouses} onClose={() => setShow(false)} />}
    </div>
  );
}
function DeliveryForm({ products, warehouses, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [warehouseId, setWh] = useState(warehouses[0]?.id ?? '');
  const [lines, setLines] = useState<any[]>([]);
  const { toast } = useToast();
  return (
    <Modal title="New Delivery Note" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Customer</label><input className={inputCls} value={customer} onChange={e => setCustomer(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Warehouse</label>
          <select className={inputCls} value={warehouseId} onChange={e => setWh(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>
      <LinesEditor products={products} lines={lines} setLines={setLines} withPrice warehouseIdForStock={warehouseId} />
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = dispatchDeliveryNote({ date, customer, warehouseId, lines });
          if (!r.ok) { toast({ title: 'Insufficient stock', description: r.error, variant: 'destructive' }); return; }
          toast({ title: `Dispatched ${r.ref}` }); onClose();
        }} disabled={!customer || lines.length === 0}>Dispatch</button>
      </div>
    </Modal>
  );
}

// =============== Credit Notes Tab ===============
function CreditTab({ products, warehouses, creditNotes, whMap }: any) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const filtered = creditNotes.filter((d: any) => (!from || d.date >= from) && (!to || d.date <= to));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-end">
        <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Credit Note</button>
      </div>
      <RegisterTable
        title="Credit Note Register"
        cols={['Ref', 'Date', 'Customer', 'Warehouse', 'Inspected By', 'Lines', 'Status']}
        rows={creditNotes && filtered.map((d: any) => [
          d.ref, d.date, d.customer, whMap[d.warehouseId]?.name ?? '-', d.inspectedBy, d.lines.length, d.status,
        ])}
      />
      {show && <CreditForm products={products} warehouses={warehouses} onClose={() => setShow(false)} />}
    </div>
  );
}
function CreditForm({ products, warehouses, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [inspectedBy, setIB] = useState('');
  const [warehouseId, setWh] = useState(warehouses[0]?.id ?? '');
  const [lines, setLines] = useState<any[]>([]);
  const { toast } = useToast();
  return (
    <Modal title="New Credit Note (Customer Return)" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Customer</label><input className={inputCls} value={customer} onChange={e => setCustomer(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Inspected By</label><input className={inputCls} value={inspectedBy} onChange={e => setIB(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Receive Into</label>
          <select className={inputCls} value={warehouseId} onChange={e => setWh(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>
      <LinesEditor products={products} lines={lines} setLines={setLines} withReason />
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = postCreditNote({ date, customer, warehouseId, inspectedBy, lines });
          toast({ title: `Posted ${r.ref}` }); onClose();
        }} disabled={!customer || !inspectedBy || lines.length === 0}>Post</button>
      </div>
    </Modal>
  );
}

// =============== Transfer Tab ===============
function TransferTab({ products, warehouses, transfers, whMap }: any) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const filtered = transfers.filter((d: any) => (!from || d.date >= from) && (!to || d.date <= to));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-end">
        <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Transfer</button>
      </div>
      <RegisterTable
        title="Warehouse Transfer Report"
        cols={['Ref', 'Date', 'From', 'To', 'Lines', 'Total Qty', 'Status']}
        rows={filtered.map((d: any) => [
          d.ref, d.date, whMap[d.fromWarehouseId]?.name, whMap[d.toWarehouseId]?.name,
          d.lines.length, d.lines.reduce((s: number, l: any) => s + l.quantity, 0), d.status,
        ])}
      />
      {show && <TransferForm products={products} warehouses={warehouses} onClose={() => setShow(false)} />}
    </div>
  );
}
function TransferForm({ products, warehouses, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromWh, setFromWh] = useState(warehouses[0]?.id ?? '');
  const [toWh, setToWh] = useState(warehouses[1]?.id ?? warehouses[0]?.id ?? '');
  const [lines, setLines] = useState<any[]>([]);
  const { toast } = useToast();
  return (
    <Modal title="New Warehouse Transfer" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">From</label>
          <select className={inputCls} value={fromWh} onChange={e => setFromWh(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></div>
        <div><label className="block text-xs text-muted-foreground mb-1">To</label>
          <select className={inputCls} value={toWh} onChange={e => setToWh(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></div>
      </div>
      <LinesEditor products={products} lines={lines} setLines={setLines} warehouseIdForStock={fromWh} />
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = postTransfer({ date, fromWarehouseId: fromWh, toWarehouseId: toWh, lines });
          if (!r.ok) { toast({ title: 'Transfer failed', description: r.error, variant: 'destructive' }); return; }
          toast({ title: `Posted ${r.ref}` }); onClose();
        }} disabled={lines.length === 0}>Post</button>
      </div>
    </Modal>
  );
}

// =============== Issue Tab ===============
function IssueTab({ products, warehouses, issues, whMap }: any) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const filtered = issues.filter((d: any) => (!from || d.date >= from) && (!to || d.date <= to));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-end">
        <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Issue</button>
      </div>
      <RegisterTable
        title="Internal Issuing Report"
        cols={['Ref', 'Date', 'Cost Center', 'Issued To', 'Warehouse', 'Lines', 'Status']}
        rows={filtered.map((d: any) => [
          d.ref, d.date, d.costCenter, d.issuedTo, whMap[d.warehouseId]?.name, d.lines.length, d.status,
        ])}
      />
      {show && <IssueForm products={products} warehouses={warehouses} onClose={() => setShow(false)} />}
    </div>
  );
}
function IssueForm({ products, warehouses, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [costCenter, setCC] = useState(''); const [issuedTo, setIT] = useState('');
  const [warehouseId, setWh] = useState(warehouses[0]?.id ?? '');
  const [lines, setLines] = useState<any[]>([]);
  const { toast } = useToast();
  return (
    <Modal title="New Internal Issue" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Cost Center</label><input className={inputCls} value={costCenter} onChange={e => setCC(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Issued To</label><input className={inputCls} value={issuedTo} onChange={e => setIT(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">From Warehouse</label>
          <select className={inputCls} value={warehouseId} onChange={e => setWh(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></div>
      </div>
      <LinesEditor products={products} lines={lines} setLines={setLines} warehouseIdForStock={warehouseId} />
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = postIssue({ date, costCenter, issuedTo, warehouseId, lines });
          if (!r.ok) { toast({ title: 'Issue failed', description: r.error, variant: 'destructive' }); return; }
          toast({ title: `Issued ${r.ref}` }); onClose();
        }} disabled={!costCenter || !issuedTo || lines.length === 0}>Post</button>
      </div>
    </Modal>
  );
}

// =============== Return Tab ===============
function ReturnTab({ products, warehouses, issues, returns, whMap }: any) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const filtered = returns.filter((d: any) => (!from || d.date >= from) && (!to || d.date <= to));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-end">
        <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button onClick={() => setShow(true)} className={btnPrimary} disabled={issues.length === 0}><Plus size={16} /> New Return</button>
      </div>
      <RegisterTable
        title="Return from Issuing Report"
        cols={['Ref', 'Date', 'Issue Ref', 'Warehouse', 'Received By', 'Lines']}
        rows={filtered.map((d: any) => [d.ref, d.date, d.issueRef, whMap[d.warehouseId]?.name, d.receivedBy, d.lines.length])}
      />
      {show && <ReturnForm products={products} warehouses={warehouses} issues={issues} onClose={() => setShow(false)} />}
    </div>
  );
}
function ReturnForm({ products, warehouses, issues, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueRef, setIR] = useState(issues[0]?.ref ?? '');
  const [receivedBy, setRB] = useState('');
  const issue = issues.find((i: any) => i.ref === issueRef);
  const warehouseId = issue?.warehouseId ?? warehouses[0]?.id;
  const [lines, setLines] = useState<any[]>([]);
  const { toast } = useToast();
  return (
    <Modal title="New Return from Issuing" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Issue Ref</label>
          <select className={inputCls} value={issueRef} onChange={e => setIR(e.target.value)}>
            {issues.map((i: any) => <option key={i.id} value={i.ref}>{i.ref} ({i.costCenter})</option>)}
          </select></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Received By</label><input className={inputCls} value={receivedBy} onChange={e => setRB(e.target.value)} /></div>
      </div>
      <LinesEditor products={products} lines={lines} setLines={setLines} withCondition />
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = postIssueReturn({ date, issueRef, warehouseId, receivedBy, lines });
          toast({ title: `Posted ${r.ref}` }); onClose();
        }} disabled={!issueRef || !receivedBy || lines.length === 0}>Post</button>
      </div>
    </Modal>
  );
}

// =============== Movements Tab (summary) ===============
function MovementsTab({ movements, products, warehouses, productMap, whMap }: any) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [pid, setPid] = useState(''); const [wid, setWid] = useState(''); const [type, setType] = useState<MovementType | ''>('');
  const filtered = movements.filter((m: any) =>
    (!from || m.date >= from) && (!to || m.date <= to) &&
    (!pid || m.productId === pid) && (!wid || m.warehouseId === wid) && (!type || m.type === type)
  );
  const totalIn = filtered.filter((m: any) => m.quantity > 0).reduce((s: number, m: any) => s + m.quantity, 0);
  const totalOut = filtered.filter((m: any) => m.quantity < 0).reduce((s: number, m: any) => s + m.quantity, 0);

  return (
    <div className="space-y-4">
      <DateRangeFilters from={from} to={to} setFrom={setFrom} setTo={setTo} extra={
        <>
          <select value={pid} onChange={e => setPid(e.target.value)} className={inputCls + ' w-48'}>
            <option value="">All products</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={wid} onChange={e => setWid(e.target.value)} className={inputCls + ' w-48'}>
            <option value="">All warehouses</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value as any)} className={inputCls + ' w-44'}>
            <option value="">All types</option>
            {['OPENING','PURCHASE','DELIVERY','CREDIT_NOTE','TRANSFER_OUT','TRANSFER_IN','ISSUE','ISSUE_RETURN','ADJUSTMENT'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </>
      } />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total IN"  value={totalIn} tone="success" />
        <Stat label="Total OUT" value={Math.abs(totalOut)} tone="destructive" />
        <Stat label="Net"       value={totalIn + totalOut} />
      </div>
      <RegisterTable
        title="Stock Movement Summary"
        cols={['Date', 'Product', 'Warehouse', 'Type', 'Doc Ref', 'Qty', 'Unit Cost', 'Value']}
        rows={filtered.map((m: any) => [
          m.date, productMap[m.productId]?.name, whMap[m.warehouseId]?.name,
          m.type, m.documentRef, m.quantity, `$${m.unitCost.toFixed(2)}`, `$${(m.quantity * m.unitCost).toFixed(2)}`,
        ])}
      />
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'destructive' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <div className={card + ' p-4'}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
    </div>
  );
}

// =============== Stock Take Tab ===============
function StockTakeTab({ products, warehouses, stockTakes, whMap }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setShow(true)} className={btnPrimary}><Plus size={16} /> New Stock Take</button></div>
      <RegisterTable
        title="Stock Take Register"
        cols={['Ref', 'Date', 'Warehouse', 'Counted By', 'Lines', 'Variance Lines', 'Status']}
        rows={stockTakes.map((s: any) => [
          s.ref, s.date, whMap[s.warehouseId]?.name, s.countedBy, s.lines.length,
          s.lines.filter((l: any) => l.systemQty !== l.countedQty).length, s.status,
        ])}
      />
      {show && <StockTakeForm products={products} warehouses={warehouses} onClose={() => setShow(false)} />}
    </div>
  );
}
function StockTakeForm({ products, warehouses, onClose }: any) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWh] = useState(warehouses[0]?.id ?? '');
  const [countedBy, setCB] = useState('');
  const [lines, setLines] = useState(() => products.map((p: any) => ({ productId: p.id, systemQty: getStockOnHand(p.id, warehouses[0]?.id), countedQty: getStockOnHand(p.id, warehouses[0]?.id) })));
  const { toast } = useToast();

  const recompute = (whId: string) => {
    setWh(whId);
    setLines(products.map((p: any) => ({ productId: p.id, systemQty: getStockOnHand(p.id, whId), countedQty: getStockOnHand(p.id, whId) })));
  };

  return (
    <Modal title="New Stock Take" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Warehouse</label>
          <select className={inputCls} value={warehouseId} onChange={e => recompute(e.target.value)}>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></div>
        <div><label className="block text-xs text-muted-foreground mb-1">Counted By</label><input className={inputCls} value={countedBy} onChange={e => setCB(e.target.value)} /></div>
      </div>
      <div className="max-h-72 overflow-y-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>
            <th className="text-left px-3 py-2">Product</th>
            <th className="text-right px-3 py-2">System</th>
            <th className="text-right px-3 py-2">Counted</th>
            <th className="text-right px-3 py-2">Variance</th>
          </tr></thead>
          <tbody>
            {lines.map((l: any, i: number) => {
              const p = products.find((x: any) => x.id === l.productId);
              const v = l.countedQty - l.systemQty;
              return (
                <tr key={l.productId} className="border-t border-border">
                  <td className="px-3 py-2">{p?.name}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{l.systemQty}</td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" className={inputCls + ' w-24 ml-auto'} value={l.countedQty}
                      onChange={e => setLines(lines.map((x: any, idx: number) => idx === i ? { ...x, countedQty: +e.target.value } : x))} />
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${v === 0 ? 'text-muted-foreground' : v > 0 ? 'text-success' : 'text-destructive'}`}>{v}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} onClick={() => {
          const r = postStockTake({ date, warehouseId, countedBy, lines });
          toast({ title: `Posted ${r.ref}` }); onClose();
        }} disabled={!countedBy}>Post</button>
      </div>
    </Modal>
  );
}

// =============== Alerts Tab ===============
function AlertsTab({ products, warehouses }: any) {
  const rows = products
    .map((p: any) => ({ p, qty: getStockOnHand(p.id), val: getProductValuation(p.id) }))
    .filter((x: any) => x.qty <= x.p.reorderLevel);
  return (
    <RegisterTable
      title="Low Stock Alerts"
      cols={['SKU', 'Product', 'Category', 'On Hand', 'Reorder Level', 'Suggested Order']}
      rows={rows.map((x: any) => [x.p.sku, x.p.name, x.p.category, x.qty, x.p.reorderLevel, Math.max(x.p.reorderLevel * 2 - x.qty, x.p.reorderLevel)])}
    />
  );
}

// =============== Register table helper ===============
function RegisterTable({ title, cols, rows }: { title: string; cols: string[]; rows: any[][] }) {
  return (
    <div className={card + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{rows.length} record(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted border-b border-border">
            {cols.map(c => <th key={c} className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/50">
                {r.map((cell, j) => <td key={j} className="px-4 py-2 text-foreground whitespace-nowrap">{String(cell ?? '-')}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={cols.length} className="text-center py-8 text-muted-foreground">No records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
