const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // not configured yet — caller should handle gracefully
  }

  const port = Number(process.env.EMAIL_PORT) || 465;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    // 465 is implicit TLS; 587 (and most other ports) use STARTTLS, which
    // nodemailer only negotiates when `secure` is false. Hardcoding `true`
    // silently breaks any provider (e.g. Brevo, port 587) that isn't 465.
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

/**
 * Sends an email. If EMAIL_USER/EMAIL_PASS are not configured (e.g. during
 * local development before SMTP is set up), this logs the intended email
 * to the console instead of throwing — so the rest of the signup flow
 * (user creation, RBAC, etc.) can still be developed and tested.
 */
async function sendEmail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    console.log("─────────────────────────────────────────");
    console.log("[Email] SMTP not configured — logging instead of sending:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${html.replace(/<[^>]+>/g, " ").trim()}`);
    console.log("─────────────────────────────────────────");
    return { simulated: true };
  }

  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  return info;
}

module.exports = sendEmail;
