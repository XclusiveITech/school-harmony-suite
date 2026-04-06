// Dummy data store for Brainstar School Management System

export interface Student {
  id: string;
  regNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  level: string;
  className: string;
  boardingStatus: 'Boarding' | 'Day';
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  address: string;
  enrollmentDate: string;
  status: 'Active' | 'Inactive' | 'Graduated';
  feesBalance: number;
}

export interface Staff {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  dateJoined: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
}

export interface GLAccount {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

export interface Transaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  accountCode: string;
  debit: number;
  credit: number;
}

export interface Subject {
  id: string;
  name: string;
  type: 'Theory' | 'Practical';
  caPercent: number;
  teacherId: string;
  classes: string[];
}

export interface ExamResult {
  studentId: string;
  subjectId: string;
  examType: string;
  papers: { name: string; mark: number; possible: number; weight: number }[];
  percentage: number;
  comment: string;
}

// Generate student reg number
export function generateRegNumber(firstName: string, lastName: string): string {
  const year = new Date().getFullYear();
  const abbr = (firstName[0] + lastName[0]).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${year}${abbr}${rand}`;
}

export const students: Student[] = [
  { id: '1', regNumber: '2026HM4521', firstName: 'Henry', lastName: 'Murinda', gender: 'Male', dateOfBirth: '2010-03-15', level: 'Form 3', className: 'Form 3A', boardingStatus: 'Boarding', parentName: 'James Murinda', parentEmail: 'james.m@email.com', parentPhone: '+263771234567', address: '12 Main St, Harare', enrollmentDate: '2024-01-10', status: 'Active', feesBalance: 400 },
  { id: '2', regNumber: '2026TC3287', firstName: 'Tinashe', lastName: 'Chikara', gender: 'Male', dateOfBirth: '2011-07-22', level: 'Form 2', className: 'Form 2B', boardingStatus: 'Day', parentName: 'Mary Chikara', parentEmail: 'mary.c@email.com', parentPhone: '+263772345678', address: '45 Oak Ave, Bulawayo', enrollmentDate: '2024-01-10', status: 'Active', feesBalance: 150 },
  { id: '3', regNumber: '2026RN7834', firstName: 'Rudo', lastName: 'Nyathi', gender: 'Female', dateOfBirth: '2010-11-05', level: 'Form 3', className: 'Form 3A', boardingStatus: 'Boarding', parentName: 'Peter Nyathi', parentEmail: 'peter.n@email.com', parentPhone: '+263773456789', address: '78 River Rd, Gweru', enrollmentDate: '2023-09-01', status: 'Active', feesBalance: 0 },
  { id: '4', regNumber: '2026KM1456', firstName: 'Kudzai', lastName: 'Moyo', gender: 'Female', dateOfBirth: '2012-01-18', level: 'Form 1', className: 'Form 1A', boardingStatus: 'Day', parentName: 'Grace Moyo', parentEmail: 'grace.m@email.com', parentPhone: '+263774567890', address: '23 Park Lane, Mutare', enrollmentDate: '2026-01-15', status: 'Active', feesBalance: 600 },
  { id: '5', regNumber: '2025TD9023', firstName: 'Tatenda', lastName: 'Dube', gender: 'Male', dateOfBirth: '2009-06-30', level: 'Form 4', className: 'Form 4A', boardingStatus: 'Boarding', parentName: 'Simon Dube', parentEmail: 'simon.d@email.com', parentPhone: '+263775678901', address: '56 Hill St, Masvingo', enrollmentDate: '2023-01-08', status: 'Active', feesBalance: 250 },
  { id: '6', regNumber: '2026CM5678', firstName: 'Chipo', lastName: 'Madziva', gender: 'Female', dateOfBirth: '2011-09-12', level: 'Form 2', className: 'Form 2A', boardingStatus: 'Day', parentName: 'Edwin Madziva', parentEmail: 'edwin.m@email.com', parentPhone: '+263776789012', address: '90 Cedar Blvd, Harare', enrollmentDate: '2025-01-12', status: 'Active', feesBalance: 320 },
];

export const staff: Staff[] = [
  { id: '1', employeeId: 'EMP001', firstName: 'John', lastName: 'Banda', email: 'john.banda@brainstar.edu', phone: '+263771111111', role: 'Teacher', department: 'Sciences', dateJoined: '2020-01-15', salary: 1200, status: 'Active' },
  { id: '2', employeeId: 'EMP002', firstName: 'Sarah', lastName: 'Ncube', email: 'sarah.ncube@brainstar.edu', phone: '+263772222222', role: 'Teacher', department: 'Mathematics', dateJoined: '2019-06-01', salary: 1300, status: 'Active' },
  { id: '3', employeeId: 'EMP003', firstName: 'David', lastName: 'Phiri', email: 'david.phiri@brainstar.edu', phone: '+263773333333', role: 'Admin', department: 'Administration', dateJoined: '2018-03-10', salary: 1500, status: 'Active' },
  { id: '4', employeeId: 'EMP004', firstName: 'Linda', lastName: 'Zuze', email: 'linda.zuze@brainstar.edu', phone: '+263774444444', role: 'Accountant', department: 'Finance', dateJoined: '2021-02-01', salary: 1400, status: 'Active' },
  { id: '5', employeeId: 'EMP005', firstName: 'Michael', lastName: 'Tafara', email: 'michael.t@brainstar.edu', phone: '+263775555555', role: 'Teacher', department: 'Languages', dateJoined: '2022-01-10', salary: 1100, status: 'On Leave' },
];

export const glAccounts: GLAccount[] = [
  { code: '1000', name: 'Cash at Bank', type: 'Asset', balance: 45000 },
  { code: '1100', name: 'Petty Cash', type: 'Asset', balance: 2500 },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset', balance: 18500 },
  { code: '1300', name: 'Prepaid Expenses', type: 'Asset', balance: 5000 },
  { code: '1500', name: 'Furniture & Equipment', type: 'Asset', balance: 120000 },
  { code: '1510', name: 'Accumulated Depreciation', type: 'Asset', balance: -35000 },
  { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 12000 },
  { code: '2100', name: 'Salaries Payable', type: 'Liability', balance: 8500 },
  { code: '2200', name: 'Tax Payable', type: 'Liability', balance: 3200 },
  { code: '3000', name: 'School Capital', type: 'Equity', balance: 100000 },
  { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 25000 },
  { code: '4000', name: 'Tuition Fees Income', type: 'Revenue', balance: 85000 },
  { code: '4100', name: 'Boarding Fees Income', type: 'Revenue', balance: 32000 },
  { code: '4200', name: 'Registration Fees', type: 'Revenue', balance: 5500 },
  { code: '5000', name: 'Salaries Expense', type: 'Expense', balance: 42000 },
  { code: '5100', name: 'Utilities Expense', type: 'Expense', balance: 8500 },
  { code: '5200', name: 'Supplies Expense', type: 'Expense', balance: 6200 },
  { code: '5300', name: 'Depreciation Expense', type: 'Expense', balance: 12000 },
  { code: '5400', name: 'Maintenance Expense', type: 'Expense', balance: 4500 },
];

export const transactions: Transaction[] = [
  { id: '1', date: '2026-03-01', reference: 'INV-001', description: 'Tuition fees - Henry Murinda', accountCode: '4000', debit: 0, credit: 1200 },
  { id: '2', date: '2026-03-01', reference: 'INV-001', description: 'Tuition fees - Henry Murinda', accountCode: '1200', debit: 1200, credit: 0 },
  { id: '3', date: '2026-03-02', reference: 'REC-001', description: 'Payment received - Henry Murinda', accountCode: '1000', debit: 800, credit: 0 },
  { id: '4', date: '2026-03-02', reference: 'REC-001', description: 'Payment received - Henry Murinda', accountCode: '1200', debit: 0, credit: 800 },
  { id: '5', date: '2026-03-05', reference: 'PAY-001', description: 'Salary payment - March', accountCode: '5000', debit: 6500, credit: 0 },
  { id: '6', date: '2026-03-05', reference: 'PAY-001', description: 'Salary payment - March', accountCode: '1000', debit: 0, credit: 6500 },
  { id: '7', date: '2026-03-10', reference: 'INV-002', description: 'Utilities bill', accountCode: '5100', debit: 1500, credit: 0 },
  { id: '8', date: '2026-03-10', reference: 'INV-002', description: 'Utilities bill', accountCode: '2000', debit: 0, credit: 1500 },
  { id: '9', date: '2026-03-15', reference: 'JNL-001', description: 'Depreciation - March', accountCode: '5300', debit: 1000, credit: 0 },
  { id: '10', date: '2026-03-15', reference: 'JNL-001', description: 'Depreciation - March', accountCode: '1510', debit: 0, credit: 1000 },
];

export const subjects: Subject[] = [
  { id: '1', name: 'Mathematics', type: 'Theory', caPercent: 30, teacherId: '2', classes: ['Form 1A', 'Form 2A', 'Form 2B', 'Form 3A'] },
  { id: '2', name: 'English', type: 'Theory', caPercent: 30, teacherId: '5', classes: ['Form 1A', 'Form 2A', 'Form 2B', 'Form 3A', 'Form 4A'] },
  { id: '3', name: 'Physics', type: 'Practical', caPercent: 40, teacherId: '1', classes: ['Form 3A', 'Form 4A'] },
  { id: '4', name: 'Chemistry', type: 'Practical', caPercent: 40, teacherId: '1', classes: ['Form 3A', 'Form 4A'] },
  { id: '5', name: 'Biology', type: 'Practical', caPercent: 40, teacherId: '1', classes: ['Form 2A', 'Form 2B', 'Form 3A', 'Form 4A'] },
  { id: '6', name: 'History', type: 'Theory', caPercent: 30, teacherId: '5', classes: ['Form 1A', 'Form 2A', 'Form 3A'] },
  { id: '7', name: 'Geography', type: 'Theory', caPercent: 30, teacherId: '5', classes: ['Form 1A', 'Form 2A', 'Form 3A'] },
  { id: '8', name: 'Computer Science', type: 'Practical', caPercent: 40, teacherId: '2', classes: ['Form 2A', 'Form 3A', 'Form 4A'] },
];

export const classes = [
  { id: '1', name: 'Form 1A', level: 'Form 1', students: 35 },
  { id: '2', name: 'Form 2A', level: 'Form 2', students: 38 },
  { id: '3', name: 'Form 2B', level: 'Form 2', students: 36 },
  { id: '4', name: 'Form 3A', level: 'Form 3', students: 32 },
  { id: '5', name: 'Form 4A', level: 'Form 4', students: 28 },
];

export const examResults: ExamResult[] = [
  { studentId: '1', subjectId: '1', examType: 'End of Term 1', papers: [{ name: 'Paper 1', mark: 72, possible: 100, weight: 60 }, { name: 'Paper 2', mark: 65, possible: 100, weight: 40 }], percentage: 69.2, comment: 'Good performance, needs to improve on algebra.' },
  { studentId: '1', subjectId: '3', examType: 'End of Term 1', papers: [{ name: 'Paper 1', mark: 58, possible: 100, weight: 40 }, { name: 'Paper 2', mark: 70, possible: 100, weight: 30 }, { name: 'Practical', mark: 82, possible: 100, weight: 30 }], percentage: 68.0, comment: 'Excellent practical work.' },
  { studentId: '2', subjectId: '1', examType: 'End of Term 1', papers: [{ name: 'Paper 1', mark: 85, possible: 100, weight: 60 }, { name: 'Paper 2', mark: 78, possible: 100, weight: 40 }], percentage: 82.2, comment: 'Outstanding student.' },
];

export const homeworks = [
  { id: '1', subjectId: '1', className: 'Form 3A', title: 'Algebra Practice Set 1', dueDate: '2026-03-20', status: 'Completed', totalMarks: 50 },
  { id: '2', subjectId: '1', className: 'Form 3A', title: 'Geometry Worksheet', dueDate: '2026-03-25', status: 'Pending', totalMarks: 30 },
  { id: '3', subjectId: '3', className: 'Form 3A', title: 'Newton Laws Questions', dueDate: '2026-03-22', status: 'Completed', totalMarks: 40 },
  { id: '4', subjectId: '2', className: 'Form 3A', title: 'Essay Writing', dueDate: '2026-03-28', status: 'Pending', totalMarks: 100 },
];

export const announcements = [
  { id: '1', title: 'Term 1 Exams Schedule Released', date: '2026-03-18', content: 'The examination timetable for End of Term 1 has been published. Please check the exams module for details.', priority: 'high' as const },
  { id: '2', title: 'Sports Day - March 30th', date: '2026-03-15', content: 'Annual sports day will be held on March 30th. All students are expected to participate.', priority: 'medium' as const },
  { id: '3', title: 'Fees Payment Reminder', date: '2026-03-10', content: 'Parents with outstanding fees are reminded to settle their accounts before end of term.', priority: 'high' as const },
  { id: '4', title: 'New Library Books Available', date: '2026-03-08', content: 'New textbooks and reference materials are now available in the school library.', priority: 'low' as const },
];

export const revenueData = [
  { month: 'Jan', tuition: 28000, boarding: 12000, other: 2500 },
  { month: 'Feb', tuition: 25000, boarding: 11000, other: 1800 },
  { month: 'Mar', tuition: 32000, boarding: 9000, other: 3200 },
];

export const attendanceData = [
  { day: 'Mon', present: 165, absent: 4 },
  { day: 'Tue', present: 162, absent: 7 },
  { day: 'Wed', present: 167, absent: 2 },
  { day: 'Thu', present: 160, absent: 9 },
  { day: 'Fri', present: 158, absent: 11 },
];

export interface Asset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  depreciationRate: number;
  currentValue: number;
  location: string;
  serialNumbers: string[];
}

export const assets: Asset[] = [
  { id: '1', name: 'Desktop Computers (Lab)', category: 'IT Equipment', purchaseDate: '2023-06-15', cost: 25000, depreciationRate: 25, currentValue: 15625, location: 'Computer Lab', serialNumbers: ['IT-PC-001', 'IT-PC-002', 'IT-PC-003', 'IT-PC-004', 'IT-PC-005'] },
  { id: '2', name: 'School Bus - ZH1234', category: 'Vehicles', purchaseDate: '2022-01-10', cost: 65000, depreciationRate: 20, currentValue: 41600, location: 'Parking', serialNumbers: ['VEH-BUS-001'] },
  { id: '3', name: 'Laboratory Equipment', category: 'Lab Equipment', purchaseDate: '2024-02-20', cost: 18000, depreciationRate: 15, currentValue: 15300, location: 'Science Lab', serialNumbers: ['LAB-EQ-001', 'LAB-EQ-002', 'LAB-EQ-003'] },
  { id: '4', name: 'Classroom Furniture', category: 'Furniture', purchaseDate: '2021-09-01', cost: 35000, depreciationRate: 10, currentValue: 24500, location: 'Classrooms', serialNumbers: ['FRN-DESK-001', 'FRN-DESK-002', 'FRN-DESK-003', 'FRN-DESK-004', 'FRN-CHAIR-001', 'FRN-CHAIR-002', 'FRN-CABINET-001'] },
];

export interface AssetAssignment {
  id: string;
  assetId: string;
  serialNumber: string;
  assignedTo: string;
  assignedToType: 'Student' | 'Staff';
  assignedToName: string;
  roomNumber: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  dateAssigned: string;
  notes?: string;
}

export const assetAssignments: AssetAssignment[] = [
  { id: '1', assetId: '4', serialNumber: 'FRN-DESK-001', assignedTo: '1', assignedToType: 'Student', assignedToName: 'Henry Murinda', roomNumber: 'Room 3A', condition: 'Good', dateAssigned: '2026-01-15', notes: 'Wooden desk with drawer' },
  { id: '2', assetId: '4', serialNumber: 'FRN-DESK-002', assignedTo: '2', assignedToType: 'Student', assignedToName: 'Tinashe Chikara', roomNumber: 'Room 2B', condition: 'Excellent', dateAssigned: '2026-01-15' },
  { id: '3', assetId: '4', serialNumber: 'FRN-CHAIR-001', assignedTo: '3', assignedToType: 'Student', assignedToName: 'Rudo Nyathi', roomNumber: 'Room 3A', condition: 'Fair', dateAssigned: '2026-01-15', notes: 'Minor scratch on surface' },
  { id: '4', assetId: '4', serialNumber: 'FRN-DESK-003', assignedTo: '4', assignedToType: 'Student', assignedToName: 'Kudzai Moyo', roomNumber: 'Room 1A', condition: 'Good', dateAssigned: '2026-01-16' },
  { id: '5', assetId: '1', serialNumber: 'IT-PC-001', assignedTo: '1', assignedToType: 'Staff', assignedToName: 'John Banda', roomNumber: 'Science Lab', condition: 'Good', dateAssigned: '2023-07-01', notes: 'Dell OptiPlex 7090' },
  { id: '6', assetId: '1', serialNumber: 'IT-PC-002', assignedTo: '3', assignedToType: 'Staff', assignedToName: 'David Phiri', roomNumber: 'Admin Office', condition: 'Excellent', dateAssigned: '2023-07-01', notes: 'HP ProDesk 400' },
  { id: '7', assetId: '1', serialNumber: 'IT-PC-003', assignedTo: '4', assignedToType: 'Staff', assignedToName: 'Linda Zuze', roomNumber: 'Finance Office', condition: 'Good', dateAssigned: '2023-07-05', notes: 'Lenovo ThinkCentre' },
  { id: '8', assetId: '4', serialNumber: 'FRN-CABINET-001', assignedTo: '2', assignedToType: 'Staff', assignedToName: 'Sarah Ncube', roomNumber: 'Maths Dept', condition: 'Good', dateAssigned: '2024-02-10', notes: 'Filing cabinet 4-drawer' },
  { id: '9', assetId: '4', serialNumber: 'FRN-DESK-004', assignedTo: '5', assignedToType: 'Student', assignedToName: 'Tatenda Dube', roomNumber: 'Room 4A', condition: 'Poor', dateAssigned: '2026-01-16', notes: 'Needs repair - wobbly leg' },
  { id: '10', assetId: '4', serialNumber: 'FRN-CHAIR-002', assignedTo: '6', assignedToType: 'Student', assignedToName: 'Chipo Madziva', roomNumber: 'Room 2A', condition: 'Excellent', dateAssigned: '2026-01-16' },
];

export const inventory = [
  { id: '1', name: 'Exercise Books (48pg)', category: 'Stationery', quantity: 2500, warehouse: 'Main Store', unitCost: 0.50, reorderLevel: 500 },
  { id: '2', name: 'Blue Pens', category: 'Stationery', quantity: 1200, warehouse: 'Main Store', unitCost: 0.25, reorderLevel: 300 },
  { id: '3', name: 'Chalk (White)', category: 'Teaching Supplies', quantity: 500, warehouse: 'Main Store', unitCost: 0.10, reorderLevel: 100 },
  { id: '4', name: 'Science Kit', category: 'Lab Supplies', quantity: 25, warehouse: 'Science Lab', unitCost: 45.00, reorderLevel: 5 },
  { id: '5', name: 'Printer Paper (A4)', category: 'Office Supplies', quantity: 150, warehouse: 'Admin Office', unitCost: 5.00, reorderLevel: 30 },
];

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: 'Annual' | 'Sick' | 'Maternity' | 'Personal' | 'Compassionate';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  paid: boolean;
}

export const leaveRequests: LeaveRequest[] = [
  { id: '1', staffId: '5', type: 'Annual', startDate: '2026-03-20', endDate: '2026-03-25', days: 5, reason: 'Family vacation', status: 'Approved', paid: true },
  { id: '2', staffId: '1', type: 'Sick', startDate: '2026-03-18', endDate: '2026-03-19', days: 2, reason: 'Medical appointment', status: 'Pending', paid: true },
  { id: '3', staffId: '4', type: 'Personal', startDate: '2026-04-01', endDate: '2026-04-02', days: 2, reason: 'Personal matters', status: 'Pending', paid: false },
];

export interface LeaveAllocation {
  staffId: string;
  annual: number;
  sick: number;
  maternity: number;
  personal: number;
  compassionate: number;
  annualUsed: number;
  sickUsed: number;
  maternityUsed: number;
  personalUsed: number;
  compassionateUsed: number;
}

export const leaveAllocations: LeaveAllocation[] = [
  { staffId: '1', annual: 20, sick: 10, maternity: 0, personal: 5, compassionate: 5, annualUsed: 0, sickUsed: 2, maternityUsed: 0, personalUsed: 0, compassionateUsed: 0 },
  { staffId: '2', annual: 20, sick: 10, maternity: 90, personal: 5, compassionate: 5, annualUsed: 3, sickUsed: 0, maternityUsed: 0, personalUsed: 1, compassionateUsed: 0 },
  { staffId: '3', annual: 22, sick: 10, maternity: 0, personal: 5, compassionate: 5, annualUsed: 5, sickUsed: 1, maternityUsed: 0, personalUsed: 2, compassionateUsed: 0 },
  { staffId: '4', annual: 20, sick: 10, maternity: 90, personal: 5, compassionate: 5, annualUsed: 0, sickUsed: 0, maternityUsed: 0, personalUsed: 2, compassionateUsed: 0 },
  { staffId: '5', annual: 20, sick: 10, maternity: 0, personal: 5, compassionate: 5, annualUsed: 5, sickUsed: 3, maternityUsed: 0, personalUsed: 0, compassionateUsed: 1 },
];

export interface UserCredential {
  id: string;
  staffId: string;
  email: string;
  role: string;
  password: string;
  lastChanged: string;
  status: 'Active' | 'Locked' | 'Disabled';
  mustChangePassword: boolean;
}

export const userCredentials: UserCredential[] = [
  { id: '1', staffId: '1', email: 'teacher@brainstar.edu', role: 'teacher', password: 'test123', lastChanged: '2026-01-15', status: 'Active', mustChangePassword: false },
  { id: '2', staffId: '2', email: 'sarah.ncube@brainstar.edu', role: 'teacher', password: 'test123', lastChanged: '2026-01-15', status: 'Active', mustChangePassword: true },
  { id: '3', staffId: '3', email: 'hr@brainstar.edu', role: 'hr', password: 'test123', lastChanged: '2026-02-01', status: 'Active', mustChangePassword: false },
  { id: '4', staffId: '4', email: 'accountant@brainstar.edu', role: 'accountant', password: 'test123', lastChanged: '2026-01-20', status: 'Active', mustChangePassword: false },
  { id: '5', staffId: '5', email: 'michael.t@brainstar.edu', role: 'teacher', password: 'test123', lastChanged: '2026-01-15', status: 'Active', mustChangePassword: true },
];

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  description: string;
  qualifications: string;
  deadline: string;
  status: 'Open' | 'Closed' | 'Filled';
  datePosted: string;
  salary?: string;
}

export const jobPostings: JobPosting[] = [
  { id: '1', title: 'Mathematics Teacher', department: 'Mathematics', description: 'We are seeking a qualified Mathematics teacher for Form 1-4 classes. The candidate will be responsible for lesson planning, classroom teaching, and continuous assessment.', qualifications: 'Bachelor\'s degree in Mathematics or Education. Teaching certificate required. Minimum 2 years teaching experience.', deadline: '2026-04-30', status: 'Open', datePosted: '2026-03-15', salary: '$1,100 - $1,400/month' },
  { id: '2', title: 'Science Lab Technician', department: 'Sciences', description: 'Laboratory technician to support Physics, Chemistry, and Biology practical sessions. Responsible for lab maintenance, equipment setup, and safety compliance.', qualifications: 'Diploma in Laboratory Science. Experience with school laboratory equipment preferred.', deadline: '2026-04-20', status: 'Open', datePosted: '2026-03-10', salary: '$800 - $1,000/month' },
];

export interface JobApplication {
  id: string;
  jobId: string;
  applicantName: string;
  email: string;
  phone: string;
  qualifications: string;
  experience: string;
  coverLetter: string;
  dateApplied: string;
  status: 'Received' | 'Shortlisted' | 'Interviewed' | 'Offered' | 'Rejected';
}

export const jobApplications: JobApplication[] = [
  { id: '1', jobId: '1', applicantName: 'Peter Mugabe', email: 'peter.m@email.com', phone: '+263776001122', qualifications: 'BSc Mathematics, Teaching Diploma', experience: '3 years at Greendale Academy', coverLetter: 'I am excited to apply...', dateApplied: '2026-03-18', status: 'Shortlisted' },
  { id: '2', jobId: '1', applicantName: 'Grace Hwata', email: 'grace.h@email.com', phone: '+263776334455', qualifications: 'BEd Mathematics', experience: '5 years at St Johns High', coverLetter: 'With my extensive experience...', dateApplied: '2026-03-20', status: 'Received' },
  { id: '3', jobId: '2', applicantName: 'Tapiwa Chirwa', email: 'tapiwa.c@email.com', phone: '+263776556677', qualifications: 'National Diploma Lab Technology', experience: '2 years at UZ Lab', coverLetter: 'I have hands-on experience...', dateApplied: '2026-03-16', status: 'Interviewed' },
];
