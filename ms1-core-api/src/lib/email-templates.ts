/**
 * Email templates for EcoMatch transactional emails.
 * All templates are self-contained HTML — no external CSS or image dependencies.
 */

const BRAND_GREEN = '#16a34a';
const BRAND_DARK = '#0f172a';
const BRAND_LIGHT_BG = '#f0fdf4';

function baseLayout(preheader: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>EcoMatch</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;</div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND_DARK};padding:28px 40px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              ♻️ EcoMatch
            </span>
            <span style="font-size:12px;color:#94a3b8;margin-left:8px;">Industrial Symbiosis Marketplace</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              EcoMatch — Turning waste into resources.<br/>
              You received this email because you signed up on EcoMatch.<br/>
              This is an automated message — please do not reply directly.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `
  <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="background:${BRAND_GREEN};border-radius:8px;padding:14px 32px;">
        <a href="${href}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Verification Email
// ─────────────────────────────────────────────────────────────────────────────

export function verificationEmailHtml(businessName: string, verifyUrl: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND_DARK};">
      Verify your email address
    </h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>${businessName}</strong>, welcome to EcoMatch!<br/>
      Click the button below to verify your email. This link expires in <strong>24 hours</strong>.
    </p>

    ${ctaButton(verifyUrl, 'Verify Email →')}

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">
      Or copy and paste this URL into your browser:<br/>
      <a href="${verifyUrl}" style="color:${BRAND_GREEN};word-break:break-all;">${verifyUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
      If you didn't sign up for EcoMatch, you can safely ignore this email.
    </p>`;

  return baseLayout(
    `Welcome to EcoMatch — please verify your email to get started.`,
    body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Match Proposal Email
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchProposalEmailParams {
  businessName: string;
  partnerBusinessName: string;   // shown by role name, NOT contact details
  matchRationale: string;
  matchConfidence: number;       // 0–1
  estimatedSavings?: number | null;
  proposedTerms: {
    pricePerUnit?: number;
    frequency?: string;
    contractLengthMonths?: number;
    startDate?: string;
  };
  draftMessage: string;          // Negotiator Agent's personalised proposal text
  dashboardUrl: string;
  role: 'source' | 'target';
}

export function matchProposalEmailHtml(params: MatchProposalEmailParams): string {
  const {
    businessName,
    partnerBusinessName,
    matchRationale,
    matchConfidence,
    estimatedSavings,
    proposedTerms,
    draftMessage,
    dashboardUrl,
    role,
  } = params;

  const confidencePct = Math.round(matchConfidence * 100);
  const savingsLine =
    role === 'source' && estimatedSavings
      ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Estimated annual savings:</strong> $${estimatedSavings.toLocaleString()}</p>`
      : '';

  const terms = proposedTerms || {};

  const termsBlock = `
  <table cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND_LIGHT_BG};border-radius:8px;padding:0;margin:20px 0;">
    <tr><td style="padding:20px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND_GREEN};">
        Proposed Terms
      </p>
      ${terms.pricePerUnit != null ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Price:</strong> $${Number(terms.pricePerUnit).toFixed(2)} / unit</p>` : ''}
      ${terms.frequency ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Frequency:</strong> ${terms.frequency}</p>` : ''}
      ${terms.contractLengthMonths ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Contract length:</strong> ${terms.contractLengthMonths} months</p>` : ''}
      ${terms.startDate ? `<p style="margin:0;font-size:14px;"><strong>Start date:</strong> ${terms.startDate}</p>` : ''}
      ${savingsLine}
    </td></tr>
  </table>`;

  const body = `
    <!-- Badge -->
    <div style="display:inline-block;background:${BRAND_LIGHT_BG};border:1px solid #bbf7d0;border-radius:999px;padding:6px 14px;margin-bottom:20px;">
      <span style="font-size:13px;font-weight:600;color:${BRAND_GREEN};">♻️ New Symbiosis Match — ${confidencePct}% Confidence</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND_DARK};">
      A match has been found for you
    </h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>${businessName}</strong>, EcoMatch's AI identified a potential industrial
      symbiosis partner: <strong>${partnerBusinessName}</strong>.
    </p>

    <!-- Draft message from Negotiator Agent -->
    <div style="background:#f8fafc;border-left:4px solid ${BRAND_GREEN};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;white-space:pre-line;">${draftMessage}</p>
    </div>

    <!-- Why it works -->
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">
      Why this pairing works
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#334155;">
      ${matchRationale}
    </p>

    ${termsBlock}

    <p style="margin:0 0 4px;font-size:14px;color:#64748b;">
      ℹ️ This is a <strong>proposal</strong> — no commitment has been made. You can review
      the full details and accept or decline in your dashboard.
    </p>
    <p style="margin:0 0 0;font-size:13px;color:#94a3b8;">
      The deal only moves forward after <em>both</em> businesses independently accept.
    </p>

    ${ctaButton(dashboardUrl, 'Review Proposal in Dashboard →')}

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Note: Contact details of the matched business are not included in this email for privacy.
      Full details are available in your secure dashboard.
    </p>`;

  return baseLayout(
    `EcoMatch found a ${confidencePct}% confidence symbiosis match for ${businessName} — action required.`,
    body,
  );
}
