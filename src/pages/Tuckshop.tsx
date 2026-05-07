import React, { useMemo, useState } from 'react';
import {
  ShoppingCart, ScanBarcode, Search, Plus, Minus, X, Printer, Tag,
  PlayCircle, StopCircle, Trash2, AlertTriangle, BarChart3, FileText,
  CreditCard, Wallet, UserCircle, Package, Receipt, Activity, RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventory, getStockOnHand, TUCKSHOP_WAREHOUSE_ID } from '@/lib/inventory-store';
import {
  useTuckshop, setPrice, getPrice, openShift, closeShift, getActiveShift,
  recordSale, voidSale, refundSale, recordWastage, type PaymentMethod,
} from '@/lib/tuckshop-store';
import { students } from '@/lib/dummy-data';
import { useAuth } from '@/contexts/AuthContext';
import { exportCSV as csvExport, exportPDF } from '@/lib/report-export';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';

type TabKey = 'pos' | 'shifts' | 'prices' | 'wastage' | 'dashboard' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'pos',       label: 'POS',         icon: <ShoppingCart size={16} /> },
  { key: 'shifts',    label: 'Shifts & Cashup', icon: <PlayCircle size={16} /> },
  { key: 'prices',    label: 'Price List',  icon: <Tag size={16} /> },
  { key: 'wastage',   label: 'Wastage',     icon: <Trash2 size={16} /> },
  { key: 'dashboard', label: 'Dashboard',   icon: <BarChart3 size={16} /> },
  { key: 'reports',   label: 'Reports',     icon: <FileText size={16} /> },
];

export default function Tuckshop() {
  const [tab, setTab] = useState<TabKey>('pos');
  const { user } = useAuth();
  const operator = user?.name ?? 'Operator';

  const products = useInventory(s => s.products);
  const movements = useInventory(s => s.movements);
  const sales = useTuckshop(s => s.sales);
  const shifts = useTuckshop(s => s.shifts);
  const prices = useTuckshop(s => s.prices);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const tuckStock = useMemo(
    () => Object.fromEntries(products.map(p => [p.id, getStockOnHand(p.id, TUCKSHOP_WAREHOUSE_ID)])),
    [products, movements]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Tuckshop</h1>
          <p className="text-sm text-muted-foreground">
            POS · Shift management · {sales.filter(s => s.status === 'Completed').length} sales · ${sales.filter(s => s.status === 'Completed').reduce((a, s) => a + s.subtotal, 0).toFixed(2)} revenue
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto print:hidden border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'pos' && <POSTab operator={operator} products={products} tuckStock={tuckStock} prices={prices} />}
      {tab === 'shifts' && <ShiftsTab operator={operator} shifts={shifts} sales={sales} />}
      {tab === 'prices' && <PricesTab products={products} prices={prices} tuckStock={tuckStock} />}
      {tab === 'wastage' && <WastageTab products={products} tuckStock={tuckStock} />}
      {tab === 'dashboard' && <DashboardTab sales={sales} productMap={productMap} tuckStock={tuckStock} products={products} />}
      {tab === 'reports' && <ReportsTab sales={sales} shifts={shifts} movements={movements} productMap={productMap} />}
    </div>
  );
}

// ---------------- POS ----------------
function POSTab({ operator, products, tuckStock, prices }: any) {
  const { toast } = useToast();
  const activeShift = getActiveShift(operator);
  const [cart, setCart] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [studentId, setStudentId] = useState('');
  const [, force] = useState(0);

  const filtered = useMemo(() => products.filter((p: any) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  ).filter((p: any) => tuckStock[p.id] > 0), [products, search, tuckStock]);

  const student = students.find(s => s.regNumber === studentId || s.id === studentId);

  const addToCart = (productId: string) => {
    const price = getPrice(productId);
    if (!price) { toast({ title: 'No price set', description: 'Set a selling price for this item first', variant: 'destructive' }); return; }
    setCart(c => {
      const ex = c.find(x => x.productId === productId);
      if (ex) {
        if (ex.quantity + 1 > tuckStock[productId]) { toast({ title: 'Out of stock', variant: 'destructive' }); return c; }
        return c.map(x => x.productId === productId ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...c, { productId, quantity: 1, unitPrice: price }];
    });
  };

  const updateQty = (pid: string, delta: number) =>
    setCart(c => c.flatMap(x => x.productId === pid
      ? (x.quantity + delta <= 0 ? [] : [{ ...x, quantity: x.quantity + delta }])
      : [x]));

  const total = cart.reduce((s, x) => s + x.quantity * x.unitPrice, 0);

  const checkout = () => {
    if (!activeShift) { toast({ title: 'Open a shift first', variant: 'destructive' }); return; }
    if (!cart.length) return;
    if ((paymentMethod === 'Student Card' || paymentMethod === 'Parent Account') && !student) {
      toast({ title: 'Select a student', variant: 'destructive' }); return;
    }
    const r = recordSale({
      shiftId: activeShift.id, operator,
      paymentMethod,
      studentId: student?.id, studentName: student ? `${student.firstName} ${student.lastName}` : undefined,
      lines: cart,
    });
    if (!r.ok) { toast({ title: 'Sale failed', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'Sale completed', description: `${r.sale?.ref} · $${total.toFixed(2)}` });
    setCart([]); setStudentId(''); force(n => n + 1);
  };

  if (!activeShift) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
        <PlayCircle size={36} className="mx-auto text-muted-foreground" />
        <p className="text-foreground font-medium">No active shift</p>
        <p className="text-sm text-muted-foreground">Open a shift in the Shifts & Cashup tab to start selling.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or scan barcode..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => addToCart(p.id)}
              className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary hover:shadow-card transition-all"
            >
              <Package size={20} className="text-primary mb-2" />
              <div className="font-medium text-sm text-foreground line-clamp-2">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.sku} · {tuckStock[p.id]} in stock</div>
              <div className="font-display font-bold text-primary mt-1">${getPrice(p.id).toFixed(2)}</div>
            </button>
          ))}
          {!filtered.length && <p className="col-span-full text-sm text-muted-foreground p-6 text-center">No items in tuckshop. Transfer stock from Main Store via Inventory → Transfers.</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3 h-fit lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground">Cart</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-destructive">Clear</button>}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {cart.map(line => {
            const p: any = products.find((x: any) => x.id === line.productId);
            return (
              <div key={line.productId} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-foreground">{p?.name}</div>
                  <div className="text-xs text-muted-foreground">${line.unitPrice.toFixed(2)} ea</div>
                </div>
                <button onClick={() => updateQty(line.productId, -1)} className="p-1 rounded border border-border"><Minus size={12} /></button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button onClick={() => updateQty(line.productId, +1)} className="p-1 rounded border border-border"><Plus size={12} /></button>
                <span className="w-16 text-right font-medium">${(line.quantity * line.unitPrice).toFixed(2)}</span>
              </div>
            );
          })}
          {!cart.length && <p className="text-xs text-muted-foreground text-center py-6">Tap items to add</p>}
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex justify-between font-display font-bold text-lg">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(['Cash', 'Student Card', 'Parent Account'] as PaymentMethod[]).map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  paymentMethod === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'
                }`}>
                {m === 'Cash' ? <Wallet size={14} className="mx-auto mb-1" /> : m === 'Student Card' ? <CreditCard size={14} className="mx-auto mb-1" /> : <UserCircle size={14} className="mx-auto mb-1" />}
                {m}
              </button>
            ))}
          </div>

          {(paymentMethod !== 'Cash') && (
            <div>
              <input
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="Student Reg # (e.g. 2026HM4521)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
              {student && <p className="text-xs text-muted-foreground mt-1">{student.firstName} {student.lastName} · {student.className}</p>}
            </div>
          )}

          <button onClick={checkout} disabled={!cart.length}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Receipt size={16} /> Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Shifts ----------------
function ShiftsTab({ operator, shifts, sales }: any) {
  const { toast } = useToast();
  const active = shifts.find((s: any) => s.status === 'Open' && s.operator === operator);
  const [openingCash, setOpeningCash] = useState(50);
  const [declaredCash, setDeclaredCash] = useState(0);
  const [notes, setNotes] = useState('');

  const shiftSales = active ? sales.filter((s: any) => s.shiftId === active.id) : [];
  const cashSales = shiftSales.filter((s: any) => s.status === 'Completed' && s.paymentMethod === 'Cash')
    .reduce((a: number, s: any) => a + s.subtotal, 0);
  const expected = active ? active.openingCash + cashSales : 0;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-display font-bold text-foreground mb-3">Active Shift</h3>
        {!active ? (
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground">Opening Cash</label>
              <input type="number" value={openingCash} onChange={e => setOpeningCash(+e.target.value)}
                className="block px-3 py-2 rounded-lg border border-input bg-background text-sm w-40" />
            </div>
            <button onClick={() => { openShift(operator, openingCash); toast({ title: 'Shift opened' }); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
              <PlayCircle size={16} /> Open Shift
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Shift Ref" value={active.ref} />
              <Stat label="Opening Cash" value={`$${active.openingCash.toFixed(2)}`} />
              <Stat label="Cash Sales" value={`$${cashSales.toFixed(2)}`} />
              <Stat label="Expected Cash" value={`$${expected.toFixed(2)}`} />
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <h4 className="font-medium text-foreground text-sm">End-of-day Cashup</h4>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-xs text-muted-foreground">Declared Cash</label>
                  <input type="number" value={declaredCash} onChange={e => setDeclaredCash(+e.target.value)}
                    className="block px-3 py-2 rounded-lg border border-input bg-background text-sm w-40" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    className="block w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <button onClick={() => {
                  const r = closeShift(active.id, declaredCash, notes);
                  if (r) {
                    const v = r.variance ?? 0;
                    toast({
                      title: 'Shift closed',
                      description: `Variance: ${v >= 0 ? '+' : ''}$${v.toFixed(2)} ${Math.abs(v) < 0.01 ? '(balanced)' : v > 0 ? '(over)' : '(short)'}`,
                      variant: Math.abs(v) > 5 ? 'destructive' : 'default',
                    });
                  }
                }}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center gap-2">
                  <StopCircle size={16} /> Close & Cashup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-display font-bold">Shift History</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Ref</th><th className="px-3 py-2 text-left">Operator</th><th className="px-3 py-2 text-left">Opened</th><th className="px-3 py-2 text-left">Closed</th><th className="px-3 py-2 text-right">Opening</th><th className="px-3 py-2 text-right">Expected</th><th className="px-3 py-2 text-right">Declared</th><th className="px-3 py-2 text-right">Variance</th><th className="px-3 py-2 text-left">Status</th></tr>
          </thead>
          <tbody>
            {shifts.map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2">{s.ref}</td>
                <td className="px-3 py-2">{s.operator}</td>
                <td className="px-3 py-2">{new Date(s.openedAt).toLocaleString()}</td>
                <td className="px-3 py-2">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2 text-right">${s.openingCash.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{s.expectedCash != null ? `$${s.expectedCash.toFixed(2)}` : '-'}</td>
                <td className="px-3 py-2 text-right">{s.declaredCash != null ? `$${s.declaredCash.toFixed(2)}` : '-'}</td>
                <td className={`px-3 py-2 text-right font-medium ${s.variance == null ? '' : Math.abs(s.variance) < 0.01 ? 'text-green-600' : s.variance > 0 ? 'text-amber-600' : 'text-destructive'}`}>{s.variance != null ? `${s.variance >= 0 ? '+' : ''}$${s.variance.toFixed(2)}` : '-'}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${s.status === 'Open' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{s.status}</span></td>
              </tr>
            ))}
            {!shifts.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No shifts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Prices ----------------
function PricesTab({ products, prices, tuckStock }: any) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr><th className="px-3 py-2 text-left">SKU</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Stock @ Tuckshop</th><th className="px-3 py-2 text-right">Selling Price</th></tr>
        </thead>
        <tbody>
          {products.map((p: any) => {
            const price = prices.find((x: any) => x.productId === p.id)?.sellingPrice ?? 0;
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-right">{tuckStock[p.id] ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <input type="number" step="0.01" defaultValue={price}
                    onBlur={e => setPrice(p.id, +e.target.value)}
                    className="w-24 px-2 py-1 rounded border border-input bg-background text-right" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Wastage ----------------
function WastageTab({ products, tuckStock }: any) {
  const { toast } = useToast();
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('Expired');
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-xl">
      <h3 className="font-display font-bold text-foreground">Record Wastage</h3>
      <select value={productId} onChange={e => setProductId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
        <option value="">Select item...</option>
        {products.filter((p: any) => tuckStock[p.id] > 0).map((p: any) =>
          <option key={p.id} value={p.id}>{p.name} (stock: {tuckStock[p.id]})</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input type="number" value={qty} onChange={e => setQty(+e.target.value)} min={1}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <select value={reason} onChange={e => setReason(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {['Expired', 'Damaged', 'Spoilage', 'Theft', 'Other'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <button onClick={() => {
        if (!productId) return;
        const r = recordWastage({ lines: [{ productId, quantity: qty, reason }] });
        if (!r.ok) toast({ title: 'Failed', description: r.error, variant: 'destructive' });
        else { toast({ title: 'Wastage recorded' }); setProductId(''); setQty(1); }
      }} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
        Post Wastage
      </button>
    </div>
  );
}

// ---------------- Dashboard ----------------
function DashboardTab({ sales, productMap, tuckStock, products }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const completed = sales.filter((s: any) => s.status === 'Completed');
  const todays = completed.filter((s: any) => s.date.slice(0, 10) === today);
  const todaysRevenue = todays.reduce((a: number, s: any) => a + s.subtotal, 0);
  const todaysCogs = todays.reduce((a: number, s: any) => a + s.cogs, 0);
  const margin = todaysRevenue ? ((todaysRevenue - todaysCogs) / todaysRevenue) * 100 : 0;

  const byHour = Array.from({ length: 24 }, (_, h) => ({
    h, total: todays.filter((s: any) => new Date(s.date).getHours() === h).reduce((a: number, s: any) => a + s.subtotal, 0),
  }));
  const maxHour = Math.max(1, ...byHour.map(b => b.total));

  const topItems = (() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    todays.forEach((s: any) => s.lines.forEach((l: any) => {
      map[l.productId] = map[l.productId] || { qty: 0, revenue: 0 };
      map[l.productId].qty += l.quantity;
      map[l.productId].revenue += l.quantity * l.unitPrice;
    }));
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  })();

  const paymentSplit = (['Cash', 'Student Card', 'Parent Account'] as PaymentMethod[]).map(m => ({
    m, total: todays.filter((s: any) => s.paymentMethod === m).reduce((a: number, s: any) => a + s.subtotal, 0),
  }));
  const paymentTotal = Math.max(1, paymentSplit.reduce((a, p) => a + p.total, 0));

  const stockValue = products.reduce((a: number, p: any) => a + (tuckStock[p.id] || 0) * (p.unitCost || 0), 0);
  const lowStock = products.filter((p: any) => (tuckStock[p.id] || 0) <= p.reorderLevel);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Today's Sales" value={`$${todaysRevenue.toFixed(2)}`} />
        <Stat label="Today's Profit" value={`$${(todaysRevenue - todaysCogs).toFixed(2)}`} />
        <Stat label="Margin" value={`${margin.toFixed(1)}%`} />
        <Stat label="Tuckshop Stock Value" value={`$${stockValue.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-bold text-foreground mb-3">Sales by Hour (today)</h3>
          <div className="flex items-end gap-1 h-40">
            {byHour.map(b => (
              <div key={b.h} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(b.total / maxHour) * 100}%` }} title={`$${b.total.toFixed(2)}`} />
                <span className="text-[10px] text-muted-foreground">{b.h}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-bold text-foreground mb-3">Top Selling (today)</h3>
          <div className="space-y-2">
            {topItems.map(([pid, v]) => (
              <div key={pid} className="flex justify-between text-sm">
                <span className="text-foreground">{productMap[pid]?.name}</span>
                <span className="text-muted-foreground">{v.qty} × · ${v.revenue.toFixed(2)}</span>
              </div>
            ))}
            {!topItems.length && <p className="text-sm text-muted-foreground">No sales today</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-bold text-foreground mb-3">Payment Method Split</h3>
          <div className="space-y-2">
            {paymentSplit.map(p => (
              <div key={p.m}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{p.m}</span>
                  <span className="text-muted-foreground">${p.total.toFixed(2)} ({((p.total / paymentTotal) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(p.total / paymentTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" />Low Stock Alerts</h3>
          <div className="space-y-1 text-sm max-h-44 overflow-y-auto">
            {lowStock.map((p: any) => (
              <div key={p.id} className="flex justify-between">
                <span className="text-foreground">{p.name}</span>
                <span className="text-amber-600">{tuckStock[p.id] || 0} / {p.reorderLevel}</span>
              </div>
            ))}
            {!lowStock.length && <p className="text-muted-foreground">All items above reorder level</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Reports ----------------
function ReportsTab({ sales, shifts, movements, productMap }: any) {
  const { toast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<'daily' | 'cashup' | 'product' | 'movements' | 'voids' | 'student'>('daily');
  const [voidId, setVoidId] = useState('');

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const filteredSales = sales.filter((s: any) => inRange(s.date.slice(0, 10)));
  const filteredShifts = shifts.filter((s: any) => inRange(s.openedAt.slice(0, 10)));
  const filteredMov = movements.filter((m: any) => ['SALE', 'SALE_RETURN', 'WASTAGE'].includes(m.type) && m.warehouseId === TUCKSHOP_WAREHOUSE_ID && inRange(m.date));

  const exportCSV = (rows: any[][], name: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end print:hidden">
        <select value={report} onChange={e => setReport(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="daily">Daily Sales Summary</option>
          <option value="cashup">Cashup / Shift Reconciliation</option>
          <option value="product">Product Sales</option>
          <option value="movements">Stock Movements (Tuckshop)</option>
          <option value="voids">Voids & Refunds</option>
          <option value="student">Student Purchases</option>
        </select>
        <div><label className="block text-xs text-muted-foreground">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        <div><label className="block text-xs text-muted-foreground">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2"><Printer size={14} /> Print</button>
      </div>

      {report === 'daily' && (() => {
        const byDay: Record<string, { revenue: number; cogs: number; count: number }> = {};
        filteredSales.filter((s: any) => s.status === 'Completed').forEach((s: any) => {
          const d = s.date.slice(0, 10);
          byDay[d] = byDay[d] || { revenue: 0, cogs: 0, count: 0 };
          byDay[d].revenue += s.subtotal; byDay[d].cogs += s.cogs; byDay[d].count++;
        });
        const rows = Object.entries(byDay).sort();
        return (
          <ReportTable
            head={['Date', 'Sales', 'Revenue', 'COGS', 'Profit', 'Margin %']}
            body={rows.map(([d, v]) => [d, v.count, `$${v.revenue.toFixed(2)}`, `$${v.cogs.toFixed(2)}`, `$${(v.revenue - v.cogs).toFixed(2)}`, `${v.revenue ? (((v.revenue - v.cogs) / v.revenue) * 100).toFixed(1) : '0'}%`])}
            onExport={() => exportCSV([['Date', 'Sales', 'Revenue', 'COGS', 'Profit', 'Margin'], ...rows.map(([d, v]) => [d, v.count, v.revenue, v.cogs, v.revenue - v.cogs, ((v.revenue - v.cogs) / (v.revenue || 1)) * 100])], 'daily-sales')}
          />
        );
      })()}

      {report === 'cashup' && (
        <ReportTable
          head={['Ref', 'Operator', 'Opened', 'Closed', 'Opening', 'Expected', 'Declared', 'Variance']}
          body={filteredShifts.map((s: any) => [s.ref, s.operator, new Date(s.openedAt).toLocaleString(), s.closedAt ? new Date(s.closedAt).toLocaleString() : '-', `$${s.openingCash.toFixed(2)}`, s.expectedCash != null ? `$${s.expectedCash.toFixed(2)}` : '-', s.declaredCash != null ? `$${s.declaredCash.toFixed(2)}` : '-', s.variance != null ? `${s.variance >= 0 ? '+' : ''}$${s.variance.toFixed(2)}` : '-'])}
          onExport={() => exportCSV([['Ref', 'Operator', 'Opened', 'Closed', 'Opening', 'Expected', 'Declared', 'Variance'], ...filteredShifts.map((s: any) => [s.ref, s.operator, s.openedAt, s.closedAt, s.openingCash, s.expectedCash, s.declaredCash, s.variance])], 'cashup-report')}
        />
      )}

      {report === 'product' && (() => {
        const map: Record<string, { qty: number; revenue: number; cogs: number }> = {};
        filteredSales.filter((s: any) => s.status === 'Completed').forEach((s: any) => s.lines.forEach((l: any) => {
          map[l.productId] = map[l.productId] || { qty: 0, revenue: 0, cogs: 0 };
          map[l.productId].qty += l.quantity;
          map[l.productId].revenue += l.quantity * l.unitPrice;
          map[l.productId].cogs += l.quantity * l.unitCost;
        }));
        const rows = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
        return <ReportTable
          head={['Product', 'Qty Sold', 'Revenue', 'COGS', 'Profit']}
          body={rows.map(([pid, v]) => [productMap[pid]?.name || pid, v.qty, `$${v.revenue.toFixed(2)}`, `$${v.cogs.toFixed(2)}`, `$${(v.revenue - v.cogs).toFixed(2)}`])}
          onExport={() => exportCSV([['Product', 'Qty', 'Revenue', 'COGS', 'Profit'], ...rows.map(([pid, v]) => [productMap[pid]?.name || pid, v.qty, v.revenue, v.cogs, v.revenue - v.cogs])], 'product-sales')}
        />;
      })()}

      {report === 'movements' && (
        <ReportTable
          head={['Date', 'Type', 'Product', 'Qty', 'Unit Cost', 'Doc Ref']}
          body={filteredMov.map((m: any) => [m.date, m.type, productMap[m.productId]?.name || m.productId, m.quantity, `$${m.unitCost.toFixed(2)}`, m.documentRef])}
          onExport={() => exportCSV([['Date', 'Type', 'Product', 'Qty', 'Unit Cost', 'Doc Ref'], ...filteredMov.map((m: any) => [m.date, m.type, productMap[m.productId]?.name || m.productId, m.quantity, m.unitCost, m.documentRef])], 'tuckshop-movements')}
        />
      )}

      {report === 'voids' && (
        <>
          <div className="bg-card border border-border rounded-xl p-3 flex gap-2 items-end print:hidden">
            <input value={voidId} onChange={e => setVoidId(e.target.value)} placeholder="Sale Ref to void/refund (e.g. S-0001)"
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm flex-1" />
            <button onClick={() => { const s = sales.find((x: any) => x.ref === voidId); if (!s) return toast({ title: 'Sale not found', variant: 'destructive' }); const r = voidSale(s.id, 'Cancelled at counter'); toast({ title: r.ok ? 'Voided' : 'Failed', description: r.error, variant: r.ok ? 'default' : 'destructive' }); }}
              className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-1"><X size={14} /> Void</button>
            <button onClick={() => { const s = sales.find((x: any) => x.ref === voidId); if (!s) return toast({ title: 'Sale not found', variant: 'destructive' }); const r = refundSale(s.id, 'Customer refund'); toast({ title: r.ok ? 'Refunded' : 'Failed', description: r.error, variant: r.ok ? 'default' : 'destructive' }); }}
              className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-1"><RotateCcw size={14} /> Refund</button>
          </div>
          <ReportTable
            head={['Ref', 'Date', 'Operator', 'Status', 'Amount', 'Reason']}
            body={filteredSales.filter((s: any) => s.status !== 'Completed').map((s: any) => [s.ref, new Date(s.date).toLocaleString(), s.operator, s.status, `$${s.subtotal.toFixed(2)}`, s.voidReason || '-'])}
            onExport={() => exportCSV([['Ref', 'Date', 'Operator', 'Status', 'Amount', 'Reason'], ...filteredSales.filter((s: any) => s.status !== 'Completed').map((s: any) => [s.ref, s.date, s.operator, s.status, s.subtotal, s.voidReason])], 'voids-refunds')}
          />
        </>
      )}

      {report === 'student' && (() => {
        const map: Record<string, { name: string; total: number; count: number }> = {};
        filteredSales.filter((s: any) => s.status === 'Completed' && s.studentId).forEach((s: any) => {
          map[s.studentId] = map[s.studentId] || { name: s.studentName || s.studentId, total: 0, count: 0 };
          map[s.studentId].total += s.subtotal; map[s.studentId].count++;
        });
        const rows = Object.entries(map).sort((a, b) => b[1].total - a[1].total);
        return <ReportTable
          head={['Student', 'Purchases', 'Total Spend']}
          body={rows.map(([sid, v]) => [v.name, v.count, `$${v.total.toFixed(2)}`])}
          onExport={() => exportCSV([['Student', 'Purchases', 'Total'], ...rows.map(([sid, v]) => [v.name, v.count, v.total])], 'student-purchases')}
        />;
      })()}
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

function ReportTable({ head, body, onExport }: { head: string[]; body: any[][]; onExport: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex justify-between items-center print:hidden">
        <span className="text-sm text-muted-foreground">{body.length} rows</span>
        <button onClick={onExport} className="px-3 py-1.5 text-xs rounded-lg border border-border">Export CSV</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>{head.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
            </tr>
          ))}
          {!body.length && <tr><td colSpan={head.length} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

