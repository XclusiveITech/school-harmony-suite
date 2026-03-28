import React from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import { subjects, homeworks, announcements, examResults, students } from '@/lib/dummy-data';
import { DollarSign, BookOpen, Bell, Calendar, CreditCard, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PortalDashboard() {
  const student = usePortalStudent();
  const { settings } = useSchoolSettings();

  const mySubjects = subjects.filter(s => s.classes.includes(student.className));
  const myHomeworks = homeworks.filter(h => h.className === student.className);
  const pendingHw = myHomeworks.filter(h => h.status === 'Pending');
  const myResults = examResults.filter(r => r.studentId === student.id);
  const recentNotices = announcements.slice(0, 3);

  const totalFees = student.boardingStatus === 'Boarding' ? 2400 : 1500;
  const paid = totalFees - student.feesBalance;

  const timetable = [
    { time: '07:30', subject: mySubjects[0]?.name || '-', room: 'Room 1' },
    { time: '08:30', subject: mySubjects[1]?.name || '-', room: 'Room 3' },
    { time: '09:30', subject: 'Break', room: '' },
    { time: '10:00', subject: mySubjects[2]?.name || '-', room: 'Lab 1' },
    { time: '11:00', subject: mySubjects[3]?.name || '-', room: 'Room 2' },
    { time: '12:00', subject: 'Lunch', room: '' },
    { time: '13:30', subject: mySubjects[4]?.name || 'Sports', room: 'Field' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome, {student.firstName}! 👋</h1>
        <p className="text-sm text-muted-foreground">{student.className} • {student.boardingStatus} Student • {settings.name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card light-card-red">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <DollarSign size={18} />
            <span className="text-xs font-medium">Outstanding</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">${student.feesBalance.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card light-card-green">
          <div className="flex items-center gap-2 text-success mb-2">
            <CreditCard size={18} />
            <span className="text-xs font-medium">Paid</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">${paid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card light-card-blue">
          <div className="flex items-center gap-2 text-primary mb-2">
            <BookOpen size={18} />
            <span className="text-xs font-medium">Subjects</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">{mySubjects.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card light-card-orange">
          <div className="flex items-center gap-2 text-warning mb-2">
            <Clock size={18} />
            <span className="text-xs font-medium">Pending HW</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">{pendingHw.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Timetable */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h3 className="font-display font-semibold text-foreground text-sm">Today's Timetable</h3>
          </div>
          <div className="divide-y divide-border">
            {timetable.map((t, i) => (
              <div key={i} className={`px-4 py-2.5 flex items-center justify-between text-sm ${t.subject === 'Break' || t.subject === 'Lunch' ? 'bg-muted/50' : ''}`}>
                <span className="text-muted-foreground w-14">{t.time}</span>
                <span className="flex-1 font-medium text-foreground">{t.subject}</span>
                <span className="text-xs text-muted-foreground">{t.room}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Structure */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground text-sm">Current Fee Structure</h3>
            <Link to="/portal/fees" className="text-xs text-primary hover:underline">View Statement →</Link>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tuition Fees</span><span className="font-medium text-foreground">$1,200</span></div>
            {student.boardingStatus === 'Boarding' && <div className="flex justify-between"><span className="text-muted-foreground">Boarding Fees</span><span className="font-medium text-foreground">$800</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Development Levy</span><span className="font-medium text-foreground">$200</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sports Levy</span><span className="font-medium text-foreground">$100</span></div>
            {student.boardingStatus === 'Boarding' && <div className="flex justify-between"><span className="text-muted-foreground">Meals</span><span className="font-medium text-foreground">$100</span></div>}
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">${totalFees.toLocaleString()}</span>
            </div>
          </div>
          <div className="px-4 pb-4">
            <a href="#" className="block w-full py-2 text-center rounded-lg bg-success text-success-foreground font-medium text-sm hover:opacity-90 transition-opacity">
              💳 Pay Fees Online
            </a>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Notices */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-warning" />
              <h3 className="font-display font-semibold text-foreground text-sm">Recent Notices</h3>
            </div>
            <Link to="/portal/notices" className="text-xs text-primary hover:underline">View All →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentNotices.map(n => (
              <div key={n.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${n.priority === 'high' ? 'bg-destructive' : n.priority === 'medium' ? 'bg-warning' : 'bg-success'}`} />
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* School Info */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-foreground text-sm">School Information</h3>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div><span className="text-muted-foreground">School:</span> <span className="font-medium text-foreground">{settings.name}</span></div>
            <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{settings.address}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{settings.phone}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{settings.email}</span></div>
            {settings.bankDetails && <div><span className="text-muted-foreground">Bank:</span> <span className="text-foreground">{settings.bankDetails}</span></div>}
            {settings.motto && <div className="pt-2 border-t border-border italic text-muted-foreground">"{settings.motto}"</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
