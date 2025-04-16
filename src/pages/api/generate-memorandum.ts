import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabaseClient';
import prisma from '@/utils/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importa o idioma português

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemIds, schoolName, district, inep } = req.body;
  console.log("Request body:", req.body);

  // Validação dos dados recebidos
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Invalid request: "itemIds" is required and must be a non-empty array.' });
  }

  if (itemIds.length > 13) {
    return res.status(400).json({ error: 'Only 13 items are allowed per memorandum.' });
  }

  if (!schoolName || typeof schoolName !== "string") {
    return res.status(400).json({ error: 'Invalid request: "schoolName" is required and must be a string.' });
  }

  // Use valores padrão para district e inep se não forem fornecidos
  const inepAtt = typeof inep === "number" ? inep : 0; // Valor padrão para inep
  const districtAtt = district || "não informado"; // Valor padrão para district

  try {
    console.log("Upserting school...");
    const school = await prisma.school.upsert({
      where: { name: schoolName },
      update: {},
      create: {
        name: schoolName,
        district: districtAtt,
        inep: inepAtt,
      },
    });
    console.log("School upserted:", school);

    console.log("Creating memorandum...");
    const memorandum = await prisma.memorandum.create({
      data: {
        schoolName,
        district: districtAtt,
        items: {
          create: itemIds.map((id: number) => ({
            item: { connect: { id } },
          })),
        },
      },
      include: {
        items: {
          include: {
            item: true,
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
        schoolId: school.id, // Atualiza o campo schoolId com o ID da escola
        updatedAt: new Date(), // Atualiza explicitamente a data/hora
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
            toSchool: "Destino não informado", // Valor padrão
            movedAt: new Date(),
            generatedBy: req.body.userName || "Desconhecido", // Nome do usuário que gerou o memorando
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

    form.getTextField("dataMemorando").setText(formattedDate); // Data formatada
    form.getTextField("escola").setText(schoolName);
    form.getTextField("distrito").setText(district || "não informado");

    memorandum.items.forEach((item, index) => {
      if (index >= 13) return;
      const itemWithBrand = `${item.item.name} ${item.item.brand}`;
      form.getTextField(`item${index + 1}`).setText(itemWithBrand);
      form.getTextField(`serial${index + 1}`).setText(item.item.serialNumber);
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