import React from 'react';
import { staff, leaveRequests } from '@/lib/dummy-data';
import { Search, Plus, Eye } from 'lucide-react';

export default function StaffList() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground">{staff.length} staff members</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{s.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3 text-foreground">{s.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.department}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-success/10 text-success' : s.status === 'On Leave' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Requests */}
      <div>
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Recent Leave Requests</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map(lr => {
                const s = staff.find(st => st.id === lr.staffId);
                return (
                  <tr key={lr.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{s?.firstName} {s?.lastName}</td>
                    <td className="px-4 py-3 text-foreground">{lr.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lr.startDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lr.endDate}</td>
                    <td className="px-4 py-3 text-foreground">{lr.days}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lr.status === 'Approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {lr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      {lr.status === 'Pending' && <>
                        <button className="px-2 py-1 rounded text-xs bg-success/10 text-success hover:bg-success/20">Approve</button>
                        <button className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Reject</button>
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
