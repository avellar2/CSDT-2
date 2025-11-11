import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import archiver from 'archiver';

const prisma = new PrismaClient();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar se o usuário é Vanderson através do email da sessão
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar se é o Vanderson pelo ID do Supabase
    if (user.id !== 'c7b74239-4188-4218-8390-063e0ad58871') {
      return res.status(403).json({ error: 'Acesso negado. Apenas Vanderson pode fazer backup.' });
    }

    const backupDate = new Date().toISOString().split('T')[0];

    // Função para converter objetos para CSV
    const objectsToCSV = (objects: any[], filename: string) => {
      if (!objects || objects.length === 0) {
        return `${filename}\nNenhum dado encontrado\n`;
      }

      const headers = Object.keys(objects[0]);
      const csvRows = [headers.join(',')];

      for (const obj of objects) {
        const values = headers.map(header => {
          const value = obj[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          return String(value).replace(/"/g, '""');
        });
        csvRows.push(`"${values.join('","')}"`);
      }

      return csvRows.join('\n');
    };

    // Configurar response como ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="backup_csdt2_${backupDate}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Erro no arquivo ZIP:', err);
      throw err;
    });

    archive.pipe(res);

    // Fazer backup de TODAS as tabelas do schema
    const tables = [
      { name: 'BaseTechnician', model: prisma.baseTechnician },
      { name: 'InternalOS', model: prisma.internalOS },
      { name: 'Item', model: prisma.item, include: { School: { select: { name: true } } } },
      { name: 'ItemsChada', model: prisma.itemsChada },
      { name: 'ItemHistory', model: prisma.itemHistory, include: { Item: { select: { name: true } } } },
      { name: 'ItemsHistoryChada', model: prisma.itemsHistoryChada },
      { name: 'Memorandum', model: prisma.memorandum },
      { name: 'MemorandumItem', model: prisma.memorandumItem },
      { name: 'OffTechnician', model: prisma.offTechnician },
      { name: 'Os', model: prisma.os },
      { name: 'OsAssinada', model: prisma.osAssinada },
      { name: 'Printer', model: prisma.printer },
      { name: 'Profile', model: prisma.profile, include: { School: { select: { name: true } } } },
      { name: 'School', model: prisma.school, include: { School: { select: { name: true } }, other_School: { select: { name: true } } } },
      { name: 'SchoolDemand', model: prisma.schoolDemand, include: { School: { select: { name: true } } } },
      { name: 'ServiceOrder', model: prisma.serviceOrder },
      { name: 'User', model: prisma.user },
      { name: 'VisitTechnician', model: prisma.visitTechnician },
      { name: 'Locados', model: prisma.locados },
      { name: 'OSExterna', model: prisma.oSExterna },
      { name: 'NewMemorandum', model: prisma.newMemorandum },
      { name: 'NewMemorandumItem', model: prisma.newMemorandumItem },
      { name: 'Calendar', model: prisma.calendar },
      { name: 'ScheduleEvent', model: prisma.scheduleEvent },
      { name: 'EventReminder', model: prisma.eventReminder },
      { name: 'EventParticipant', model: prisma.eventParticipant },
      { name: 'TechnicalTicket', model: prisma.technicalTicket, include: { School: { select: { name: true } } } },
      { name: 'TicketComment', model: prisma.ticketComment },
      { name: 'InternalTicket', model: prisma.internal_tickets, include: { School: { select: { name: true } } } },
      { name: 'InternalChatMessage', model: prisma.internal_chat_messages },
      { name: 'ChadaDiagnostic', model: prisma.chadaDiagnostic, include: { Item: { select: { name: true, brand: true } }, Sector: { select: { name: true } } } }
    ];

    for (const table of tables) {
      try {
        let data;
        if (table.include) {
          // Usar any para contornar limitações de tipo do TypeScript
          data = await (table.model as any).findMany({ include: table.include });
          
          // Achatar dados relacionais para CSV
          data = data.map((item: any) => {
            const flatItem = { ...item };
            
            // Achatar objetos relacionais
            Object.keys(item).forEach(key => {
              if (typeof item[key] === 'object' && item[key] && !Array.isArray(item[key]) && key !== 'createdAt' && key !== 'updatedAt' && key !== 'completedAt') {
                const related = item[key];
                Object.keys(related).forEach(relKey => {
                  flatItem[`${key}_${relKey}`] = related[relKey];
                });
                delete flatItem[key];
              }
              
              // Converter arrays para string
              if (Array.isArray(item[key])) {
                if (typeof item[key][0] === 'object') {
                  flatItem[key] = item[key].map((obj: any) => obj.name || JSON.stringify(obj)).join('; ');
                } else {
                  flatItem[key] = item[key].join('; ');
                }
              }
            });
            
            return flatItem;
          });
        } else {
          data = await (table.model as any).findMany();
          
          // Converter arrays para strings
          data = data.map((item: any) => {
            const flatItem = { ...item };
            Object.keys(item).forEach(key => {
              if (Array.isArray(item[key])) {
                flatItem[key] = item[key].join('; ');
              }
            });
            return flatItem;
          });
        }
        
        const csv = objectsToCSV(data, table.name);
        archive.append(csv, { name: `${table.name.toLowerCase()}.csv` });
        
      } catch (error) {
        console.error(`Erro ao exportar tabela ${table.name}:`, error);
        archive.append(`Erro ao exportar tabela ${table.name}: ${error}`, { name: `${table.name.toLowerCase()}_error.txt` });
      }
    }

    // Backup do storage (fotos) - baixar arquivos reais
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('photos')
        .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

      if (listError) {
        archive.append(`Erro ao listar arquivos: ${listError.message}`, { name: 'storage_error.txt' });
      } else {
        const photos = files?.map(file => ({
          name: file.name,
          size: file.metadata?.size || 0,
          lastModified: file.updated_at,
          publicUrl: supabase.storage.from('photos').getPublicUrl(file.name).data.publicUrl
        })) || [];
        
        // Criar CSV com informações dos arquivos
        const photosCSV = objectsToCSV(photos, 'storage_photos');
        archive.append(photosCSV, { name: 'storage_photos_list.csv' });

        // Criar pasta para as imagens no ZIP
        const imagesFolder = 'storage_images/';
        
        // Baixar cada arquivo real
        let downloadedCount = 0;
        let errorCount = 0;
        
        for (const file of files || []) {
          try {
            // Limite de 100 arquivos para evitar timeout
            if (downloadedCount >= 100) {
              archive.append(`Limite de 100 arquivos atingido. Total disponível: ${files?.length || 0}`, { name: 'storage_download_limit.txt' });
              break;
            }

            const { data: fileData, error: downloadError } = await supabase.storage
              .from('photos')
              .download(file.name);

            if (downloadError) {
              console.warn(`Erro ao baixar ${file.name}:`, downloadError);
              errorCount++;
              continue;
            }

            if (fileData) {
              const buffer = await fileData.arrayBuffer();
              archive.append(Buffer.from(buffer), { name: `${imagesFolder}${file.name}` });
              downloadedCount++;
            }
          } catch (error) {
            console.warn(`Erro ao processar arquivo ${file.name}:`, error);
            errorCount++;
          }
        }

        // Relatório do download
        const downloadReport = `Backup do Storage - Relatório
Total de arquivos listados: ${files?.length || 0}
Arquivos baixados com sucesso: ${downloadedCount}
Arquivos com erro: ${errorCount}
Data do backup: ${new Date().toLocaleString('pt-BR')}

Observação: Por questões de performance, limitamos o backup a 100 arquivos.
Se precisar de mais arquivos, execute o backup novamente ou entre em contato.
`;
        
        archive.append(downloadReport, { name: 'storage_download_report.txt' });
      }
    } catch (error) {
      archive.append(`Erro geral no storage: ${error}`, { name: 'storage_error.txt' });
    }

    // Criar arquivo de estatísticas
    const stats = `BACKUP COMPLETO CSDT2 - ${new Date().toLocaleDateString('pt-BR')}
Criado em: ${new Date().toLocaleString('pt-BR')}
Criado por: ${user.email}
Usuário ID: ${user.id}

CONTEÚDO DO BACKUP:
====================

📊 TABELAS EXPORTADAS (CSV):
- BaseTechnician, InternalOS, Item, ItemsChada
- ItemHistory, ItemsHistoryChada, Memorandum, MemorandumItem
- OffTechnician, Os, OsAssinada, Printer, Profile
- School, SchoolDemand, ServiceOrder, User, VisitTechnician
- Locados, OSExterna, NewMemorandum, NewMemorandumItem
- Calendar, ScheduleEvent, EventReminder, EventParticipant
- TechnicalTicket, TicketComment, InternalTicket, InternalChatMessage
- ChadaDiagnostic

📸 STORAGE (IMAGENS):
- Pasta: storage_images/
- Lista completa: storage_photos_list.csv
- Relatório: storage_download_report.txt
- Limite: 100 arquivos (para performance)

🛠️ FORMATO:
- Todos os dados em formato CSV para fácil importação
- Relacionamentos "achatados" com prefixos (ex: School_name)
- Arrays convertidos para strings separadas por "; "
- Imagens reais baixadas do Supabase Storage

Data do backup: ${backupDate}
Versão do sistema: CSDT2 v1.0
`;
    
    archive.append(stats, { name: 'backup_info.txt' });

    // Finalizar o arquivo ZIP
    archive.finalize();

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao criar backup' });
  } finally {
    await prisma.$disconnect();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
    externalResolver: true,
  },
  maxDuration: 300, // 5 minutos
}