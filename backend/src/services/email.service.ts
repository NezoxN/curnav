import { Resend } from 'resend';
import { getPrisma } from '../config/db';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback');
const FROM_EMAIL = 'CurriNav <onboarding@resend.dev>';

export class EmailService {
  static async sendPasswordResetEmail(toEmail: string, token: string) {
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'Відновлення пароля на порталі CurriNav',
        html: `
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
        `
      });

      console.log('Password reset email sent via Resend:', data);
      return data;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send email via Resend.');
    }
  }

  static async sendWelcomeEmail(toEmail: string, token: string) {
    const setPasswordLink = `http://localhost:5173/reset-password?token=${token}`;

    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: 'Вітаємо в CurriNav! Налаштуйте свій доступ',
        html: `
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
        `
      });

      console.log('Welcome email sent via Resend:', data);
      return data;
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

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [student.user.email],
        subject: 'Оновлення статусу траєкторії',
        html: `<p>Статус вашої освітньої траєкторії було змінено на: <b>${status}</b>.</p>`
      });
    } catch (error) {
      console.error('Error sending trajectory update email:', error);
    }
  }
}
