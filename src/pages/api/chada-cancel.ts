import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { generateChadaCancelEmail } from "@/utils/emailTemplates";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: "ID do item é obrigatório" });
  }

  try {
    // Buscar o item na tabela ItemsChada
    const chadaItem = await prisma.itemsChada.findUnique({
      where: { id: itemId },
    });

    if (!chadaItem) {
      return res.status(404).json({ error: "Item não encontrado na CHADA" });
    }

    // Buscar dados do item original se tiver
    let itemName = chadaItem.itemNameSemSerial || "Item sem serial";
    let serial = chadaItem.semSerial ? "SEM SERIAL" : "";

    if (chadaItem.itemId) {
      const originalItem = await prisma.item.findUnique({
        where: { id: chadaItem.itemId },
      });
      if (originalItem) {
        itemName = originalItem.name;
        serial = originalItem.serialNumber;
      }
    }

    // Enviar email de cancelamento
    const transporter = nodemailer.createTransport({
      host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.CSDT_EMAIL_USER,
        pass: process.env.CSDT_EMAIL_PASS,
      },
    });

    const emailContent = generateChadaCancelEmail({
      itemName,
      serialNumber: serial,
      problem: chadaItem.problem,
      userName: chadaItem.userName,
      setor: chadaItem.setor,
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
      console.error('Erro ao enviar email de cancelamento:', emailError);
    }

    // Remover o item da tabela ItemsChada
    await prisma.itemsChada.delete({
      where: { id: itemId },
    });

    // Se o item original existia e estava marcado como CHADA, restaurar
    if (chadaItem.itemId && !chadaItem.manutencaoSemMovimentacao) {
      const originalSchoolId = chadaItem.schoolIdOriginal || 225;
      await prisma.item.update({
        where: { id: chadaItem.itemId },
        data: {
          status: "DISPONIVEL",
          schoolId: originalSchoolId,
        },
      });
    }

    res.status(200).json({ message: "Item cancelado e email de cancelamento enviado" });
  } catch (error) {
    console.error("Erro ao cancelar item da CHADA:", error);
    res.status(500).json({ error: "Erro ao cancelar item" });
  }
}