import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { PDFDocument } from "pdf-lib";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  console.log("Dados recebidos no endpoint:", req.body);

  const { osId, status, descricao, peca } = req.body;

  if (!osId || !status || !descricao || peca === "-----") {
    return res.status(400).json({ message: "ID da OS, status, descrição e peça são obrigatórios" });
  }

  try {
    // Atualiza a OS normalmente
    const updatedOS = await prisma.internalOS.update({
      where: { id: osId },
      data: { status, descricao, peca },
    });

    // Busca dados do setor (ajuste conforme seu modelo)
    const setor = await prisma.school.findUnique({
      where: { id: Number(updatedOS.setorId) },
      select: { name: true, email: true }
    });

    if (!setor?.email) {
      return res.status(404).json({ message: "Email do setor não encontrado" });
    }

    // Busca o nome do técnico na tabela profile
    const tecnico = await prisma.profile.findUnique({
      where: { id: updatedOS.tecnicoId },
      select: { displayName: true }
    });

    // Gera token único para confirmação
    const confirmToken = uuidv4();
    await prisma.internalOS.update({
      where: { id: osId },
      data: { assinado: confirmToken }
    });

    // Gera o PDF preenchido
    const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://csdt.vercel.app"}/os-interna.pdf`;
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    form.getTextField('SETOR').setText(setor.name || "");
    form.getTextField('TECNICO').setText(tecnico?.displayName || "");
    form.getTextField('SOLICITACAO').setText(updatedOS.problema || "");
    form.getTextField('PECA').setText(updatedOS.peca || "");
    const now = new Date();
    form.getTextField('DATA').setText(
      now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    );
    form.getTextField('HORA').setText(
      now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })
    );
    form.getTextField('RELATORIO').setText(updatedOS.descricao || "");

    const pdfBytes = await pdfDoc.save();

    // Configura o transporte do nodemailer usando Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Monta o link de confirmação
    const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://csdt.vercel.app"}/confirm-os?id=${osId}&token=${confirmToken}`;

    // Envia o e-mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: setor.email,
      subject: "Confirmação de OS Interna",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px 0;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px 24px;">
            <h2 style="color: #2563eb; text-align: center; margin-bottom: 16px;">
              Confirmação de OS Eletrônica - CSDT
            </h2>
            <p style="font-size: 16px; color: #222; margin-bottom: 16px;">
              Olá,<br>
              Segue em anexo a Ordem de Serviço (OS) referente ao seu setor.
            </p>
            <p style="font-size: 16px; color: #222; margin-bottom: 24px;">
              <strong>Para concluir o processo, é necessário assinar eletronicamente a OS.</strong>
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: #fff; font-weight: bold; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 16px;">
                Assinar OS Eletronicamente
              </a>
            </div>
            <p style="font-size: 14px; color: #555; margin-bottom: 8px;">
              Caso não consiga clicar no botão acima, copie e cole o link abaixo no seu navegador:
            </p>
            <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin-bottom: 24px;">
              ${confirmUrl}
            </p>
            <hr style="margin: 24px 0;">
            <p style="font-size: 13px; color: #888;">
              Este endereço de e-mail serve apenas para envio de OS eletrônica.<br>
              Para mais informações: <a href="mailto:csdt@smeduquedecaxias.rj.gov.br" style="color: #2563eb;">csdt@smeduquedecaxias.rj.gov.br</a>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `os-interna-${osId}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });

    // Atualiza o campo email para "Enviado"
    await prisma.internalOS.update({
      where: { id: osId },
      data: { email: "Enviado" }
    });

    res.status(200).json(updatedOS);
  } catch (error) {
    console.error("Erro ao finalizar OS:", error);
    res.status(500).json({ message: "Erro ao finalizar OS" });
  }
}