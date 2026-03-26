import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  status: 'Active' | 'Inactive';
}

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch;
  switchBranch: (branchId: string) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, data: Partial<Branch>) => void;
}

const defaultBranches: Branch[] = [
  { id: '1', name: 'Brainstar Main Campus', code: 'MAIN', address: '12 Education Rd, Harare', phone: '+263771000001', status: 'Active' },
  { id: '2', name: 'Brainstar Bulawayo', code: 'BYO', address: '45 School Ave, Bulawayo', phone: '+263771000002', status: 'Active' },
  { id: '3', name: 'Brainstar Gweru', code: 'GWR', address: '78 Academy St, Gweru', phone: '+263771000003', status: 'Active' },
];

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(defaultBranches);
  const [currentBranchId, setCurrentBranchId] = useState(() => {
    return localStorage.getItem('brainstar_branch') || '1';
  });

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

  const switchBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
    localStorage.setItem('brainstar_branch', branchId);
  };

  const addBranch = (branch: Omit<Branch, 'id'>) => {
    const newBranch: Branch = { ...branch, id: String(Date.now()) };
    setBranches(prev => [...prev, newBranch]);
  };

  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };

  return (
    <BranchContext.Provider value={{ branches, currentBranch, switchBranch, addBranch, updateBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
