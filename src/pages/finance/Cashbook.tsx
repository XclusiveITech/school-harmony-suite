import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, ArrowRightLeft, Printer, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listCashbookEntries, createCashbookEntry, processCashbookEntry, deleteCashbookEntry,
  listLedgerAccounts, num,
  type CashbookEntry, type LedgerGLAccount, type CashbookType,
} from '@/lib/ledger-api';

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];

export default function Cashbook() {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'processing' | 'report'>('report');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    account: '',
    contra_account: '',
    type: '' as '' | CashbookType,
    amount: '',
    method: '',
    description: '',
    counterparty: '',
    reference: '',
  });

  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccount: '',
    toAccount: '',
    amount: '',
    description: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cbs, accs] = await Promise.all([listCashbookEntries(), listLedgerAccounts()]);
      setEntries(cbs);
      setAccounts(accs);
    } catch (e: any) {
      setError(e?.message || 'Could not load the cashbook from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const bankAccounts = useMemo(
    () => accounts.filter(a => /bank|cash|petty|mobile/i.test(a.type || a.name || '')),
    [accounts],
  );

  const accountBalances = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of bankAccounts) map[a.id] = 0;
    for (const e of entries) {
      if (e.status !== 'Processed') continue;
      const amt = num(e.amount);
      if (e.type === 'Receipt') map[e.account] = (map[e.account] ?? 0) + amt;
      else if (e.type === 'Payment') map[e.account] = (map[e.account] ?? 0) - amt;
      else if (e.type === 'Transfer') {
        map[e.account] = (map[e.account] ?? 0) - amt;
        if (e.contra_account) map[e.contra_account] = (map[e.contra_account] ?? 0) + amt;
      }
    }
    return map;
  }, [entries, bankAccounts]);

  const pendingEntries = entries.filter(e => e.status === 'Pending');
  const processedEntries = [...entries.filter(e => e.status === 'Processed')].sort((a, b) => b.date.localeCompare(a.date));

  const accountLabel = (id?: number | null) => {
    if (!id) return '-';
    const a = accounts.find(x => x.id === id);
    return a ? `${a.code} - ${a.name}` : String(id);
  };

  const handleSaveEntry = async () => {
    if (!formData.date || !formData.account || !formData.type || !formData.amount || !formData.method) {
      toast.error('Date, account, type, amount and method are required.');
      return;
    }
    setSaving(true);
    try {
      await createCashbookEntry({
        date: formData.date,
        type: formData.type as CashbookType,
        account: Number(formData.account),
        contra_account: formData.contra_account ? Number(formData.contra_account) : null,
        amount: parseFloat(formData.amount),
        currency: 'USD',
        method: formData.method,
        reference: formData.reference,
        description: formData.description,
        status: 'Pending',
        counterparty: formData.counterparty,
      });
      toast.success('Cashbook entry saved as pending');
      setFormData(p => ({ ...p, contra_account: '', amount: '', description: '', counterparty: '', reference: '' }));
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the cashbook entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessOne = async (id: number) => {
    try {
      await processCashbookEntry(id);
      toast.success('Entry processed');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not process the entry.');
    }
  };

  const handleProcessAll = async () => {
    setSaving(true);
    try {
      for (const e of pendingEntries) await processCashbookEntry(e.id);
      toast.success('All pending entries processed');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not process all entries.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePending = async (id: number) => {
    try {
      await deleteCashbookEntry(id);
      toast.success('Entry removed');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove the entry.');
    }
  };

  const handleTransfer = async () => {
    if (!transferData.fromAccount || !transferData.toAccount || !transferData.amount || transferData.fromAccount === transferData.toAccount) {
      toast.error('Select two different accounts and an amount.');
      return;
    }
    setSaving(true);
    try {
      const entry = await createCashbookEntry({
        date: transferData.date,
        type: 'Transfer',
        account: Number(transferData.fromAccount),
        contra_account: Number(transferData.toAccount),
        amount: parseFloat(transferData.amount),
        currency: 'USD',
        method: 'Internal Transfer',
        description: transferData.description,
        status: 'Pending',
      });
      await processCashbookEntry(entry.id);
      toast.success('Transfer processed');
      setTransferData({ date: new Date().toISOString().split('T')[0], fromAccount: '', toAccount: '', amount: '', description: '' });
      setShowTransfer(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not complete the transfer.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60";
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
          <button onClick={() => setActiveTab('processing')} className={btnPrimary}>
            <Plus size={18} /> Cashbook Processing
          </button>
          <button onClick={() => setShowTransfer(true)} className={btnOutline}>
            <ArrowRightLeft size={18} /> Account Transfer
          </button>
          <button onClick={() => window.print()} className={btnOutline}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading cashbook…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

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
          {bankAccounts.map(acc => (
            <Card key={acc.id} className="light-card-blue">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{acc.code}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">{acc.type}</span>
                </div>
                <CardTitle className="text-base mt-1">{acc.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold text-foreground">${(accountBalances[acc.id] ?? 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
          {!loading && bankAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No bank/cash GL accounts found.</p>
          )}
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
                  <select value={formData.account} onChange={e => setFormData(p => ({ ...p, account: e.target.value }))} className={selectClass}>
                    <option value="">Select account...</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Contra / GL Account</label>
                  <select value={formData.contra_account} onChange={e => setFormData(p => ({ ...p, contra_account: e.target.value }))} className={selectClass}>
                    <option value="">Select...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Transaction Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))} className={selectClass}>
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
                  <select value={formData.method} onChange={e => setFormData(p => ({ ...p, method: e.target.value }))} className={selectClass}>
                    <option value="">Select...</option>
                    {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Counterparty</label>
                  <input type="text" value={formData.counterparty} onChange={e => setFormData(p => ({ ...p, counterparty: e.target.value }))} placeholder="Student / supplier / customer" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Transaction description" className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <button disabled={saving} onClick={handleSaveEntry} className={btnPrimary}>Save Entry</button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Entries Table */}
          {pendingEntries.length > 0 && (
            <Card className="light-card-warning">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pending Entries ({pendingEntries.length})</CardTitle>
                  <button disabled={saving} onClick={handleProcessAll} className={btnPrimary}>
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
                          <td className="px-3 py-2">{accountLabel(e.account)}</td>
                          <td className="px-3 py-2">{accountLabel(e.contra_account)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'Receipt' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{e.type}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">${num(e.amount).toLocaleString()}</td>
                          <td className="px-3 py-2">{e.method}</td>
                          <td className="px-3 py-2 text-center flex gap-2 justify-center">
                            <button onClick={() => handleProcessOne(e.id)} className="text-success hover:text-success/80"><Check size={14} /></button>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mode</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receipt</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {processedEntries.map(e => (
                    <tr key={e.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-foreground">{accountLabel(e.account)}</td>
                      <td className="px-4 py-3 text-foreground">{e.description}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{e.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.method}</td>
                      <td className="px-4 py-3 text-right text-success font-mono">{e.type === 'Receipt' ? `$${num(e.amount).toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-right text-destructive font-mono">{e.type === 'Payment' ? `$${num(e.amount).toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                  {!loading && processedEntries.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No processed transactions yet.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-foreground">Totals</td>
                    <td className="px-4 py-3 text-right text-success font-mono">${processedEntries.filter(e => e.type === 'Receipt').reduce((s, e) => s + num(e.amount), 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-destructive font-mono">${processedEntries.filter(e => e.type === 'Payment').reduce((s, e) => s + num(e.amount), 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
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
                <select value={transferData.fromAccount} onChange={e => setTransferData(p => ({ ...p, fromAccount: e.target.value }))} className={selectClass}>
                  <option value="">Select source...</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name} (${(accountBalances[a.id] ?? 0).toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">To Account</label>
                <select value={transferData.toAccount} onChange={e => setTransferData(p => ({ ...p, toAccount: e.target.value }))} className={selectClass}>
                  <option value="">Select destination...</option>
                  {bankAccounts.filter(a => String(a.id) !== transferData.fromAccount).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name} (${(accountBalances[a.id] ?? 0).toLocaleString()})</option>)}
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
              <button disabled={saving} onClick={handleTransfer} className={btnPrimary}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
