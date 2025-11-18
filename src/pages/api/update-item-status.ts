import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  console.log("Dados recebidos no backend:", req.body);

  const { id, status, updatedBy, novoModelo, novoSerial } = req.body;

  if (!id || !status || !updatedBy) {
    console.error("Campos obrigatórios ausentes:", { id, status, updatedBy });
    return res.status(400).json({ error: "Os campos id, status e updatedBy são obrigatórios." });
  }

  try {
    console.log("Atualizando registro com id:", id);

    // Verificar se o registro existe na tabela ItemsChada
    const existingItem = await prisma.itemsChada.findUnique({
      where: { id: String(id) },
    });

    if (!existingItem) {
      console.error("Registro não encontrado para id:", id);
      return res.status(404).json({ error: "Registro não encontrado na tabela ItemsChada." });
    }

    // Atualizar o status e o campo updatedBy na tabela ItemsChada
    const updatedItem = await prisma.itemsChada.update({
      where: { id: String(id) },
      data: { status, updatedBy },
    });

    console.log("Status atualizado com sucesso na tabela ItemsChada:", updatedItem);

    // Localizar o registro correspondente na tabela Item usando o itemId
    const itemToUpdate = await prisma.item.findUnique({
      where: { id: existingItem.itemId }, // Usar itemId da tabela ItemsChada para encontrar o registro na tabela Item
    });

    if (!itemToUpdate) {
      console.error("Registro não encontrado na tabela Item para itemId:", existingItem.itemId);
      return res.status(404).json({ error: "Registro não encontrado na tabela Item." });
    }

    // Determinar o schoolId de retorno baseado em manutenção sem movimentação
    // Se foi manutenção sem movimentação, retorna para a localização original
    // Senão, retorna para o CSDT (schoolId = 225)
    const schoolIdRetorno = existingItem.manutencaoSemMovimentacao && existingItem.schoolIdOriginal
      ? existingItem.schoolIdOriginal
      : 225;

    // Atualizar o campo schoolId na tabela Item
    const updatedItemInItemTable = await prisma.item.update({
      where: { id: itemToUpdate.id },
      data: { schoolId: schoolIdRetorno },
    });

    console.log("schoolId atualizado com sucesso na tabela Item:", updatedItemInItemTable);

    await prisma.item.update({
      where: { id: itemToUpdate.id },
      data: {
        status,
        ...(novoModelo && { brand: novoModelo }),
        ...(novoSerial && { serialNumber: novoSerial }),
      },
    });

    // Registrar retorno da CHADA no histórico
    // Se foi manutenção sem movimentação, adiciona nota explicativa
    const schoolDestino = await prisma.school.findUnique({
      where: { id: schoolIdRetorno },
    });

    const toSchoolName = schoolDestino?.name || (schoolIdRetorno === 225 ? "CSDT" : "Escola");

    await prisma.itemHistory.create({
      data: {
        itemId: itemToUpdate.id,
        fromSchool: existingItem.manutencaoSemMovimentacao
          ? "CHADA (Manutenção sem movimentação física)"
          : "CHADA",
        toSchool: existingItem.manutencaoSemMovimentacao
          ? `${toSchoolName} (Retorno ao local original)`
          : toSchoolName,
        generatedBy: updatedBy,
      },
    });

    return res.status(200).json({
      message: "Status, schoolId, modelo e serial atualizados com sucesso!",
      updatedItem,
      updatedItemInItemTable,
    });
  } catch (error) {
    console.error("Erro ao atualizar o status ou schoolId:", error);
    return res.status(500).json({ error: "Erro ao atualizar o status ou schoolId." });
  }
}