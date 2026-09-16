import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('MailService errors', () => {
  const sendMail = jest.fn();
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as unknown as nodemailer.Transporter);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns a safe, actionable 503 when SMTP rejects delivery', async () => {
    sendMail.mockRejectedValueOnce(new Error('535 smtp-user=private@example.com password=secret'));
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await expect(service.sendPasswordResetOtp('student@example.com', 'Test', '123456', 10)).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED', statusCode: 503,
      message: 'We could not send the verification code. Please try again in a few minutes.',
    });
  });

  it('reports disabled delivery as a service error before attempting to send', () => {
    const service = new MailService(new ConfigService({ smtp: { enabled: false } }));
    expect(() => service.assertConfigured()).toThrow('Password reset emails are temporarily unavailable. Please try again later.');
  });

  it('reuses SMTP connections and applies bounded connection timeouts', () => {
    new MailService(new ConfigService({ smtp: {
      enabled: true, host: 'smtp.example.com', port: 465, secure: true, from: 'test@example.com',
      connectionTimeoutMs: 4000, greetingTimeoutMs: 4500, socketTimeoutMs: 9000,
    } }));
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      pool: true, maxConnections: 2, maxMessages: 100,
      connectionTimeout: 4000, greetingTimeout: 4500, socketTimeout: 9000,
    }));
  });
});
