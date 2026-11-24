import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";
import { sendMail, MailConfigurationError } from "@/utils/mailer";
import { evaluateMailAcceptance } from "@/utils/mailRecipients";

/** Reenvio manual legítimo é permitido no mesmo dia; o cooldown evita spam. */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function isValidEmail(value: string): boolean {
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value.trim());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Autenticação antes do processamento (antes estava em código inacessível).
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { osId, unidadeEscolar, emailResponsavel, numeroOs } = req.body;

    if (!osId || !numeroOs) {
      return res.status(400).json({ error: "Dados obrigatorios nao fornecidos" });
    }

    const parsedId = Number(osId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: "osId inválido" });
    }

    const osExterna = await prisma.oSExterna.findUnique({
      where: { id: parsedId },
    });

    if (!osExterna) {
      return res.status(404).json({ error: "OS nao encontrada" });
    }

    if (osExterna.numeroOs !== numeroOs) {
      return res.status(400).json({
        error: "O numeroOs informado não corresponde à OS.",
      });
    }

    if (osExterna.status !== "Pendente") {
      return res.status(400).json({ error: "Apenas OS pendentes podem ter emails reenviados" });
    }

    const permission = await authorizeOsExterna(auth, osExterna);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    const school = await prisma.school.findUnique({
      where: { name: osExterna.unidadeEscolar || unidadeEscolar || "" },
      select: { email: true },
    });

    const candidateEmails = [
      school?.email,
      osExterna.emailResponsavel,
      typeof emailResponsavel === "string" ? emailResponsavel : null,
    ];
    const targetEmail = candidateEmails
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find((value) => value && isValidEmail(value));

    if (!targetEmail) {
      return res.status(400).json({ error: "Nenhum email valido foi encontrado para esta escola" });
    }

    // Reenvio manual permitido no mesmo dia, com cooldown curto contra duplo
    // clique/acidente.
    if (osExterna.lastEmailSent) {
      const elapsed = Date.now() - new Date(osExterna.lastEmailSent).getTime();
      if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
        return res.status(429).json({
          error: "Aguarde alguns segundos antes de reenviar o e-mail desta OS.",
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    let token =
      osExterna.assinado && osExterna.assinado.length > 10
        ? osExterna.assinado
        : null;

    if (!token) {
      token = uuidv4();
      await prisma.oSExterna.update({
        where: { id: parsedId },
        data: { assinado: token },
      });
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await fillOSExternaPDF(osExterna);
    } catch (pdfError) {
      console.error("Erro ao gerar PDF:", pdfError);
      return res.status(500).json({
        error: "Erro ao gerar PDF da OS",
        details: pdfError instanceof Error ? pdfError.message : "Erro desconhecido na geracao do PDF",
      });
    }

    // Base URL para links em emails: nunca permite localhost, pois o
    // destinatario (escola) nao teria acesso. Se NEXT_PUBLIC_BASE_URL estiver
    // ausente ou apontando para localhost, cai no dominio de producao.
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes("localhost")
        ? process.env.NEXT_PUBLIC_BASE_URL
        : "https://csdt.vercel.app";

    const unidade = osExterna.unidadeEscolar || unidadeEscolar;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000000;">
        <h1 style="color: #f59e0b;">ASSINATURA PENDENTE</h1>
        <h2 style="color: #000000;">OS ${numeroOs} - ${unidade}</h2>

        <p style="color: #000000;"><strong>Prezados responsaveis,</strong></p>

        <p style="color: #000000;">A Ordem de Servico ${numeroOs} ainda nao foi assinada eletronicamente.</p>

        <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #000000;"><strong>IMPORTANTE:</strong> Enquanto esta OS nao for assinada, o sistema nao gerara novas OS para sua escola.</p>
        </div>

        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #000000;"><strong>PDF ANEXADO:</strong> A Ordem de Servico completa esta anexada neste email para facilitar o entendimento do servico prestado pela equipe.</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${baseUrl}/confirmar-os-externa?numeroOs=${encodeURIComponent(numeroOs)}&token=${token}"
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ASSINAR ONLINE
          </a>
        </div>

        <p style="color: #000000;">Tecnico: ${osExterna.tecnicoResponsavel || "Nao informado"}</p>
        <p style="color: #000000;"><strong>CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnologico</strong></p>
      </div>
    `;

    const csdtEmail = process.env.CSDT_EMAIL || "csdt@smeduquedecaxias.rj.gov.br";

    const result = await sendMail({
      to: targetEmail,
      cc: csdtEmail,
      replyTo: `${process.env.EMAIL_USER}, ${csdtEmail}`,
      subject: `URGENTE - CSDT/SME - Assinatura Pendente da OS ${numeroOs} - ${unidade}`,
      text: `OS ${numeroOs} - ${unidade} - Assinatura Pendente`,
      html: emailHtml,
      attachments: [
        {
          filename: `OS_${numeroOs}_${unidade.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          content: Buffer.from(pdfBytes),
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    });

    const acceptance = evaluateMailAcceptance(result, targetEmail, csdtEmail);

    if (!acceptance.mainAccepted) {
      console.error(
        "Reenvio de e-mail da OS sem aceite do destinatário principal.",
        { acceptedCount: acceptance.acceptedCount, rejectedCount: acceptance.rejectedCount },
      );
      return res.status(502).json({
        error:
          "O destinatário principal não foi aceito pelo servidor de e-mail. O reenvio não foi confirmado.",
        mainAccepted: false,
      });
    }

    try {
      await prisma.oSExterna.update({
        where: { id: parsedId },
        data: {
          lastEmailSent: new Date(),
          emailResponsavel: targetEmail,
        },
      });
    } catch (updateError) {
      console.error("Falha ao registrar reenvio de e-mail:", updateError);
    }

    res.status(200).json({
      success: true,
      message: `Email reenviado com sucesso para ${unidade}`,
      lastSent: new Date(),
      mainAccepted: true,
      ccStatus: acceptance.ccStatus,
      ccRejectedCount: acceptance.ccRejectedCount,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return res.status(503).json({ error: error.message });
    }
    console.error("Erro ao reenviar email da OS:", error);
    res.status(500).json({
      error: "Erro ao enviar o email",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/[-]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[^\x00-\xFF]/g, "");
}

async function fillOSExternaPDF(osExterna: any): Promise<Uint8Array> {
  const pdfPath = path.join(process.cwd(), "public", "os-externa2-EDITADA.pdf");

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF template nao encontrado em: ${pdfPath}`);
    throw new Error(`Template os-externa2-EDITADA.pdf nao encontrado no caminho: ${pdfPath}`);
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields = form.getFields();

  try {
    const fieldsToFill = {
      "NUMERO OS": osExterna.numeroOs || "",
      DATA: osExterna.data || "",
      HORA: osExterna.hora || "",
      "UNIDADE ESCOLAR": osExterna.unidadeEscolar || "",
      "TECNICO RESPONSAVEL": osExterna.tecnicoResponsavel || "",
      LAB_PC_P: osExterna.pcsProprio?.toString() || "0",
      LAB_NOTEBOOK_P: osExterna.notebooksProprio?.toString() || "0",
      LAB_MONITOR_P: osExterna.monitoresProprio?.toString() || "0",
      LAB_ESTABILIZADOR_P: osExterna.estabilizadoresProprio?.toString() || "0",
      LAB_TABLET_P: osExterna.tabletsProprio?.toString() || "0",
      LAB_PC_L: osExterna.pcsLocado?.toString() || "0",
      LAB_NOTEBOOK_L: osExterna.notebooksLocado?.toString() || "0",
      LAB_MONITOR_L: osExterna.monitoresLocado?.toString() || "0",
      LAB_ESTABILIZADOR_L: osExterna.estabilizadoresLocado?.toString() || "0",
      LAB_TABLET_L: osExterna.tabletsLocado?.toString() || "0",
      OUT_PC_P: osExterna.pcsProprioOutrosLocais?.toString() || "0",
      OUT_NOTEBOOK_P: osExterna.notebooksProprioOutrosLocais?.toString() || "0",
      OUT_MONITOR_P: osExterna.monitoresProprioOutrosLocais?.toString() || "0",
      OUT_ESTABILIZADOR_P: osExterna.estabilizadoresProprioOutrosLocais?.toString() || "0",
      OUT_TABLET_P: osExterna.tabletsProprioOutrosLocais?.toString() || "0",
      OUT_PC_L: osExterna.pcsLocadoOutrosLocais?.toString() || "0",
      OUT_NOTEBOOK_L: osExterna.notebooksLocadoOutrosLocais?.toString() || "0",
      OUT_MONITOR_L: osExterna.monitoresLocadoOutrosLocais?.toString() || "0",
      OUT_ESTABILIZADOR_L: osExterna.estabilizadoresLocadoOutrosLocais?.toString() || "0",
      OUT_TABLET_L: osExterna.tabletsLocadoOutrosLocais?.toString() || "0",
      OKI: osExterna.oki?.toString() || "0",
      KYOCERA: osExterna.kyocera?.toString() || "0",
      HP: osExterna.hp?.toString() || "0",
      RICOH: osExterna.ricoh?.toString() || "0",
      RACK: osExterna.rack?.toString() || "0",
      SWITCH: osExterna.switch?.toString() || "0",
      ROTEADOR: osExterna.roteador?.toString() || "0",
      PECA: osExterna.pecasOuMaterial || "",
      RELATORIO: osExterna.relatorio || "",
      SOLICITACAO: osExterna.solicitacaoDaVisita || "",
      REDEBR: osExterna.redeBr || "",
      EDUCACAOCONECTADA: osExterna.educacaoConectada || "",
      NAOHAPROVEDOR: osExterna.naoHaProvedor || "",
      NAOHALABORATORIO: osExterna.temLaboratorio ? "" : "X",
    };

    let fieldsPreenchidos = 0;
    Object.entries(fieldsToFill).forEach(([fieldName, value]) => {
      try {
        const field = form.getField(fieldName);
        if (field instanceof PDFCheckBox) {
          const shouldCheck = fieldName === "NAOHALABORATORIO" ? value === "X" : !!value;
          if (shouldCheck) {
            form.getCheckBox(fieldName).check();
          }
        } else if (field instanceof PDFTextField) {
          form.getTextField(fieldName).setText(sanitizeForWinAnsi(String(value)));
        }
        fieldsPreenchidos++;
      } catch {
        // campo nao existe no PDF, ignora
      }
    });

    form.flatten();

    return await pdfDoc.save();
  } catch (error) {
    console.error("Erro ao preencher PDF da OS:", error);
    throw error;
  }
}
