import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import prisma from '@/utils/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';

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
    memorandumNumber,
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

  if (!memorandumNumber) {
    return res.status(400).json({ error: 'Número do memorando é obrigatório.' });
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

    // CRIAR MEMORANDO COM NOVOS CAMPOS
    console.log("Creating memorandum...");
    const memorandumData: any = {
      generatedBy: userProfile.displayName,
      number: memorandumNumber,
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

    const memorandum = await prisma.memorandum.create({
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
    await prisma.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        schoolId: targetSchool.id, // Sempre vai para a escola de destino
        updatedAt: new Date(),
      },
    });
    console.log("Items updated.");

    // ADICIONAR HISTÓRICO
    console.log("Adding item history...");
    await Promise.all(
      itemIds.map(async (itemId: number) => {
        const historyData: any = {
          itemId,
          movedAt: new Date(),
          generatedBy: userProfile.displayName,
        };

        if (type === 'entrega') {
          historyData.fromSchool = "CSDT";
          historyData.toSchool = schoolName;
        } else if (type === 'troca') {
          historyData.fromSchool = cleanFromSchoolName;
          historyData.toSchool = cleanToSchoolName;
        }

        await prisma.itemHistory.create({
          data: historyData,
        });
      })
    );
    console.log("Item history updated.");

    // GERAR PDF
    console.log("Generating PDF...");

    // Escolher o template correto
    const pdfFileName = type === 'entrega' ? 'memorando.pdf' : 'memorando-troca.pdf';
    const pdfPath = path.join(process.cwd(), "public", pdfFileName);

    // Se não existir template específico para troca, usar o padrão
    const finalPdfPath = fs.existsSync(pdfPath) ? pdfPath : path.join(process.cwd(), "public", "memorando.pdf");

    const pdfBytes = fs.readFileSync(finalPdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();

    // Preencher campos básicos
    form.getTextField("numeroMemorando").setText(`${memorandum.number}`);

    // Formatar a data no formato "26 de novembro de 2025"
    const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    form.getTextField("dataMemorando").setText(formattedDate);

    // Preencher campos específicos por tipo
    if (type === 'entrega') {
      form.getTextField("escola").setText(schoolName);
      form.getTextField("distrito").setText(district || "não informado");

      // Campos opcionais
      try {
        form.getTextField("tipoOperacao")?.setText("ENTREGA DE EQUIPAMENTOS");
      } catch (e) {
        console.log("Campo tipoOperacao não encontrado no PDF");
      }

    } else if (type === 'troca') {
      // Para troca, usar campos diferentes
      form.getTextField("escola").setText(`DE: ${cleanFromSchoolName} | PARA: ${cleanToSchoolName}`);
      form.getTextField("distrito").setText(`${fromSchool.district} → ${toSchool.district}`);

      // Campos específicos para troca (se existirem no PDF)
      try {
        form.getTextField("tipoOperacao")?.setText("TROCA DE EQUIPAMENTOS");
        form.getTextField("escolaOrigem")?.setText(cleanFromSchoolName);
        form.getTextField("escolaDestino")?.setText(cleanToSchoolName);
        form.getTextField("distritoOrigem")?.setText(fromSchool.district);
        form.getTextField("distritoDestino")?.setText(toSchool.district);
        form.getTextField("inepOrigem")?.setText(fromSchool.inep?.toString() || "");
        form.getTextField("inepDestino")?.setText(toSchool.inep?.toString() || "");
      } catch (e) {
        console.log("Campos específicos de troca não encontrados no PDF");
      }
    }

    // Preencher itens (igual para ambos os tipos)
    memorandum.items.forEach((item, index) => {
      if (index >= 13) return; // Limite de 13 itens
      const itemWithBrand = `${item.Item.brand}`;
      form.getTextField(`item${index + 1}`).setText(itemWithBrand);
      form.getTextField(`serial${index + 1}`).setText(item.Item.serialNumber);
    });

    form.flatten();
    const pdfBytesModified = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytesModified).toString("base64");

    console.log(`PDF de ${type} gerado com sucesso.`);
    res.status(200).json({
      pdfBase64,
      type,
      memorandumNumber: memorandum.number,
      fromSchool: type === 'troca' ? cleanFromSchoolName : null,
      toSchool: type === 'troca' ? cleanToSchoolName : schoolName
    });

  } catch (error) {
    console.error("Error generating memorandum:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}