import React from 'react';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import { useBranch } from '@/contexts/BranchContext';
import { Landmark } from 'lucide-react';

interface ReportHeaderProps {
  reportTitle: string;
  subtitle?: string;
}

export default function ReportHeader({ reportTitle, subtitle }: ReportHeaderProps) {
  const { settings } = useSchoolSettings();
  const { currentBranch } = useBranch();

  return (
    <div className="text-center mb-6 pb-4 border-b-2 border-primary report-header">
      {/* Logo */}
      <div className="flex justify-center mb-2">
        {settings.logo ? (
          <img src={settings.logo} alt={settings.name} className="h-16 w-16 object-contain" />
        ) : (
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
            <Landmark size={32} className="text-primary-foreground" />
          </div>
        )}
      </div>

      {/* School Name */}
      <h2 className="font-display text-xl font-bold text-foreground">{settings.name}</h2>

      {/* Address & Phone */}
      {settings.address && (
        <p className="text-sm text-muted-foreground">{settings.address}</p>
      )}
      {(settings.phone || settings.email) && (
        <p className="text-sm text-muted-foreground">
          {settings.phone}{settings.phone && settings.email ? ' | ' : ''}{settings.email}
        </p>
      )}

      {/* Branch */}
      {currentBranch && (
        <p className="text-xs text-muted-foreground mt-1">Branch: {currentBranch.name}</p>
      )}

      {/* Bank Details (if set) */}
      {settings.bankDetails && (
        <p className="text-xs text-muted-foreground mt-1">{settings.bankDetails}</p>
      )}

      {/* Report Title */}
      <div className="mt-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{reportTitle}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
