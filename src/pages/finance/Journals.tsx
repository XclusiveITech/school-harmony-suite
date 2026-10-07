import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Download, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listJournalEntries, createJournalEntry, postJournalEntry, cancelJournalEntry,
  listLedgerAccounts, num,
  type JournalEntry, type LedgerGLAccount,
} from '@/lib/ledger-api';

interface FormLine { account: string; debit: string; credit: string; memo: string }

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  reference: '',
  description: '',
  lines: [{ account: '', debit: '', credit: '', memo: '' }] as FormLine[],
});

export default function Journals() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [js, accs] = await Promise.all([listJournalEntries(), listLedgerAccounts()]);
      setJournals(js);
      setAccounts(accs);
    } catch (e: any) {
      setError(e?.message || 'Could not load journals from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    for (const l of form.lines) { debit += parseFloat(l.debit) || 0; credit += parseFloat(l.credit) || 0; }
    return { debit, credit };
  }, [form.lines]);

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { account: '', debit: '', credit: '', memo: '' }] }));
  const removeLine = (idx: number) => setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
  const updateLine = (idx: number, patch: Partial<FormLine>) =>
    setForm(p => ({ ...p, lines: p.lines.map((l, i) => i === idx ? { ...l, ...patch } : l) }));

  const handleSubmit = async (status: 'Draft' | 'Posted') => {
    const lines = form.lines
      .filter(l => l.account && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map(l => ({ account: Number(l.account), debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, memo: l.memo }));
    if (!form.date || !form.reference || lines.length < 2) {
      toast.error('Date, reference and at least two journal lines are required.');
      return;
    }
    if (Math.abs(totals.debit - totals.credit) > 0.01) {
      toast.error('Total debits must equal total credits.');
      return;
    }
    setSaving(true);
    try {
      const entry = await createJournalEntry({ date: form.date, reference: form.reference, description: form.description, status, lines });
      if (status === 'Posted') await postJournalEntry(entry.id);
      toast.success(`Journal ${status === 'Posted' ? 'posted' : 'saved as draft'}`);
      setShowForm(false);
      setForm(emptyForm());
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the journal entry.');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id: number) => {
    try {
      await postJournalEntry(id);
      toast.success('Journal posted');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not post the journal.');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelJournalEntry(id);
      toast.success('Journal cancelled');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not cancel the journal.');
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Journals</h1>
          <p className="text-sm text-muted-foreground">Journal entries for accounting adjustments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> New Journal
          </button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading journals…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <h3 className="font-display font-semibold text-card-foreground">New Journal Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-foreground mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Reference</label><input type="text" placeholder="JNL-002" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Description</label><input type="text" placeholder="Journal description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} /></div>
          </div>

          <div className="space-y-2">
            {form.lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Account</label>
                  <select value={l.account} onChange={e => updateLine(idx, { account: e.target.value })} className={selectClass}>
                    <option value="">Select account...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Debit</label>
                  <input type="number" min="0" step="0.01" value={l.debit} onChange={e => updateLine(idx, { debit: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Credit</label>
                  <input type="number" min="0" step="0.01" value={l.credit} onChange={e => updateLine(idx, { credit: e.target.value })} className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Memo" value={l.memo} onChange={e => updateLine(idx, { memo: e.target.value })} className={inputClass} />
                  {form.lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-destructive hover:text-destructive/80"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addLine} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Add Line</button>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Debit: ${totals.debit.toLocaleString()}</span>
            <span>Total Credit: ${totals.credit.toLocaleString()}</span>
            <span className={Math.abs(totals.debit - totals.credit) > 0.01 ? 'text-destructive font-medium' : 'text-success font-medium'}>
              {Math.abs(totals.debit - totals.credit) > 0.01 ? 'Out of balance' : 'Balanced'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="px-4 py-2 rounded-lg border border-input text-foreground text-sm">Cancel</button>
            <button disabled={saving} onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-lg border border-input text-foreground text-sm font-medium disabled:opacity-60">Save Draft</button>
            <button disabled={saving} onClick={() => handleSubmit('Posted')} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-60">Post Journal</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lines</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {journals.map(j => {
                const debit = j.lines.reduce((s, l) => s + num(l.debit), 0);
                const credit = j.lines.reduce((s, l) => s + num(l.credit), 0);
                return (
                  <tr key={j.id} className="border-b border-border hover:bg-muted/50 transition-colors align-top">
                    <td className="px-4 py-3 text-foreground">{j.date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{j.reference}</td>
                    <td className="px-4 py-3 text-foreground">{j.description}</td>
                    <td className="px-4 py-3 text-foreground">
                      {j.lines.map((l, i) => (
                        <div key={i} className="font-mono text-xs text-muted-foreground">{l.account_code || l.account}</div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">${debit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-foreground">${credit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${j.status === 'Posted' ? 'bg-success/10 text-success' : j.status === 'Draft' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{j.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {j.status === 'Draft' && (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handlePost(j.id)} className="text-success hover:text-success/80" title="Post"><Check size={16} /></button>
                          <button onClick={() => handleCancel(j.id)} className="text-destructive hover:text-destructive/80" title="Cancel"><X size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && journals.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No journal entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
