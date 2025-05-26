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

    // Gera token único para confirmação
    const confirmToken = uuidv4();
    await prisma.internalOS.update({
      where: { id: osId },
      data: { assinado: confirmToken }
    });

    // Gera o PDF preenchido
    const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/os-interna.pdf`;
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    form.getTextField('SETOR').setText(setor.name || "");
    form.getTextField('TECNICO').setText(updatedOS.tecnicoId?.toString() || "");
    form.getTextField('SOLICITACAO').setText(updatedOS.problema || "");
    form.getTextField('PECA').setText(updatedOS.peca || "");
    const now = new Date();
    form.getTextField('DATA').setText(now.toLocaleDateString("pt-BR"));
    form.getTextField('HORA').setText(now.toLocaleTimeString("pt-BR"));
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
    const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/confirm-os?id=${osId}&token=${confirmToken}`;

    // Envia o e-mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: setor.email,
      subject: "Confirmação de OS Interna",
      html: `
        <p>Olá, segue em anexo a OS.</p>
        <p>Para confirmar a OS, <a href="${confirmUrl}">clique aqui</a>.</p>
        <p>Este endreço de email serve apenas para envio de OS eletrônica, para mais informações: csdt@smeduquedecaxias.rj.gov.br .</p>
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