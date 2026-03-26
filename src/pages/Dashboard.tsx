import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { students, staff, announcements, revenueData, attendanceData } from '@/lib/dummy-data';
import { useBranch } from '@/contexts/BranchContext';
import { Users, GraduationCap, DollarSign, TrendingUp, BookOpen, AlertCircle, UserCheck, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(217,91%,50%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(280,67%,52%)'];

function StatCard({ icon, label, value, change, color, cardAccent }: { icon: React.ReactNode; label: string; value: string; change?: string; color: string; cardAccent?: string }) {
  return (
    <div className={`bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in ${cardAccent || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">{value}</p>
          {change && <p className="text-xs text-success mt-1 flex items-center gap-1"><TrendingUp size={12} />{change}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const totalStudents = students.length;
  const boardingStudents = students.filter(s => s.boardingStatus === 'Boarding').length;
  const dayStudents = students.filter(s => s.boardingStatus === 'Day').length;
  const totalStaff = staff.length;
  const teachers = staff.filter(s => s.role === 'Teacher').length;
  const totalFees = students.reduce((sum, s) => sum + s.feesBalance, 0);
  const totalRevenue = revenueData.reduce((sum, r) => sum + r.tuition + r.boarding + r.other, 0);

  const pieData = [
    { name: 'Boarding', value: boardingStudents },
    { name: 'Day', value: dayStudents },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening at Brainstar today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<GraduationCap size={22} className="text-primary-foreground" />} label="Total Students" value={String(totalStudents)} change="+12 this term" color="gradient-primary" cardAccent="light-card-blue" />
        <StatCard icon={<Users size={22} className="text-success-foreground" />} label="Total Staff" value={String(totalStaff)} change={`${teachers} teachers`} color="bg-success" cardAccent="light-card-green" />
        <StatCard icon={<DollarSign size={22} className="text-warning-foreground" />} label="Fees Outstanding" value={`$${totalFees.toLocaleString()}`} color="bg-warning" cardAccent="light-card-orange" />
        <StatCard icon={<TrendingUp size={22} className="text-info-foreground" />} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} change="+8% vs last term" color="bg-info" cardAccent="light-card-cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow-card animate-fade-in">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }} />
              <Bar dataKey="tuition" fill="hsl(217,91%,50%)" radius={[4, 4, 0, 0]} name="Tuition" />
              <Bar dataKey="boarding" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Boarding" />
              <Bar dataKey="other" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Other" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Student Distribution */}
        <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Student Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[0] }} /><span className="text-muted-foreground">Boarding</span></div>
              <span className="font-medium text-card-foreground">{boardingStudents}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[1] }} /><span className="text-muted-foreground">Day</span></div>
              <span className="font-medium text-card-foreground">{dayStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Weekly Attendance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }} />
              <Line type="monotone" dataKey="present" stroke="hsl(142,71%,45%)" strokeWidth={2} name="Present" />
              <Line type="monotone" dataKey="absent" stroke="hsl(0,72%,51%)" strokeWidth={2} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-muted">
                <AlertCircle size={18} className={a.priority === 'high' ? 'text-destructive mt-0.5' : a.priority === 'medium' ? 'text-warning mt-0.5' : 'text-info mt-0.5'} />
                <div>
                  <p className="text-sm font-medium text-card-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
