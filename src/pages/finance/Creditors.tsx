import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { glAccounts } from '@/lib/dummy-data';
import {
  Plus, Search, Printer, Download, Eye, X, Check, Edit2, FileText,
  Users, Clock, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';

// Types
interface Supplier {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  bankDetails: string;
  taxNumber: string;
  paymentTerms: number; // days
  status: 'Active' | 'Inactive';
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  glAccountCode: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  currency: string;
  status: 'Outstanding' | 'Partially Paid' | 'Paid' | 'Cancelled';
}

interface SupplierPayment {
  id: string;
  supplierId: string;
  invoiceId: string;
  date: string;
  reference: string;
  amount: number;
  paymentMode: string;
  currency: string;
  description: string;
  status: 'Pending' | 'Processed';
}

// Dummy data
const initialSuppliers: Supplier[] = [
  { id: 's1', code: 'SUP001', name: 'ABC Stationery Supplies', contact: 'John Smith', phone: '+263771112233', email: 'abc@supplies.com', address: '12 Industrial Rd, Harare', bankDetails: 'FBC Acc: 1234567890', taxNumber: 'TIN-001234', paymentTerms: 30, status: 'Active' },
  { id: 's2', code: 'SUP002', name: 'National Foods Ltd', contact: 'Mary Jones', phone: '+263772223344', email: 'orders@natfoods.co.zw', address: '45 Robert Mugabe Rd, Harare', bankDetails: 'CBZ Acc: 9876543210', taxNumber: 'TIN-005678', paymentTerms: 30, status: 'Active' },
  { id: 's3', code: 'SUP003', name: 'Mega Office Furniture', contact: 'Peter Brown', phone: '+263773334455', email: 'sales@megaoffice.co.zw', address: '78 Samora Machel Ave', bankDetails: 'Stanbic Acc: 5555666677', taxNumber: 'TIN-009012', paymentTerms: 45, status: 'Active' },
  { id: 's4', code: 'SUP004', name: 'ZESA Holdings', contact: 'Billing Dept', phone: '+263774445566', email: 'billing@zesa.co.zw', address: 'Electricity Centre, Harare', bankDetails: 'ZB Acc: 1111222233', taxNumber: 'TIN-003456', paymentTerms: 14, status: 'Active' },
  { id: 's5', code: 'SUP005', name: 'NetOne Telecoms', contact: 'Corporate', phone: '+263775556677', email: 'corporate@netone.co.zw', address: 'NetOne Centre, Harare', bankDetails: 'CABS Acc: 4444555566', taxNumber: 'TIN-007890', paymentTerms: 30, status: 'Active' },
];

const initialInvoices: SupplierInvoice[] = [
  { id: 'si1', supplierId: 's1', invoiceNumber: 'ABC-1045', date: '2026-02-15', dueDate: '2026-03-17', glAccountCode: '5200', description: 'Exercise books & pens', amount: 2500, paid: 1500, balance: 1000, currency: 'USD', status: 'Partially Paid' },
  { id: 'si2', supplierId: 's1', invoiceNumber: 'ABC-1078', date: '2026-03-01', dueDate: '2026-03-31', glAccountCode: '5200', description: 'Chalk & markers', amount: 3500, paid: 0, balance: 3500, currency: 'USD', status: 'Outstanding' },
  { id: 'si3', supplierId: 's2', invoiceNumber: 'NF-8821', date: '2026-01-20', dueDate: '2026-02-20', glAccountCode: '5200', description: 'Catering supplies - Jan', amount: 4200, paid: 4200, balance: 0, currency: 'USD', status: 'Paid' },
  { id: 'si4', supplierId: 's2', invoiceNumber: 'NF-8890', date: '2026-02-20', dueDate: '2026-03-22', glAccountCode: '5200', description: 'Catering supplies - Feb', amount: 4800, paid: 2000, balance: 2800, currency: 'USD', status: 'Partially Paid' },
  { id: 'si5', supplierId: 's2', invoiceNumber: 'NF-8945', date: '2026-03-20', dueDate: '2026-04-20', glAccountCode: '5200', description: 'Catering supplies - Mar', amount: 5400, paid: 0, balance: 5400, currency: 'USD', status: 'Outstanding' },
  { id: 'si6', supplierId: 's3', invoiceNumber: 'MOF-456', date: '2026-03-10', dueDate: '2026-04-24', glAccountCode: '1500', description: 'Classroom desks & chairs', amount: 3500, paid: 0, balance: 3500, currency: 'USD', status: 'Outstanding' },
  { id: 'si7', supplierId: 's4', invoiceNumber: 'ZESA-0326', date: '2026-03-01', dueDate: '2026-03-15', glAccountCode: '5100', description: 'Electricity - March', amount: 1500, paid: 0, balance: 1500, currency: 'USD', status: 'Outstanding' },
  { id: 'si8', supplierId: 's5', invoiceNumber: 'N1-7890', date: '2026-03-05', dueDate: '2026-04-04', glAccountCode: '5100', description: 'Internet & phone - March', amount: 650, paid: 0, balance: 650, currency: 'USD', status: 'Outstanding' },
];

const initialPayments: SupplierPayment[] = [
  { id: 'sp1', supplierId: 's1', invoiceId: 'si1', date: '2026-03-05', reference: 'PAY-S001', amount: 1500, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Partial payment - ABC Stationery', status: 'Processed' },
  { id: 'sp2', supplierId: 's2', invoiceId: 'si3', date: '2026-02-10', reference: 'PAY-S002', amount: 4200, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Full payment - NF Jan invoice', status: 'Processed' },
  { id: 'sp3', supplierId: 's2', invoiceId: 'si4', date: '2026-02-28', reference: 'PAY-S003', amount: 2000, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Partial payment - NF Feb invoice', status: 'Processed' },
];

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];
const expenseAccounts = glAccounts.filter(a => a.type === 'Expense' || a.type === 'Asset');

export default function Creditors() {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [viewStatement, setViewStatement] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier form
  const [supForm, setSupForm] = useState({ code: '', name: '', contact: '', phone: '', email: '', address: '', bankDetails: '', taxNumber: '', paymentTerms: '30' });

  // Invoice form
  const [invForm, setInvForm] = useState({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], glAccountCode: '', description: '', amount: '', currency: 'USD' });

  // Payment form
  const [payForm, setPayForm] = useState({ supplierId: '', invoiceId: '', date: new Date().toISOString().split('T')[0], amount: '', paymentMode: '', description: '' });

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Totals
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const totalPaid = payments.filter(p => p.status === 'Processed').reduce((s, p) => s + p.amount, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);

  // Aging
  const aging = useMemo(() => {
    const today = new Date('2026-03-27');
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    invoices.filter(i => i.balance > 0).forEach(inv => {
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) b.current += inv.balance;
      else if (days <= 30) b.days30 += inv.balance;
      else if (days <= 60) b.days60 += inv.balance;
      else if (days <= 90) b.days90 += inv.balance;
      else b.over90 += inv.balance;
      b.total += inv.balance;
    });
    return b;
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (selectedSupplier !== 'all' && inv.supplierId !== selectedSupplier) return false;
    if (searchTerm && !inv.description.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (inv.date < dateFrom || inv.date > dateTo) return false;
    return true;
  });

  // Save supplier
  const handleSaveSupplier = () => {
    if (!supForm.code || !supForm.name) return;
    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...supForm, paymentTerms: parseInt(supForm.paymentTerms) || 30 } : s));
    } else {
      setSuppliers(prev => [...prev, { id: String(Date.now()), ...supForm, paymentTerms: parseInt(supForm.paymentTerms) || 30, status: 'Active' as const }]);
    }
    setSupForm({ code: '', name: '', contact: '', phone: '', email: '', address: '', bankDetails: '', taxNumber: '', paymentTerms: '30' });
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  // Save invoice
  const handleSaveInvoice = () => {
    if (!invForm.supplierId || !invForm.invoiceNumber || !invForm.amount || !invForm.glAccountCode) return;
    const sup = suppliers.find(s => s.id === invForm.supplierId);
    const amt = parseFloat(invForm.amount);
    const dueDate = new Date(invForm.date);
    dueDate.setDate(dueDate.getDate() + (sup?.paymentTerms || 30));
    setInvoices(prev => [...prev, {
      id: String(Date.now()),
      supplierId: invForm.supplierId,
      invoiceNumber: invForm.invoiceNumber,
      date: invForm.date,
      dueDate: dueDate.toISOString().split('T')[0],
      glAccountCode: invForm.glAccountCode,
      description: invForm.description,
      amount: amt,
      paid: 0,
      balance: amt,
      currency: invForm.currency,
      status: 'Outstanding' as const,
    }]);
    setInvForm({ supplierId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], glAccountCode: '', description: '', amount: '', currency: 'USD' });
    setShowInvoiceForm(false);
  };

  // Save payment
  const handleSavePayment = () => {
    if (!payForm.supplierId || !payForm.invoiceId || !payForm.amount || !payForm.paymentMode) return;
    const amt = parseFloat(payForm.amount);
    const inv = invoices.find(i => i.id === payForm.invoiceId);
    if (!inv) return;

    setPayments(prev => [...prev, {
      id: String(Date.now()),
      supplierId: payForm.supplierId,
      invoiceId: payForm.invoiceId,
      date: payForm.date,
      reference: `PAY-S${String(prev.length + 1).padStart(3, '0')}`,
      amount: amt,
      paymentMode: payForm.paymentMode,
      currency: inv.currency,
      description: payForm.description || `Payment for ${inv.invoiceNumber}`,
      status: 'Processed' as const,
    }]);

    // Update invoice
    const newPaid = inv.paid + amt;
    const newBalance = inv.amount - newPaid;
    setInvoices(prev => prev.map(i => i.id === payForm.invoiceId ? {
      ...i, paid: newPaid, balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? 'Paid' : 'Partially Paid',
    } : i));

    setPayForm({ supplierId: '', invoiceId: '', date: new Date().toISOString().split('T')[0], amount: '', paymentMode: '', description: '' });
    setShowPaymentForm(false);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupForm({ code: s.code, name: s.name, contact: s.contact, phone: s.phone, email: s.email, address: s.address, bankDetails: s.bankDetails, taxNumber: s.taxNumber, paymentTerms: String(s.paymentTerms) });
    setShowSupplierForm(true);
  };

  // Statement data for a supplier
  const getStatementData = (supplierId: string) => {
    const supInvoices = invoices.filter(i => i.supplierId === supplierId).sort((a, b) => a.date.localeCompare(b.date));
    const supPayments = payments.filter(p => p.supplierId === supplierId && p.status === 'Processed').sort((a, b) => a.date.localeCompare(b.date));
    const lines: { date: string; ref: string; description: string; debit: number; credit: number; balance: number }[] = [];
    let running = 0;
    const all = [
      ...supInvoices.map(i => ({ date: i.date, ref: i.invoiceNumber, description: i.description, debit: i.amount, credit: 0, type: 'inv' as const })),
      ...supPayments.map(p => ({ date: p.date, ref: p.reference, description: p.description, debit: 0, credit: p.amount, type: 'pay' as const })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    all.forEach(item => {
      running += item.debit - item.credit;
      lines.push({ ...item, balance: running });
    });
    return lines;
  };

  const supplierInvoicesForPayment = payForm.supplierId
    ? invoices.filter(i => i.supplierId === payForm.supplierId && i.balance > 0)
    : [];

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Creditors (Accounts Payable)</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers, invoices, payments & outstanding liabilities</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
                      const balance = invoices.filter(i => i.supplierId === sup.id).reduce((s, i) => s + i.balance, 0);
                      return (
                        <tr key={sup.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{sup.code}</td>
                          <td className="px-3 py-2 font-medium">{sup.name}</td>
                          <td className="px-3 py-2">{sup.contact}</td>
                          <td className="px-3 py-2">{sup.phone}</td>
                          <td className="px-3 py-2">{sup.paymentTerms} days</td>
                          <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(balance)}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => openEditSupplier(sup)} className="text-primary hover:text-primary/80"><Edit2 size={14} /></button>
                              <button onClick={() => setViewStatement(sup.id)} className="text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2">{inv.date}</td>
                        <td className="px-3 py-2 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{suppliers.find(s => s.id === inv.supplierId)?.name}</td>
                        <td className="px-3 py-2">{inv.description}</td>
                        <td className="px-3 py-2 font-mono text-xs">{inv.glAccountCode}</td>
                        <td className="px-3 py-2 text-right">${fmt(inv.amount)}</td>
                        <td className="px-3 py-2 text-right text-success">${fmt(inv.paid)}</td>
                        <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(inv.balance)}</td>
                        <td className="px-3 py-2">{inv.dueDate}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'Paid' ? 'bg-success/10 text-success' : inv.status === 'Partially Paid' ? 'bg-warning/10 text-warning' : inv.status === 'Cancelled' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td colSpan={5} className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">${fmt(filteredInvoices.reduce((s, i) => s + i.amount, 0))}</td>
                      <td className="px-3 py-2 text-right text-success">${fmt(filteredInvoices.reduce((s, i) => s + i.paid, 0))}</td>
                      <td className="px-3 py-2 text-right text-destructive">${fmt(filteredInvoices.reduce((s, i) => s + i.balance, 0))}</td>
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
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => selectedSupplier === 'all' || p.supplierId === selectedSupplier).map(p => {
                      const inv = invoices.find(i => i.id === p.invoiceId);
                      return (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2">{p.date}</td>
                          <td className="px-3 py-2 font-mono text-xs text-primary">{p.reference}</td>
                          <td className="px-3 py-2">{suppliers.find(s => s.id === p.supplierId)?.name}</td>
                          <td className="px-3 py-2 font-mono text-xs">{inv?.invoiceNumber}</td>
                          <td className="px-3 py-2 text-right font-medium text-success">${fmt(p.amount)}</td>
                          <td className="px-3 py-2">{p.paymentMode}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'Processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{p.status}</span>
                          </td>
                        </tr>
                      );
                    })}
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
                      const today = new Date('2026-03-27');
                      const sb = { current: 0, d30: 0, d60: 0, d90: 0, o90: 0, total: 0 };
                      invoices.filter(i => i.supplierId === sup.id && i.balance > 0).forEach(inv => {
                        const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) sb.current += inv.balance;
                        else if (days <= 30) sb.d30 += inv.balance;
                        else if (days <= 60) sb.d60 += inv.balance;
                        else if (days <= 90) sb.d90 += inv.balance;
                        else sb.o90 += inv.balance;
                        sb.total += inv.balance;
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
              <ReportHeader reportTitle="Creditor Statement" subtitle={`${suppliers.find(s => s.id === viewStatement)?.name} | ${dateFrom} to ${dateTo}`} />
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
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Email</label><input type="email" value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Payment Terms (days)</label><input type="number" value={supForm.paymentTerms} onChange={e => setSupForm(p => ({ ...p, paymentTerms: e.target.value }))} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1">Address</label><input value={supForm.address} onChange={e => setSupForm(p => ({ ...p, address: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bank Details</label><input value={supForm.bankDetails} onChange={e => setSupForm(p => ({ ...p, bankDetails: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Tax Number</label><input value={supForm.taxNumber} onChange={e => setSupForm(p => ({ ...p, taxNumber: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveSupplier} className={btnPrimary}><Check size={16} /> Save</button>
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
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                <select value={invForm.supplierId} onChange={e => setInvForm(p => ({ ...p, supplierId: e.target.value }))} className={selectClass}>
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Invoice Number</label><input value={invForm.invoiceNumber} onChange={e => setInvForm(p => ({ ...p, invoiceNumber: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date</label><input type="date" value={invForm.date} onChange={e => setInvForm(p => ({ ...p, date: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Expense Account</label>
                <select value={invForm.glAccountCode} onChange={e => setInvForm(p => ({ ...p, glAccountCode: e.target.value }))} className={selectClass}>
                  <option value="">Select GL Account...</option>
                  {expenseAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label><input type="number" min="0" step="0.01" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} placeholder="0.00" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label><input value={invForm.currency} onChange={e => setInvForm(p => ({ ...p, currency: e.target.value }))} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><input value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowInvoiceForm(false)} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveInvoice} className={btnPrimary}><Check size={16} /> Save Invoice</button>
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
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                <select value={payForm.supplierId} onChange={e => setPayForm(p => ({ ...p, supplierId: e.target.value, invoiceId: '' }))} className={selectClass}>
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Invoice</label>
                <select value={payForm.invoiceId} onChange={e => setPayForm(p => ({ ...p, invoiceId: e.target.value }))} className={selectClass} disabled={!payForm.supplierId}>
                  <option value="">Select invoice...</option>
                  {supplierInvoicesForPayment.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} (Bal: ${fmt(i.balance)})</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date</label><input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label><input type="number" min="0" step="0.01" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} placeholder="0.00" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                <select value={payForm.paymentMode} onChange={e => setPayForm(p => ({ ...p, paymentMode: e.target.value }))} className={selectClass}>
                  <option value="">Select...</option>
                  {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><input value={payForm.description} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPaymentForm(false)} className={btnOutline}>Cancel</button>
              <button onClick={handleSavePayment} className={btnSuccess}><Check size={16} /> Process Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
