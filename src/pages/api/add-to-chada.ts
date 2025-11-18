import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { generateChadaRequestEmail } from "@/utils/emailTemplates";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, problem, userName, sector, status, manutencaoSemMovimentacao } = req.body;

  console.log("Dados recebidos:", req.body); // Log dos dados recebidos

  if (!itemId || !problem || !userName || !sector) {
    console.error("Campos obrigatórios ausentes:", { itemId, problem, userName, sector });
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Buscar o item atual para obter o nome da escola atual
    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
      include: { School: true }, // Inclui os dados da escola atual
    });

    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    // Verificar se é impressora (case-insensitive)
    const isImpressora = item.name.toLowerCase().includes('impressora');

    // Verificar se é manutenção sem movimentação física
    const isManutencaoSemMovimentacao = manutencaoSemMovimentacao === true;

    // Validar se o item está no CSDT (schoolId = 225)
    // EXCEÇÕES: Impressoras podem ser enviadas de qualquer local OU quando marcado como manutenção sem movimentação
    if (item.schoolId !== 225 && !isImpressora && !isManutencaoSemMovimentacao) {
      return res.status(400).json({
        error: "ITEM_NAO_NO_CSDT",
        message: "O item precisa estar no CSDT primeiro. Consulte o Aurélio para fazer o memorando e trazer o item para o CSDT antes de enviar à CHADA."
      });
    }

    const fromSchool = item.School?.name || "Escola desconhecida";
    const toSchool = "CHADA"; // Nome da escola de destino

    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.CSDT_EMAIL_USER,
        pass: process.env.CSDT_EMAIL_PASS,
      },
    });

    // Gerar template de email
    const emailContent = generateChadaRequestEmail({
      itemId: Number(itemId),
      itemName: item.name,
      brand: item.brand,
      serialNumber: item.serialNumber,
      problem,
      userName,
      setor: sector,
    });

    // Enviar email para CHADA
    let emailMessageId: string | undefined;
    try {
      // Montar lista de CC com os dois emails
      const ccEmails = [
        process.env.CSDT_REPLY_TO_EMAIL || 'csdt@smeduquedecaxias.rj.gov.br',
        process.env.CSDT_EMAIL_USER || 'ordemdeservicocsdt@gmail.com'
      ].filter((email, index, self) => self.indexOf(email) === index); // Remove duplicatas

      const emailInfo = await transporter.sendMail({
        from: `"CSDT" <${process.env.CSDT_EMAIL_USER}>`,
        to: process.env.CHADA_EMAIL || 'sac@xscan.com.br',
        cc: ccEmails.join(', '),
        replyTo: ccEmails.join(', '), // Reply-To com os DOIS emails - resposta automática para todos!
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      emailMessageId = emailInfo.messageId;
      console.log('Email enviado para CHADA:', emailInfo.messageId);
    } catch (emailError) {
      console.error('Erro ao enviar email para CHADA:', emailError);
      // Continua mesmo se o email falhar, mas loga o erro
    }

    // Adicionar o item à tabela ItemsChada
    await prisma.itemsChada.create({
      data: {
        itemId: Number(itemId),
        problem,
        userName,
        status: status || "PENDENTE", // Define o status como PENDENTE se não for fornecido
        setor: sector, // Adiciona o setor à tabela ItemsChada
        osImages: [], // Inicializa o campo osImages como um array vazio
        emailSentAt: emailMessageId ? new Date() : null,
        emailMessageId: emailMessageId || null,
        manutencaoSemMovimentacao: isManutencaoSemMovimentacao,
        schoolIdOriginal: isManutencaoSemMovimentacao ? item.schoolId : null, // Salva localização original se for manutenção sem movimentação
      },
    });

    // Atualizar o status e o schoolId do item na tabela Item
    // Se for manutenção sem movimentação, mantém o schoolId original (item não se move fisicamente)
    await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        status: "CHADA",
        ...(isManutencaoSemMovimentacao ? {} : { schoolId: 259 }), // Só muda schoolId se NÃO for manutenção sem movimentação
      },
    });

    // Registrar a movimentação na tabela ItemHistory
    // Se for manutenção sem movimentação, adiciona nota explicativa
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