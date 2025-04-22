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

  // Validação dos dados recebidos
  const { itemIds, schoolName, district, inep } = req.body;

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Item IDs are required.' });
  }

  if (!schoolName) {
    return res.status(400).json({ error: 'School name is required.' });
  }

  if (!district) {
    return res.status(400).json({ error: 'District is required.' });
  }

  try {
    console.log("Upserting school...");
    const school = await prisma.school.upsert({
      where: { name: schoolName },
      update: {},
      create: {
        name: schoolName,
        district: district || "não informado",
        inep: typeof inep === "number" ? inep : 0,
      },
    });
    console.log("School upserted:", school);

    console.log("Creating memorandum...");
    const memorandum = await prisma.memorandum.create({
      data: {
        schoolName,
        district,
        generatedBy: userProfile.displayName, // Nome do usuário logado
        items: {
          create: itemIds.map((id: number) => ({
            Item: { connect: { id } },
          })),
        },
      },
      include: {
        items: {
          include: {
            Item: true,
          },
        },
      },
    });
    console.log("Memorandum created:", memorandum);

    console.log("Updating items...");
    await prisma.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        schoolId: school.id,
        updatedAt: new Date(),
      },
    });
    console.log("Items updated.");

    // Adicione o histórico
    await Promise.all(
      itemIds.map(async (itemId: number) => {
        await prisma.itemHistory.create({
          data: {
            itemId,
            fromSchool: schoolName,
            toSchool: "Destino não informado",
            movedAt: new Date(),
            generatedBy: userProfile.displayName, // Nome do usuário que gerou o memorando
          },
        });
      })
    );
    console.log("Item history updated.");

    // Gerar o PDF
    console.log("Generating PDF...");
    const pdfPath = path.join(process.cwd(), "public", "memorando.pdf");
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();
    form.getTextField("numeroMemorando").setText(`${memorandum.id}`);

    // Formatar a data no formato "26 de novembro de 2025"
    const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    form.getTextField("dataMemorando").setText(formattedDate);
    form.getTextField("escola").setText(schoolName);
    form.getTextField("distrito").setText(district || "não informado");

    memorandum.items.forEach((item, index) => {
      if (index >= 13) return;
      const itemWithBrand = `${item.Item.name} ${item.Item.brand}`;
      form.getTextField(`item${index + 1}`).setText(itemWithBrand);
      form.getTextField(`serial${index + 1}`).setText(item.Item.serialNumber);
    });

    form.flatten();
    const pdfBytesModified = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytesModified).toString("base64");

    console.log("PDF generated successfully.");
    res.status(200).json({ pdfBase64 });
  } catch (error) {
    console.error("Error generating memorandum:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}