import React, { useState } from 'react';
import { transactions, students, glAccounts, type Transaction } from '@/lib/dummy-data';
import { Download, Plus, ArrowRightLeft, Printer, Edit2, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashbookAccount {
  id: string;
  code: string;
  name: string;
  type: 'Bank' | 'Petty Cash' | 'Mobile Money';
  balance: number;
}

interface PendingEntry {
  id: string;
  date: string;
  cashbookAccountId: string;
  module: 'student' | 'customer' | 'supplier' | 'gl';
  linkedAccountId: string;
  linkedAccountName: string;
  trCode: 'Receipt' | 'Payment';
  amount: number;
  paymentMode: string;
  description: string;
  status: 'pending' | 'processed';
}

const defaultCashbookAccounts: CashbookAccount[] = [
  { id: '1', code: '1000', name: 'Cash at Bank - FBC', type: 'Bank', balance: 45000 },
  { id: '2', code: '1100', name: 'Petty Cash', type: 'Petty Cash', balance: 2500 },
  { id: '3', code: '1150', name: 'EcoCash Mobile', type: 'Mobile Money', balance: 3200 },
];

const dummySuppliers = [
  { id: 's1', name: 'ABC Stationery Supplies' },
  { id: 's2', name: 'National Foods Ltd' },
  { id: 's3', name: 'Mega Office Furniture' },
];

const dummyCustomers = [
  { id: 'c1', name: 'PTA Committee' },
  { id: 'c2', name: 'Sports Council' },
  { id: 'c3', name: 'Cafeteria Vendor' },
];

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];

export default function Cashbook() {
  const [cashbookAccounts, setCashbookAccounts] = useState<CashbookAccount[]>(defaultCashbookAccounts);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashbookAccount | null>(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'processing' | 'report'>('report');

  // Processing form state
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [processedEntries, setProcessedEntries] = useState<PendingEntry[]>([
    // Dummy processed entries
    { id: 'p1', date: '2026-03-02', cashbookAccountId: '1', module: 'student', linkedAccountId: '1', linkedAccountName: 'Henry Murinda (2026HM4521)', trCode: 'Receipt', amount: 800, paymentMode: 'Bank Transfer', description: 'Tuition payment', status: 'processed' },
    { id: 'p2', date: '2026-03-05', cashbookAccountId: '1', module: 'gl', linkedAccountId: '5000', linkedAccountName: 'Salaries Expense', trCode: 'Payment', amount: 6500, paymentMode: 'Bank Transfer', description: 'March salary payment', status: 'processed' },
    { id: 'p3', date: '2026-03-08', cashbookAccountId: '2', module: 'gl', linkedAccountId: '5200', linkedAccountName: 'Supplies Expense', trCode: 'Payment', amount: 350, paymentMode: 'Cash', description: 'Office supplies', status: 'processed' },
  ]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    cashbookAccountId: '',
    module: '' as '' | 'student' | 'customer' | 'supplier' | 'gl',
    linkedAccountId: '',
    trCode: '' as '' | 'Receipt' | 'Payment',
    amount: '',
    paymentMode: '',
    description: '',
  });

  // Transfer state
  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
  });

  // Account form state
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'Bank' as CashbookAccount['type'], balance: '' });

  const getLinkedAccounts = () => {
    switch (formData.module) {
      case 'student': return students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName} (${s.regNumber})` }));
      case 'customer': return dummyCustomers;
      case 'supplier': return dummySuppliers;
      case 'gl': return glAccounts.map(a => ({ id: a.code, name: `${a.code} - ${a.name}` }));
      default: return [];
    }
  };

  const handleSaveEntry = () => {
    if (!formData.date || !formData.cashbookAccountId || !formData.module || !formData.linkedAccountId || !formData.trCode || !formData.amount || !formData.paymentMode) return;
    
    const linked = getLinkedAccounts().find(a => a.id === formData.linkedAccountId);
    const entry: PendingEntry = {
      id: String(Date.now()),
      date: formData.date,
      cashbookAccountId: formData.cashbookAccountId,
      module: formData.module,
      linkedAccountId: formData.linkedAccountId,
      linkedAccountName: linked?.name || '',
      trCode: formData.trCode as 'Receipt' | 'Payment',
      amount: parseFloat(formData.amount),
      paymentMode: formData.paymentMode,
      description: formData.description,
      status: 'pending',
    };
    setPendingEntries(prev => [...prev, entry]);
    setFormData(prev => ({ ...prev, linkedAccountId: '', trCode: '', amount: '', description: '' }));
  };

  const handleProcessEntries = () => {
    const toProcess = pendingEntries.map(e => ({ ...e, status: 'processed' as const }));
    setProcessedEntries(prev => [...prev, ...toProcess]);
    setPendingEntries([]);
  };

  const handleDeletePending = (id: string) => {
    setPendingEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleTransfer = () => {
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount || transferData.fromAccountId === transferData.toAccountId) return;
    const amount = parseFloat(transferData.amount);
    const fromAcc = cashbookAccounts.find(a => a.id === transferData.fromAccountId);
    const toAcc = cashbookAccounts.find(a => a.id === transferData.toAccountId);
    if (!fromAcc || !toAcc) return;

    // Create two processed entries for the transfer
    const transferEntries: PendingEntry[] = [
      { id: String(Date.now()) + 'a', date: transferData.date, cashbookAccountId: transferData.fromAccountId, module: 'gl', linkedAccountId: toAcc.code, linkedAccountName: `Transfer to ${toAcc.name}`, trCode: 'Payment', amount, paymentMode: 'Internal Transfer', description: transferData.description || `Transfer to ${toAcc.name}`, status: 'processed' },
      { id: String(Date.now()) + 'b', date: transferData.date, cashbookAccountId: transferData.toAccountId, module: 'gl', linkedAccountId: fromAcc.code, linkedAccountName: `Transfer from ${fromAcc.name}`, trCode: 'Receipt', amount, paymentMode: 'Internal Transfer', description: transferData.description || `Transfer from ${fromAcc.name}`, status: 'processed' },
    ];
    setProcessedEntries(prev => [...prev, ...transferEntries]);

    setCashbookAccounts(prev => prev.map(a => {
      if (a.id === transferData.fromAccountId) return { ...a, balance: a.balance - amount };
      if (a.id === transferData.toAccountId) return { ...a, balance: a.balance + amount };
      return a;
    }));

    setTransferData({ date: new Date().toISOString().split('T')[0], fromAccountId: '', toAccountId: '', amount: '', description: '' });
    setShowTransfer(false);
  };

  const handleSaveAccount = () => {
    if (!accountForm.code || !accountForm.name) return;
    if (editingAccount) {
      setCashbookAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, code: accountForm.code, name: accountForm.name, type: accountForm.type, balance: parseFloat(accountForm.balance) || a.balance } : a));
    } else {
      setCashbookAccounts(prev => [...prev, { id: String(Date.now()), code: accountForm.code, name: accountForm.name, type: accountForm.type, balance: parseFloat(accountForm.balance) || 0 }]);
    }
    setShowAccountModal(false);
    setEditingAccount(null);
    setAccountForm({ code: '', name: '', type: 'Bank', balance: '' });
  };

  const openEditAccount = (acc: CashbookAccount) => {
    setEditingAccount(acc);
    setAccountForm({ code: acc.code, name: acc.name, type: acc.type, balance: String(acc.balance) });
    setShowAccountModal(true);
  };

  const allEntries = [...processedEntries].sort((a, b) => b.date.localeCompare(a.date));

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cashbook</h1>
          <p className="text-sm text-muted-foreground">Manage cash & bank transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setEditingAccount(null); setAccountForm({ code: '', name: '', type: 'Bank', balance: '' }); setShowAccountModal(true); }} className={btnPrimary}>
            <Plus size={18} /> Add Cashbook Account
          </button>
          <button onClick={() => setActiveTab('processing')} className={btnPrimary}>
            <DollarSignIcon /> Cashbook Processing
          </button>
          <button onClick={() => setShowTransfer(true)} className={btnOutline}>
            <ArrowRightLeft size={18} /> Account Transfer
          </button>
          <button onClick={() => window.print()} className={btnOutline}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['accounts', 'processing', 'report'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'accounts' ? 'Cashbook Accounts' : tab === 'processing' ? 'Processing' : 'Cashbook Report'}
          </button>
        ))}
      </div>

      {/* Cashbook Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashbookAccounts.map(acc => (
            <Card key={acc.id} className="light-card-blue">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{acc.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${acc.type === 'Bank' ? 'bg-info/10 text-info' : acc.type === 'Petty Cash' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{acc.type}</span>
                </div>
                <CardTitle className="text-base mt-1">{acc.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold text-foreground">${acc.balance.toLocaleString()}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEditAccount(acc)} className="text-xs text-primary hover:underline flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processing Tab */}
      {activeTab === 'processing' && (
        <div className="space-y-4">
          <Card className="light-card-primary">
            <CardHeader>
              <CardTitle className="text-lg">New Transaction Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cashbook Account</label>
                  <select value={formData.cashbookAccountId} onChange={e => setFormData(p => ({ ...p, cashbookAccountId: e.target.value }))} className={selectClass}>
                    <option value="">Select account...</option>
                    {cashbookAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Module</label>
                  <select value={formData.module} onChange={e => setFormData(p => ({ ...p, module: e.target.value as any, linkedAccountId: '' }))} className={selectClass}>
                    <option value="">Select module...</option>
                    <option value="student">Student</option>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="gl">General Ledger (GL)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {formData.module === 'student' ? 'Student Account' : formData.module === 'customer' ? 'Customer' : formData.module === 'supplier' ? 'Supplier' : formData.module === 'gl' ? 'GL Account' : 'Account'}
                  </label>
                  <select value={formData.linkedAccountId} onChange={e => setFormData(p => ({ ...p, linkedAccountId: e.target.value }))} className={selectClass} disabled={!formData.module}>
                    <option value="">Select...</option>
                    {getLinkedAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Transaction Code</label>
                  <select value={formData.trCode} onChange={e => setFormData(p => ({ ...p, trCode: e.target.value as any }))} className={selectClass}>
                    <option value="">Select...</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Payment">Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ($)</label>
                  <input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                  <select value={formData.paymentMode} onChange={e => setFormData(p => ({ ...p, paymentMode: e.target.value }))} className={selectClass}>
                    <option value="">Select...</option>
                    {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Transaction description" className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <button onClick={handleSaveEntry} className={btnPrimary}>Save Entry</button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Entries Table */}
          {pendingEntries.length > 0 && (
            <Card className="light-card-warning">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pending Entries ({pendingEntries.length})</CardTitle>
                  <button onClick={handleProcessEntries} className={btnPrimary}>
                    <Check size={16} /> Process All
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Account</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Module</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Linked To</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mode</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingEntries.map(e => (
                        <tr key={e.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2">{e.date}</td>
                          <td className="px-3 py-2">{cashbookAccounts.find(a => a.id === e.cashbookAccountId)?.name}</td>
                          <td className="px-3 py-2 capitalize">{e.module}</td>
                          <td className="px-3 py-2">{e.linkedAccountName}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.trCode === 'Receipt' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{e.trCode}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">${e.amount.toLocaleString()}</td>
                          <td className="px-3 py-2">{e.paymentMode}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => handleDeletePending(e.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cashbook Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Module</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mode</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receipt</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map(e => (
                    <tr key={e.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-foreground">{cashbookAccounts.find(a => a.id === e.cashbookAccountId)?.name || '-'}</td>
                      <td className="px-4 py-3 text-foreground">{e.description}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{e.module}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.paymentMode}</td>
                      <td className="px-4 py-3 text-right text-success font-mono">{e.trCode === 'Receipt' ? `$${e.amount.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-right text-destructive font-mono">{e.trCode === 'Payment' ? `$${e.amount.toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-foreground">Totals</td>
                    <td className="px-4 py-3 text-right text-success font-mono">${allEntries.filter(e => e.trCode === 'Receipt').reduce((s, e) => s + e.amount, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-destructive font-mono">${allEntries.filter(e => e.trCode === 'Payment').reduce((s, e) => s + e.amount, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">{editingAccount ? 'Edit' : 'Add'} Cashbook Account</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account Code</label>
                <input value={accountForm.code} onChange={e => setAccountForm(p => ({ ...p, code: e.target.value }))} className={inputClass} placeholder="e.g. 1200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account Name</label>
                <input value={accountForm.name} onChange={e => setAccountForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g. Cash at Bank - CABS" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={accountForm.type} onChange={e => setAccountForm(p => ({ ...p, type: e.target.value as any }))} className={selectClass}>
                  <option value="Bank">Bank</option>
                  <option value="Petty Cash">Petty Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Opening Balance ($)</label>
                <input type="number" value={accountForm.balance} onChange={e => setAccountForm(p => ({ ...p, balance: e.target.value }))} className={inputClass} placeholder="0.00" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAccountModal(false); setEditingAccount(null); }} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveAccount} className={btnPrimary}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Account Transfer</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <input type="date" value={transferData.date} onChange={e => setTransferData(p => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">From Account</label>
                <select value={transferData.fromAccountId} onChange={e => setTransferData(p => ({ ...p, fromAccountId: e.target.value }))} className={selectClass}>
                  <option value="">Select source...</option>
                  {cashbookAccounts.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance.toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">To Account</label>
                <select value={transferData.toAccountId} onChange={e => setTransferData(p => ({ ...p, toAccountId: e.target.value }))} className={selectClass}>
                  <option value="">Select destination...</option>
                  {cashbookAccounts.filter(a => a.id !== transferData.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance.toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ($)</label>
                <input type="number" min="0" step="0.01" value={transferData.amount} onChange={e => setTransferData(p => ({ ...p, amount: e.target.value }))} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input value={transferData.description} onChange={e => setTransferData(p => ({ ...p, description: e.target.value }))} className={inputClass} placeholder="Transfer reason" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTransfer(false)} className={btnOutline}>Cancel</button>
              <button onClick={handleTransfer} className={btnPrimary}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DollarSignIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
