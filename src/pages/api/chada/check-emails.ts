import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";

const prisma = new PrismaClient();

/**
 * API para monitorar inbox e capturar números de OS da CHADA
 * Pode ser chamada manualmente ou via cron job
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

    console.log('Conectando ao servidor IMAP...');
    const connection = await imaps.connect(config);

    // Abrir inbox
    await connection.openBox('INBOX');

    // Buscar emails não lidos do remetente CHADA (últimos 30 dias)
    const searchCriteria = [
      'UNSEEN', // Apenas não lidos
      ['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] // Últimos 30 dias
    ];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // Não marcar como lido ainda
    };

    console.log('Buscando emails...');
    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`${messages.length} emails encontrados`);

    let processed = 0;
    let updated = 0;
    const results: any[] = [];

    for (const message of messages) {
      try {
        // Parsear email
        const all = message.parts.find((part: any) => part.which === '');
        if (!all) {
          console.error('Parte do email não encontrada');
          continue;
        }
        const emailBuffer = Buffer.from(all.body);
        const parsed = await simpleParser(emailBuffer);

        const from = parsed.from?.text || '';
        const subject = parsed.subject || '';
        const text = parsed.text || '';
        const html = parsed.html || '';

        // Verificar se é da CHADA ou email de teste
        const chadaDomain = process.env.CHADA_EMAIL_DOMAIN || 'xscan.com.br';
        const isChadaEmail = from.toLowerCase().includes('xscan.com.br') ||
                             from.toLowerCase().includes(chadaDomain) ||
                             from.toLowerCase().includes('vandersonavellar1997@gmail.com'); // Email de teste

        if (!isChadaEmail) {
          console.log(`Email de ${from} não é da CHADA, pulando...`);
          continue;
        }

        processed++;

        // Extrair número de OS usando vários padrões
        // Padrão da CHADA: "Ordem de serviço número: 321858"
        const osPatterns = [
          /\bORDEM\s+DE\s+SERVI[CÇ]O\s+N[UÚ]MERO[:\s]*(\d+)/i,  // Padrão CHADA específico
          /\bOS[:\s#-]*(\d+)/i,
          /\bO\.S\.?[:\s#-]*(\d+)/i,
          /\bORDEM\s+DE\s+SERVI[CÇ]O[:\s#-]*(\d+)/i,
          /\bPROTOCOLO[:\s#-]*(\d+)/i,
          /\bN[UÚ]MERO[:\s#-]*(\d+)/i,
          /\b(?:número|numero)\s+(?:da\s+)?OS[:\s#-]*(\d+)/i,
        ];

        let osNumber: string | null = null;
        const searchContent = subject + ' ' + text + ' ' + html;

        for (const pattern of osPatterns) {
          const match = searchContent.match(pattern);
          if (match && match[1]) {
            osNumber = match[1];
            console.log(`Número de OS encontrado: ${osNumber} usando padrão ${pattern}`);
            break;
          }
        }

        if (!osNumber) {
          console.log(`Nenhum número de OS encontrado no email: ${subject}`);
          results.push({
            from,
            subject,
            osNumber: null,
            status: 'no_os_found',
          });
          continue;
        }

        // Tentar encontrar o item correspondente no banco
        // Procura por referências no assunto/corpo (número de série, ID do item, etc.)
        const serialMatches = searchContent.match(/\b[A-Z0-9]{8,}\b/g);

        let itemChadaId: string | null = null;

        // Buscar por referência ao número de série
        if (serialMatches && serialMatches.length > 0) {
          for (const serial of serialMatches) {
            const itemBySerial = await prisma.item.findUnique({
              where: { serialNumber: serial },
            });

            if (itemBySerial) {
              // Encontrar o registro correspondente em ItemsChada
              const chadaItem = await prisma.itemsChada.findFirst({
                where: {
                  itemId: itemBySerial.id,
                  numeroChadaOS: null, // Ainda não tem OS
                },
                orderBy: {
                  createdAt: 'desc',
                },
              });

              if (chadaItem) {
                itemChadaId = chadaItem.id;
                break;
              }
            }
          }
        }

        // Se não encontrou por serial, buscar pelo In-Reply-To (email thread)
        if (!itemChadaId && parsed.inReplyTo) {
          const chadaItem = await prisma.itemsChada.findFirst({
            where: {
              emailMessageId: parsed.inReplyTo,
              numeroChadaOS: null,
            },
          });

          if (chadaItem) {
            itemChadaId = chadaItem.id;
          }
        }

        // Se ainda não encontrou, buscar o mais recente sem OS
        if (!itemChadaId) {
          const recentChadaItem = await prisma.itemsChada.findFirst({
            where: {
              numeroChadaOS: null,
              emailSentAt: { not: null },
            },
            orderBy: {
              emailSentAt: 'desc',
            },
          });

          if (recentChadaItem) {
            itemChadaId = recentChadaItem.id;
          }
        }

        if (itemChadaId) {
          // Atualizar o registro com o número de OS
          await prisma.itemsChada.update({
            where: { id: itemChadaId },
            data: {
              numeroChadaOS: osNumber,
            },
          });

          // Marcar email como lido
          await connection.addFlags(message.attributes.uid, ['\\Seen']);

          updated++;
          console.log(`Item ${itemChadaId} atualizado com OS ${osNumber}`);

          results.push({
            from,
            subject,
            osNumber,
            itemChadaId,
            status: 'updated',
          });
        } else {
          console.log(`Não foi possível associar OS ${osNumber} a nenhum item`);
          results.push({
            from,
            subject,
            osNumber,
            status: 'no_item_found',
          });
        }

      } catch (emailError) {
        console.error('Erro ao processar email:', emailError);
        results.push({
          error: String(emailError),
          status: 'error',
        });
      }
    }

    // Fechar conexão
    connection.end();

    return res.status(200).json({
      success: true,
      totalEmails: messages.length,
      processed,
      updated,
      results,
    });

  } catch (error) {
    console.error('Erro ao verificar emails:', error);
    return res.status(500).json({
      error: 'Erro ao verificar emails',
      details: String(error),
    });
  }
}
