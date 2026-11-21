const nodemailer = require('nodemailer');

const DEV_EMAIL = process.env.DEV_EMAIL || 'nexbyte.dev@gmail.com';
const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.EMAIL_USER || 'perpetualnagpur@gmail.com';

function getTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ SMTP credentials not found in env, skipping live email delivery.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

const PRIORITY_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#2563eb',
  Low: '#64748b'
};

const STATUS_COLORS = {
  Open: '#ea580c',
  'In Progress': '#0284c7',
  'Under Review': '#7c3aed',
  Resolved: '#16a34a',
  Closed: '#475569'
};

/**
 * 1. Notification sent immediately when a customer raises a new ticket
 *    - To Dev (nexbyte.dev@gmail.com) & Owner
 *    - To Customer (Confirmation & transparency)
 */
async function sendTicketCreatedEmails(ticket) {
  const transporter = getTransporter();
  if (!transporter) return;

  const senderAddress = `"PS-MagnaShield Support" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`;
  const priorityColor = PRIORITY_COLORS[ticket.priority] || '#2563eb';

  // --- A. Mail to Developer & Owner ---
  const adminSubject = `🚨 [New Support Ticket #${ticket.ticketId}] ${ticket.title} (${ticket.priority} Priority)`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 22px 26px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 1.3rem; color: #ffffff;">PS-MagnaShield Support Desk</h2>
          <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">
            ${ticket.priority} Priority
          </span>
        </div>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 0.9rem;">
          NexByte Developer Dispatch & Platform Engineering
        </p>
      </div>

      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Ticket ID:</strong></td>
              <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">#${ticket.ticketId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; font-weight: bold; color: #028090;">${ticket.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Category:</strong></td>
              <td style="padding: 6px 0;">${ticket.category}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Customer:</strong></td>
              <td style="padding: 6px 0;">${ticket.customerName} (<a href="mailto:${ticket.customerEmail}" style="color: #028090;">${ticket.customerEmail}</a>)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Company:</strong></td>
              <td style="padding: 6px 0;">${ticket.companyName || 'N/A'} ${ticket.companyCode ? `(Code: ${ticket.companyCode})` : ''}</td>
            </tr>
            ${ticket.contact ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Contact:</strong></td>
              <td style="padding: 6px 0;">📞 ${ticket.contact}</td>
            </tr>` : ''}
            ${ticket.systemInfo?.currentUrl ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Raised From:</strong></td>
              <td style="padding: 6px 0; font-size: 0.85rem; color: #64748b;">${ticket.systemInfo.currentUrl}</td>
            </tr>` : ''}
          </table>
        </div>

        <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 1rem;">Problem / Error Description:</h4>
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #028090; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; white-space: pre-wrap; font-family: Consolas, monospace, sans-serif; font-size: 0.9rem; color: #1e293b;">
${ticket.description}
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://perpetualsolutions.co.in/dev" style="background: linear-gradient(135deg, #028090 0%, #00a896 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 0.95rem; display: inline-block;">
            🛠️ Open Developer Dashboard →
          </a>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 14px 24px; font-size: 0.8rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
        NexByte Development Team (nexbyte.dev@gmail.com) • Perpetual Solutions MagnaShield
      </div>
    </div>
  `;

  // --- B. Confirmation Mail to Customer ---
  const customerSubject = `🎟️ Ticket Received: [#${ticket.ticketId}] - ${ticket.title}`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #00a896 0%, #028090 100%); color: white; padding: 24px;">
        <h2 style="margin: 0 0 6px 0; font-size: 1.35rem; color: #ffffff;">PS-MagnaShield Support</h2>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 0.92rem;">
          Your support ticket has been received and logged.
        </p>
      </div>

      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p style="margin-top: 0;">Dear <strong>${ticket.customerName}</strong>,</p>
        <p>Thank you for reaching out to us. We have received your ticket and our dedicated engineering team at <strong>NexByte Dev</strong> has been notified.</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
          <p style="margin: 4px 0;"><strong>Ticket Reference:</strong> <span style="color: #028090; font-weight: bold;">#${ticket.ticketId}</span></p>
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${ticket.title}</p>
          <p style="margin: 4px 0;"><strong>Category:</strong> ${ticket.category}</p>
          <p style="margin: 4px 0;"><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${ticket.priority}</span></p>
          <p style="margin: 4px 0;"><strong>Initial Status:</strong> <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85rem;">Open</span></p>
        </div>

        <h4 style="margin: 16px 0 6px 0; color: #0f172a;">Your Reported Issue:</h4>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 0.88rem; color: #475569; white-space: pre-wrap;">
${ticket.description}
        </div>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 0.88rem; color: #1e40af; margin-bottom: 20px;">
          <strong>💡 Full Transparency Guarantee:</strong>
          <br />
          You will receive automatic email updates whenever our developers change the ticket status (e.g. <em>In Progress</em>, <em>Under Review</em>, or <em>Resolved</em>) along with developer resolution notes.
        </div>

        <p style="margin-bottom: 0; font-size: 0.9rem; color: #64748b;">
          You can also track your ticket progress directly inside the PS-MagnaShield portal under <strong>"My Tickets"</strong> in the Help & Support menu.
        </p>
      </div>

      <div style="background: #f8fafc; padding: 14px 24px; font-size: 0.8rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
        PS-MagnaShield Engineering & NexByte Developer Desk • All Rights Reserved
      </div>
    </div>
  `;

  // Send admin notification
  try {
    await transporter.sendMail({
      from: senderAddress,
      to: [DEV_EMAIL, OWNER_EMAIL].join(','),
      subject: adminSubject,
      html: adminHtml
    });
    console.log(`✅ [TicketEmail] New ticket alert sent to ${DEV_EMAIL} and ${OWNER_EMAIL}`);
  } catch (err) {
    console.error(`❌ [TicketEmail] Failed to send admin ticket alert:`, err.message);
  }

  // Send customer confirmation
  try {
    await transporter.sendMail({
      from: senderAddress,
      to: ticket.customerEmail,
      subject: customerSubject,
      html: customerHtml
    });
    console.log(`✅ [TicketEmail] Confirmation email sent to customer ${ticket.customerEmail}`);
  } catch (err) {
    console.error(`❌ [TicketEmail] Failed to send customer confirmation:`, err.message);
  }
}

/**
 * 2. Notification sent when Developer / Owner updates ticket status or adds a resolution note
 *    - To Customer (Complete transparency on what was resolved)
 *    - To Dev & Owner (Sync record)
 */
async function sendTicketStatusUpdateEmails(ticket, previousStatus, note) {
  const transporter = getTransporter();
  if (!transporter) return;

  const senderAddress = `"PS-MagnaShield Support" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`;
  const statusColor = STATUS_COLORS[ticket.status] || '#028090';

  const customerSubject = `🔔 Ticket Status Update: [#${ticket.ticketId}] is now "${ticket.status}"`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 22px 26px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 1.3rem; color: #ffffff;">PS-MagnaShield Ticket Update</h2>
          <span style="background: ${statusColor}; color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: bold;">
            ${ticket.status}
          </span>
        </div>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 0.88rem;">
          Reference #${ticket.ticketId} • ${ticket.title}
        </p>
      </div>

      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p style="margin-top: 0;">Dear <strong>${ticket.customerName}</strong>,</p>
        <p>The status of your support ticket has been updated by the NexByte engineering team:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 0.9rem;">Previous Status:</span>
            <strong style="color: #64748b;">${previousStatus || 'Open'}</strong>
            <span style="color: #94a3b8;">➔</span>
            <span style="color: #64748b; font-size: 0.9rem;">New Status:</span>
            <span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: bold;">
              ${ticket.status}
            </span>
          </div>
          <div style="font-size: 0.9rem; color: #475569;">
            <strong>Company:</strong> ${ticket.companyName || 'N/A'} ${ticket.companyCode ? `(${ticket.companyCode})` : ''}
          </div>
        </div>

        ${note ? `
        <h4 style="margin: 20px 0 8px 0; color: #0f172a; font-size: 0.98rem;">💬 Developer Resolution / Progress Note:</h4>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 0.92rem; color: #166534; white-space: pre-wrap;">
${note}
        </div>
        ` : ''}

        ${ticket.status === 'Resolved' ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 18px 0; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">🎉</div>
          <h3 style="margin: 0 0 6px 0; color: #065f46;">Issue Marked as Resolved</h3>
          <p style="margin: 0; color: #047857; font-size: 0.88rem;">
            Our engineering team has implemented and verified the fix. Please verify on your portal.
          </p>
        </div>
        ` : ''}

        <p style="font-size: 0.88rem; color: #64748b; margin-bottom: 0;">
          If you have further questions or if the problem persists, simply reply to this email or update the ticket thread in your portal.
        </p>
      </div>

      <div style="background: #f8fafc; padding: 14px 24px; font-size: 0.8rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
        NexByte Developer Support (nexbyte.dev@gmail.com) • PS-MagnaShield Engineering
      </div>
    </div>
  `;

  // Send update to customer
  try {
    await transporter.sendMail({
      from: senderAddress,
      to: ticket.customerEmail,
      subject: customerSubject,
      html: customerHtml
    });
    console.log(`✅ [TicketEmail] Status update email sent to customer ${ticket.customerEmail}`);
  } catch (err) {
    console.error(`❌ [TicketEmail] Failed to send status update to customer:`, err.message);
  }

  // Also send sync copy to Dev & Owner
  try {
    await transporter.sendMail({
      from: senderAddress,
      to: [DEV_EMAIL, OWNER_EMAIL].join(','),
      subject: `📋 [Ticket #${ticket.ticketId} Update] ${ticket.status}: ${ticket.title}`,
      html: customerHtml
    });
    console.log(`✅ [TicketEmail] Status sync email sent to Dev and Owner`);
  } catch (err) {
    console.error(`❌ [TicketEmail] Failed to send status sync to dev/owner:`, err.message);
  }
}

/**
 * 3. Notification sent when a message is added to ticket thread
 */
async function sendTicketMessageEmail(ticket, message, senderType) {
  const transporter = getTransporter();
  if (!transporter) return;

  const senderAddress = `"PS-MagnaShield Support" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`;

  const isFromDev = senderType === 'Developer' || senderType === 'Owner';
  const recipient = isFromDev ? ticket.customerEmail : [DEV_EMAIL, OWNER_EMAIL].join(',');

  const subject = `💬 New Message on Ticket [#${ticket.ticketId}] from ${senderType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #028090 0%, #00a896 100%); color: white; padding: 20px;">
        <h3 style="margin: 0; color: #ffffff;">Ticket Message: #${ticket.ticketId}</h3>
        <p style="margin: 4px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 0.88rem;">${ticket.title}</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p style="margin-top: 0;"><strong>${message.senderName || senderType}</strong> wrote:</p>
        <div style="background: #f8fafc; border-left: 4px solid #028090; padding: 14px 16px; border-radius: 6px; font-size: 0.92rem; white-space: pre-wrap; margin-bottom: 20px;">
${message.message}
        </div>
        <p style="font-size: 0.85rem; color: #64748b;">
          Current Ticket Status: <strong>${ticket.status}</strong>
        </p>
      </div>
      <div style="background: #f8fafc; padding: 12px 24px; font-size: 0.78rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
        NexByte Developer Support (nexbyte.dev@gmail.com) • PS-MagnaShield
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: senderAddress,
      to: recipient,
      subject,
      html
    });
    console.log(`✅ [TicketEmail] Message notification sent to ${recipient}`);
  } catch (err) {
    console.error(`❌ [TicketEmail] Failed to send message email:`, err.message);
  }
}

module.exports = {
  DEV_EMAIL,
  OWNER_EMAIL,
  sendTicketCreatedEmails,
  sendTicketStatusUpdateEmails,
  sendTicketMessageEmail
};
