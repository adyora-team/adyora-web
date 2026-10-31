import { createServiceRoleClient } from '@/utils/supabase/admin';

export type BrevoTemplateType =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'order_confirmation'
  | 'payment_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_confirmation';

interface SendBrevoEmailParams {
  toEmail: string;
  toName?: string;
  templateType: BrevoTemplateType;
  orderId?: string | null;
  variables?: {
    customerName?: string;
    orderNumber?: string;
    totalAmount?: string;
    trackingNumber?: string;
    courierName?: string;
    actionUrl?: string;
    itemsSummaryHtml?: string;
    refundAmount?: string;
  };
}

function renderAdyoraEmailTemplate(
  templateType: BrevoTemplateType,
  vars: NonNullable<SendBrevoEmailParams['variables']>
): { subject: string; htmlContent: string } {
  const name = vars.customerName || 'Valued Customer';
  const orderNo = vars.orderNumber || '';
  const total = vars.totalAmount || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://adyora.in';

  let subject = 'Notification from ADYORA';
  let headline = 'WEAR YOUR IDENTITY.';
  let bodyHtml = '';
  let ctaText = 'VISIT ADYORA';
  let ctaUrl = siteUrl;

  switch (templateType) {
    case 'welcome':
      subject = 'Welcome to ADYORA — Contemporary Streetwear';
      headline = 'WELCOME TO ADYORA.';
      bodyHtml = `<p>Hi ${name},</p><p>Your ADYORA account is now active. Explore our latest drops in contemporary streetwear, crafted for clean fits and everyday elevation.</p>`;
      ctaText = 'SHOP COLLECTION';
      ctaUrl = `${siteUrl}/shop`;
      break;

    case 'email_verification':
      subject = 'Verify your ADYORA email address';
      headline = 'VERIFY YOUR EMAIL.';
      bodyHtml = `<p>Hi ${name},</p><p>Please confirm your email address to complete your ADYORA account setup.</p>`;
      ctaText = 'VERIFY EMAIL';
      ctaUrl = vars.actionUrl || `${siteUrl}/account`;
      break;

    case 'password_reset':
      subject = 'Reset your ADYORA password';
      headline = 'PASSWORD RESET REQUEST.';
      bodyHtml = `<p>Hi ${name},</p><p>We received a request to reset the password for your ADYORA account. Click the button below to set a new password.</p>`;
      ctaText = 'RESET PASSWORD';
      ctaUrl = vars.actionUrl || `${siteUrl}/login`;
      break;

    case 'order_confirmation':
      subject = `Order Confirmed — #${orderNo} | ADYORA`;
      headline = `ORDER #${orderNo} CONFIRMED.`;
      bodyHtml = `
        <p>Hi ${name},</p>
        <p>Thank you for your order with ADYORA. We have received your order <strong>#${orderNo}</strong> totaling <strong>${total}</strong> and are preparing it for dispatch.</p>
        ${vars.itemsSummaryHtml || ''}
      `;
      ctaText = 'VIEW ORDER DETAILS';
      ctaUrl = `${siteUrl}/account`;
      break;

    case 'payment_confirmation':
      subject = `Payment Received for Order #${orderNo} | ADYORA`;
      headline = 'PAYMENT VERIFIED.';
      bodyHtml = `<p>Hi ${name},</p><p>Your payment of <strong>${total}</strong> for order <strong>#${orderNo}</strong> has been securely verified. We are now processing your items.</p>`;
      ctaText = 'TRACK ORDER';
      ctaUrl = `${siteUrl}/account`;
      break;

    case 'order_shipped':
      subject = `Your ADYORA Order #${orderNo} Has Shipped`;
      headline = 'YOUR ORDER IS ON THE WAY.';
      bodyHtml = `
        <p>Hi ${name},</p>
        <p>Great news — your ADYORA order <strong>#${orderNo}</strong> has been dispatched.</p>
        <p><strong>Courier:</strong> ${vars.courierName || 'Express Partner'}<br/>
        <strong>Tracking Number:</strong> ${vars.trackingNumber || 'Updated in your account'}</p>
      `;
      ctaText = 'TRACK SHIPMENT';
      ctaUrl = `${siteUrl}/account`;
      break;

    case 'order_delivered':
      subject = `Order #${orderNo} Delivered | ADYORA`;
      headline = 'DELIVERED.';
      bodyHtml = `<p>Hi ${name},</p><p>Your ADYORA order <strong>#${orderNo}</strong> has been delivered. Thank you for choosing ADYORA.</p>`;
      ctaText = 'SHOP NEW ARRIVALS';
      ctaUrl = `${siteUrl}/shop`;
      break;

    case 'order_cancelled':
      subject = `Order #${orderNo} Cancelled | ADYORA`;
      headline = `ORDER #${orderNo} CANCELLED.`;
      bodyHtml = `<p>Hi ${name},</p><p>Your order <strong>#${orderNo}</strong> has been cancelled as requested or due to stock/payment verification. If a payment was captured, a refund will be initiated automatically.</p>`;
      ctaText = 'CONTACT SUPPORT';
      ctaUrl = `${siteUrl}/pages/contact-us`;
      break;

    case 'refund_confirmation':
      subject = `Refund Processed for Order #${orderNo} | ADYORA`;
      headline = 'REFUND PROCESSED.';
      bodyHtml = `<p>Hi ${name},</p><p>A refund of <strong>${vars.refundAmount || total}</strong> for order <strong>#${orderNo}</strong> has been processed. Please allow 5–7 business days for the amount to reflect in your original payment method.</p>`;
      ctaText = 'VIEW ACCOUNT';
      ctaUrl = `${siteUrl}/account`;
      break;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#080808;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E5E5E5;">
              <tr>
                <td style="background-color:#080808;padding:24px 32px;text-align:left;">
                  <span style="font-size:24px;font-weight:900;letter-spacing:0.12em;color:#0066FF;text-transform:uppercase;">ADYORA</span>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 32px;">
                  <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#0066FF;font-weight:700;">CONTEMPORARY STREETWEAR</p>
                  <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:900;letter-spacing:0.02em;color:#080808;text-transform:uppercase;">${headline}</h1>
                  <div style="font-size:14px;line-height:1.65;color:#222222;">
                    ${bodyHtml}
                  </div>
                  <div style="margin-top:28px;">
                    <a href="${ctaUrl}" style="display:inline-block;background-color:#080808;color:#FFFFFF;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                      ${ctaText} &rarr;
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color:#F4F4F4;padding:20px 32px;border-top:1px solid #E5E5E5;font-size:12px;color:#6B6B6B;">
                  <p style="margin:0;">&copy; ${new Date().getFullYear()} ADYORA. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, htmlContent };
}

/**
 * Sends a transactional email through Brevo REST API with automatic retry handling
 * and persists the delivery log in `public.email_logs`.
 */
export async function sendTransactionalEmail(
  params: SendBrevoEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'orders@adyora.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'ADYORA';

  const { subject, htmlContent } = renderAdyoraEmailTemplate(
    params.templateType,
    params.variables || {}
  );

  let status: 'sent' | 'failed' = 'failed';
  let messageId = '';
  let lastError = '';
  let attempts = 0;

  if (!apiKey) {
    lastError = 'BREVO_API_KEY not configured; email logged in dry-run state.';
  } else {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts = attempt;
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: params.toEmail, name: params.toName || params.toEmail }],
            subject,
            htmlContent,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          status = 'sent';
          messageId = data.messageId || '';
          lastError = '';
          break;
        } else {
          lastError = data?.message || `HTTP ${res.status}`;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Network error';
      }
    }
  }

  // Record in Supabase email_logs table
  try {
    const supabaseAdmin = createServiceRoleClient();
    await supabaseAdmin.from('email_logs').insert({
      recipient_email: params.toEmail,
      template_type: params.templateType,
      subject,
      order_id: params.orderId || null,
      brevo_message_id: messageId,
      status,
      attempts: Math.max(attempts, 1),
      error_message: lastError,
    });
  } catch {
    // Do not throw if email_logs table is not yet migrated
  }

  return {
    success: status === 'sent',
    messageId,
    error: lastError || undefined,
  };
}

