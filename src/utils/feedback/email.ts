import {
  FEEDBACK_DEFAULT_INTRO,
  FEEDBACK_DEFAULT_SUBJECT,
  FEEDBACK_INSTITUTIONAL_CONTACT,
  FEEDBACK_TEST_RECIPIENT,
} from "./config";

export interface FeedbackEmailSchoolLink {
  schoolName: string;
  url: string;
}

export interface FeedbackInviteEmailInput {
  /** Uma entrada por escola. Várias entradas = e-mail compartilhado. */
  schoolLinks: FeedbackEmailSchoolLink[];
  /** Prazo opcional já formatado (ex.: "15/12/2026"). */
  deadlineLabel?: string | null;
  /** E-mail do destinatário, exibido no rodapé. */
  recipientEmail?: string | null;
  /** Quando verdadeiro, marca visualmente o envio como teste. */
  isTest?: boolean;
  /** URL absoluta da aplicação, usada para o logotipo. */
  baseUrl?: string;
  subject?: string;
  introText?: string;
}

export const FEEDBACK_EMAIL_ACCENT = "#1d4ed8";
export const FEEDBACK_EMAIL_NAVY = "#0b2a5b";
export const FEEDBACK_EMAIL_MUTED = "#4b5563";
export const FEEDBACK_EMAIL_BORDER = "#dfe6f1";
export const FEEDBACK_EMAIL_BACKGROUND = "#eef2f8";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDeadlineLabel(
  deadline: Date | null | undefined,
): string | null {
  if (!deadline) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(deadline));
}

export function buildFeedbackInviteSubject(input: {
  isTest?: boolean;
  subject?: string;
}): string {
  const base = (input.subject || FEEDBACK_DEFAULT_SUBJECT).trim();
  return input.isTest ? `[TESTE] ${base}` : base;
}

function renderLogo(baseUrl: string | undefined): string {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) return "";
  const src = `${baseUrl.replace(/\/+$/, "")}/images/logo.png`;
  return `<img src="${escapeHtml(src)}" alt="CSDT" width="56" height="56" style="display:block;border:0;outline:none;text-decoration:none;width:56px;height:56px;margin:0 auto 14px auto;" />`;
}

function renderSchoolLinks(
  links: FeedbackEmailSchoolLink[],
  isTest: boolean,
): string {
  const single = links.length === 1;

  return links
    .map((link, index) => {
      const separator =
        index > 0
          ? `<tr><td style="padding:0 0 18px 0;font-size:0;line-height:0;">&nbsp;</td></tr>`
          : "";
      const label = single ? "RESPONDER PESQUISA" : "RESPONDER ESTA ESCOLA";
      const schoolBlock = `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:${FEEDBACK_EMAIL_MUTED};text-transform:uppercase;letter-spacing:0.04em;">Unidade escolar</p>
           <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:23px;color:${FEEDBACK_EMAIL_NAVY};font-weight:bold;">${escapeHtml(link.schoolName)}</p>`;

      return `${separator}
        <tr>
          <td style="padding:0 0 16px 0;">
            ${schoolBlock}
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(link.url)}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" strokecolor="${FEEDBACK_EMAIL_ACCENT}" fillcolor="${FEEDBACK_EMAIL_ACCENT}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
              <tr>
                <td align="center" bgcolor="${FEEDBACK_EMAIL_ACCENT}" style="border-radius:8px;">
                  <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;line-height:18px;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:0.03em;">${label}</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${FEEDBACK_EMAIL_MUTED};">
            Se o botão não abrir, copie e cole este link no navegador:
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 4px 0;word-break:break-all;">
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${FEEDBACK_EMAIL_ACCENT};text-decoration:underline;">${escapeHtml(link.url)}</a>
          </td>
        </tr>
        ${
          isTest
            ? `<tr><td style="padding:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#b45309;">Envio de TESTE — este convite não representa uma campanha oficial.</td></tr>`
            : ""
        }`;
    })
    .join("");
}

export function buildFeedbackInviteEmail(input: FeedbackInviteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const links = input.schoolLinks.filter(
    (link) => typeof link.url === "string" && link.url.length > 0,
  );
  const isTest = Boolean(input.isTest);
  const subject = buildFeedbackInviteSubject({
    isTest,
    subject: input.subject,
  });
  const intro = (input.introText || FEEDBACK_DEFAULT_INTRO).trim();
  const deadline = input.deadlineLabel?.trim() || null;
  const year = new Date().getFullYear();
  // Contato institucional explícito: não depende da conta SMTP (EMAIL_USER).
  const contact = FEEDBACK_INSTITUTIONAL_CONTACT;
  const logo = renderLogo(input.baseUrl);

  const deadlineRow = deadline
    ? `<tr>
         <td style="padding:0 0 20px 0;">
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
             <tr>
               <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#92400e;">
                 <strong>Prazo para participação:</strong> ${escapeHtml(deadline)}
               </td>
             </tr>
           </table>
         </td>
       </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .email-heading { font-size: 18px !important; line-height: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${FEEDBACK_EMAIL_BACKGROUND};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;color:${FEEDBACK_EMAIL_BACKGROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Convite da Pesquisa de Feedback do CSDT para sua unidade escolar.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:${FEEDBACK_EMAIL_BACKGROUND};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff;border:1px solid ${FEEDBACK_EMAIL_BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" bgcolor="${FEEDBACK_EMAIL_NAVY}" class="email-padding" style="padding:32px 28px;background-color:${FEEDBACK_EMAIL_NAVY};">
              ${logo}
              <h1 class="email-heading" style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:28px;color:#ffffff;font-weight:bold;letter-spacing:0.01em;">PESQUISA DE FEEDBACK &ndash; CSDT</h1>
              <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#c7d6f0;letter-spacing:0.06em;">CENTRO DE SUPORTE E DESENVOLVIMENTO TECNOL&Oacute;GICO</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#c7d6f0;letter-spacing:0.04em;">Secretaria Municipal de Educa&ccedil;&atilde;o</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#111827;">Prezada equipe gestora,</p>
              <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(intro)}</p>
              <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Queremos conhecer sua avalia&ccedil;&atilde;o sobre nossos servi&ccedil;os, atendimentos e comunica&ccedil;&atilde;o, al&eacute;m de identificar oportunidades de melhoria no suporte tecnol&oacute;gico oferecido &agrave;s escolas.</p>
              <p style="margin:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Sua participa&ccedil;&atilde;o &eacute; muito importante para aprimorarmos continuamente nosso trabalho. Para responder, utilize o bot&atilde;o abaixo.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:#f8fafc;border:1px solid ${FEEDBACK_EMAIL_BORDER};border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#374151;">
                    ${
                      links.length > 1
                        ? "Este endere&ccedil;o de e-mail est&aacute; vinculado a mais de uma unidade escolar. Cada unidade possui um link pr&oacute;prio, identificado abaixo."
                        : "O link abaixo &eacute; exclusivo da sua unidade escolar e n&atilde;o deve ser compartilhado."
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${renderSchoolLinks(links, isTest)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${deadlineRow}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px 28px;">
              <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Agradecemos pela participa&ccedil;&atilde;o e pelo compromisso com a melhoria cont&iacute;nua dos servi&ccedil;os tecnol&oacute;gicos da rede municipal.</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#111827;font-weight:bold;">Atenciosamente,</p>
              <p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#374151;">Equipe CSDT<br />Centro de Suporte e Desenvolvimento Tecnol&oacute;gico<br />Secretaria Municipal de Educa&ccedil;&atilde;o</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f7f9fc" style="padding:22px 28px;background-color:#f7f9fc;border-top:1px solid ${FEEDBACK_EMAIL_BORDER};">
              <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">Centro de Suporte e Desenvolvimento Tecnol&oacute;gico &mdash; Secretaria Municipal de Educa&ccedil;&atilde;o</p>
              ${contact ? `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">Contato: <a href="mailto:${escapeHtml(contact)}" style="color:${FEEDBACK_EMAIL_ACCENT};text-decoration:none;">${escapeHtml(contact)}</a></p>` : ""}
              ${input.recipientEmail ? `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#9ca3af;text-align:center;">Mensagem enviada para ${escapeHtml(input.recipientEmail)}.</p>` : ""}
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#9ca3af;text-align:center;">Este convite foi enviado &agrave;s unidades escolares da rede municipal. Se voc&ecirc; n&atilde;o &eacute; o destinat&aacute;rio, por favor desconsidere. &copy; ${year} CSDT.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines: string[] = [
    "PESQUISA DE FEEDBACK – CSDT",
    "CENTRO DE SUPORTE E DESENVOLVIMENTO TECNOLÓGICO",
    "Secretaria Municipal de Educação",
    "",
    "Prezada equipe gestora,",
    "",
    intro,
    "",
    "Queremos conhecer sua avaliação sobre nossos serviços, atendimentos e comunicação, além de identificar oportunidades de melhoria no suporte tecnológico oferecido às escolas.",
    "",
    "Sua participação é muito importante para aprimorarmos continuamente nosso trabalho.",
    "",
  ];

  if (links.length > 1) {
    textLines.push(
      "Este endereço de e-mail está vinculado a mais de uma unidade escolar. Cada unidade possui um link próprio:",
      "",
    );
  }

  for (const link of links) {
    if (links.length > 1) {
      textLines.push(`Unidade escolar: ${link.schoolName}`);
    } else {
      textLines.push(`Unidade escolar: ${link.schoolName}`);
    }
    textLines.push(`Responder: ${link.url}`, "");
  }

  if (deadline) {
    textLines.push(`Prazo para participação: ${deadline}`, "");
  }

  if (isTest) {
    textLines.push(
      "Envio de TESTE — este convite não representa uma campanha oficial.",
      "",
    );
  }

  textLines.push(
    "Agradecemos pela participação e pelo compromisso com a melhoria contínua dos serviços tecnológicos da rede municipal.",
    "",
    "Atenciosamente,",
    "Equipe CSDT",
    "Centro de Suporte e Desenvolvimento Tecnológico",
    "Secretaria Municipal de Educação",
  );

  if (contact) textLines.push("", `Contato: ${contact}`);
  if (input.recipientEmail) {
    textLines.push(`Mensagem enviada para ${input.recipientEmail}.`);
  }
  textLines.push("Se você não é o destinatário, por favor desconsidere.");

  return { subject, html, text: textLines.join("\n") };
}

/** Destinatário fixo e autorizado dos testes. */
export function isAuthorizedTestRecipient(email: string): boolean {
  return email.trim().toLowerCase() === FEEDBACK_TEST_RECIPIENT;
}
