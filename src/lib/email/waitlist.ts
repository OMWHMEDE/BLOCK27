import "server-only";
import { EMAIL_FROM, getResend } from "./client";
import { unsubscribeUrl } from "./unsubscribe";
import { SUPPORT_EMAIL } from "@/lib/support";

// The waitlist confirmation email. Brand voice: certain, brief, unsentimental,
// no emoji, no exclamation marks. One promise — we email you once, at launch —
// and a real way out. HTML is inline-styled (email clients strip <style> and
// external CSS) on the void/paper palette with square corners; a plain-text
// alternative carries the same words for clients that prefer it.
//
// Never throws. A failed send returns false and is logged; the caller has
// already stored the signup, and a broken mailer must not cost us one.

const SUBJECT = "You're on the list.";

function html(unsubUrl: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#000000;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;color:#F2F0EC;font-size:13px;letter-spacing:0.28em;text-transform:uppercase;font-weight:bold;">BLOCK27</td></tr>
        <tr><td style="border-top:1px solid #2A2825;padding-top:32px;"></td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;color:#F2F0EC;font-size:26px;line-height:1.15;font-weight:bold;letter-spacing:-0.01em;padding-bottom:20px;">You're on the list.</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;color:#C9C4BC;font-size:15px;line-height:1.6;padding-bottom:16px;">An AI stylist for the clothes you already own. It reads your wardrobe, decides what you should wear, and shows it on you.</td></tr>
        <tr><td style="font-family:Arial,Helvetica,sans-serif;color:#C9C4BC;font-size:15px;line-height:1.6;padding-bottom:40px;">We email you once, when it launches. Nothing before that.</td></tr>
        <tr><td style="border-top:1px solid #2A2825;padding-top:24px;font-family:Arial,Helvetica,sans-serif;color:#8A8783;font-size:12px;line-height:1.6;">
          You received this because you asked us to tell you when BLOCK27 launches.
          <a href="${unsubUrl}" style="color:#8A8783;text-decoration:underline;">Unsubscribe</a> and we won't email you.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function text(unsubUrl: string): string {
  return [
    "BLOCK27",
    "",
    "You're on the list.",
    "",
    "An AI stylist for the clothes you already own. It reads your wardrobe, decides what you should wear, and shows it on you.",
    "",
    "We email you once, when it launches. Nothing before that.",
    "",
    "—",
    "You received this because you asked us to tell you when BLOCK27 launches.",
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");
}

export async function sendWaitlistConfirmation(email: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[waitlist] RESEND_API_KEY unset — confirmation email skipped");
    return false;
  }

  const unsubUrl = unsubscribeUrl(email);

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      replyTo: SUPPORT_EMAIL,
      subject: SUBJECT,
      html: html(unsubUrl),
      text: text(unsubUrl),
      headers: {
        // Let mailbox providers surface a native unsubscribe control.
        "List-Unsubscribe": `<${unsubUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      },
    });
    if (error) {
      console.error("[waitlist] confirmation send failed:", error.name, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[waitlist] confirmation send threw:", e);
    return false;
  }
}
