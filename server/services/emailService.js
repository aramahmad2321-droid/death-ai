/**
 * Zana AI — Email Service
 */

'use strict';

const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── Email Templates ──────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zana AI</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f1a; color: #e2e8f0; }
    .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(124, 58, 237, 0.3); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #0891b2 100%); padding: 32px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .logo span { opacity: 0.8; font-weight: 400; }
    .body { padding: 40px 32px; }
    h1 { font-size: 22px; color: #f8fafc; margin: 0 0 16px; }
    p { font-size: 15px; line-height: 1.7; color: #94a3b8; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #0891b2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 13px; color: #475569; }
    .token { background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 8px; padding: 12px 20px; font-family: monospace; font-size: 20px; letter-spacing: 4px; color: #a78bfa; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Zana <span>AI</span> ✦</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Zana AI. All rights reserved.<br>
      You received this email because an account was created with this address.
    </div>
  </div>
</body>
</html>`;

/**
 * Send email verification link.
 */
const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/auth.html?verify=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Zana AI" <noreply@zana-ai.com>',
    to: email,
    subject: 'Verify your Zana AI account',
    html: baseTemplate(`
      <h1>Welcome to Zana AI, ${name}! 👋</h1>
      <p>You're almost there. Click the button below to verify your email address and activate your account.</p>
      <a href="${url}" class="btn">Verify My Account</a>
      <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `),
  });
};

/**
 * Send password reset email.
 */
const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/auth.html?reset=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Zana AI" <noreply@zana-ai.com>',
    to: email,
    subject: 'Reset your Zana AI password',
    html: baseTemplate(`
      <h1>Reset Your Password</h1>
      <p>Hi ${name}, we received a request to reset your Zana AI password.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p>This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
    `),
  });
};

/**
 * Send welcome email after account activation.
 */
const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Zana AI" <noreply@zana-ai.com>',
    to: email,
    subject: 'Your Zana AI account is ready! ✦',
    html: baseTemplate(`
      <h1>Your account is verified! ✦</h1>
      <p>Hi ${name}, welcome to Zana AI! Your account is now fully activated and ready to use.</p>
      <p>Start chatting with Zana — your knowledgeable AI assistant that understands Kurdish, Arabic, and English.</p>
      <a href="${process.env.CLIENT_URL}/chat.html" class="btn">Start Chatting with Zana</a>
    `),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };
