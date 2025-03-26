import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(
    to: string,
    username: string,
    verificationCode: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: to,
      subject: 'Verify Your Email Address',
      template: 'verification', // This will use verification.hbs
      context: {
        username,
        verificationCode,
        year: new Date().getFullYear(),
      },
    });
  }

  // Generic email sending method for reusability
  async sendEmail({
    to,
    subject,
    template,
    context,
  }: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
