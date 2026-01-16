import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { getPrintersBySchoolName } from "@/data/printers-inventory";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

/**
 * API para monitorar inbox e capturar números de OS de Manutenção Preventiva
 * Padrão do email: "AK8A034395B0 Ordem de serviço - 327815"
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Configuração do IMAP
    const config = {
      imap: {
        user: process.env.CSDT_EMAIL_USER!,
        password: process.env.CSDT_EMAIL_PASS!,
        host: process.env.CSDT_EMAIL_IMAP_HOST || 'imap.gmail.com',
        port: parseInt(process.env.CSDT_EMAIL_IMAP_PORT || '993'),
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };

    console.log('📧 Conectando ao servidor IMAP para capturar OS...');
    const connection = await imaps.connect(config);

    // Abrir inbox
    await connection.openBox('INBOX');

    // Buscar emails não lidos do SAC XSCAN (últimos 30 dias)
    const searchCriteria = [
      'UNSEEN', // Apenas não lidos
      ['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] // Últimos 30 dias
    ];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // Não marcar como lido ainda
    };

    console.log('🔍 Buscando emails da XSCAN...');
    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`✉️  ${messages.length} emails encontrados`);

    let processed = 0;
    let captured = 0;
    const results: any[] = [];

    for (const message of messages) {
      try {
        // Parsear email
        const all = message.parts.find((part: any) => part.which === '');
        if (!all) {
          console.error('❌ Parte do email não encontrada');
          continue;
        }
        const emailBuffer = Buffer.from(all.body);
        const parsed = await simpleParser(emailBuffer);

        const from = parsed.from?.text || '';
        const subject = parsed.subject || '';
        const text = parsed.text || '';
        const html = parsed.html || '';

        // Verificar se é do SAC XSCAN
        const isXScanEmail = from.toLowerCase().includes('xscan.com.br') ||
                             from.toLowerCase().includes('sac@xscan') ||
                             from.toLowerCase().includes('vandersonavellar1997@gmail.com'); // Email de teste

        if (!isXScanEmail) {
          console.log(`⏭️  Email de ${from} não é da XSCAN, pulando...`);
          continue;
        }

        processed++;

        // Extrair dados do email usando o padrão:
        // "AK8A034395B0 Ordem de serviço - 327815"
        const searchContent = subject + ' ' + text + ' ' + html;

        // Padrão: SERIAL + "Ordem de serviço" + NÚMERO
        const osPattern = /([A-Z0-9]{8,})\s+Ordem\s+de\s+servi[çc]o\s+[-:–—]\s+(\d+)/gi;
        const matches = [...searchContent.matchAll(osPattern)];

        if (matches.length === 0) {
          console.log(`⚠️  Nenhuma OS encontrada no email: ${subject}`);
          results.push({
            from,
            subject,
            status: 'no_os_found',
          });
          continue;
        }

        // Processar cada OS encontrada
        for (const match of matches) {
          const printerSerial = match[1];
          const osNumber = match[2];

          console.log(`🎯 OS encontrada: ${osNumber} para impressora ${printerSerial}`);

          // Buscar informações da impressora no inventário
          let printerModel = '';
          let schoolName = '';

          // Importar todas as impressoras e buscar pela serial
          const { printersInventory } = await import('@/data/printers-inventory');
          const printerInfo = printersInventory.find(p => p.serial === printerSerial);

          if (printerInfo) {
            printerModel = printerInfo.modelo;
            schoolName = printerInfo.schoolName;
            console.log(`✅ Impressora encontrada: ${printerModel} na escola ${schoolName}`);
          } else {
            console.log(`⚠️  Impressora ${printerSerial} não encontrada no inventário`);
            printerModel = 'Não identificado';
            schoolName = 'Não identificada';
          }

          // Buscar schoolId se encontrou o nome
          let schoolId: number | null = null;
          if (schoolName && schoolName !== 'Não identificada') {
            const school = await prisma.school.findFirst({
              where: {
                name: schoolName
              }
            });
            schoolId = school?.id || null;
          }

          // Verificar se já existe (evitar duplicatas)
          const existing = await prisma.preventiveMaintenanceOS.findFirst({
            where: {
              printerSerial,
              osNumber,
            }
          });

          if (existing) {
            console.log(`ℹ️  OS ${osNumber} já existe no banco para serial ${printerSerial}`);
            results.push({
              from,
              subject,
              printerSerial,
              osNumber,
              status: 'already_exists',
            });
            continue;
          }

          // Criar registro no banco
          await prisma.preventiveMaintenanceOS.create({
            data: {
              schoolId,
              schoolName,
              printerModel,
              printerSerial,
              osNumber,
              emailFrom: from,
              emailSubject: subject,
              emailReceivedAt: parsed.date || new Date(),
            }
          });

          // Marcar email como lido
          await connection.addFlags(message.attributes.uid, ['\\Seen']);

          captured++;
          console.log(`💾 OS ${osNumber} salva com sucesso!`);

          // Enviar notificação por email para CSDT e escola
          try {
            console.log(`📧 Enviando notificação de OS capturada...`);

            // Buscar email da escola
            let schoolEmail = '';
            if (schoolId) {
              const schoolData = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { email: true }
              });
              schoolEmail = schoolData?.email || '';
            }

            // Configurar transporter
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });

            // Montar lista de destinatários em cópia (CC)
            const ccRecipients = [];
            if (schoolEmail) {
              ccRecipients.push(schoolEmail);
            }

            // Preparar o conteúdo do email original do SAC
            const originalEmailContent = html || text || 'Conteúdo não disponível';

            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: 'csdt@smeduquedecaxias.rj.gov.br',
              cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
              subject: `✅ OS Capturada - ${osNumber} - ${schoolName}`,
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
                      max-width: 800px;
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
                    .os-number {
                      background: #f0fdf4;
                      padding: 15px;
                      margin: 15px 0;
                      border-radius: 4px;
                      border: 2px solid #10b981;
                      text-align: center;
                    }
                    .printer-details {
                      background: #f0fdf4;
                      padding: 15px;
                      margin: 15px 0;
                      border-radius: 4px;
                      border: 2px solid #10b981;
                    }
                    .original-email {
                      background: #fff;
                      border: 2px solid #3b82f6;
                      border-radius: 8px;
                      padding: 20px;
                      margin: 20px 0;
                    }
                    .original-email-header {
                      background: #eff6ff;
                      border-left: 4px solid #3b82f6;
                      padding: 15px;
                      margin-bottom: 15px;
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
                    <h1 style="margin: 0;">✅ Ordem de Serviço Capturada</h1>
                    <p style="margin: 10px 0 0 0;">Manutenção Preventiva</p>
                  </div>

                  <div class="content">
                    <p>Prezados,</p>

                    <p>Informamos que o SAC XSCAN respondeu à solicitação de manutenção preventiva com o número de OS.</p>

                    <div class="os-number">
                      <h2 style="margin: 0; color: #059669; font-size: 32px;">OS: ${osNumber}</h2>
                    </div>

                    <div class="info-box">
                      <h3 style="margin-top: 0; color: #10b981;">📍 Unidade Escolar:</h3>
                      <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${schoolName}</p>
                    </div>

                    <div class="printer-details">
                      <h3 style="margin-top: 0; color: #059669;">🖨️ Impressora:</h3>
                      <p style="margin: 5px 0;"><strong>Modelo:</strong> ${printerModel}</p>
                      <p style="margin: 5px 0;"><strong>Número de Série:</strong> ${printerSerial}</p>
                    </div>

                    <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;">

                    <div class="original-email">
                      <div class="original-email-header">
                        <h3 style="margin: 0 0 10px 0; color: #3b82f6;">📧 Resposta Original do SAC XSCAN</h3>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>De:</strong> ${from}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Assunto:</strong> ${subject}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Data:</strong> ${parsed.date ? new Date(parsed.date).toLocaleString('pt-BR') : 'Não disponível'}</p>
                      </div>
                      <div style="padding: 10px; background: #fafafa; border-radius: 4px;">
                        ${originalEmailContent}
                      </div>
                    </div>

                    <p style="margin-top: 20px;">A ordem de serviço foi registrada no sistema e está disponível para acompanhamento.</p>
                  </div>

                  <div class="footer">
                    <p><strong>CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnológico</strong></p>
                    <p>Secretaria Municipal de Educação de Duque de Caxias</p>
                    <p style="margin-top: 10px; font-size: 10px;">Este é um email automático. Por favor, não responda.</p>
                  </div>
                </body>
                </html>
              `,
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Notificação enviada com sucesso para CSDT${schoolEmail ? ' e escola' : ''}!`);
          } catch (emailError) {
            console.error(`⚠️  Erro ao enviar notificação de email:`, emailError);
            // Não falhar a captura se o email falhar
          }

          results.push({
            from,
            subject,
            printerSerial,
            printerModel,
            schoolName,
            osNumber,
            status: 'captured',
          });
        }

      } catch (emailError) {
        console.error('❌ Erro ao processar email:', emailError);
        results.push({
          error: String(emailError),
          status: 'error',
        });
      }
    }

    // Fechar conexão
    connection.end();

    console.log(`🎉 Captura concluída! ${captured} OS capturadas de ${messages.length} emails.`);

    return res.status(200).json({
      success: true,
      totalEmails: messages.length,
      processed,
      captured,
      results,
      message: `${captured} número(s) de OS capturado(s) com sucesso!`,
    });

  } catch (error) {
    console.error('❌ Erro ao verificar emails:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar emails',
      details: String(error),
    });
  } finally {
    await prisma.$disconnect();
  }
}
