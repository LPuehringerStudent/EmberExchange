import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://emberexchange.xyz";

let resendClient: Resend | null = null;

function getResend(): Resend {
    if (resendClient) return resendClient;

    if (!RESEND_API_KEY) {
        console.warn("[EmailService] RESEND_API_KEY not set. Emails will be logged to console only.");
    }

    resendClient = new Resend(RESEND_API_KEY ?? "mock-key");
    return resendClient;
}

async function sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
}): Promise<void> {
    if (!RESEND_API_KEY) {
        console.log("[EmailService] MOCK EMAIL (RESEND_API_KEY not set) — PII redacted");
        return;
    }

    const resend = getResend();
    const { error } = await resend.emails.send({
        from: `Ember Exchange <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    });

    if (error) {
        console.error("[EmailService] Resend error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

function verificationEmailTemplate(verifyUrl: string): { html: string; text: string } {
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify your Ember Exchange account</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a0f0a; color: #e8e8e8; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #2d1b14; border: 1px solid rgba(232,93,4,0.3); border-radius: 16px; padding: 32px; }
        .logo { display: block; width: 64px; height: 64px; object-fit: contain; margin: 0 auto 24px; }
        h1 { color: #e85d04; font-size: 22px; margin-bottom: 16px; text-align: center; }
        p { line-height: 1.6; color: #c9b8b0; margin-bottom: 20px; }
        .button { display: block; width: fit-content; margin: 24px auto; padding: 14px 32px; background: linear-gradient(135deg, #e85d04, #f48c06); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; }
        .footer { text-align: center; font-size: 12px; color: #8a7a72; margin-top: 24px; }
        .url { word-break: break-all; color: #f48c06; }
    </style>
</head>
<body>
    <div class="container">
        <img class="logo" src="${FRONTEND_URL}/Ember_Exchange_Logo.png" alt="Ember Exchange logo">
        <h1>Welcome to Ember Exchange!</h1>
        <p>Your forge awaits. Click the button below to verify your email and start trading stoves.</p>
        <a href="${verifyUrl}" class="button">Verify Email</a>
        <p style="font-size: 13px;">Or copy and paste this link into your browser:<br><span class="url">${verifyUrl}</span></p>
        <p style="font-size: 13px;">This link expires in 24 hours.</p>
        <div class="footer">Ember Exchange — Imperium of Stoves</div>
    </div>
</body>
</html>`;

    const text = `Welcome to Ember Exchange!\n\nVerify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nEmber Exchange — Imperium of Stoves`;

    return { html, text };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function chatMessageEmailTemplate(options: {
    senderName: string;
    preview: string;
    isMarketplace: boolean;
}): { html: string; text: string } {
    const socialUrl = `${FRONTEND_URL}/social`;
    const logoUrl = `${FRONTEND_URL}/Ember_Exchange_Logo.png`;
    const senderName = escapeHtml(options.senderName);
    const preview = escapeHtml(options.preview);
    const context = options.isMarketplace ? "marketplace message" : "message";

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>You received a new Ember Exchange message</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #140d0a; color: #f4eee8; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #211712; border: 1px solid #3a261b; border-radius: 14px; padding: 32px; }
        .logo { display: block; width: 64px; height: 64px; object-fit: contain; margin: 0 auto 20px; }
        h1 { color: #f4eee8; font-size: 22px; margin: 0 0 12px; text-align: center; }
        p { line-height: 1.6; color: #c8b6aa; margin: 0 0 18px; }
        .preview { background: #1c130f; border: 1px solid #3a261b; border-radius: 10px; padding: 16px; color: #f4eee8; margin: 18px 0 24px; }
        .button { display: block; width: fit-content; margin: 0 auto 24px; padding: 13px 28px; background: #e85d04; color: #fff; text-decoration: none; border-radius: 9px; font-weight: 700; }
        .footer { text-align: center; font-size: 12px; color: #927f73; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <img class="logo" src="${logoUrl}" alt="Ember Exchange logo">
        <h1>New ${context}</h1>
        <p><strong>${senderName}</strong> sent you a ${context} on Ember Exchange.</p>
        <div class="preview">${preview}</div>
        <a href="${socialUrl}" class="button">Open Socials</a>
        <div class="footer">Ember Exchange</div>
    </div>
</body>
</html>`;

    const text = `New ${context} from ${options.senderName}\n\n${options.preview}\n\nOpen Socials: ${socialUrl}\n\nEmber Exchange`;

    return { html, text };
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const { html, text } = verificationEmailTemplate(verifyUrl);

    await sendEmail({
        to: email,
        subject: "Welcome to Ember Exchange — confirm your email",
        html,
        text,
    });
}

export async function sendChatMessageEmail(options: {
    email: string;
    senderName: string;
    preview: string;
    isMarketplace: boolean;
}): Promise<void> {
    const preview =
        options.preview.length > 180
            ? `${options.preview.slice(0, 177)}...`
            : options.preview;
    const { html, text } = chatMessageEmailTemplate({
        senderName: options.senderName,
        preview,
        isMarketplace: options.isMarketplace,
    });

    await sendEmail({
        to: options.email,
        subject: options.isMarketplace
            ? "New marketplace message on Ember Exchange"
            : "New message on Ember Exchange",
        html,
        text,
    });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await sendEmail({
        to: email,
        subject: "Reset your Ember Exchange password",
        html: `<p>Click to reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>Expires in 1 hour.</p>`,
        text: `Reset your password: ${resetUrl}\n\nExpires in 1 hour.`,
    });
}
