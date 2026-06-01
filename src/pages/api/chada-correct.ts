import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { generateChadaCorrectionEmail } from "@/utils/emailTemplates";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, problem, sector, selectedItem, semSerial, itemNameSemSerial, itemTypeSemSerial, itemBrandSemSerial } = req.body;

  if (!itemId || !problem || !sector) {
    return res.status(400).json({ error: "ID do item, problema e setor são obrigatórios" });
  }

  try {
    // Buscar o item atual na CHADA
    const chadaItem = await prisma.itemsChada.findUnique({
      where: { id: itemId },
    });

    if (!chadaItem) {
      return res.status(404).json({ error: "Item não encontrado na CHADA" });
    }

    // Montar dados antigos (para o email de errata)
    let oldItemName = chadaItem.itemNameSemSerial || "Item sem serial";
    let oldSerial = chadaItem.semSerial ? "SEM SERIAL" : "";

    if (chadaItem.itemId) {
      const originalItem = await prisma.item.findUnique({
        where: { id: chadaItem.itemId },
      });
      if (originalItem) {
        oldItemName = originalItem.name;
        oldSerial = originalItem.serialNumber;
      }
    }

    // Montar dados novos
    let newItemName = oldItemName;
    let newSerial = oldSerial;
    let newSetor = sector;

    if (semSerial) {
      newItemName = `${itemTypeSemSerial || "Item"} - ${itemNameSemSerial || ""}`.trim();
      newSerial = "SEM SERIAL";
    } else if (selectedItem) {
      const newItem = await prisma.item.findUnique({
        where: { id: Number(selectedItem) },
      });
      if (newItem) {
        newItemName = newItem.name;
        newSerial = newItem.serialNumber;
      }
    }

    // Enviar email de correção
    const transporter = nodemailer.createTransport({
      host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.CSDT_EMAIL_USER,
        pass: process.env.CSDT_EMAIL_PASS,
      },
    });

    const emailContent = generateChadaCorrectionEmail({
      oldItemName,
      oldSerial,
      oldProblem: chadaItem.problem,
      newItemName,
      newSerial,
      newProblem: problem,
      newSetor,
      userName: chadaItem.userName,
      idOriginal: chadaItem.id.substring(0, 8),
    });

    const ccEmails = [
      process.env.CSDT_REPLY_TO_EMAIL || 'csdt@smeduquedecaxias.rj.gov.br',
      process.env.CSDT_EMAIL_USER || 'ordemdeservicocsdt@gmail.com'
    ].filter((email, index, self) => self.indexOf(email) === index);

    const mailOptions: any = {
      from: `"CSDT" <${process.env.CSDT_EMAIL_USER}>`,
      to: process.env.CHADA_EMAIL || 'sac@xscan.com.br',
      cc: ccEmails.join(', '),
      replyTo: ccEmails.join(', '),
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    // In-Reply-To para manter na mesma thread do email original
    if (chadaItem.emailMessageId) {
      mailOptions.headers = {
        'In-Reply-To': chadaItem.emailMessageId,
        'References': chadaItem.emailMessageId,
      };
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Erro ao enviar email de correção:', emailError);
    }

    // Atualizar o registro no banco com os novos dados
    const updateData: any = {
      problem,
      setor: sector,
    };

    if (semSerial) {
      updateData.semSerial = true;
      updateData.itemId = null;
      updateData.itemNameSemSerial = itemNameSemSerial || null;
      updateData.itemTypeSemSerial = itemTypeSemSerial || null;
      updateData.itemBrandSemSerial = itemBrandSemSerial || null;
    } else if (selectedItem) {
      updateData.semSerial = false;
      updateData.itemId = Number(selectedItem);
      updateData.itemNameSemSerial = null;
      updateData.itemTypeSemSerial = null;
      updateData.itemBrandSemSerial = null;
    }

    await prisma.itemsChada.update({
      where: { id: itemId },
      data: updateData,
    });

    res.status(200).json({ message: "Item corrigido e email de retificação enviado" });
  } catch (error) {
    console.error("Erro ao corrigir item da CHADA:", error);
    res.status(500).json({ error: "Erro ao corrigir item" });
  }
}