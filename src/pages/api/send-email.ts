import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.to,
      cc: req.body.cc || undefined,
      replyTo: req.body.replyTo || undefined,
      subject: req.body.subject,
      text: req.body.text, // Para clientes que não suportam HTML
      html: req.body.html, // Para clientes que suportam HTML (estilizado)
      attachments: req.body.attachments?.map((attachment: any) => ({
        filename: attachment.filename,
        content: attachment.content,
        encoding: attachment.encoding || "base64",
        contentType: attachment.contentType || "application/pdf",
      })) || [],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar o email:', error);
    res.status(500).json({ error: 'Erro ao enviar o email' });
  }
}