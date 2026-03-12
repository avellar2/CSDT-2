import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { generateChadaRequestEmail } from "@/utils/emailTemplates";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, problem, userName, sector, status, manutencaoSemMovimentacao, semSerial, itemNameSemSerial, itemTypeSemSerial, itemBrandSemSerial } = req.body;

  console.log("Dados recebidos:", req.body);

  if (!problem || !userName || !sector) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  // Fluxo sem serial: não precisa de itemId
  if (semSerial) {
    if (!itemNameSemSerial || !itemTypeSemSerial) {
      return res.status(400).json({ error: "Informe o nome e o tipo do item sem serial." });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.CSDT_EMAIL_USER,
          pass: process.env.CSDT_EMAIL_PASS,
        },
      });

      const emailContent = generateChadaRequestEmail({
        itemId: 0,
        itemName: `${itemTypeSemSerial} - ${itemNameSemSerial}`,
        brand: undefined,
        serialNumber: "SEM SERIAL",
        problem,
        userName,
        setor: sector,
      });

      let emailMessageId: string | undefined;
      try {
        const ccEmails = [
          process.env.CSDT_REPLY_TO_EMAIL || 'csdt@smeduquedecaxias.rj.gov.br',
          process.env.CSDT_EMAIL_USER || 'ordemdeservicocsdt@gmail.com'
        ].filter((email, index, self) => self.indexOf(email) === index);

        const emailInfo = await transporter.sendMail({
          from: `"CSDT" <${process.env.CSDT_EMAIL_USER}>`,
          to: process.env.CHADA_EMAIL || 'sac@xscan.com.br',
          cc: ccEmails.join(', '),
          replyTo: ccEmails.join(', '),
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });
        emailMessageId = emailInfo.messageId;
      } catch (emailError) {
        console.error('Erro ao enviar email para CHADA:', emailError);
      }

      await prisma.itemsChada.create({
        data: {
          problem,
          userName,
          status: status || "PENDENTE",
          setor: sector,
          osImages: [],
          emailSentAt: emailMessageId ? new Date() : null,
          emailMessageId: emailMessageId || null,
          manutencaoSemMovimentacao: false,
          semSerial: true,
          itemNameSemSerial,
          itemTypeSemSerial,
          itemBrandSemSerial: itemBrandSemSerial || null,
        },
      });

      return res.status(200).json({ message: "Item adicionado à CHADA com sucesso" });
    } catch (error) {
      console.error("Erro ao adicionar item sem serial à CHADA:", error);
      return res.status(500).json({ error: "Erro ao adicionar item à CHADA" });
    }
  }

  // Fluxo normal: com itemId
  if (!itemId) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Buscar o item atual para obter o nome da escola atual
    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
      include: { School: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    const isImpressora = item.name.toLowerCase().includes('impressora');
    const isManutencaoSemMovimentacao = manutencaoSemMovimentacao === true;

    if (item.schoolId !== 225 && !isImpressora && !isManutencaoSemMovimentacao) {
      return res.status(400).json({
        error: "ITEM_NAO_NO_CSDT",
        message: "O item precisa estar no CSDT primeiro. Consulte o Aurélio para fazer o memorando e trazer o item para o CSDT antes de enviar à CHADA."
      });
    }

    const fromSchool = item.School?.name || "Escola desconhecida";
    const toSchool = "CHADA";

    const transporter = nodemailer.createTransport({
      host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.CSDT_EMAIL_USER,
        pass: process.env.CSDT_EMAIL_PASS,
      },
    });

    const emailContent = generateChadaRequestEmail({
      itemId: Number(itemId),
      itemName: item.name,
      brand: item.brand,
      serialNumber: item.serialNumber,
      problem,
      userName,
      setor: sector,
    });

    let emailMessageId: string | undefined;
    try {
      const ccEmails = [
        process.env.CSDT_REPLY_TO_EMAIL || 'csdt@smeduquedecaxias.rj.gov.br',
        process.env.CSDT_EMAIL_USER || 'ordemdeservicocsdt@gmail.com'
      ].filter((email, index, self) => self.indexOf(email) === index);

      const emailInfo = await transporter.sendMail({
        from: `"CSDT" <${process.env.CSDT_EMAIL_USER}>`,
        to: process.env.CHADA_EMAIL || 'sac@xscan.com.br',
        cc: ccEmails.join(', '),
        replyTo: ccEmails.join(', '),
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      emailMessageId = emailInfo.messageId;
      console.log('Email enviado para CHADA:', emailInfo.messageId);
    } catch (emailError) {
      console.error('Erro ao enviar email para CHADA:', emailError);
    }

    await prisma.itemsChada.create({
      data: {
        itemId: Number(itemId),
        problem,
        userName,
        status: status || "PENDENTE",
        setor: sector,
        osImages: [],
        emailSentAt: emailMessageId ? new Date() : null,
        emailMessageId: emailMessageId || null,
        manutencaoSemMovimentacao: isManutencaoSemMovimentacao,
        schoolIdOriginal: isManutencaoSemMovimentacao ? item.schoolId : null,
      },
    });

    await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        status: "CHADA",
        ...(isManutencaoSemMovimentacao ? {} : { schoolId: 259 }),
      },
    });

    await prisma.itemHistory.create({
      data: {
        itemId: Number(itemId),
        fromSchool: isManutencaoSemMovimentacao ? `${fromSchool} (Manutenção no local)` : fromSchool,
        toSchool: isManutencaoSemMovimentacao ? `${toSchool} (Sem movimentação física)` : toSchool,
        generatedBy: userName,
      },
    });

    res.status(200).json({ message: "Item adicionado à CHADA com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar item à CHADA:", error);
    res.status(500).json({ error: "Erro ao adicionar item à CHADA" });
  }
}