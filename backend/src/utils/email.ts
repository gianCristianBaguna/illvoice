import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');

function loadEmailConfig() {
  dotenv.config({ path: envPath, override: true });

  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s+/g, '').trim(),
    fromEmail: process.env.FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || 'noreply@illvoice.app',
    appName: process.env.APP_NAME?.trim() || 'IllVoice',
  };
}

let transporter: nodemailer.Transporter | null = null;
let transporterSignature: string | null = null;

export function getTransporter() {
  const config = loadEmailConfig();
  const signature = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass}`;

  if (!config.user || !config.pass) {
    return null;
  }

  if (!transporter || transporterSignature !== signature) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    transporterSignature = signature;
  }

  return transporter;
}

export async function sendVerificationEmail(to: string, code: string, name?: string): Promise<{ sent: boolean; code: string }> {
  const config = loadEmailConfig();
  const t = getTransporter();

  if (!t) {
    console.log('[Email] Verification code for', to, ':', code);
    console.log('[Email] SMTP not configured (missing SMTP_USER/SMTP_PASS). Returning code for dev mode.');
    return { sent: false, code };
  }

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #1E3A8A; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${config.appName}</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Email Verification</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Hello${name ? ' ' + name : ''},</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for using ${config.appName}. Please use the verification code below to verify your email address:
            </p>
            <div style="background-color: #f0f0f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; color: #1E3A8A; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.5;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this verification, please ignore this email.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 16px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${config.appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await t.sendMail({
      from: `"${config.appName}" <${config.fromEmail}>`,
      to,
      subject: `Verify your email - ${config.appName}`,
      text: `Hi${name ? ' ' + name : ''},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification, please ignore this email.`,
      html,
    });
    console.log('[Email] Verification email sent:', info.messageId, 'to', to);
    return { sent: true, code };
  } catch (err) {
    console.error('[Email] Failed to send verification email:', err);
    return { sent: false, code };
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
