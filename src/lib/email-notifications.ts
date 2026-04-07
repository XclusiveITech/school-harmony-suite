import { toast } from 'sonner';

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

// Simulated email log (in-memory for demo)
const emailLog: EmailNotification[] = [];

export function sendEmailNotification(to: string, subject: string, body: string) {
  const notification: EmailNotification = {
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
  };
  emailLog.push(notification);
  toast.success(`Email sent to ${to}`, { description: subject });
  console.log('[Email Notification]', notification);
}

export function getEmailLog() {
  return [...emailLog];
}

// Leave notification helpers
export function sendLeaveApprovalEmail(staffEmail: string, staffName: string, leaveType: string, startDate: string, endDate: string, days: number) {
  sendEmailNotification(
    staffEmail,
    `Leave Request Approved — ${leaveType}`,
    `Dear ${staffName},\n\nYour ${leaveType} leave request from ${startDate} to ${endDate} (${days} days) has been approved.\n\nRegards,\nBrainstar Academy HR`
  );
}

export function sendLeaveRejectionEmail(staffEmail: string, staffName: string, leaveType: string, startDate: string, endDate: string) {
  sendEmailNotification(
    staffEmail,
    `Leave Request Rejected — ${leaveType}`,
    `Dear ${staffName},\n\nYour ${leaveType} leave request from ${startDate} to ${endDate} has been rejected. Please contact HR for more details.\n\nRegards,\nBrainstar Academy HR`
  );
}

// Recruitment notification helpers
export function sendApplicationStatusEmail(applicantEmail: string, applicantName: string, jobTitle: string, status: string) {
  const messages: Record<string, string> = {
    Shortlisted: `We are pleased to inform you that you have been shortlisted for the position of ${jobTitle}. We will contact you shortly with further details.`,
    Interviewed: `Thank you for attending the interview for the position of ${jobTitle}. We will be in touch with the outcome soon.`,
    Offered: `Congratulations! We are pleased to offer you the position of ${jobTitle} at Brainstar Academy. Please contact HR to discuss next steps.`,
    Rejected: `Thank you for your interest in the position of ${jobTitle}. After careful review, we regret to inform you that we will not be proceeding with your application at this time.`,
  };

  sendEmailNotification(
    applicantEmail,
    `Application Update — ${jobTitle}: ${status}`,
    `Dear ${applicantName},\n\n${messages[status] || `Your application status has been updated to: ${status}.`}\n\nRegards,\nBrainstar Academy HR`
  );
}
