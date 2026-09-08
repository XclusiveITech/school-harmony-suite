import React, { useEffect, useMemo, useState } from 'react';
import { Printer, DollarSign, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listStaff, listPayrollRuns, createPayrollRun, generatePayroll, listPayslips,
  staffName, num,
  type BackendStaff, type BackendPayrollRun, type BackendPayslip,
} from '@/lib/hr-api';

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const [staff, setStaff] = useState<BackendStaff[]>([]);
  const [runs, setRuns] = useState<BackendPayrollRun[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [payslips, setPayslips] = useState<BackendPayslip[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayslip, setShowPayslip] = useState<BackendPayslip | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([listStaff(), listPayrollRuns()]);
      setStaff(s);
      setRuns(r);
      const active = r[0]?.id ?? null;
      setRunId(active);
      setPayslips(active ? await listPayslips(active) : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load payroll from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectRun = async (id: number) => {
    setRunId(id);
    try {
      setPayslips(await listPayslips(id));
    } catch (e: any) {
      toast.error(e?.message || 'Could not load payslips.');
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const existing = runs.find(r => r.period === period);
      const run = existing ?? await createPayrollRun(period);
      await generatePayroll(run.id);
      toast.success(`Payroll generated for ${period}`);
      const r = await listPayrollRuns();
      setRuns(r);
      setRunId(run.id);
      setPayslips(await listPayslips(run.id));
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate payroll.');
    } finally {
      setBusy(false);
    }
  };

  const totals = useMemo(() => payslips.reduce((acc, p) => ({
    gross: acc.gross + num(p.gross),
    tax: acc.tax + num(p.tax),
    pension: acc.pension + num(p.pension),
    leave: acc.leave + num(p.leave_deduction),
    net: acc.net + num(p.net),
  }), { gross: 0, tax: 0, pension: 0, leave: 0, net: 0 }), [payslips]);

  const activeRun = runs.find(r => r.id === runId);
  const nameFor = (p: BackendPayslip) => {
    if (p.staff_name) return p.staff_name;
    const s = staff.find(x => x.id === p.staff);
    return s ? staffName(s) : '-';
  };

  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            {activeRun ? `Period ${activeRun.period} · ${activeRun.status}` : 'No payroll run selected'} — leave deductions applied automatically
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <button disabled={busy} onClick={handleGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-60">
            <DollarSign size={18} /> Generate Payslips
          </button>
          <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {runs.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Payroll run</label>
          <select value={runId ?? ''} onChange={e => selectRun(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {runs.map(r => <option key={r.id} value={r.id}>{r.period} · {r.status}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Gross Salary</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">{totals.gross.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Tax + Pension</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{(totals.tax + totals.pension).toFixed(0)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Leave Deductions</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{totals.leave.toFixed(0)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Net Pay</p>
          <p className="text-2xl font-display font-bold text-success mt-1">{totals.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pension</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unpaid Days</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Leave Deduction</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs">{p.employee_id || '-'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{nameFor(p)}</td>
                  <td className="px-4 py-3 text-right font-mono">{num(p.gross).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{num(p.tax).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{num(p.pension).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{num(p.unpaid_days)}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{num(p.leave_deduction).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success font-semibold">{num(p.net).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setShowPayslip(p)} className="text-primary text-xs hover:underline">View</button>
                  </td>
                </tr>
              ))}
              {!loading && payslips.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No payslips for this period yet — pick a month and generate payroll ({staff.length} staff on file).
                </td></tr>
              )}
              {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Payslip · {activeRun?.period}</h2>
              <button onClick={() => setShowPayslip(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{nameFor(showPayslip)} · {showPayslip.employee_id}</p>
            <div className="text-sm space-y-1 pt-2">
              <div className="flex justify-between"><span>Gross salary</span><span className="font-mono">{num(showPayslip.gross).toFixed(2)}</span></div>
              <div className="flex justify-between text-destructive"><span>Tax</span><span className="font-mono">-{num(showPayslip.tax).toFixed(2)}</span></div>
              <div className="flex justify-between text-destructive"><span>Pension</span><span className="font-mono">-{num(showPayslip.pension).toFixed(2)}</span></div>
              <div className="flex justify-between text-destructive"><span>Unpaid leave ({num(showPayslip.unpaid_days)} days)</span><span className="font-mono">-{num(showPayslip.leave_deduction).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-2"><span>Net pay</span><span className="font-mono text-success">{num(showPayslip.net).toFixed(2)}</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => window.print()} className={btnOutline}><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
