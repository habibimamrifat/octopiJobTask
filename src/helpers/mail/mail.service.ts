import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('MAIL_HOST');

    const port = Number(
      this.configService.getOrThrow<string>('MAIL_PORT'),
    );

    const secure =
      this.configService.getOrThrow<string>('MAIL_SECURE') === 'true';

    const user = this.configService.getOrThrow<string>('MAIL_USER');

    const password =
      this.configService.getOrThrow<string>('MAIL_PASSWORD');

    const from = this.configService.getOrThrow<string>('MAIL_FROM');

    console.log('SMTP configuration:', {
      host,
      port,
      secure,
      user,
      from,
    });

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('MAIL_FROM'),
      to,
      subject,
      html,
    });
  }
}