import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, photo } = req.body;

  if (!itemId || !photo) {
    return res.status(400).json({ error: "ID do item e foto são obrigatórios" });
  }

  try {
    const chadaItem = await prisma.itemsChada.findUnique({
      where: { id: itemId },
    });

    if (!chadaItem) {
      return res.status(404).json({ error: "Item não encontrado na CHADA" });
    }

    // Montar nome do equipamento pra colocar no assunto
    let itemName = chadaItem.itemNameSemSerial || "Item";
    if (chadaItem.itemId && !chadaItem.semSerial) {
      const originalItem = await prisma.item.findUnique({
        where: { id: chadaItem.itemId },
      });
      if (originalItem) {
        itemName = originalItem.name;
      }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.CSDT_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.CSDT_EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.CSDT_EMAIL_USER,
        pass: process.env.CSDT_EMAIL_PASS,
      },
    });

    const ccEmails = [
      process.env.CSDT_REPLY_TO_EMAIL || 'csdt@smeduquedecaxias.rj.gov.br',
      process.env.CSDT_EMAIL_USER || 'ordemdeservicocsdt@gmail.com'
    ].filter((email, index, self) => self.indexOf(email) === index);

    // Parse da foto base64
    const matches = photo.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
    if (!matches) {
      return res.status(400).json({ error: "Formato de foto inválido. Use PNG, JPEG ou GIF." });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const contentType = `image/${matches[1] === 'jpg' ? 'jpeg' : matches[1]}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foto do Equipamento</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 5px 0; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 CSDT - Foto do Equipamento</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${itemName}</p>
        </div>

        <div class="content">
            <p>Prezados,</p>
            <p>Conforme solicitado, segue foto do equipamento em anexo.</p>

            <div class="info-box">
                <p style="margin: 0; color: #374151;">
                    <strong>📋 Equipamento:</strong> ${itemName}<br/>
                    <strong>🆔 Chamado:</strong> #${chadaItem.id.substring(0, 8)}
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</strong></p>
            <p>Secretaria Municipal de Educação de Duque de Caxias</p>
            <p style="font-size: 12px; color: #9ca3af;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
CSDT - Foto do Equipamento

Prezados,

Conforme solicitado, segue foto do equipamento em anexo.

Equipamento: ${itemName}
Chamado ID: #${chadaItem.id.substring(0, 8)}

---
CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico
Secretaria Municipal de Educação de Duque de Caxias
    `;

    const mailOptions: any = {
      from: `"CSDT" <${process.env.CSDT_EMAIL_USER}>`,
      to: process.env.CHADA_EMAIL || 'sac@xscan.com.br',
      cc: ccEmails.join(', '),
      replyTo: ccEmails.join(', '),
      subject: `📷 Foto - ${itemName}`,
      text,
      html,
      attachments: [{
        filename: `foto_equipamento_${Date.now()}.${ext}`,
        content: matches[2],
        encoding: 'base64',
        contentType,
      }],
      headers: {},
    };

    // In-Reply-To para manter na mesma thread do email original
    if (chadaItem.emailMessageId) {
      mailOptions.headers['In-Reply-To'] = chadaItem.emailMessageId;
      mailOptions.headers['References'] = chadaItem.emailMessageId;
    }

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Foto enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar foto:", error);
    res.status(500).json({ error: "Erro ao enviar foto" });
  }
}