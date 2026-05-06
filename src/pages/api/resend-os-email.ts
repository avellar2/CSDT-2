import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import nodemailer from "nodemailer";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { osId, unidadeEscolar, emailResponsavel, numeroOs } = req.body;

    if (!osId || !unidadeEscolar || !numeroOs) {
      return res.status(400).json({ error: "Dados obrigatorios nao fornecidos" });
    }

    const osExterna = await prisma.oSExterna.findUnique({
      where: { id: parseInt(osId) },
    });

    if (!osExterna) {
      return res.status(404).json({ error: "OS nao encontrada" });
    }

    if (osExterna.status !== "Pendente") {
      return res.status(400).json({ error: "Apenas OS pendentes podem ter emails reenviados" });
    }

    const school = await prisma.school.findUnique({
      where: { name: unidadeEscolar },
      select: { email: true },
    });

    const targetEmail = school?.email?.trim() || osExterna.emailResponsavel || emailResponsavel;

    if (!targetEmail) {
      return res.status(400).json({ error: "Nenhum email valido foi encontrado para esta escola" });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    if (osExterna.lastEmailSent) {
      const lastEmailDate = new Date(osExterna.lastEmailSent);
      if (lastEmailDate >= hoje && lastEmailDate < amanha) {
        return res.status(400).json({
          error: "Ja foi enviado um email para esta OS hoje. Limite: 1 email por dia.",
          lastSent: osExterna.lastEmailSent,
        });
      }
    }

    let token = osExterna.assinado && osExterna.assinado.length > 10 ? osExterna.assinado : null;
    if (!token) {
      token = uuidv4();
      await prisma.oSExterna.update({
        where: { id: parseInt(osId) },
        data: { assinado: token },
      });
    }

    let pdfBytes;
    try {
      console.log("Iniciando geracao do PDF para OS:", osExterna.numeroOs);
      console.log("Dados da OS:", JSON.stringify(osExterna, null, 2));
      pdfBytes = await fillOSExternaPDF(osExterna);
      console.log("PDF gerado com sucesso, tamanho:", pdfBytes.length);
    } catch (pdfError) {
      console.error("Erro ao gerar PDF:", pdfError);
      return res.status(500).json({
        error: "Erro ao gerar PDF da OS",
        details: pdfError instanceof Error ? pdfError.message : "Erro desconhecido na geracao do PDF",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000000;">
        <h1 style="color: #f59e0b;">ASSINATURA PENDENTE</h1>
        <h2 style="color: #000000;">OS ${numeroOs} - ${unidadeEscolar}</h2>

        <p style="color: #000000;"><strong>Prezados responsaveis,</strong></p>

        <p style="color: #000000;">A Ordem de Servico ${numeroOs} ainda nao foi assinada eletronicamente.</p>

        <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #000000;"><strong>IMPORTANTE:</strong> Enquanto esta OS nao for assinada, o sistema nao gerara novas OS para sua escola.</p>
        </div>

        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #000000;"><strong>PDF ANEXADO:</strong> A Ordem de Servico completa esta anexada neste email para facilitar o entendimento do servico prestado pela equipe.</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://csdt.vercel.app"}/confirmar-os-externa?numeroOs=${encodeURIComponent(numeroOs)}&token=${token}"
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ASSINAR ONLINE
          </a>
        </div>

        <p style="color: #000000;">Tecnico: ${osExterna.tecnicoResponsavel || "Nao informado"}</p>
        <p style="color: #000000;"><strong>CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnologico</strong></p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: targetEmail,
      subject: `URGENTE - CSDT/SME - Assinatura Pendente da OS ${numeroOs} - ${unidadeEscolar}`,
      text: `OS ${numeroOs} - ${unidadeEscolar} - Assinatura Pendente`,
      html: emailHtml,
      attachments: [
        {
          filename: `OS_${numeroOs}_${unidadeEscolar.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          content: Buffer.from(pdfBytes),
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    try {
      await prisma.oSExterna.update({
        where: { id: parseInt(osId) },
        data: {
          lastEmailSent: new Date(),
          emailResponsavel: targetEmail,
        },
      });
    } catch (updateError) {
      console.log("Erro ao atualizar lastEmailSent, mas email foi enviado com sucesso:", updateError);
    }

    res.status(200).json({
      success: true,
      message: `Email reenviado com sucesso para ${unidadeEscolar}`,
      lastSent: new Date(),
    });
  } catch (error) {
    console.error("Erro ao reenviar email da OS:", error);
    res.status(500).json({
      error: "Erro ao enviar o email",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

async function fillOSExternaPDF(osExterna: any): Promise<Uint8Array> {
  const pdfPath = path.join(process.cwd(), "public", "os-externa2-EDITADA.pdf");

  console.log("Caminho do PDF:", pdfPath);

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF template nao encontrado em: ${pdfPath}`);
    throw new Error(`Template os-externa2-EDITADA.pdf nao encontrado no caminho: ${pdfPath}`);
  }

  console.log("PDF template encontrado, carregando...");

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log("PDF carregado, obtendo campos do formulario...");

  const fields = form.getFields();
  console.log("Campos disponiveis no PDF:", fields.map((field) => field.getName()));

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
        const field = form.getTextField(fieldName);
        field.setText(String(value));
        fieldsPreenchidos++;
        console.log(`Campo ${fieldName} preenchido com: ${value}`);
      } catch {
        console.warn(`Campo ${fieldName} nao encontrado no PDF`);
      }
    });

    console.log(`Total de campos preenchidos: ${fieldsPreenchidos} de ${Object.keys(fieldsToFill).length}`);

    form.flatten();
    console.log("Formulario achatado, salvando PDF...");

    return await pdfDoc.save();
  } catch (error) {
    console.error("Erro ao preencher PDF da OS:", error);
    throw error;
  }
}
