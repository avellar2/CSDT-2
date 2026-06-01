import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    // Source 1: Printer table (SNMP-monitored printers)
    const snmpPrinters = await prisma.printer.findMany({
      select: {
        id: true,
        sigla: true,
        setor: true,
        modelo: true,
        fabricante: true,
        serial: true,
        ip: true,
      },
    });

    // Source 2: Item table (patrimonio printers)
    const itemPrinters = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: 'impressora', mode: 'insensitive' } },
          { name: { contains: 'printer', mode: 'insensitive' } },
          { name: { contains: 'multifuncional', mode: 'insensitive' } },
        ],
      },
      include: {
        School: {
          select: { name: true },
        },
      },
      orderBy: [{ School: { name: 'asc' } }, { name: 'asc' }],
    });

    // Normalize both sources into a unified format
    // Use negative IDs for Item-sourced printers to avoid ID collision with Printer table
    const unified = [
      // SNMP printers - keep original positive IDs
      ...snmpPrinters.map(p => ({
        id: p.id,
        sigla: p.sigla || '',
        setor: p.setor || '',
        modelo: p.modelo || '',
        fabricante: p.fabricante || '',
        serial: p.serial || '',
        ip: p.ip || '',
        escola: '',
        source: 'monitoramento' as const,
      })),
      // Item printers - use negative IDs to avoid collision
      ...itemPrinters.map(p => ({
        id: -p.id, // negative ID to distinguish from SNMP printers
        sigla: p.name || '',
        setor: p.School?.name || '',
        modelo: p.name || '',
        fabricante: p.brand || '',
        serial: p.serialNumber || '',
        ip: '',
        escola: p.School?.name || '',
        source: 'patrimonio' as const,
      })),
    ];

    // Deduplicate by serial number (prefer SNMP data if same serial exists in both)
    const seenSerials = new Set<string>();
    const deduped = unified.filter(p => {
      if (!p.serial) return true; // keep entries without serial
      if (seenSerials.has(p.serial.toLowerCase())) return false;
      seenSerials.add(p.serial.toLowerCase());
      return true;
    });

    res.status(200).json(deduped);
  } catch (error) {
    console.error('Erro ao buscar impressoras:', error);
    res.status(500).json({ error: 'Erro ao buscar impressoras' });
  }
}