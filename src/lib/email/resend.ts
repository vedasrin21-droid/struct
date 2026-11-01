import { Resend } from 'resend';
import { getDb } from '@/lib/assess/db';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skippedDueToExamOnlyMode?: boolean;
}

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('placeholder')) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'STRUCT Platform <notifications@struct.careers>';

/**
 * Determines whether a candidate account is configured for EXAM_ONLY authentication mode
 * directly from database records.
 *
 * Explicit Rule:
 * - EXAM_ONLY candidates must not receive email through their generated login IDs.
 * - CLERK / normal accounts may receive transactional email when email is valid.
 * - Never infer fake email status from domain names alone.
 */
export async function isExamOnlyCandidateAccount(email: string): Promise<boolean> {
  if (!email) return true;
  try {
    const db = getDb();
    const user = await db.queryOne<{ id: string; role: string; must_change_password: number }>(
      'SELECT id, role, must_change_password FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (!user) {
      // Non-existent or external address (not an exam-only generated credential)
      return false;
    }

    if (user.role === 'candidate') {
      // Check if candidate belongs to an exam_only configuration or has generated temp password
      const examAssignment = await db.queryOne<{ auth_mode: string }>(
        `SELECT e.auth_mode
         FROM exam_assignments ea
         JOIN exams e ON e.id = ea.exam_id
         WHERE ea.candidate_id = $1
         ORDER BY ea.assigned_at DESC LIMIT 1`,
        [user.id]
      );

      if (examAssignment?.auth_mode === 'exam_only' || Number(user.must_change_password) === 1) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Send an assessment invitation to a candidate (normal/Clerk authenticated accounts only).
 */
export async function sendAssessmentInvite(params: {
  toEmail: string;
  candidateName: string;
  examTitle: string;
  examCode: string;
  durationMinutes: number;
  deadlineFormatted: string;
  examUrl: string;
  organizationName?: string;
}): Promise<EmailSendResult> {
  const isExamOnly = await isExamOnlyCandidateAccount(params.toEmail);
  if (isExamOnly) {
    console.log(`[Resend Skipped] EXAM_ONLY candidate account "${params.toEmail}" will not receive email.`);
    return { success: true, skippedDueToExamOnlyMode: true };
  }

  const client = getResendClient();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Assessment Invitation: ${params.examTitle}</h2>
      <p>Hello ${params.candidateName},</p>
      <p>You have been assigned to complete the <strong>${params.examTitle}</strong> (${params.examCode})${params.organizationName ? ` by ${params.organizationName}` : ''}.</p>
      <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Duration:</strong> ${params.durationMinutes} minutes</p>
        <p style="margin: 4px 0;"><strong>Deadline:</strong> ${params.deadlineFormatted}</p>
      </div>
      <div style="margin: 24px 0;">
        <a href="${params.examUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Start Assessment &rarr;
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Please ensure a stable internet connection and quiet environment before starting.</p>
    </div>
  `;

  if (!client) {
    console.log(`[Resend Dev Fallback] Assessment invite prepared for ${params.toEmail}: ${params.examUrl}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const data = await client.emails.send({
      from: FROM_EMAIL,
      to: params.toEmail,
      subject: `Action Required: Invitation to ${params.examTitle}`,
      html,
    });
    return { success: true, messageId: data.data?.id };
  } catch (err: any) {
    console.error('[Resend Error]', err);
    return { success: false, error: err?.message || 'Failed to send email' };
  }
}

/**
 * Send an organization team member invitation.
 */
export async function sendOrganizationInvite(params: {
  toEmail: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}): Promise<EmailSendResult> {
  const client = getResendClient();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Join ${params.organizationName} on STRUCT</h2>
      <p>Hello,</p>
      <p>${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> as an <strong>${params.role}</strong> on STRUCT Recruitment Platform.</p>
      <div style="margin: 24px 0;">
        <a href="${params.inviteUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Accept Invitation &rarr;
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This invitation link will expire in 7 days.</p>
    </div>
  `;

  if (!client) {
    console.log(`[Resend Dev Fallback] Org invite prepared for ${params.toEmail}: ${params.inviteUrl}`);
    return { success: true, messageId: `mock_org_${Date.now()}` };
  }

  try {
    const data = await client.emails.send({
      from: FROM_EMAIL,
      to: params.toEmail,
      subject: `Invitation to join ${params.organizationName} on STRUCT`,
      html,
    });
    return { success: true, messageId: data.data?.id };
  } catch (err: any) {
    console.error('[Resend Error]', err);
    return { success: false, error: err?.message || 'Failed to send invite' };
  }
}

/**
 * Send a payment receipt for AI packs or subscriptions.
 */
export async function sendPaymentReceipt(params: {
  toEmail: string;
  customerName: string;
  receiptNumber: string;
  amountInr: number;
  productName: string;
  dateFormatted: string;
}): Promise<EmailSendResult> {
  const client = getResendClient();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Payment Receipt</h2>
      <p>Hello ${params.customerName},</p>
      <p>Thank you for your purchase on STRUCT. Here is your receipt:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Receipt #:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${params.receiptNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Date:</td>
          <td style="padding: 8px 0; text-align: right;">${params.dateFormatted}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Item:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${params.productName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; font-size: 16px; font-weight: 600;">Total Paid:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: 700; color: #059669;">₹${params.amountInr}</td>
        </tr>
      </table>
      <p style="color: #64748b; font-size: 13px;">If you have any questions about this charge, please contact support@struct.careers.</p>
    </div>
  `;

  if (!client) {
    console.log(`[Resend Dev Fallback] Payment receipt prepared for ${params.toEmail}: ₹${params.amountInr}`);
    return { success: true, messageId: `mock_receipt_${Date.now()}` };
  }

  try {
    const data = await client.emails.send({
      from: FROM_EMAIL,
      to: params.toEmail,
      subject: `Receipt for your STRUCT purchase (${params.productName})`,
      html,
    });
    return { success: true, messageId: data.data?.id };
  } catch (err: any) {
    console.error('[Resend Error]', err);
    return { success: false, error: err?.message || 'Failed to send receipt' };
  }
}
