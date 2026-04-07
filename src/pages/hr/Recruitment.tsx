import React, { useState } from 'react';
import { staff, jobPostings, jobApplications, JobPosting, JobApplication } from '@/lib/dummy-data';
import { Plus, Briefcase, Users, Eye, CheckCircle, XCircle, Clock, FileText, Search } from 'lucide-react';
import { sendApplicationStatusEmail } from '@/lib/email-notifications';

type Tab = 'staff' | 'jobs' | 'applications';

export default function Recruitment() {
  const [tab, setTab] = useState<Tab>('staff');
  const [staffList, setStaffList] = useState(staff);
  const [jobs, setJobs] = useState<JobPosting[]>(jobPostings);
  const [applications, setApplications] = useState<JobApplication[]>(jobApplications);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [viewApp, setViewApp] = useState<JobApplication | null>(null);

  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', department: '', salary: '' });
  const [jobForm, setJobForm] = useState({ title: '', department: '', description: '', qualifications: '', deadline: '', salary: '' });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'staff', label: 'Add Staff', icon: <Plus size={16} /> },
    { id: 'jobs', label: 'Job Advertisements', icon: <Briefcase size={16} /> },
    { id: 'applications', label: 'Applications', icon: <Users size={16} /> },
  ];

  const handleAddStaff = () => {
    if (!staffForm.firstName || !staffForm.lastName || !staffForm.email) return;
    const newStaff = {
      id: String(staffList.length + 1),
      employeeId: `EMP${String(staffList.length + 1).padStart(3, '0')}`,
      firstName: staffForm.firstName,
      lastName: staffForm.lastName,
      email: staffForm.email,
      phone: staffForm.phone,
      role: staffForm.role,
      department: staffForm.department,
      dateJoined: new Date().toISOString().split('T')[0],
      salary: Number(staffForm.salary) || 0,
      status: 'Active' as const,
    };
    setStaffList(prev => [...prev, newStaff]);
    setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: '', department: '', salary: '' });
    setShowAddStaff(false);
  };

  const handleAddJob = () => {
    if (!jobForm.title || !jobForm.department || !jobForm.deadline) return;
    const newJob: JobPosting = {
      id: String(jobs.length + 1),
      title: jobForm.title,
      department: jobForm.department,
      description: jobForm.description,
      qualifications: jobForm.qualifications,
      deadline: jobForm.deadline,
      status: 'Open',
      datePosted: new Date().toISOString().split('T')[0],
      salary: jobForm.salary || undefined,
    };
    setJobs(prev => [...prev, newJob]);
    setJobForm({ title: '', department: '', description: '', qualifications: '', deadline: '', salary: '' });
    setShowAddJob(false);
  };

  const updateAppStatus = (id: string, status: JobApplication['status']) => {
    setApplications(prev => prev.map(a => {
      if (a.id !== id) return a;
      const job = jobs.find(j => j.id === a.jobId);
      sendApplicationStatusEmail(a.email, a.applicantName, job?.title || 'Unknown Position', status);
      return { ...a, status };
    }));
  };

  const filteredApps = selectedJob ? applications.filter(a => a.jobId === selectedJob) : applications;

  const statusColor = (s: string) => {
    switch (s) {
      case 'Shortlisted': case 'Offered': return 'bg-success/10 text-success';
      case 'Rejected': return 'bg-destructive/10 text-destructive';
      case 'Interviewed': return 'bg-primary/10 text-primary';
      default: return 'bg-warning/10 text-warning';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Manage staff hiring, job postings and applications</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ADD STAFF TAB */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddStaff(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> New Staff Member
          </button>

          {showAddStaff && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Register New Staff</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'First Name', key: 'firstName', type: 'text' },
                  { label: 'Last Name', key: 'lastName', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Phone', key: 'phone', type: 'tel' },
                  { label: 'Role', key: 'role', type: 'select', options: ['Teacher', 'Admin', 'Accountant', 'Lab Technician', 'Librarian', 'Groundskeeper', 'Nurse'] },
                  { label: 'Department', key: 'department', type: 'select', options: ['Sciences', 'Mathematics', 'Languages', 'Administration', 'Finance', 'IT', 'Sports', 'Arts'] },
                  { label: 'Monthly Salary ($)', key: 'salary', type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={(staffForm as any)[field.key]} onChange={e => setStaffForm(p => ({ ...p, [field.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                        <option value="">Select {field.label}</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={(staffForm as any)[field.key]} onChange={e => setStaffForm(p => ({ ...p, [field.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddStaff} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">Register Staff</button>
                <button onClick={() => setShowAddStaff(false)} className="px-4 py-2 rounded-lg border border-input text-foreground font-medium text-sm">Cancel</button>
              </div>
            </div>
          )}

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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{s.employeeId}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                      <td className="px-4 py-3 text-foreground">{s.role}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.dateJoined}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* JOB ADVERTISEMENTS TAB */}
      {tab === 'jobs' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddJob(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> Post New Job
          </button>

          {showAddJob && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Create Job Advertisement</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Job Title</label>
                  <input value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
                  <select value={jobForm.department} onChange={e => setJobForm(p => ({ ...p, department: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                    <option value="">Select</option>
                    {['Sciences', 'Mathematics', 'Languages', 'Administration', 'Finance', 'IT', 'Sports', 'Arts'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Application Deadline</label>
                  <input type="date" value={jobForm.deadline} onChange={e => setJobForm(p => ({ ...p, deadline: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Salary Range</label>
                  <input value={jobForm.salary} onChange={e => setJobForm(p => ({ ...p, salary: e.target.value }))} placeholder="e.g. $1,000 - $1,400/month" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Job Description</label>
                  <textarea value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Qualifications Required</label>
                  <textarea value={jobForm.qualifications} onChange={e => setJobForm(p => ({ ...p, qualifications: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddJob} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">Post Job</button>
                <button onClick={() => setShowAddJob(false)} className="px-4 py-2 rounded-lg border border-input text-foreground font-medium text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {jobs.map(job => {
              const appCount = applications.filter(a => a.jobId === job.id).length;
              const isExpired = new Date(job.deadline) < new Date();
              return (
                <div key={job.id} className="bg-card rounded-xl shadow-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.department}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'Open' && !isExpired ? 'bg-success/10 text-success' : job.status === 'Filled' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {isExpired && job.status === 'Open' ? 'Expired' : job.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{job.description}</p>
                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <p><strong className="text-foreground">Qualifications:</strong> {job.qualifications.substring(0, 100)}...</p>
                    {job.salary && <p><strong className="text-foreground">Salary:</strong> {job.salary}</p>}
                    <p><strong className="text-foreground">Deadline:</strong> {job.deadline}</p>
                    <p><strong className="text-foreground">Posted:</strong> {job.datePosted}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground"><Users size={14} className="inline mr-1" />{appCount} application{appCount !== 1 ? 's' : ''}</span>
                    <button onClick={() => { setSelectedJob(job.id); setTab('applications'); }} className="text-xs text-primary hover:underline">View Applications →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {tab === 'applications' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedJob || ''} onChange={e => setSelectedJob(e.target.value || null)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="">All Jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <div className="flex gap-2 text-xs">
              {['Received', 'Shortlisted', 'Interviewed', 'Offered', 'Rejected'].map(s => {
                const count = filteredApps.filter(a => a.status === s).length;
                return count > 0 ? <span key={s} className={`px-2 py-1 rounded-full font-medium ${statusColor(s)}`}>{s}: {count}</span> : null;
              })}
            </div>
          </div>

          {viewApp && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-foreground">Application Details</h2>
                <button onClick={() => setViewApp(null)} className="text-muted-foreground hover:text-foreground text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><strong className="text-muted-foreground">Name:</strong> <span className="text-foreground ml-2">{viewApp.applicantName}</span></div>
                <div><strong className="text-muted-foreground">Email:</strong> <span className="text-foreground ml-2">{viewApp.email}</span></div>
                <div><strong className="text-muted-foreground">Phone:</strong> <span className="text-foreground ml-2">{viewApp.phone}</span></div>
                <div><strong className="text-muted-foreground">Applied:</strong> <span className="text-foreground ml-2">{viewApp.dateApplied}</span></div>
                <div><strong className="text-muted-foreground">Job:</strong> <span className="text-foreground ml-2">{jobs.find(j => j.id === viewApp.jobId)?.title}</span></div>
                <div><strong className="text-muted-foreground">Status:</strong> <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(viewApp.status)}`}>{viewApp.status}</span></div>
                <div className="sm:col-span-2"><strong className="text-muted-foreground">Qualifications:</strong><p className="text-foreground mt-1">{viewApp.qualifications}</p></div>
                <div className="sm:col-span-2"><strong className="text-muted-foreground">Experience:</strong><p className="text-foreground mt-1">{viewApp.experience}</p></div>
                <div className="sm:col-span-2"><strong className="text-muted-foreground">Cover Letter:</strong><p className="text-foreground mt-1">{viewApp.coverLetter}</p></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { updateAppStatus(viewApp.id, 'Shortlisted'); setViewApp({ ...viewApp, status: 'Shortlisted' }); }} className="px-3 py-1.5 rounded text-xs bg-success/10 text-success hover:bg-success/20">Shortlist</button>
                <button onClick={() => { updateAppStatus(viewApp.id, 'Interviewed'); setViewApp({ ...viewApp, status: 'Interviewed' }); }} className="px-3 py-1.5 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">Mark Interviewed</button>
                <button onClick={() => { updateAppStatus(viewApp.id, 'Offered'); setViewApp({ ...viewApp, status: 'Offered' }); }} className="px-3 py-1.5 rounded text-xs bg-success/10 text-success hover:bg-success/20">Offer</button>
                <button onClick={() => { updateAppStatus(viewApp.id, 'Rejected'); setViewApp({ ...viewApp, status: 'Rejected' }); }} className="px-3 py-1.5 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Reject</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applicant</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Position</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date Applied</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr key={app.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{app.applicantName}</td>
                      <td className="px-4 py-3 text-foreground">{jobs.find(j => j.id === app.jobId)?.title || 'N/A'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{app.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{app.dateApplied}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(app.status)}`}>{app.status}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setViewApp(app)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredApps.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No applications found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
