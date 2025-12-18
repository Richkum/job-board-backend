import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Gmail SMTP configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_APP_PASSWORD'),
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP connection error: ${error.message}`);
      } else {
        this.logger.log('SMTP server connection established successfully');
      }
    });
  }

  async sendVerificationEmail(email: string, code: string, username: string) {
    const appName = 'Job Board App';

    try {
      this.logger.log(`Attempting to send verification email to: ${email}`);

      const info = await this.transporter.sendMail({
        from: `"${appName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: email,
        subject: `Verify your email for ${appName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${username}!</h2>
            <p>Thank you for registering with ${appName}. To complete your registration, please use the verification code below:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
              ${code}
            </div>
            
            <p>This code will expire in 25 minutes.</p>
            <p>If you didn't request this email, please ignore it.</p>
            
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
        `,
      });

      this.logger.log(
        `Email sent successfully to ${email}, messageId: ${info.messageId}`,
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendNewDeviceLoginAlert(
    email: string,
    username: string,
    deviceInfo: any,
  ) {
    const appName = 'Job Board App';

    try {
      this.logger.log(`Sending login alert to: ${email}`);

      const info = await this.transporter.sendMail({
        from: `"${appName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: email,
        subject: `New device login detected - ${appName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${username}!</h2>
            <p>We detected a login from a new device or location:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0;">
              <p><strong>Device:</strong> ${deviceInfo.device.name}</p>
              <p><strong>Browser:</strong> ${deviceInfo.device.browser}</p>
              <p><strong>Location:</strong> ${deviceInfo.location.city || 'Unknown'}, ${deviceInfo.location.country || 'Unknown'}</p>
              <p><strong>IP Address:</strong> ${deviceInfo.ipAddress}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>If this was you, no further action is needed.</p>
            <p>If you don't recognize this login, please secure your account by changing your password immediately.</p>
            
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
        `,
      });

      this.logger.log(`Login alert sent successfully to ${email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send login alert to ${email}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Sends a password reset email with verification code
   */
  async sendPasswordResetEmail(email: string, code: string, username: string) {
    const appName = 'Job Board App';

    try {
      this.logger.log(`Attempting to send password reset email to: ${email}`);

      const info = await this.transporter.sendMail({
        from: `"${appName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: email,
        subject: `Password Reset for ${appName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${username}!</h2>
          <p>We received a request to reset your password. Use the verification code below to complete the process:</p>
          
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${code}
          </div>
          
          <p>This code will expire in 25 minutes.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
      `,
      });

      this.logger.log(
        `Password reset email sent successfully to ${email}, messageId: ${info.messageId}`,
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }
}
