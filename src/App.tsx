import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { SchoolSettingsProvider } from "@/contexts/SchoolSettingsContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import EnrollStudent from "@/pages/EnrollStudent";
import GeneralLedger from "@/pages/finance/GeneralLedger";
import Cashbook from "@/pages/finance/Cashbook";
import Journals from "@/pages/finance/Journals";
import Invoices from "@/pages/finance/Invoices";
import Receipts from "@/pages/finance/Receipts";
import CurrencySettings from "@/pages/finance/CurrencySettings";
import TrialBalance from "@/pages/reports/TrialBalance";
import BalanceSheet from "@/pages/reports/BalanceSheet";
import IncomeStatement from "@/pages/reports/IncomeStatement";
import FeesStatement from "@/pages/reports/FeesStatement";
import FeesBalances from "@/pages/reports/FeesBalances";
import StaffList from "@/pages/hr/StaffList";
import Payroll from "@/pages/hr/Payroll";
import Assets from "@/pages/Assets";
import Inventory from "@/pages/Inventory";
import Subjects from "@/pages/academics/Subjects";
import Classes from "@/pages/academics/Classes";
import ContinuousAssessment from "@/pages/academics/ContinuousAssessment";
import PlaceholderPage from "@/pages/PlaceholderPage";
import SchoolSettings from "@/pages/admin/SchoolSettings";
import BankReconciliation from "@/pages/finance/BankReconciliation";
import CreditorsReconciliation from "@/pages/finance/CreditorsReconciliation";
import DebtorsReconciliation from "@/pages/finance/DebtorsReconciliation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SchoolSettingsProvider>
      <BranchProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/enroll" element={<EnrollStudent />} />
                <Route path="/attendance" element={<PlaceholderPage />} />
                <Route path="/academics/subjects" element={<Subjects />} />
                <Route path="/academics/classes" element={<Classes />} />
                <Route path="/academics/timetable" element={<PlaceholderPage />} />
                <Route path="/academics/assessment" element={<ContinuousAssessment />} />
                <Route path="/exams/types" element={<PlaceholderPage />} />
                <Route path="/exams/schedule" element={<PlaceholderPage />} />
                <Route path="/exams/marks" element={<PlaceholderPage />} />
                <Route path="/exams/results" element={<PlaceholderPage />} />
                <Route path="/exams/evaluation" element={<PlaceholderPage />} />
                <Route path="/finance/gl" element={<GeneralLedger />} />
                <Route path="/finance/cashbook" element={<Cashbook />} />
                <Route path="/finance/journals" element={<Journals />} />
                <Route path="/finance/invoices" element={<Invoices />} />
                <Route path="/finance/receipts" element={<Receipts />} />
                <Route path="/finance/currency" element={<CurrencySettings />} />
                <Route path="/finance/creditors" element={<PlaceholderPage />} />
                <Route path="/finance/bank-recon" element={<PlaceholderPage />} />
                <Route path="/reports/trial-balance" element={<TrialBalance />} />
                <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
                <Route path="/reports/income-statement" element={<IncomeStatement />} />
                <Route path="/reports/fees-statement" element={<FeesStatement />} />
                <Route path="/reports/fees-balances" element={<FeesBalances />} />
                <Route path="/reports/account-transactions" element={<PlaceholderPage />} />
                <Route path="/hr/staff" element={<StaffList />} />
                <Route path="/hr/recruitment" element={<PlaceholderPage />} />
                <Route path="/hr/leave" element={<PlaceholderPage />} />
                <Route path="/hr/payroll" element={<Payroll />} />
                <Route path="/hr/departments" element={<PlaceholderPage />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/admin/settings" element={<SchoolSettings />} />
                <Route path="/admin/roles" element={<PlaceholderPage />} />
                <Route path="/admin/announcements" element={<PlaceholderPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </BranchProvider>
      </SchoolSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
