import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPrisma } from '../config/db';
import { EmailService } from './email.service';
import { getRedis, TTL } from '../config/redis';

export class AuthService {
  static async loginUser(email: string, passwordPlain: string) {
    if (!email || !passwordPlain) {
      const err: any = new Error('Email та пароль є обовʼязковими');
      err.status = 400;
      throw err;
    }

    const user = await getPrisma().user.findUnique({
      where: { email },
      include: {
        student: true
      }
    });

    if (!user) {
      const err: any = new Error('Невірний email або пароль');
      err.status = 401;
      throw err;
    }

    if (user.isBlocked) {
      const err: any = new Error('Ваш акаунт заблоковано адміністратором');
      err.status = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Невірний email або пароль');
      err.status = 401;
      throw err;
    }

    const tokens = await this.generateTokens({
      id: user.id,
      studentId: user.student?.id,
      role: user.role
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student?.id
      }
    };
  }

  static async generateTokens(user: { id: string, studentId?: string, role: string }) {
    const accessPayload = {
      userId: user.id,
      studentId: user.studentId,
      role: user.role
    };

    const accessToken = jwt.sign(
      accessPayload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '15m' }
    );

    const refreshPayload = {
      userId: user.id,
      version: Date.now()
    };

    const refreshToken = jwt.sign(
      refreshPayload,
      process.env.REFRESH_SECRET || 'refresh_fallback_secret',
      { expiresIn: '7d' }
    );

    const redis = getRedis();
    await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  static async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      const err: any = new Error('Refresh token is required');
      err.status = 401;
      throw err;
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_fallback_secret') as any;
      const { userId } = decoded;

      const redis = getRedis();
      const storedToken = await redis.get(`refresh_token:${userId}`);

      if (!storedToken || storedToken !== refreshToken) {
        const err: any = new Error('Refresh token is invalid or expired');
        err.status = 401;
        throw err;
      }

      const user = await getPrisma().user.findUnique({
        where: { id: userId },
        include: { student: true }
      });

      if (!user || user.isBlocked) {
        const err: any = new Error('User not found or blocked');
        err.status = 401;
        throw err;
      }

      const tokens = await this.generateTokens({
        id: user.id,
        studentId: user.student?.id,
        role: user.role
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          studentId: user.student?.id
        }
      };
    } catch (error) {
      const err: any = new Error('Invalid refresh token');
      err.status = 401;
      throw err;
    }
  }

  static async resetPassword(email: string) {
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user) {
      const err: any = new Error('Користувача не знайдено');
      err.status = 404;
      throw err;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const redis = getRedis();

    await redis.set(`password_reset:${resetToken}`, user.id, 'EX', TTL.PASSWORD_RESET);

    await EmailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'На вашу пошту відправлено інструкції з відновлення пароля' };
  }

  static async confirmResetPassword(token: string, newPasswordPlain: string) {
    if (!token || !newPasswordPlain) {
      const err: any = new Error('Токен та новий пароль є обовʼязковими');
      err.status = 400;
      throw err;
    }

    const redis = getRedis();
    const userId = await redis.get(`password_reset:${token}`);

    if (!userId) {
      const err: any = new Error('Токен відновлення недійсний або протермінований');
      err.status = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPasswordPlain, salt);

    await getPrisma().user.update({
      where: { id: userId },
      data: {
        passwordHash
      }
    });

    await redis.del(`password_reset:${token}`);

    return { message: 'Пароль успішно змінено. Тепер ви можете увійти.' };
  }

  static async logoutUser(token: string, exp: number, userId: string) {
    const redis = getRedis();
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(0, exp - now);

    if (ttl > 0) {
      await redis.set(`blacklist_token:${token}`, '1', 'EX', ttl);
    }

    await redis.del(`refresh_token:${userId}`);

    return { message: 'Ви успішно вийшли з акаунта' };
  }

  static async getUserProfile(userId: string) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      include: {
        student: true
      }
    });

    if (!user) {
      const err: any = new Error('Користувача не знайдено');
      err.status = 401;
      throw err;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student?.id
      }
    };
  }


}
