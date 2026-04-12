import { Resend } from "resend";

const DEFAULT_SIGNUP_BASE_URL = "https://legoodanfitrion.com/signup";
const DEFAULT_FROM_EMAIL = "LeGoodAnfitrion <onboarding@resend.dev>";

let resendClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = toSafeString(process.env.RESEND_API_KEY);
  if (!apiKey) {
    const error = new Error("RESEND_API_KEY no está configurada.");
    error.code = "EMAIL_CONFIG_ERROR";
    throw error;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function buildSignupUrl(targetEmail) {
  const signupBase = toSafeString(process.env.SIGNUP_URL || DEFAULT_SIGNUP_BASE_URL);
  const url = new URL(signupBase);
  url.searchParams.set("email", toSafeString(targetEmail));
  url.searchParams.set("ref", "invite");
  return url.toString();
}

function buildCoHostInviteHtml({ signupUrl, hostName, eventName }) {
  const escapedHostName = escapeHtml(hostName);
  const escapedEventName = escapeHtml(eventName);
  const escapedSignupUrl = escapeHtml(signupUrl);

  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 20px 28px;">
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;font-weight:700;">LeGoodAnfitrion</p>
            <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827;">T'han convidat a co-organitzar un esdeveniment</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#374151;">
              <strong>${escapedHostName}</strong> vol que l'ajudis a organitzar <strong>${escapedEventName}</strong>.
            </p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#374151;">
              Crea el teu compte gratuït a LeGoodAnfitrion per formar part de l'equip de l'esdeveniment.
            </p>
            <a href="${escapedSignupUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 18px;border-radius:10px;">
              Crear compte gratuït
            </a>
            <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
              Si el botó no funciona, copia i enganxa aquest enllaç al navegador:<br />
              <a href="${escapedSignupUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;word-break:break-all;">${escapedSignupUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendCoHostInvitation(targetEmail, hostName, eventName) {
  const normalizedEmail = toSafeString(targetEmail).toLowerCase();
  const normalizedHostName = toSafeString(hostName) || "Un anfitrión de LeGoodAnfitrion";
  const normalizedEventName = toSafeString(eventName) || "tu evento";

  if (!normalizedEmail) {
    const error = new Error("targetEmail es obligatorio.");
    error.code = "EMAIL_BAD_REQUEST";
    throw error;
  }

  const resend = getResendClient();
  const signupUrl = buildSignupUrl(normalizedEmail);
  const fromEmail = toSafeString(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL);

  const response = await resend.emails.send({
    from: fromEmail,
    to: normalizedEmail,
    subject: `${normalizedHostName} te invita a co-organizar "${normalizedEventName}"`,
    html: buildCoHostInviteHtml({
      signupUrl,
      hostName: normalizedHostName,
      eventName: normalizedEventName
    }),
    text: `${normalizedHostName} te invita a co-organizar "${normalizedEventName}" en LeGoodAnfitrion. Crea tu cuenta gratuita aquí: ${signupUrl}`
  });

  if (response?.error) {
    const error = new Error(
      toSafeString(response.error.message) || "Resend no pudo enviar el email."
    );
    error.code = "EMAIL_SEND_ERROR";
    error.details = response.error;
    throw error;
  }

  return {
    messageId: toSafeString(response?.data?.id)
  };
}

