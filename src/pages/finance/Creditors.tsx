import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { toast } from 'sonner';
import { listGLAccounts, num, type BackendGLAccount } from '@/lib/finance-api';
import {
  listSuppliers, createSupplier, updateSupplier,
  listSupplierBills, createSupplierBill,
  listSupplierPayments, createSupplierPayment,
  billBalance,
  type BackendSupplier, type BackendSupplierBill, type BackendSupplierPayment,
} from '@/lib/payables-api';
import {
  Plus, Search, Printer, Download, Eye, Check, Edit2, FileText,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];
const todayStr = () => new Date().toISOString().split('T')[0];

export default function Creditors() {
  const [suppliers, setSuppliers] = useState<BackendSupplier[]>([]);
  const [bills, setBills] = useState<BackendSupplierBill[]>([]);
  const [payments, setPayments] = useState<BackendSupplierPayment[]>([]);
  const [glAccounts, setGlAccounts] = useState<BackendGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('2000-01-01');
  const [dateTo, setDateTo] = useState('2100-12-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [viewStatement, setViewStatement] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<BackendSupplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [supForm, setSupForm] = useState({ code: '', name: '', contact: '', phone: '', email: '', address: '', bankDetails: '', taxNumber: '', paymentTerms: '30' });
  const [invForm, setInvForm] = useState({ supplierId: '', invoiceNumber: '', date: todayStr(), glAccountCode: '', description: '', amount: '', currency: 'USD' });
  const [payForm, setPayForm] = useState({ supplierId: '', invoiceId: '', date: todayStr(), amount: '', paymentMode: '', description: '' });

  const expenseAccounts = glAccounts.filter(a => a.type === 'Expense' || a.type === 'Asset');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, b, p, g] = await Promise.all([
        listSuppliers(), listSupplierBills(), listSupplierPayments(), listGLAccounts(),
      ]);
      setSuppliers(s);
      setBills(b);
      setPayments(p);
      setGlAccounts(g);
    } catch (e: any) {
      setError(e?.message || 'Could not load creditors data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const billStatusLabel = (b: BackendSupplierBill) => b.status === 'Unpaid' ? 'Outstanding' : b.status === 'Partial' ? 'Partially Paid' : b.status;

  const totalOutstanding = bills.reduce((s, b) => s + billBalance(b), 0);
  const totalPaid = payments.reduce((s, p) => s + num(p.amount), 0);
  const totalInvoiced = bills.reduce((s, b) => s + num(b.amount), 0);

  const aging = useMemo(() => {
    const today = new Date();
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    bills.filter(bi => billBalance(bi) > 0 && bi.status !== 'Cancelled').forEach(bi => {
      const balance = billBalance(bi);
      const days = Math.floor((today.getTime() - new Date(bi.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) b.current += balance;
      else if (days <= 30) b.days30 += balance;
      else if (days <= 60) b.days60 += balance;
      else if (days <= 90) b.days90 += balance;
      else b.over90 += balance;
      b.total += balance;
    });
    return b;
  }, [bills]);

  const filteredBills = bills.filter(b => {
    if (selectedSupplier !== 'all' && String(b.supplier) !== selectedSupplier) return false;
    if (searchTerm && !b.description?.toLowerCase().includes(searchTerm.toLowerCase()) && !b.bill_no.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (b.date < dateFrom || b.date > dateTo) return false;
    return true;
  });

  const supplierName = (id: number) => suppliers.find(s => s.id === id)?.name || `#${id}`;

  const handleSaveSupplier = async () => {
    if (!supForm.code || !supForm.name) {
      toast.error('Supplier code and name are required.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        code: supForm.code, name: supForm.name, contact: supForm.contact, phone: supForm.phone,
        email: supForm.email, address: supForm.address, bank_details: supForm.bankDetails,
        tax_number: supForm.taxNumber, payment_terms: parseInt(supForm.paymentTerms) || 30,
      };
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, input);
        toast.success('Supplier updated');
      } else {
        await createSupplier({ ...input, status: 'Active' });
        toast.success('Supplier created');
      }
      setSupForm({ code: '', name: '', contact: '', phone: '', email: '', address: '', bankDetails: '', taxNumber: '', paymentTerms: '30' });
      setShowSupplierForm(false);
      setEditingSupplier(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!invForm.supplierId || !invForm.invoiceNumber || !invForm.amount || !invForm.glAccountCode) {
      toast.error('Supplier, invoice number, GL account and amount are required.');
      return;
    }
    setSaving(true);
    try {
      const sup = suppliers.find(s => String(s.id) === invForm.supplierId);
      const amt = parseFloat(invForm.amount);
      const dueDate = new Date(invForm.date);
      dueDate.setDate(dueDate.getDate() + (num(sup?.payment_terms) || 30));
      await createSupplierBill({
        supplier: parseInt(invForm.supplierId),
        bill_no: invForm.invoiceNumber,
        date: invForm.date,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amt,
        currency: invForm.currency,
        description: invForm.description,
        gl_account_code: invForm.glAccountCode,
        status: 'Unpaid',
      });
      toast.success('Supplier bill captured');
      setInvForm({ supplierId: '', invoiceNumber: '', date: todayStr(), glAccountCode: '', description: '', amount: '', currency: 'USD' });
      setShowInvoiceForm(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the supplier bill.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!payForm.supplierId || !payForm.invoiceId || !payForm.amount || !payForm.paymentMode) {
      toast.error('Supplier, invoice, amount and payment mode are required.');
      return;
    }
    setSaving(true);
    try {
      const bill = bills.find(b => String(b.id) === payForm.invoiceId);
      await createSupplierPayment({
        supplier: parseInt(payForm.supplierId),
        bill: payForm.invoiceId ? parseInt(payForm.invoiceId) : null,
        date: payForm.date,
        amount: parseFloat(payForm.amount),
        method: payForm.paymentMode,
        description: payForm.description || `Payment for ${bill?.bill_no ?? ''}`,
      });
      toast.success('Payment recorded');
      setPayForm({ supplierId: '', invoiceId: '', date: todayStr(), amount: '', paymentMode: '', description: '' });
      setShowPaymentForm(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const openEditSupplier = (s: BackendSupplier) => {
    setEditingSupplier(s);
    setSupForm({
      code: s.code, name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '',
      address: s.address || '', bankDetails: s.bank_details || '', taxNumber: s.tax_number || '',
      paymentTerms: String(s.payment_terms ?? 30),
    });
    setShowSupplierForm(true);
  };

  const getStatementData = (supplierId: string) => {
    const supBills = bills.filter(b => String(b.supplier) === supplierId).sort((a, b) => a.date.localeCompare(b.date));
    const supPayments = payments.filter(p => String(p.supplier) === supplierId).sort((a, b) => a.date.localeCompare(b.date));
    const all = [
      ...supBills.map(b => ({ date: b.date, ref: b.bill_no, description: b.description, debit: num(b.amount), credit: 0 })),
      ...supPayments.map(p => ({ date: p.date, ref: p.reference || '', description: p.description || '', debit: 0, credit: num(p.amount) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return all.map(item => {
      running += item.debit - item.credit;
      return { ...item, balance: running };
    });
  };

  const supplierInvoicesForPayment = payForm.supplierId
    ? bills.filter(b => String(b.supplier) === payForm.supplierId && billBalance(b) > 0)
    : [];

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors";

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground">Loading creditors…</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="text-destructive" size={32} />
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Creditors (Accounts Payable)</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers, invoices, payments & outstanding liabilities</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className={btnOutline}><RefreshCw size={18} /> Refresh</button>
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-lg font-bold font-display">{suppliers.filter(s => s.status === 'Active').length}</p></CardContent></Card>
        <Card className="light-card-purple"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-lg font-bold font-display">${fmt(totalInvoiced)}</p></CardContent></Card>
        <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-lg font-bold font-display">${fmt(totalPaid)}</p></CardContent></Card>
        <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOutstanding)}</p></CardContent></Card>
        <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Overdue ({'>'}30 days)</p><p className="text-lg font-bold font-display">${fmt(aging.days30 + aging.days60 + aging.days90 + aging.over90)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="statement">Supplier Statement</TabsTrigger>
        </TabsList>

        {/* SUPPLIERS TAB */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search suppliers..." className={`${inputClass} pl-9`} />
            </div>
            <button onClick={() => { setEditingSupplier(null); setSupForm({ code: '', name: '', contact: '', phone: '', email: '', address: '', bankDetails: '', taxNumber: '', paymentTerms: '30' }); setShowSupplierForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Add Supplier
            </button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Code</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Contact</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Terms</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())).map(sup => {
                      const balance = bills.filter(b => b.supplier === sup.id).reduce((s, b) => s + billBalance(b), 0);
                      return (
                        <tr key={sup.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{sup.code}</td>
                          <td className="px-3 py-2 font-medium">{sup.name}</td>
                          <td className="px-3 py-2">{sup.contact}</td>
                          <td className="px-3 py-2">{sup.phone}</td>
                          <td className="px-3 py-2">{sup.payment_terms ?? 30} days</td>
                          <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(balance)}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => openEditSupplier(sup)} className="text-primary hover:text-primary/80"><Edit2 size={14} /></button>
                              <button onClick={() => setViewStatement(String(sup.id))} className="text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {suppliers.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No suppliers yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
              <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass} style={{ width: 'auto' }}>
                <option value="all">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <button onClick={() => setShowInvoiceForm(true)} className={btnPrimary}><Plus size={16} /> Capture Invoice</button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice #</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">GL Account</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(inv => (
                      <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2">{inv.date}</td>
                        <td className="px-3 py-2 font-mono text-xs text-primary">{inv.bill_no}</td>
                        <td className="px-3 py-2">{inv.supplier_name || supplierName(inv.supplier)}</td>
                        <td className="px-3 py-2">{inv.description}</td>
                        <td className="px-3 py-2 font-mono text-xs">{inv.gl_account_code}</td>
                        <td className="px-3 py-2 text-right">${fmt(num(inv.amount))}</td>
                        <td className="px-3 py-2 text-right text-success">${fmt(num(inv.paid))}</td>
                        <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(billBalance(inv))}</td>
                        <td className="px-3 py-2">{inv.due_date}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'Paid' ? 'bg-success/10 text-success' : inv.status === 'Partial' ? 'bg-warning/10 text-warning' : inv.status === 'Cancelled' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>{billStatusLabel(inv)}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && (
                      <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No invoices found.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td colSpan={5} className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">${fmt(filteredBills.reduce((s, i) => s + num(i.amount), 0))}</td>
                      <td className="px-3 py-2 text-right text-success">${fmt(filteredBills.reduce((s, i) => s + num(i.paid), 0))}</td>
                      <td className="px-3 py-2 text-right text-destructive">${fmt(filteredBills.reduce((s, i) => s + billBalance(i), 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
              <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass} style={{ width: 'auto' }}>
                <option value="all">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={() => setShowPaymentForm(true)} className={btnSuccess}><Plus size={16} /> Record Payment</button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => selectedSupplier === 'all' || String(p.supplier) === selectedSupplier).map(p => {
                      const inv = bills.find(b => b.id === p.bill);
                      return (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2">{p.date}</td>
                          <td className="px-3 py-2 font-mono text-xs text-primary">{p.reference}</td>
                          <td className="px-3 py-2">{p.supplier_name || supplierName(p.supplier)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{inv?.bill_no}</td>
                          <td className="px-3 py-2 text-right font-medium text-success">${fmt(num(p.amount))}</td>
                          <td className="px-3 py-2">{p.method}</td>
                        </tr>
                      );
                    })}
                    {payments.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No payments recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGING TAB */}
        <TabsContent value="aging" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Creditors Aging Report" subtitle={`As at ${new Date().toLocaleDateString()}`} />
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">Current</p><p className="text-lg font-bold font-display text-success">${fmt(aging.current)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">1-30 Days</p><p className="text-lg font-bold font-display text-warning">${fmt(aging.days30)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">31-60 Days</p><p className="text-lg font-bold font-display text-warning">${fmt(aging.days60)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">61-90 Days</p><p className="text-lg font-bold font-display text-destructive">${fmt(aging.days90)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">90+ Days</p><p className="text-lg font-bold font-display text-destructive">${fmt(aging.over90)}</p></CardContent></Card>
              <Card className="light-card-red"><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold font-display">${fmt(aging.total)}</p></CardContent></Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">1-30</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">31-60</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">61-90</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">90+</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(sup => {
                      const today = new Date();
                      const sb = { current: 0, d30: 0, d60: 0, d90: 0, o90: 0, total: 0 };
                      bills.filter(b => b.supplier === sup.id && billBalance(b) > 0).forEach(inv => {
                        const balance = billBalance(inv);
                        const days = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) sb.current += balance;
                        else if (days <= 30) sb.d30 += balance;
                        else if (days <= 60) sb.d60 += balance;
                        else if (days <= 90) sb.d90 += balance;
                        else sb.o90 += balance;
                        sb.total += balance;
                      });
                      if (sb.total === 0) return null;
                      return (
                        <tr key={sup.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{sup.name}</td>
                          <td className="px-3 py-2 text-right">{sb.current > 0 ? `$${fmt(sb.current)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d30 > 0 ? `$${fmt(sb.d30)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d60 > 0 ? `$${fmt(sb.d60)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d90 > 0 ? `$${fmt(sb.d90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.o90 > 0 ? `$${fmt(sb.o90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right font-bold">${fmt(sb.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.current)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days30)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days60)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days90)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.over90)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STATEMENT TAB */}
        <TabsContent value="statement" className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
              <select value={viewStatement || ''} onChange={e => setViewStatement(e.target.value || null)} className={selectClass} style={{ width: 'auto' }}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          </div>

          {viewStatement && (
            <div className="print-area">
              <ReportHeader reportTitle="Creditor Statement" subtitle={`${suppliers.find(s => String(s.id) === viewStatement)?.name} | ${dateFrom} to ${dateTo}`} />
              <Card>
                <CardContent className="pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reference</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Debit (Invoice)</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Credit (Payment)</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStatementData(viewStatement).filter(l => l.date >= dateFrom && l.date <= dateTo).map((line, i) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2">{line.date}</td>
                          <td className="px-3 py-2 font-mono text-xs">{line.ref}</td>
                          <td className="px-3 py-2">{line.description}</td>
                          <td className="px-3 py-2 text-right">{line.debit > 0 ? `$${fmt(line.debit)}` : ''}</td>
                          <td className="px-3 py-2 text-right text-success">{line.credit > 0 ? `$${fmt(line.credit)}` : ''}</td>
                          <td className="px-3 py-2 text-right font-medium">${fmt(line.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-foreground">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Supplier Code</label><input value={supForm.code} onChange={e => setSupForm(p => ({ ...p, code: e.target.value }))} className={inputClass} placeholder="SUP006" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Supplier Name</label><input value={supForm.name} onChange={e => setSupForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Company name" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Contact Person</label><input value={supForm.contact} onChange={e => setSupForm(p => ({ ...p, contact: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label><input value={supForm.phone} onChange={e => setSupForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Email</label><input value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Payment Terms (days)</label><input type="number" value={supForm.paymentTerms} onChange={e => setSupForm(p => ({ ...p, paymentTerms: e.target.value }))} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1">Address</label><input value={supForm.address} onChange={e => setSupForm(p => ({ ...p, address: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bank Details</label><input value={supForm.bankDetails} onChange={e => setSupForm(p => ({ ...p, bankDetails: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Tax Number</label><input value={supForm.taxNumber} onChange={e => setSupForm(p => ({ ...p, taxNumber: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }} className={btnOutline} disabled={saving}>Cancel</button>
              <button onClick={handleSaveSupplier} className={btnPrimary} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : 'Save Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Capture Supplier Invoice</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                <select value={invForm.supplierId} onChange={e => setInvForm(p => ({ ...p, supplierId: e.target.value }))} className={selectClass}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Number</label><input value={invForm.invoiceNumber} onChange={e => setInvForm(p => ({ ...p, invoiceNumber: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date</label><input type="date" value={invForm.date} onChange={e => setInvForm(p => ({ ...p, date: e.target.value }))} className={inputClass} /></div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">GL Account</label>
                <select value={invForm.glAccountCode} onChange={e => setInvForm(p => ({ ...p, glAccountCode: e.target.value }))} className={selectClass}>
                  <option value="">Select account...</option>
                  {expenseAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label><input type="number" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><input value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowInvoiceForm(false)} className={btnOutline} disabled={saving}>Cancel</button>
              <button onClick={handleSaveInvoice} className={btnPrimary} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : 'Save Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Record Supplier Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                <select value={payForm.supplierId} onChange={e => setPayForm(p => ({ ...p, supplierId: e.target.value, invoiceId: '' }))} className={selectClass}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice</label>
                <select value={payForm.invoiceId} onChange={e => setPayForm(p => ({ ...p, invoiceId: e.target.value }))} className={selectClass}>
                  <option value="">Select invoice...</option>
                  {supplierInvoicesForPayment.map(i => <option key={i.id} value={i.id}>{i.bill_no} - ${fmt(billBalance(i))} due</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date</label><input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label><input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} /></div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                <select value={payForm.paymentMode} onChange={e => setPayForm(p => ({ ...p, paymentMode: e.target.value }))} className={selectClass}>
                  <option value="">Select mode...</option>
                  {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><input value={payForm.description} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPaymentForm(false)} className={btnOutline} disabled={saving}>Cancel</button>
              <button onClick={handleSavePayment} className={btnSuccess} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : 'Save Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
