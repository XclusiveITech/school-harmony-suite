import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, Search, Printer, Download, Link2, Unlink, Eye, ArrowRightLeft, FileText, Users, Clock } from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  balance: number;
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  date: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: 'Outstanding' | 'Partially Paid' | 'Paid';
  matched: boolean;
  matchedWith?: string;
}

interface PaymentRecord {
  id: string;
  supplierId: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  paymentMode: string;
  matched: boolean;
  matchedWith?: string;
}

interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

// Dummy data
const suppliers: Supplier[] = [
  { id: 's1', code: 'SUP001', name: 'ABC Stationery Supplies', contact: 'John Smith', phone: '+263771112233', email: 'abc@supplies.com', balance: 4500 },
  { id: 's2', code: 'SUP002', name: 'National Foods Ltd', contact: 'Mary Jones', phone: '+263772223344', email: 'orders@natfoods.co.zw', balance: 8200 },
  { id: 's3', code: 'SUP003', name: 'Mega Office Furniture', contact: 'Peter Brown', phone: '+263773334455', email: 'sales@megaoffice.co.zw', balance: 3500 },
  { id: 's4', code: 'SUP004', name: 'ZESA Holdings', contact: 'Billing Dept', phone: '+263774445566', email: 'billing@zesa.co.zw', balance: 1500 },
  { id: 's5', code: 'SUP005', name: 'NetOne Telecoms', contact: 'Corporate', phone: '+263775556677', email: 'corporate@netone.co.zw', balance: 650 },
];

const supplierInvoices: SupplierInvoice[] = [
  { id: 'si1', supplierId: 's1', date: '2026-02-15', invoiceNumber: 'ABC-1045', description: 'Exercise books & pens', amount: 2500, paid: 1500, balance: 1000, dueDate: '2026-03-15', status: 'Partially Paid', matched: false },
  { id: 'si2', supplierId: 's1', date: '2026-03-01', invoiceNumber: 'ABC-1078', description: 'Chalk & markers', amount: 3500, paid: 0, balance: 3500, dueDate: '2026-03-31', status: 'Outstanding', matched: false },
  { id: 'si3', supplierId: 's2', date: '2026-01-20', invoiceNumber: 'NF-8821', description: 'Catering supplies - Jan', amount: 4200, paid: 4200, balance: 0, dueDate: '2026-02-20', status: 'Paid', matched: true, matchedWith: 'cp3' },
  { id: 'si4', supplierId: 's2', date: '2026-02-20', invoiceNumber: 'NF-8890', description: 'Catering supplies - Feb', amount: 4800, paid: 2000, balance: 2800, dueDate: '2026-03-20', status: 'Partially Paid', matched: false },
  { id: 'si5', supplierId: 's2', date: '2026-03-20', invoiceNumber: 'NF-8945', description: 'Catering supplies - Mar', amount: 5400, paid: 0, balance: 5400, dueDate: '2026-04-20', status: 'Outstanding', matched: false },
  { id: 'si6', supplierId: 's3', date: '2026-03-10', invoiceNumber: 'MOF-456', description: 'Classroom desks & chairs', amount: 3500, paid: 0, balance: 3500, dueDate: '2026-04-10', status: 'Outstanding', matched: false },
  { id: 'si7', supplierId: 's4', date: '2026-03-01', invoiceNumber: 'ZESA-0326', description: 'Electricity - March', amount: 1500, paid: 0, balance: 1500, dueDate: '2026-03-31', status: 'Outstanding', matched: false },
  { id: 'si8', supplierId: 's5', date: '2026-03-05', invoiceNumber: 'N1-7890', description: 'Internet & phone - March', amount: 650, paid: 0, balance: 650, dueDate: '2026-03-31', status: 'Outstanding', matched: false },
];

const creditorPayments: PaymentRecord[] = [
  { id: 'cp1', supplierId: 's1', date: '2026-03-05', reference: 'PAY-S001', description: 'Payment ABC Stationery - partial', amount: 1500, paymentMode: 'Bank Transfer', matched: true, matchedWith: 'si1' },
  { id: 'cp2', supplierId: 's2', date: '2026-02-28', reference: 'PAY-S002', description: 'Payment National Foods - partial', amount: 2000, paymentMode: 'Bank Transfer', matched: false },
  { id: 'cp3', supplierId: 's2', date: '2026-02-10', reference: 'PAY-S003', description: 'Payment National Foods - Jan inv', amount: 4200, paymentMode: 'Bank Transfer', matched: true, matchedWith: 'si3' },
];

export default function CreditorsReconciliation() {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [invoices, setInvoices] = useState(supplierInvoices);
  const [payments, setPayments] = useState(creditorPayments);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    if (selectedSupplier !== 'all' && inv.supplierId !== selectedSupplier) return false;
    if (showOnlyUnmatched && inv.matched) return false;
    if (searchTerm && !inv.description.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (selectedSupplier !== 'all' && p.supplierId !== selectedSupplier) return false;
    if (showOnlyUnmatched && p.matched) return false;
    if (searchTerm && !p.description.toLowerCase().includes(searchTerm.toLowerCase()) && !p.reference.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalOutstanding = suppliers.reduce((s, sup) => s + sup.balance, 0);

  // Aging calculation
  const aging = useMemo((): AgingBucket => {
    const today = new Date('2026-03-27');
    const bucket: AgingBucket = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    invoices.filter(i => i.balance > 0).forEach(inv => {
      const due = new Date(inv.dueDate);
      const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) bucket.current += inv.balance;
      else if (days <= 30) bucket.days30 += inv.balance;
      else if (days <= 60) bucket.days60 += inv.balance;
      else if (days <= 90) bucket.days90 += inv.balance;
      else bucket.over90 += inv.balance;
      bucket.total += inv.balance;
    });
    return bucket;
  }, [invoices]);

  const handleAutoMatch = () => {
    const newInv = [...invoices];
    const newPay = [...payments];
    for (let pi = 0; pi < newPay.length; pi++) {
      if (newPay[pi].matched) continue;
      for (let ii = 0; ii < newInv.length; ii++) {
        if (newInv[ii].matched || newInv[ii].supplierId !== newPay[pi].supplierId) continue;
        if (Math.abs(newPay[pi].amount - newInv[ii].paid) < 0.01 || Math.abs(newPay[pi].amount - newInv[ii].amount) < 0.01) {
          newInv[ii] = { ...newInv[ii], matched: true, matchedWith: newPay[pi].id };
          newPay[pi] = { ...newPay[pi], matched: true, matchedWith: newInv[ii].id };
          break;
        }
      }
    }
    setInvoices(newInv);
    setPayments(newPay);
  };

  const handleManualMatch = () => {
    if (!selectedInvoice || !selectedPayment) return;
    setInvoices(prev => prev.map(i => i.id === selectedInvoice ? { ...i, matched: true, matchedWith: selectedPayment } : i));
    setPayments(prev => prev.map(p => p.id === selectedPayment ? { ...p, matched: true, matchedWith: selectedInvoice } : p));
    setSelectedInvoice(null);
    setSelectedPayment(null);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors";
  const btnWarning = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Creditors Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Reconcile supplier invoices with payments made</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      <Tabs defaultValue="reconcile">
        <TabsList>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="statement">Creditor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="reconcile" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass}>
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button onClick={handleAutoMatch} className={btnSuccess}><Link2 size={16} /> Auto-Match</button>
                {selectedInvoice && selectedPayment && (
                  <button onClick={handleManualMatch} className={btnWarning}><ArrowRightLeft size={16} /> Match Selected</button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-lg font-bold font-display">{suppliers.length}</p></CardContent></Card>
            <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOutstanding)}</p></CardContent></Card>
            <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Unmatched Invoices</p><p className="text-lg font-bold font-display">{invoices.filter(i => !i.matched && i.balance > 0).length}</p></CardContent></Card>
            <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Fully Matched</p><p className="text-lg font-bold font-display">{invoices.filter(i => i.matched).length}</p></CardContent></Card>
          </div>

          {/* Search */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search invoices & payments..." className={`${inputClass} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showOnlyUnmatched} onChange={e => setShowOnlyUnmatched(e.target.checked)} className="rounded" />
              Unmatched only
            </label>
          </div>

          {/* Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-destructive" /> Supplier Invoices</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Supplier</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Balance</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id} onClick={() => !inv.matched && setSelectedInvoice(inv.id === selectedInvoice ? null : inv.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${inv.matched ? 'bg-success/5' : selectedInvoice === inv.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <td className="px-2 py-2">{inv.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="px-2 py-2">{suppliers.find(s => s.id === inv.supplierId)?.name}</td>
                          <td className="px-2 py-2 text-right">${fmt(inv.amount)}</td>
                          <td className="px-2 py-2 text-right font-medium">${fmt(inv.balance)}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'Paid' ? 'bg-success/10 text-success' : inv.status === 'Partially Paid' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-success" /> Payments Made</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Reference</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Supplier</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Mode</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(p => (
                        <tr key={p.id} onClick={() => !p.matched && setSelectedPayment(p.id === selectedPayment ? null : p.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${p.matched ? 'bg-success/5' : selectedPayment === p.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <td className="px-2 py-2">{p.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{p.reference}</td>
                          <td className="px-2 py-2">{suppliers.find(s => s.id === p.supplierId)?.name}</td>
                          <td className="px-2 py-2 text-right">${fmt(p.amount)}</td>
                          <td className="px-2 py-2">{p.paymentMode}</td>
                          <td className="px-2 py-2 text-center">
                            {p.matched ? <span className="text-xs text-success flex items-center justify-center gap-1"><CheckCircle2 size={14} /> Matched</span>
                              : <span className="text-xs text-warning flex items-center justify-center gap-1"><AlertTriangle size={14} /> Unmatched</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AGING TAB */}
        <TabsContent value="aging" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Creditors Aging Report" subtitle={`As at ${dateTo}`} />
            <Card>
              <CardContent className="pt-6">
                {/* Aging summary */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                  {[
                    { label: 'Current', value: aging.current, color: 'light-card-green' },
                    { label: '1-30 Days', value: aging.days30, color: 'light-card-blue' },
                    { label: '31-60 Days', value: aging.days60, color: 'light-card-orange' },
                    { label: '61-90 Days', value: aging.days90, color: 'light-card-red' },
                    { label: '90+ Days', value: aging.over90, color: 'light-card-red' },
                    { label: 'Total', value: aging.total, color: 'light-card-purple' },
                  ].map(b => (
                    <Card key={b.label} className={b.color}><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">{b.label}</p><p className="text-lg font-bold font-display">${fmt(b.value)}</p></CardContent></Card>
                  ))}
                </div>

                {/* Per-supplier aging */}
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
                      const supInvs = invoices.filter(i => i.supplierId === sup.id && i.balance > 0);
                      const today = new Date('2026-03-27');
                      const b = { current: 0, d30: 0, d60: 0, d90: 0, over: 0, total: 0 };
                      supInvs.forEach(inv => {
                        const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) b.current += inv.balance;
                        else if (days <= 30) b.d30 += inv.balance;
                        else if (days <= 60) b.d60 += inv.balance;
                        else if (days <= 90) b.d90 += inv.balance;
                        else b.over += inv.balance;
                        b.total += inv.balance;
                      });
                      if (b.total === 0) return null;
                      return (
                        <tr key={sup.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{sup.name}</td>
                          <td className="px-3 py-2 text-right">{b.current > 0 ? `$${fmt(b.current)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d30 > 0 ? `$${fmt(b.d30)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d60 > 0 ? `$${fmt(b.d60)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d90 > 0 ? `$${fmt(b.d90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.over > 0 ? `$${fmt(b.over)}` : '-'}</td>
                          <td className="px-3 py-2 text-right font-bold">${fmt(b.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary bg-muted font-bold">
                      <td className="px-3 py-2">TOTAL</td>
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
          <div className="print-area">
            <ReportHeader reportTitle="Creditor Statement" subtitle={selectedSupplier !== 'all' ? suppliers.find(s => s.id === selectedSupplier)?.name : 'All Suppliers'} />
            <Card>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass + ' print:hidden'}>
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Charges</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Payments</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sId = selectedSupplier;
                      const allItems: { date: string; ref: string; desc: string; charge: number; payment: number }[] = [];
                      invoices.filter(i => sId === 'all' || i.supplierId === sId).forEach(i => {
                        allItems.push({ date: i.date, ref: i.invoiceNumber, desc: i.description, charge: i.amount, payment: 0 });
                      });
                      payments.filter(p => sId === 'all' || p.supplierId === sId).forEach(p => {
                        allItems.push({ date: p.date, ref: p.reference, desc: p.description, charge: 0, payment: p.amount });
                      });
                      allItems.sort((a, b) => a.date.localeCompare(b.date));
                      let running = 0;
                      return allItems.map((item, idx) => {
                        running += item.charge - item.payment;
                        return (
                          <tr key={idx} className="border-b border-border hover:bg-muted/50">
                            <td className="px-3 py-2">{item.date}</td>
                            <td className="px-3 py-2 font-mono text-xs">{item.ref}</td>
                            <td className="px-3 py-2">{item.desc}</td>
                            <td className="px-3 py-2 text-right">{item.charge > 0 ? `$${fmt(item.charge)}` : ''}</td>
                            <td className="px-3 py-2 text-right">{item.payment > 0 ? `$${fmt(item.payment)}` : ''}</td>
                            <td className="px-3 py-2 text-right font-medium">${fmt(running)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
