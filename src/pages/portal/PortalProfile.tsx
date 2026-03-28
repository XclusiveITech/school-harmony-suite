import React, { useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Camera, Save, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PortalProfile() {
  const student = usePortalStudent();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    email: `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@student.brainstar.edu`,
    phone: '+263 77 123 4567',
    address: '12 Main Street, Harare',
    dob: '2008-03-15',
    gender: student.gender || 'Male',
    emergencyContact: '+263 71 987 6543',
    emergencyName: 'Mrs. Murinda',
    medicalNotes: 'None',
  });

  const [avatar, setAvatar] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });

  const handleProfileSave = () => {
    const stored = localStorage.getItem('brainstar_student');
    if (stored) {
      const s = JSON.parse(stored);
      s.firstName = profile.firstName;
      s.lastName = profile.lastName;
      localStorage.setItem('brainstar_student', JSON.stringify(s));
    }
    toast({ title: 'Profile Updated', description: 'Your personal details have been saved.' });
  };

  const handlePasswordChange = () => {
    if (!passwords.current) {
      toast({ title: 'Error', description: 'Enter your current password.', variant: 'destructive' });
      return;
    }
    if (passwords.newPass.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setPasswords({ current: '', newPass: '', confirm: '' });
    toast({ title: 'Password Changed', description: 'Your password has been updated successfully.' });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      toast({ title: 'Photo Updated', description: 'Your profile photo has been changed.' });
    };
    reader.readAsDataURL(file);
  };

  const initials = `${student.firstName[0]}${student.lastName[0]}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Profile</h1>

      {/* Profile header card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 text-2xl">
              <AvatarImage src={avatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white" size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-semibold text-foreground">{student.firstName} {student.lastName}</h2>
            <p className="text-sm text-muted-foreground">{student.regNumber} • {student.className}</p>
            <p className="text-xs text-muted-foreground mt-1">Level: {student.level}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal"><User size={14} className="mr-1.5" />Personal Details</TabsTrigger>
          <TabsTrigger value="security"><Lock size={14} className="mr-1.5" />Security</TabsTrigger>
        </TabsList>

        {/* Personal Details */}
        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label><Mail size={12} className="inline mr-1" />Email</Label>
                  <Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label><Phone size={12} className="inline mr-1" />Phone</Label>
                  <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label><MapPin size={12} className="inline mr-1" />Address</Label>
                  <Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label><Calendar size={12} className="inline mr-1" />Date of Birth</Label>
                  <Input type="date" value={profile.dob} onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Input value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value as 'Male' | 'Female' }))} />
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Contact Name</Label>
                    <Input value={profile.emergencyName} onChange={e => setProfile(p => ({ ...p, emergencyName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input value={profile.emergencyContact} onChange={e => setProfile(p => ({ ...p, emergencyContact: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <div className="space-y-1.5">
                  <Label>Medical Notes</Label>
                  <Input value={profile.medicalNotes} onChange={e => setProfile(p => ({ ...p, medicalNotes: e.target.value }))} />
                </div>
              </div>

              <Button onClick={handleProfileSave} className="mt-2">
                <Save size={14} className="mr-1.5" />Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button onClick={handlePasswordChange}>
                <Lock size={14} className="mr-1.5" />Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
