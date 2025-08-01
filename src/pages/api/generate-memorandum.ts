import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import prisma from '@/utils/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { generateMemorandoTrocaBase64, convertMemorandumDataForTroca } from '@/utils/pdfMemorandoTroca';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtenha o token do cabeçalho
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token recebido:', token);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing.' });
  }

  // Obtenha o usuário logado do Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Erro ao obter usuário do Supabase:', error);
    return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
  }

  console.log('Usuário autenticado:', user);

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

  console.log('Dados recebidos:', req.body);

  // Validações básicas
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Item IDs are required.' });
  }

  if (!type || !['entrega', 'troca'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de memorando deve ser "entrega" ou "troca".' });
  }

  // Validações específicas por tipo
  if (type === 'entrega') {
    if (!schoolName) {
      return res.status(400).json({ error: 'Nome da escola é obrigatório para entrega.' });
    }
    if (!district) {
      return res.status(400).json({ error: 'Distrito é obrigatório para entrega.' });
    }
    if (itemIds.length > 13) {
      return res.status(400).json({ 
        error: `Limite de itens excedido. Máximo: 13 itens, recebidos: ${itemIds.length} itens.` 
      });
    }
  } else if (type === 'troca') {
    if (!fromSchool || !fromSchool.name) {
      return res.status(400).json({ error: 'Escola de origem é obrigatória para troca.' });
    }
    if (!toSchool || !toSchool.name) {
      return res.status(400).json({ error: 'Escola de destino é obrigatória para troca.' });
    }
  }

  try {
    let targetSchool: any;
    let sourceSchool: any;
    let cleanFromSchoolName = '';
    let cleanToSchoolName = '';

    if (type === 'entrega') {
      // ENTREGA: Upsert da escola de destino
      console.log("Upserting school for delivery...");
      targetSchool = await prisma.school.upsert({
        where: { name: schoolName },
        update: {},
        create: {
          name: schoolName,
          district: district || "não informado",
          inep: typeof inep === "number" ? inep : 0,
        },
      });
      console.log("School upserted:", targetSchool);

    } else if (type === 'troca') {
      // TROCA: Lógica SUPER ROBUSTA para upsert
      console.log("Processing schools for exchange...");

      // Limpar quebras de linha e espaços
      cleanFromSchoolName = fromSchool.name.trim().replace(/\n/g, '');
      cleanToSchoolName = toSchool.name.trim().replace(/\n/g, '');

      console.log("Clean from school name:", cleanFromSchoolName);
      console.log("Clean to school name:", cleanToSchoolName);

      // Função helper MELHORADA para upsert seguro
      const safeUpsertSchool = async (schoolData: any) => {
        console.log(`Processing school: "${schoolData.name}"`);

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

          console.log(`School processed successfully with ID: ${school.id}`);
          return school;

        } catch (error) {
          console.error(`Upsert failed for "${schoolData.name}":`, error);

          // FALLBACK: Buscar escola existente
          console.log("Trying fallback search...");
          const existingSchool = await prisma.school.findFirst({
            where: {
              name: {
                equals: schoolData.name,
                mode: 'insensitive'
              }
            }
          });

          if (existingSchool) {
            console.log(`Found existing school via fallback: ${existingSchool.id}`);
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
            console.log(`Found partial match: ${partialMatch.name} (ID: ${partialMatch.id})`);
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

      console.log("Final source school:", sourceSchool);
      console.log("Final target school:", targetSchool);
    }

    // GERAR NÚMERO AUTOMÁTICO DO MEMORANDO
    console.log("Generating automatic memorandum number...");
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
    console.log("Generated memorandum number:", automaticMemorandumNumber);

    // CRIAR MEMORANDO COM NOVOS CAMPOS
    console.log("Creating memorandum...");
    const memorandumData: any = {
      generatedBy: userProfile.displayName,
      number: automaticMemorandumNumber,
      type: type, // AGORA PODE INCLUIR
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
    console.log("Memorandum created:", memorandum);

    // ATUALIZAR LOCALIZAÇÃO DOS ITENS
    console.log("Updating items location...");
    
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
      console.log(`Entrega: ${itemIds.length} itens movidos para ${targetSchool.name}`);
      
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
      
      console.log('Atualizando localizações para troca:');
      console.log('selectedFromCSDT:', selectedFromCSDT);
      console.log('selectedFromDestino:', selectedFromDestino);
      
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
        console.log(`Troca: ${selectedFromCSDT.length} itens movidos do CSDT para ${targetSchool.name}`);
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
        console.log(`Troca: ${selectedFromDestino.length} itens movidos de ${targetSchool.name} para CSDT`);
      }
    }
    
    console.log("Items location updated.");

    // ADICIONAR HISTÓRICO
    console.log("Adding item history...");
    
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
      console.log(`Histórico criado para entrega: ${itemIds.length} itens`);
      
    } else if (type === 'troca') {
      // Para troca: registrar movimentos específicos baseado nos arrays
      const { selectedFromCSDT, selectedFromDestino } = req.body;
      
      // Histórico para itens que saem do CSDT
      if (selectedFromCSDT && selectedFromCSDT.length > 0) {
        console.log('=== CRIANDO HISTÓRICO PARA ITENS DO CSDT ===');
        console.log('selectedFromCSDT:', selectedFromCSDT);
        console.log('Target school object:', targetSchool);
        console.log('Target school name:', targetSchool.name);
        
        await Promise.all(
          selectedFromCSDT.map(async (itemId: number) => {
            console.log(`Criando histórico para item ${itemId}: CSDT → ${targetSchool.name}`);
            
            const historyRecord = await prisma.itemHistory.create({
              data: {
                itemId,
                movedAt: new Date(),
                generatedBy: userProfile.displayName,
                fromSchool: "CSDT",
                toSchool: targetSchool.name,
              },
            });
            
            console.log(`✓ Histórico criado para item ${itemId}:`, historyRecord);
          })
        );
        console.log(`Histórico criado: ${selectedFromCSDT.length} itens CSDT → ${targetSchool.name}`);
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
        console.log(`Histórico criado: ${selectedFromDestino.length} itens ${targetSchool.name} → CSDT`);
      }
    }
    
    console.log("Item history updated.");

    // GERAR PDF
    console.log("Generating PDF...");

    let pdfBase64: string;

    if (type === 'troca') {
      // Usar a nova função específica para memorando de troca
      const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, req.body);
      pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
      
    } else {
      // Lógica existente para entrega
      console.log("Using existing PDF filling for entrega...");
      
      const pdfFileName = 'memorando.pdf';
      const pdfPath = path.join(process.cwd(), "public", pdfFileName);
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Preencher campos básicos
      form.getTextField("numeroMemorando").setText(`${memorandum.number}`);

      // Formatar a data no formato "26 de novembro de 2025"
      const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      form.getTextField("dataMemorando").setText(formattedDate);

      // Preencher campos para entrega
      form.getTextField("escola").setText(schoolName);
      form.getTextField("distrito").setText(district || "não informado");

      // Campos opcionais
      try {
        form.getTextField("tipoOperacao")?.setText("ENTREGA DE EQUIPAMENTOS");
      } catch (e) {
        console.log("Campo tipoOperacao não encontrado no PDF");
      }

      // Preencher itens
      memorandum.items.forEach((item, index) => {
        if (index >= 13) return; // Limite de 13 itens
        const itemWithBrand = `${item.Item.brand}`;
        form.getTextField(`item${index + 1}`).setText(itemWithBrand);
        form.getTextField(`serial${index + 1}`).setText(item.Item.serialNumber);
      });

      form.flatten();
      const pdfBytesModified = await pdfDoc.save();
      pdfBase64 = Buffer.from(pdfBytesModified).toString("base64");
    }

    console.log(`PDF de ${type} gerado com sucesso.`);
    res.status(200).json({
      pdfBase64,
      type,
      memorandumNumber: memorandum.number,
      fromSchool: type === 'troca' ? cleanFromSchoolName : null,
      toSchool: type === 'troca' ? cleanToSchoolName : schoolName
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