const REPLY_TO = "management@movemountains.co";
const TO = "management@movemountains.co";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Branded summary the caller sends. One email per batch, linking here,
 * instead of one email per report. Reply-To is management@.
 */
export function buildBatchEmail({ batch, reports, origin }) {
  const count = reports.length;
  const noun = count === 1 ? "report" : "reports";
  const batchUrl = `${origin}/batch/${encodeURIComponent(batch.id)}`;
  const subject = `MMC Reports · ${count} ${noun}`;
  const rows = reports
    .map((report) => {
      const meta = [report.type_label, report.period_label, report.department_name, report.person_name]
        .filter(Boolean)
        .join(" · ");
      return `<tr><td style="padding:0 0 14px 0;border-bottom:1px solid #D4D2CF;">
        <div style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-weight:500;font-size:15px;line-height:1.45;color:#000000;padding-top:12px;">${escapeHtml(report.title)}</div>
        <div style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-weight:300;font-size:13px;line-height:1.5;color:#6E6A64;padding-top:3px;">${escapeHtml(meta)}</div>
        <div style="padding-top:6px;"><a href="${escapeHtml(report.url)}" style="font-family:'Archivo',Arial,Helvetica,sans-serif;font-stretch:125%;font-weight:500;text-transform:uppercase;font-size:10px;letter-spacing:0.16em;color:#000000;text-decoration:underline;">Open report</a></div>
      </td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td align="left" style="padding:0 0 36px 2px;">
        <a href="https://www.movemountains.co/" style="text-decoration:none;"><img src="https://images.squarespace-cdn.com/content/561de3afe4b0e681f07cce7f/a0a4c40f-7df9-4be9-b241-27b690869394/mm-logo-dark-300.png" width="75" alt="Move Mountains Co." style="display:block;width:75px;height:auto;border:0;"></a>
      </td></tr>
      <tr><td style="font-family:'Archivo',Arial,Helvetica,sans-serif;font-stretch:125%;font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:0.22em;color:#6E6A64;padding:0 0 14px 0;">Reports · ${escapeHtml(batch.id)}</td></tr>
      <tr><td style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:300;font-style:italic;font-size:40px;line-height:1.15;color:#000000;padding:0 0 22px 0;border-bottom:1px solid #D1D1D1;">${count} ${noun} filed</td></tr>
      <tr><td style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-weight:300;font-size:16px;line-height:1.7;color:#000000;padding:22px 0 8px 0;">The latest batch is on the reports site. Open the batch, or jump to one report. Reply to this note goes to management@.</td></tr>
      <tr><td style="padding:22px 0 8px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="#000000" style="background-color:#000000;padding:14px 22px;"><a href="${escapeHtml(batchUrl)}" style="font-family:'Archivo',Arial,Helvetica,sans-serif;font-stretch:125%;font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:0.2em;color:#FFFFFF;text-decoration:none;">Open the batch</a></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 0 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
      <tr><td style="padding:28px 0 8px 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-style:italic;font-size:28px;color:#000000;">MMC Team</td></tr>
      <tr><td style="border-top:1px solid #E0E0E0;padding:16px 0 0 0;font-family:'Archivo',Arial,Helvetica,sans-serif;font-stretch:125%;font-weight:500;text-transform:uppercase;font-size:10px;letter-spacing:0.2em;color:#6E6A64;">movemountains.co · Internal &amp; confidential</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const textLines = [
    `MMC Reports · ${count} ${noun} filed`,
    ``,
    `Batch: ${batchUrl}`,
    ``,
    ...reports.map((report) => `${report.title}\n${report.url}`),
    ``,
    `Reply-To: ${REPLY_TO}`,
  ];

  return {
    to: TO,
    reply_to: REPLY_TO,
    subject,
    html,
    text: textLines.join("\n"),
  };
}

/**
 * Stub. There is no email provider. The caller sends email.html and email.text.
 */
export function sendBatchEmail() {
  return {
    sent: false,
    provider: null,
    message:
      "No email provider is configured. Send email.html and email.text yourself. Reply-To is management@movemountains.co.",
  };
}
