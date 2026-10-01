import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { ApplicationError } from '../../../common/errors/application.error';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('smtp.user');
    const password = config.get<string>('smtp.password');
    this.transporter = config.get<boolean>('smtp.enabled', false) ? nodemailer.createTransport({
      host: config.getOrThrow<string>('smtp.host'), port: config.get<number>('smtp.port', 587),
      secure: config.get<boolean>('smtp.secure', false),
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      connectionTimeout: config.get<number>('smtp.connectionTimeoutMs', 5000),
      greetingTimeout: config.get<number>('smtp.greetingTimeoutMs', 5000),
      socketTimeout: config.get<number>('smtp.socketTimeoutMs', 10000),
      ...(user && password ? { auth: { user, pass: password } } : {}),
    }) : null;
  }

  assertConfigured(): void {
    if (!this.transporter) throw new ApplicationError('EMAIL_SERVICE_DISABLED', 'Password reset emails are temporarily unavailable. Please try again later.', 503);
  }

  async sendPasswordResetOtp(to: string, firstName: string, otp: string, ttlMinutes: number): Promise<void> {
    this.assertConfigured();
    const transporter = this.transporter;
    if (!transporter) throw new ApplicationError('EMAIL_SERVICE_DISABLED', 'Password reset emails are temporarily unavailable. Please try again later.', 503);
    try {
      await transporter.sendMail({
      from: this.config.getOrThrow<string>('smtp.from'), to, subject: 'AptiMate password reset code',
      text: `Hello ${firstName}, your AptiMate password reset code is ${otp}. It expires in ${ttlMinutes} minutes.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="color:#e41e2b">AptiMate</h2><p>Hello ${this.escape(firstName)},</p><p>Use this code to reset your password:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#e41e2b">${otp}</p><p>This code expires in ${ttlMinutes} minutes. If you did not request it, you can ignore this email.</p></div>`,
      });
    } catch {
      this.logger.error('SMTP delivery failed while sending a password reset code.');
      throw new ApplicationError('EMAIL_DELIVERY_FAILED', 'We could not send the verification code. Please try again in a few minutes.', 503);
    }
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
  }
}
