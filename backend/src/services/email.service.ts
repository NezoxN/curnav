import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { getPrisma } from '../config/db';

const isSmtpConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT
);

let smtpTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

// Allow custom sender email via SMTP_FROM, defaulting to Resend onboarding sandbox
const FROM_EMAIL = process.env.SMTP_FROM || 'CurriNav <onboarding@resend.dev>';

if (isSmtpConfigured) {
  console.log('📬 [EmailService] Using SMTP for sending emails via', process.env.SMTP_HOST);
  const smtpConfig: any = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/other ports
  };

  // Only apply auth if credentials are provided (allows passwordless local SMTP like Mailpit)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    smtpConfig.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  smtpTransporter = nodemailer.createTransport(smtpConfig);
} else {
  console.log('📬 [EmailService] Using Resend for sending emails');
  resendClient = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback');
}

export class EmailService {
  private static async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (isSmtpConfigured && smtpTransporter) {
      const info = await smtpTransporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      console.log('Email sent via SMTP:', info.messageId);
      return info;
    } else if (resendClient) {
      const data = await resendClient.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      });
      if (data.error) {
        throw new Error(data.error.message);
      }
      console.log('Email sent via Resend:', data);
      return data;
    } else {
      console.log('⚠️ [EmailService] No email provider configured. Logging mail content:');
      console.log(`To: ${to}\nSubject: ${subject}\nHTML: ${html}`);
      return { id: 'dummy-id' };
    }
  }

  static async sendPasswordResetEmail(toEmail: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #F2F2F2;">
        <h2 style="color: #F25A38;">Відновлення доступу</h2>
        <p>Ви отримали цей лист, оскільки Ви (або хтось інший) зробили запит на відновлення пароля до порталу <b>CurriNav</b>.</p>
        <p>Будь ласка, натисніть на кнопку нижче або перейдіть за посиланням, щоб встановити новий пароль:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #F25A38; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Скинути пароль
          </a>
        </div>
        <p style="word-break: break-all; color: #64748b; font-size: 14px;">Або скопіюйте це посилання: ${resetLink}</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          Якщо ви не робили цього запиту, просто проігноруйте цей лист. Ваш пароль залишиться без змін. Посилання дійсне протягом 1 години.
        </p>
      </div>
    `;
    try {
      return await this.send({ to: toEmail, subject: 'Відновлення пароля на порталі CurriNav', html });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error(`Failed to send email: ${error.message || error}`);
    }
  }

  static async sendWelcomeEmail(toEmail: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost';
    const setPasswordLink = `${frontendUrl}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #F8FAFC;">
        <h2 style="color: #F25A38;">Ласкаво просимо!</h2>
        <p>Ваш акаунт було успішно створено на порталі індивідуальних траєкторій <b>CurriNav</b>.</p>
        <p>Для початку роботи вам необхідно встановити пароль до вашого акаунту:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setPasswordLink}" style="background-color: #F25A38; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Встановити пароль
          </a>
        </div>
        <p style="word-break: break-all; color: #64748b; font-size: 14px;">Або скопіюйте це посилання: ${setPasswordLink}</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          Дякуємо, що ви з нами!<br>Команда CurriNav
        </p>
      </div>
    `;
    try {
      return await this.send({ to: toEmail, subject: 'Вітаємо в CurriNav! Налаштуйте свій доступ', html });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  static async sendTrajectoryUpdateEmail(studentId: string, status: string) {
    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });

    if (!student || !student.user) return;
    const html = `<p>Статус вашої освітньої траєкторії було змінено на: <b>${status}</b>.</p>`;

    try {
      await this.send({ to: student.user.email, subject: 'Оновлення статусу траєкторії', html });
    } catch (error) {
      console.error('Error sending trajectory update email:', error);
    }
  }
}
