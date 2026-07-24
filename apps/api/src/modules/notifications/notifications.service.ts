import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

/**
 * Sends failure alerts. Email is logged unless an SMTP integration is added;
 * Slack posts to an incoming webhook when configured. All methods no-op cleanly
 * when the relevant environment variables are unset.
 */
export const notificationsService = {
  async notifyFailure(subject: string, message: string): Promise<void> {
    logger.warn({ subject, message }, "Failure notification");

    if (env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(env.SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `*${subject}*\n${message}` }),
        });
      } catch (err) {
        logger.error({ err }, "Slack notification failed");
      }
    }

    if (env.NOTIFY_EMAIL_TO) {
      // Placeholder: wire an SMTP/provider here (e.g. nodemailer, Resend).
      logger.info(
        { to: env.NOTIFY_EMAIL_TO, subject },
        "Email notification (delivery not configured)",
      );
    }
  },
};
