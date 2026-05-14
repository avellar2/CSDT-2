import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { getPrintersBySchoolName } from '@/data/printers-inventory';

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

    // Configurar transporter com pool de conexões para reutilizar autenticação
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true, // Usa pool de conexões (evita múltiplos logins)
      maxConnections: 3, // Máximo de 3 conexões simultâneas
      maxMessages: 100, // Máximo de 100 mensagens por conexão
      rateDelta: 3000, // Intervalo de 3 segundos
      rateLimit: 1, // 1 mensagem a cada 3 segundos
    });

    // Função para aguardar (delay)
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Buscar todas as escolas selecionadas (apenas escolas, não setores)
    const schools = await prisma.school.findMany({
      where: {
        id: {
          in: schoolIds.map((id: string | number) => parseInt(String(id)))
        }
      }
    });

    if (schools.length === 0) {
      return res.status(400).json({ error: 'Nenhuma escola encontrada' });
    }

    // Estatísticas para retorno
    const emailsSent: any[] = [];
    const emailsFailed: any[] = [];
    let totalEmails = 0;
    let emailsProcessed = 0;

    const BATCH_SIZE = 50; // Lote de 50 emails
    const BATCH_PAUSE = 5 * 60 * 1000; // Pausa de 5 minutos (em ms)
    const EMAIL_DELAY = 3000; // 3 segundos entre cada email

    // Para cada escola, buscar impressoras e enviar um email por impressora
    for (const school of schools) {
      // Buscar impressoras desta escola no inventário
      const printers = getPrintersBySchoolName(school.name);

      if (printers.length === 0) {
        emailsFailed.push({
          school: school.name,
          error: 'Nenhuma impressora encontrada no inventário'
        });
        continue;
      }

      // Enviar um email para cada impressora
      for (const printer of printers) {
        totalEmails++;
        emailsProcessed++;

        // Verificar se precisa pausar (a cada 50 emails)
        if (emailsProcessed > 1 && emailsProcessed % BATCH_SIZE === 1) {
          const loteNumber = Math.floor((emailsProcessed - 1) / BATCH_SIZE) + 1;

          await sleep(BATCH_PAUSE);

        }

        try {

          // Montar lista de destinatários em cópia (CC)
          const ccRecipients = [];
          if (school.email) {
            ccRecipients.push(school.email);
          }
          ccRecipients.push('csdt@smeduquedecaxias.rj.gov.br');

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'sac@xscan.com.br',
            cc: ccRecipients.join(', '),
            subject: `Solicitação de Manutenção Preventiva - ${school.name}`,
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
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                  .info-box {
                    background: #fff;
                    border-left: 4px solid #10b981;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                  }
                  .printer-details {
                    background: #f0fdf4;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 4px;
                    border: 2px solid #10b981;
                  }
                  .footer {
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 12px;
                  }
                  .signature {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1 style="margin: 0;">🔧 Solicitação de Manutenção Preventiva</h1>
                  <p style="margin: 10px 0 0 0;">Coordenadoria de Suporte e Desenvolvimento Tecnológico</p>
                </div>

                <div class="content">
                  <p>Prezados,</p>

                  <p>Solicitamos a realização de manutenção preventiva nesta unidade escolar, a fim de garantir a segurança, o bom funcionamento das instalações e o adequado atendimento à comunidade escolar.</p>

                  <div class="info-box">
                    <h3 style="margin-top: 0; color: #10b981;">📍 Unidade Escolar:</h3>
                    <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${school.name}</p>
                  </div>

                  <div class="printer-details">
                    <h3 style="margin-top: 0; color: #059669;">🖨️ Impressora:</h3>
                    <p style="margin: 5px 0;"><strong>Modelo:</strong> ${printer.modelo}</p>
                    <p style="margin: 5px 0;"><strong>Número de Série:</strong> ${printer.serial}</p>
                  </div>

                  <p>Ficamos no aguardo de orientações quanto aos procedimentos e prazos para atendimento da solicitação.</p>

                  <p>Desde já, agradecemos a atenção.</p>

                  <div class="signature">
                    <p style="margin: 5px 0;"><strong>Atenciosamente,</strong></p>
                    <p style="margin: 5px 0;"><strong>William Neves da Rocha</strong></p>
                    <p style="margin: 5px 0; color: #6b7280;">Coordenador do CSDT - SME</p>
                  </div>
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

          emailsSent.push({
            school: school.name,
            printer: {
              modelo: printer.modelo,
              serial: printer.serial
            }
          });

          // Salvar log de sucesso no banco
          await prisma.preventiveMaintenanceEmailLog.create({
            data: {
              schoolId: school.id,
              schoolName: school.name,
              printerModel: printer.modelo,
              printerSerial: printer.serial,
              status: 'success',
            }
          });

          // Aguardar 3 segundos antes do próximo email (exceto no último)
          if (emailsProcessed < totalEmails) {
            await sleep(EMAIL_DELAY);
          }
        } catch (emailError) {
          console.error(`Erro ao enviar email para ${school.name} - ${printer.serial}:`, emailError);
          const errorMessage = emailError instanceof Error ? emailError.message : 'Erro desconhecido';

          emailsFailed.push({
            school: school.name,
            printer: {
              modelo: printer.modelo,
              serial: printer.serial
            },
            error: errorMessage
          });

          // Salvar log de falha no banco
          await prisma.preventiveMaintenanceEmailLog.create({
            data: {
              schoolId: school.id,
              schoolName: school.name,
              printerModel: printer.modelo,
              printerSerial: printer.serial,
              status: 'failed',
              errorMessage: errorMessage,
            }
          });
        }
      }
    }

    // Fechar o transporter
    transporter.close();

    res.status(200).json({
      success: true,
      message: `${emailsSent.length} emails enviados com sucesso de ${totalEmails} impressoras`,
      totalPrinters: totalEmails,
      emailsSent: emailsSent.length,
      emailsFailed: emailsFailed.length,
      batchInfo: {
        batchSize: BATCH_SIZE,
        batchPauseMinutes: 5,
        emailDelaySeconds: 3,
        totalBatches: Math.ceil(totalEmails / BATCH_SIZE),
        estimatedTimeMinutes: Math.ceil((totalEmails * 3) / 60) + (Math.floor(totalEmails / BATCH_SIZE) * 5)
      },
      details: {
        sent: emailsSent,
        failed: emailsFailed
      }
    });
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar solicitação',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}
