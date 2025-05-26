import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { id, token, nome, cpf } = req.body;

  if (!id || !token || !nome || !cpf) {
    return res.status(400).json({ message: "Dados obrigatórios não enviados." });
  }

  // Busca a OS e valida o token
  const os = await prisma.internalOS.findUnique({ where: { id: Number(id) } });
  if (!os || os.assinado !== token) {
    return res.status(400).json({ message: "Token inválido ou OS não encontrada." });
  }

  // Atualiza os campos assinado (nome) e cpf
  await prisma.internalOS.update({
    where: { id: Number(id) },
    data: {
      assinado: nome,
      cpf: cpf,
      email: "Confirmado"
    },
  });

  return res.status(200).json({ message: "OS confirmada com sucesso!" });
}