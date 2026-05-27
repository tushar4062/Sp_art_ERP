import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  throw new Error('Missing SMTP configuration: EMAIL_USER and EMAIL_PASSWORD are required.');
}

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export interface SendAccountCreationEmailOptions {
  to: string;
  name: string;
  email: string;
  password: string;
  loginUrl?: string;
  academyName?: string;
}

const buildHtml = ({ name, email, password, loginUrl, academyName }: Omit<SendAccountCreationEmailOptions, 'to'>) => {
  const school = academyName || 'Little Brushes Art Academy';
  const url = loginUrl || 'http://localhost:3000/login';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to ${school}</title>
      </head>
      <body style="margin:0;background:#f7f2ee;color:#1f2937;font-family: system-ui, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(15, 23, 42, 0.08);">
                <tr>
                  <td style="background:#f97316;color:#ffffff;text-align:center;padding:32px 24px;">
                    <h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em;">${school}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 32px 24px;">
                    <p style="margin:0 0 20px;font-size:16px;line-height:1.75;">Hello ${name},</p>
                    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Your ERP account has been created successfully.</p>
                    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:16px;padding:20px;margin-bottom:24px;">
                      <p style="margin:0 0 12px;font-size:14px;color:#ea580c;font-weight:700;">Login Credentials</p>
                      <p style="margin:0;font-size:15px;line-height:1.75;"><strong>Email:</strong> ${email}</p>
                      <p style="margin:8px 0 0;font-size:15px;line-height:1.75;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.75;font-weight:600;">Login Here:</p>
                    <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Open ERP Login</a></p>
                    <p style="margin:0;font-size:16px;line-height:1.75;">Regards,<br />${school}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#fff4e6;color:#475569;text-align:center;padding:16px 24px;font-size:13px;">
                    <p style="margin:0;">If you did not expect this email, please contact your administrator.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export async function sendAccountCreationEmail(options: SendAccountCreationEmailOptions) {
  const { to, name, email, password, loginUrl, academyName } = options;
  const subject = 'Welcome to Little Brushes Art Academy ERP';
  const html = buildHtml({ name, email, password, loginUrl, academyName });
  const text = `Hello ${name},\n\nYour ERP account has been created successfully.\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nLogin Here:\n${loginUrl ?? 'http://localhost:3000/login'}\n\nRegards,\nLittle Brushes Art Academy`;

  return transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

export interface SendCredentialUpdateEmailOptions {
  to: string;
  name: string;
  updatedEmail?: string; // new email if changed
  updatedPassword?: string; // plaintext new password if provided
  loginUrl?: string;
  academyName?: string;
  changedFields: { email: boolean; password: boolean };
  performedAt?: Date;
  supportEmail?: string;
}

const buildUpdateHtml = (opts: Omit<SendCredentialUpdateEmailOptions, 'to' | 'performedAt'> & { performedAt: string }) => {
  const school = opts.academyName || 'Little Brushes Art Academy';
  const url = opts.loginUrl || 'http://localhost:3000/login';
  const support = opts.supportEmail || 'support@littlebrushes.in';
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Account Update - ${school}</title>
      </head>
      <body style="margin:0;background:#f7f2ee;color:#1f2937;font-family: system-ui, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(15, 23, 42, 0.06);">
                <tr>
                  <td style="background:#0ea5e9;color:#ffffff;text-align:center;padding:20px 24px;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;">${school}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Hello ${opts.name},</p>
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Your account credentials have been updated.</p>
                    <div style="background:#fff7ed;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:12px 0;">
                      ${opts.changedFields.email ? `<p style="margin:0 0 8px;font-size:14px;"><strong>Updated Email:</strong> ${opts.updatedEmail}</p>` : ''}
                      ${opts.changedFields.password ? `<p style="margin:8px 0 0;font-size:14px;"><strong>Updated Password:</strong> ${opts.updatedPassword ? opts.updatedPassword : '[hidden]'}</p>` : ''}
                    </div>
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#92400e;font-weight:700;">Security Notice</p>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">If you did not request this change, please contact support immediately at ${support} and consider resetting your password.</p>
                    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Updated on: ${opts.performedAt}</p>
                    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;">Regards,<br/>${school}</p>
                    <p style="margin:12px 0 0;"><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Open Login</a></p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f1f5f9;color:#475569;text-align:center;padding:12px 24px;font-size:13px;">
                    <p style="margin:0;">Need help? Contact <a href="mailto:${support}">${support}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export async function sendCredentialUpdateEmail(opts: SendCredentialUpdateEmailOptions) {
  const { to, name, updatedEmail, updatedPassword, loginUrl, academyName, changedFields, performedAt, supportEmail } = opts;
  const subject = changedFields.email && changedFields.password
    ? 'Account Credentials Updated'
    : changedFields.email
      ? 'Email Updated Successfully'
      : 'Password Updated Successfully';

  const performedAtStr = (performedAt || new Date()).toLocaleString();
  const html = buildUpdateHtml({ name, updatedEmail, updatedPassword, loginUrl, academyName, changedFields, performedAt: performedAtStr, supportEmail });
  const textLines = [`Hello ${name},`, '', 'Your account credentials have been updated.'];
  if (changedFields.email) textLines.push(`Updated Email: ${updatedEmail}`);
  if (changedFields.password) textLines.push(`Updated Password: ${updatedPassword ? updatedPassword : '[hidden]'}`);
  textLines.push('', `Updated on: ${performedAtStr}`, '', `If you did not request this change, contact ${supportEmail || 'support@littlebrushes.in'}`);

  return transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text: textLines.join('\n'),
    html,
  });
}
