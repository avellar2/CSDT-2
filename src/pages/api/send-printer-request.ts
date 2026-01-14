import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { schoolIds } = req.body;

    if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ error: 'IDs de escolas são obrigatórios' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const results = [];

    for (const schoolId of schoolIds) {
      try {
        // Buscar informações da escola
        const school = await prisma.school.findUnique({
          where: { id: parseInt(schoolId) },
        });

        if (!school || !school.email) {
          results.push({
            schoolId,
            success: false,
            error: 'Escola não encontrada ou sem email cadastrado',
          });
          continue;
        }

        // Gerar token único para esta solicitação
        const token = crypto.randomBytes(32).toString('hex');

        // Criar registro de solicitação no banco
        const printerRequest = await prisma.printerRequest.create({
          data: {
            schoolId: parseInt(schoolId),
            token,
            status: 'Pendente',
          },
        });

        // Criar link para o formulário
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const formLink = `${baseUrl}/preencher-impressoras?id=${printerRequest.id}&token=${token}`;

        // Enviar email
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: school.email,
          subject: 'Solicitação de Informações sobre Impressoras Locadas',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .content {
                  background: #f9fafb;
                  padding: 30px;
                  border: 1px solid #e5e7eb;
                }
                .button {
                  display: inline-block;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white !important;
                  padding: 15px 40px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-align: center;
                }
                .info-box {
                  background: #fff;
                  border-left: 4px solid #667eea;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  padding: 20px;
                  color: #6b7280;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0;">📋 Solicitação de Dados</h1>
                <p style="margin: 10px 0 0 0;">Coordenadoria de Suporte e Desenvolvimento Tecnológico</p>
              </div>

              <div class="content">
                <h2 style="color: #1f2937;">Olá, ${school.name}</h2>

                <p>Prezado(a) Diretor(a),</p>

                <p>Solicitamos que preencha as informações sobre as <strong>impressoras locadas</strong> que estão na sua unidade escolar.</p>

                <div class="info-box">
                  <h3 style="margin-top: 0; color: #667eea;">📝 Informações Necessárias:</h3>
                  <ul>
                    <li><strong>Nome do Responsável</strong></li>
                    <li><strong>CPF ou Matrícula</strong></li>
                    <li><strong>Cargo</strong></li>
                    <li><strong>Marca da(s) Impressora(s)</strong></li>
                    <li><strong>Número de Série</strong></li>
                  </ul>
                </div>

                <p style="margin: 25px 0;">
                  <strong>Importante:</strong> Se sua escola possui mais de uma impressora locada, você poderá adicionar todas elas no formulário.
                </p>

                <div style="text-align: center;">
                  <a href="${formLink}" class="button">
                    Preencher Formulário
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                  <a href="${formLink}" style="color: #667eea; word-break: break-all;">${formLink}</a>
                </p>
              </div>

              <div class="footer">
                <p><strong>CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnológico</strong></p>
                <p>Secretaria Municipal de Educação de Duque de Caxias</p>
              </div>
            </body>
            </html>
          `,
        };

        await transporter.sendMail(mailOptions);

        results.push({
          schoolId,
          schoolName: school.name,
          email: school.email,
          success: true,
          requestId: printerRequest.id,
        });
      } catch (error) {
        console.error(`Erro ao processar escola ${schoolId}:`, error);
        results.push({
          schoolId,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    res.status(200).json({
      message: 'Processamento concluído',
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('Erro ao enviar solicitações:', error);
    res.status(500).json({ error: 'Erro ao enviar solicitações' });
  } finally {
    await prisma.$disconnect();
  }
}
