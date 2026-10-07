import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import { join } from 'node:path';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('MailService errors', () => {
  const sendMail = jest.fn();
  beforeEach(() => {
    sendMail.mockReset();
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
    expect(() => service.assertConfigured()).toThrow('Email delivery is not configured. Please contact an administrator.');
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

  it('sends the subject and remote attachment only to the supplied recipients', async () => {
    sendMail.mockResolvedValue({});
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    const attachment = { name: 'Lesson.pdf', mimeType: 'application/pdf', url: 'https://files.example.com/lesson.pdf', publicId: 'lesson' };
    await service.sendNotificationEmail(['one@example.com', 'two@example.com'], 'Lesson <update>', 'Hello & welcome', attachment);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map(([mail]) => mail.to)).toEqual(['one@example.com', 'two@example.com']);
    for (const [mail] of sendMail.mock.calls) {
      expect(mail).toMatchObject({
        subject: 'Lesson <update>', text: 'Hello & welcome',
        attachments: [{ filename: 'Lesson.pdf', contentType: 'application/pdf', path: attachment.url }],
      });
      expect(mail.html).toContain('AptiMate');
      expect(mail.html).not.toContain('Lesson &lt;update&gt;');
      expect(mail.html).not.toContain('<h3>');
      expect(mail.html).toContain('Hello &amp; welcome');
    }
  });

  it('renders the message once when the subject and content are identical', async () => {
    sendMail.mockResolvedValue({});
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await service.sendNotificationEmail(['one@example.com'], 'Đi làm', 'Đi làm');
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('Đi làm');
    expect(mail.text).toBe('Đi làm');
    expect(mail.html.split('Đi làm')).toHaveLength(2);
    expect(mail.html).not.toContain('<h3>');
  });

  it('attaches locally stored files using their backend path', async () => {
    sendMail.mockResolvedValue({});
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await service.sendNotificationEmail(['one@example.com'], 'Lesson', 'Read the attachment', {
      name: 'Lesson.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      url: 'http://localhost:3000/api/v1/admin/media/notification-attachments/files/lesson.docx',
      publicId: 'local:notification-attachments/lesson.docx',
    });
    expect(sendMail.mock.calls[0][0].attachments[0].path).toBe(join(process.cwd(), 'uploads', 'notification-attachments', 'lesson.docx'));
  });

  it('keeps the Vietnamese filename when attaching a notification file to email', async () => {
    sendMail.mockResolvedValue({});
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await service.sendNotificationEmail(['one@example.com'], 'Tài liệu học', 'Xem file đính kèm', {
      name: 'Báo cáo tổng hợp tiếng Việt.pdf', mimeType: 'application/pdf',
      url: 'https://files.example.com/test.pdf', publicId: 'test',
    });
    expect(sendMail.mock.calls[0][0].attachments[0].filename).toBe('Báo cáo tổng hợp tiếng Việt.pdf');
  });

  it('does not send notification email when no recipients were supplied', async () => {
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await service.sendNotificationEmail([], 'Lesson', 'Content');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('returns a safe notification delivery error when SMTP rejects the email', async () => {
    sendMail.mockRejectedValueOnce(new Error('private SMTP diagnostic'));
    const service = new MailService(new ConfigService({ smtp: { enabled: true, host: 'localhost', from: 'test@example.com' } }));
    await expect(service.sendNotificationEmail(['one@example.com'], 'Lesson', 'Content')).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED', statusCode: 503,
      message: 'The notification email could not be delivered. Please check the SMTP configuration and try again.',
    });
  });
});
