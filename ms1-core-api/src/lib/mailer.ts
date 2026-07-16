/**
 * Mailer — AWS SES wrapper for ms1.
 *
 * When AWS_ACCESS_KEY_ID is "stub" (local dev without real credentials),
 * emails are logged to the console instead of sent so the pipeline never
 * breaks during development or demos.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from './logger';

let sesClient: SESClient | null = null;
let isStub = true;
let isEvaluated = false;

function initSes() {
  if (isEvaluated) return;
  isStub = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'stub';
  
  if (!isStub) {
    sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  isEvaluated = true;
}

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'soumay341@gmail.com';

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<void> {
  initSes();

  if (isStub) {
    logger.info('SES stub — email not sent (set real AWS credentials to send)', {
      to,
      subject,
      preview: htmlBody.replace(/<[^>]+>/g, ' ').substring(0, 200).trim(),
    });
    return;
  }

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: {
          Data: htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const result = await sesClient!.send(command);
    logger.info('Email sent via SES', {
      to,
      subject,
      messageId: result.MessageId,
    });
  } catch (err: any) {
    logger.error('SES send failed', {
      to,
      subject,
      error: err?.message || String(err),
    });
  }
}

