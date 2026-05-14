import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { supabase } from '@/lib/supabaseClient';
import { generateMemorandoTrocaBase64, convertMemorandumDataForTroca } from '@/utils/pdfMemorandoTroca';
import { generateOneWayMemorandumBase64 } from '@/utils/pdfMemorandoOneWay';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtenha o token do cabeçalho
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing.' });
  }

  // Obtenha o usuário logado do Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Erro ao obter usuário do Supabase:', error);
    return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
  }

  // Busca o perfil do usuário na tabela `profile`
  const userProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!userProfile) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  // Extrair e validar dados do request
  const {
    itemIds,
    type,
    // Para entrega
    schoolName,
    district,
    inep,
    // Para troca
    fromSchool,
    toSchool
  } = req.body;

  // Validações básicas
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Item IDs are required.' });
  }

  if (!type || !['entrega', 'troca', 'devolucao'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de memorando deve ser "entrega", "troca" ou "devolucao".' });
  }

  // Validações específicas por tipo
  if (type === 'entrega') {
    if (!schoolName) {
      return res.status(400).json({ error: 'Nome da escola é obrigatório para entrega.' });
    }
    if (!district) {
      return res.status(400).json({ error: 'Distrito é obrigatório para entrega.' });
    }
  } else if (type === 'devolucao') {
    if (!schoolName) {
      return res.status(400).json({ error: 'Nome da escola é obrigatório para devolução.' });
    }
    if (!district) {
      return res.status(400).json({ error: 'Distrito é obrigatório para devolução.' });
    }
  } else if (type === 'troca') {
    if (!fromSchool || !fromSchool.name) {
      return res.status(400).json({ error: 'Escola de origem é obrigatória para troca.' });
    }
    if (!toSchool || !toSchool.name) {
      return res.status(400).json({ error: 'Escola de destino é obrigatória para troca.' });
    }
  }

  // Constante para itens por página
  const ITEMS_PER_PAGE = 13;

  // Calcular quantidade de páginas necessárias
  const totalPages = Math.ceil(itemIds.length / ITEMS_PER_PAGE);

  try {
    let targetSchool: any;
    let sourceSchool: any;
    let cleanFromSchoolName = '';
    let cleanToSchoolName = '';

    if (type === 'entrega') {
      // ENTREGA: Upsert da escola de destino

      targetSchool = await prisma.school.upsert({
        where: { name: schoolName },
        update: {},
        create: {
          name: schoolName,
          district: district || "não informado",
          inep: typeof inep === "number" ? inep : 0,
        },
      });

    } else if (type === 'devolucao') {

      sourceSchool = await prisma.school.upsert({
        where: { name: schoolName },
        update: {},
        create: {
          name: schoolName,
          district: district || "nao informado",
          inep: typeof inep === "number" ? inep : 0,
        },
      });

      targetSchool = await prisma.school.upsert({
        where: { name: "CSDT" },
        update: {},
        create: {
          name: "CSDT",
          district: "SEDE",
          inep: 0,
        },
      });


    } else if (type === 'troca') {
      // TROCA: Lógica SUPER ROBUSTA para upsert

      // Limpar quebras de linha e espaços
      cleanFromSchoolName = fromSchool.name.trim().replace(/\n/g, '');
      cleanToSchoolName = toSchool.name.trim().replace(/\n/g, '');


      // Função helper MELHORADA para upsert seguro
      const safeUpsertSchool = async (schoolData: any) => {

        // PRIMEIRO: Tentar upsert padrão
        try {
          const school = await prisma.school.upsert({
            where: { name: schoolData.name },
            update: {
              district: schoolData.district || "não informado",
              inep: typeof schoolData.inep === "number" ? schoolData.inep : 0,
            },
            create: {
              name: schoolData.name,
              district: schoolData.district || "não informado",
              inep: typeof schoolData.inep === "number" ? schoolData.inep : 0,
            }
          });

          return school;

        } catch (error) {
          console.error(`Upsert failed for "${schoolData.name}":`, error);

          // FALLBACK: Buscar escola existente

          const existingSchool = await prisma.school.findFirst({
            where: {
              name: {
                equals: schoolData.name,
                mode: 'insensitive'
              }
            }
          });

          if (existingSchool) {

            return existingSchool;
          }

          // ÚLTIMO RECURSO: Buscar por substring
          const partialMatch = await prisma.school.findFirst({
            where: {
              name: {
                contains: schoolData.name.substring(0, 20),
                mode: 'insensitive'
              }
            }
          });

          if (partialMatch) {

            return partialMatch;
          }

          // Se chegou aqui, há um problema sério
          throw new Error(`Não foi possível processar a escola: ${schoolData.name}`);
        }
      };

      // Processar escola de origem
      sourceSchool = await safeUpsertSchool({
        name: cleanFromSchoolName,
        district: fromSchool.district,
        inep: fromSchool.inep
      });

      // Processar escola de destino
      targetSchool = await safeUpsertSchool({
        name: cleanToSchoolName,
        district: toSchool.district,
        inep: toSchool.inep
      });


    }

    // GERAR NÚMERO AUTOMÁTICO DO MEMORANDO

    const currentYear = new Date().getFullYear();
    
    // Buscar o último memorando do ano atual para determinar o próximo número
    const lastMemorandumThisYear = await prisma.newMemorandum.findFirst({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`)
        }
      },
      orderBy: {
        id: 'desc'
      }
    });
    
    let sequentialNumber = 1;
    if (lastMemorandumThisYear) {
      // Extrair o número sequencial do último memorando (formato: numero/ano)
      const lastNumber = lastMemorandumThisYear.number.split('/')[0];
      sequentialNumber = parseInt(lastNumber) + 1;
    }
    
    const automaticMemorandumNumber = `${sequentialNumber}/${currentYear}`;

    // CRIAR MEMORANDO COM NOVOS CAMPOS

    const memorandumData: any = {
      generatedBy: userProfile.displayName,
      number: automaticMemorandumNumber,
      type: type, // AGORA PODE INCLUIR
      pageCount: totalPages,  // NOVO: quantidade de páginas
      updatedAt: new Date(),
      items: {
        create: itemIds.map((id: number) => ({
          Item: { connect: { id } },
        })),
      },
    };

    // Adicionar dados específicos por tipo
    if (type === 'entrega') {
      memorandumData.schoolName = schoolName;
      memorandumData.district = district;
      memorandumData.fromSchoolName = null;
      memorandumData.toSchoolName = schoolName;
    } else if (type === 'devolucao') {
      memorandumData.schoolName = schoolName;
      memorandumData.district = district;
      memorandumData.fromSchoolName = schoolName;
      memorandumData.toSchoolName = 'CSDT';
    } else if (type === 'troca') {
      memorandumData.schoolName = `${cleanFromSchoolName} → ${cleanToSchoolName}`;
      memorandumData.district = `${fromSchool.district} → ${toSchool.district}`;
      memorandumData.fromSchoolName = cleanFromSchoolName;
      memorandumData.toSchoolName = cleanToSchoolName;
    }

    const memorandum = await prisma.newMemorandum.create({
      data: memorandumData,
      include: {
        items: {
          include: {
            Item: true,
          },
        },
      },
    });

    // ATUALIZAR LOCALIZAÇÃO DOS ITENS

    if (type === 'entrega') {
      // Para entrega: todos os itens vão para a escola de destino
      await prisma.item.updateMany({
        where: {
          id: { in: itemIds },
        },
        data: {
          schoolId: targetSchool.id,
          updatedAt: new Date(),
        },
      });

    } else if (type === 'devolucao') {
      await prisma.item.updateMany({
        where: {
          id: { in: itemIds },
        },
        data: {
          schoolId: targetSchool.id,
          updatedAt: new Date(),
        },
      });

    } else if (type === 'troca') {
      // Para troca: atualizar baseado nos arrays do frontend
      const { selectedFromCSDT, selectedFromDestino } = req.body;
      
      // Validação adicional no backend
      if (selectedFromCSDT && selectedFromCSDT.length > 10) {
        return res.status(400).json({ 
          error: `Muitos itens do CSDT selecionados. Máximo: 10, selecionados: ${selectedFromCSDT.length}` 
        });
      }
      
      if (selectedFromDestino && selectedFromDestino.length > 10) {
        return res.status(400).json({ 
          error: `Muitos itens da escola selecionados. Máximo: 10, selecionados: ${selectedFromDestino.length}` 
        });
      }



      // Itens que saem do CSDT vão para a escola
      if (selectedFromCSDT && selectedFromCSDT.length > 0) {
        await prisma.item.updateMany({
          where: {
            id: { in: selectedFromCSDT },
          },
          data: {
            schoolId: targetSchool.id, // Vão para escola destino
            updatedAt: new Date(),
          },
        });

      }
      
      // Itens que voltam da escola vão para o CSDT
      if (selectedFromDestino && selectedFromDestino.length > 0) {
        const csdtSchool = await prisma.school.upsert({
          where: { name: "CSDT" },
          update: {},
          create: {
            name: "CSDT",
            district: "SEDE",
            inep: 0,
          },
        });
        
        await prisma.item.updateMany({
          where: {
            id: { in: selectedFromDestino },
          },
          data: {
            schoolId: csdtSchool.id, // Voltam para CSDT
            updatedAt: new Date(),
          },
        });

      }
    }

    // ADICIONAR HISTÓRICO

    if (type === 'entrega') {
      // Para entrega: todos os itens saem do CSDT para a escola
      await Promise.all(
        itemIds.map(async (itemId: number) => {
          await prisma.itemHistory.create({
            data: {
              itemId,
              movedAt: new Date(),
              generatedBy: userProfile.displayName,
              fromSchool: "CSDT",
              toSchool: schoolName,
            },
          });
        })
      );

    } else if (type === 'devolucao') {
      await Promise.all(
        itemIds.map(async (itemId: number) => {
          await prisma.itemHistory.create({
            data: {
              itemId,
              movedAt: new Date(),
              generatedBy: userProfile.displayName,
              fromSchool: schoolName,
              toSchool: 'CSDT',
            },
          });
        })
      );

    } else if (type === 'troca') {
      // Para troca: registrar movimentos específicos baseado nos arrays
      const { selectedFromCSDT, selectedFromDestino } = req.body;
      
      // Histórico para itens que saem do CSDT
      if (selectedFromCSDT && selectedFromCSDT.length > 0) {




        await Promise.all(
          selectedFromCSDT.map(async (itemId: number) => {

            const historyRecord = await prisma.itemHistory.create({
              data: {
                itemId,
                movedAt: new Date(),
                generatedBy: userProfile.displayName,
                fromSchool: "CSDT",
                toSchool: targetSchool.name,
              },
            });

          })
        );

      }
      
      // Histórico para itens que voltam para o CSDT
      if (selectedFromDestino && selectedFromDestino.length > 0) {
        await Promise.all(
          selectedFromDestino.map(async (itemId: number) => {
            await prisma.itemHistory.create({
              data: {
                itemId,
                movedAt: new Date(),
                generatedBy: userProfile.displayName,
                fromSchool: targetSchool.name,
                toSchool: "CSDT",
              },
            });
          })
        );

      }
    }

    // GERAR PDF

    let pdfBase64: string;

    if (type === 'troca') {
      const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, req.body);
      pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
    } else {
      const oneWayItems = memorandum.items.map((memorandumItem) => ({
        name: memorandumItem.Item.name,
        brand: memorandumItem.Item.brand,
        serialNumber: memorandumItem.Item.serialNumber,
      }));

      pdfBase64 = await generateOneWayMemorandumBase64({
        memorandumNumber: memorandum.number,
        schoolName,
        recipientName: type === 'devolucao' ? 'Coordenadoria de Suporte e Desenvolvimento Tecnológico. CSDT/SME' : schoolName,
        senderName: type === 'devolucao' ? buildReturnSenderLine(schoolName) : schoolName,
        district: type === 'devolucao' ? 'SEDE' : (district || 'nao informado'),
        originDistrict: type === 'devolucao' ? (district || 'nao informado') : undefined,
        generatedBy: userProfile.displayName || '',
        operationLabel: type === 'devolucao' ? 'DEVOLUCAO DE EQUIPAMENTOS' : 'ENTREGA DE EQUIPAMENTOS',
        operationType: type === 'devolucao' ? 'devolucao' : 'entrega',
        date: new Date(),
        items: oneWayItems,
      });
    }

    res.status(200).json({
      pdfBase64,
      type,
      memorandumNumber: memorandum.number,
      fromSchool: type === 'troca' ? cleanFromSchoolName : type === 'devolucao' ? schoolName : null,
      toSchool: type === 'troca' ? cleanToSchoolName : type === 'devolucao' ? 'CSDT' : schoolName
    });

  } catch (error) {
    console.error("=== ERROR GENERATING MEMORANDUM ===");
    console.error("Error details:", error);
    console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

function buildReturnSenderLine(schoolName: string) {
  const upperName = schoolName.toUpperCase();
  if (upperName.includes('ANEXO')) {
    return schoolName;
  }
  if (upperName.includes('CRECHE')) {
    return `ANEXO (Creche): ${schoolName}`;
  }

  return `ANEXO: ${schoolName}`;
}
