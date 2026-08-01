import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    // If SMTP is provided in env vars, use it
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Default to Ethereal Email for development/testing if no SMTP provided
    console.warn("No SMTP configuration found. Creating a test Ethereal account...");
    const testAccount = await nodemailer.createTestAccount();
    
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  })();

  return transporterPromise;
}

// The visible From address. With transactional providers (Resend, Brevo, SES)
// the SMTP login is an API key — not an email address — so the sender must be
// set separately via SMTP_FROM (an address on your verified domain). Gmail-style
// setups can omit SMTP_FROM and fall back to the authenticated user.
export function senderAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@ailexity.com";
}

export async function sendEmail({
  to,
  bcc,
  subject,
  text,
  html,
}: {
  to: string;
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}) {
  const transporter = await getTransporter();

  const fromAddress = senderAddress();

  const info = await transporter.sendMail({
    from: `"Ailexity Market" <${fromAddress}>`,
    to,
    bcc,
    subject,
    text: text || "Ailexity Market Notification",
    html: html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`Email sent to ${to}: ${info.messageId}`);
  }

  // If we are using Ethereal, print the test URL so user can view it in browser
  const testUrl = nodemailer.getTestMessageUrl(info);
  if (testUrl) {
    console.log(`Preview Email here: ${testUrl}`);
  }

  return info;
}
