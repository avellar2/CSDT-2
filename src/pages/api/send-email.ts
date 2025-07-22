import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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