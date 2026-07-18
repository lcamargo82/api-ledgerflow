import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

type EmailSendResult = {
  messageId?: string;
  accepted?: unknown[];
  rejected?: unknown[];
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'localhost',
      port: this.config.get<number>('SMTP_PORT') ?? 1025,
      secure: (this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true',
      auth: this.getAuth(),
    });
  }

  async send(input: SendEmailInput) {
    const result = (await this.transporter.sendMail({
      from:
        this.config.get<string>('MAIL_FROM') ??
        'ApiLedgerflow <no-reply@api-ledgerflow.local>',
      ...input,
    })) as EmailSendResult;

    this.logger.log(`Email sent: ${result.messageId}`);
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }

  private getAuth() {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!user || !pass) {
      return undefined;
    }

    return { user, pass };
  }
}
