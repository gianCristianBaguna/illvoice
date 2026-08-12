import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const envPath = process.cwd() + '/.env';
let envLoaded = false;

function loadEmailConfig() {
  if (!envLoaded) {
    dotenv.config({ path: envPath, override: true });
    envLoaded = true;
  }

  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s+/g, '').trim(),
    fromEmail: process.env.FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || 'noreply@illvoice.app',
    appName: process.env.APP_NAME?.trim() || 'IllVoice',
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || process.env.FROM_EMAIL?.trim() || 'noreply@illvoice.app',
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

async function sendViaResend(to: string, code: string, config: ReturnType<typeof loadEmailConfig>, name?: string): Promise<boolean> {
  if (!config.resendApiKey) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${config.appName} <${config.resendFromEmail}>`,
        to,
        subject: `Verify your email - ${config.appName}`,
        text: `Hi${name ? ' ' + name : ''},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification, please ignore this email.`,
        html: `<html><body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
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
        </body></html>`,
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      console.log('[Email] Verification email sent via Resend:', data.id, 'to', to);
      return true;
    }

    const errorText = await response.text();
    console.error('[Email] Resend API error:', response.status, errorText);
    return false;
  } catch (err) {
    console.error('[Email] Resend request failed:', err);
    return false;
  }
}

export async function sendVerificationEmail(to: string, code: string, name?: string): Promise<{ sent: boolean; code: string }> {
  const config = loadEmailConfig();

  if (config.resendApiKey) {
    const sent = await sendViaResend(to, code, config, name);
    if (sent) {
      return { sent: true, code };
    }
  }

  const t = getTransporter();

  if (!t) {
    console.log('[Email] Verification code for', to, ':', code);
    console.log('[Email] No email provider configured. Add RESEND_API_KEY or SMTP_USER/SMTP_PASS.');
    return { sent: false, code };
  }

  try {
    const info = await t.sendMail({
      from: `"${config.appName}" <${config.fromEmail}>`,
      to,
      subject: `Verify your email - ${config.appName}`,
      text: `Hi${name ? ' ' + name : ''},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification, please ignore this email.`,
      html: `<html><body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
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
      </body></html>`,
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
