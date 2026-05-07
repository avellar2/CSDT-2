import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemDisplayName } from './itemDisplayName';

interface Equipment {
  brand?: string;
  model?: string;
  name?: string;
  serialNumber: string;
}

interface MemorandoTrocaData {
  memorandumNumber: string;
  fromSchool: string;
  toSchool: string;
  fromDistrict: string;
  toDistrict: string;
  outgoingEquipment: Equipment[];
  incomingEquipment: Equipment[];
  date?: Date;
}

export async function fillMemorandoTrocaPDF(data: MemorandoTrocaData): Promise<Uint8Array> {
  const pdfPath = path.join(process.cwd(), 'public', 'memorando-troca2.pdf');

  if (!fs.existsSync(pdfPath)) {
    throw new Error('Template memorando-troca2.pdf nao encontrado');
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  try {
    await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    const formattedDate = format(data.date || new Date(), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });

    const basicFields = {
      data: formattedDate,
      numero_memorando: data.memorandumNumber,
      origem: data.fromSchool,
      destino: data.toSchool,
      distrito_origem: data.fromDistrict,
      distrito_destino: data.toDistrict,
    };

    Object.entries(basicFields).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');

        if (['numero_memorando', 'origem', 'destino'].includes(fieldName)) {
          field.setFontSize(10);
        }
      } catch {
        // ignore missing fields
      }
    });

    const incomingItems = formatEquipmentForIndividualFields(data.incomingEquipment);
    for (let i = 0; i < 10; i++) {
      const fieldName = `antigo${i + 1}`;
      const itemText = incomingItems[i] || '';

      try {
        const field = form.getTextField(fieldName);
        field.setText(itemText);

        if (itemText) {
          field.setFontSize(9);
        }
      } catch {
        console.warn(`Campo ${fieldName} nao encontrado no PDF`);
      }
    }

    const outgoingItems = formatEquipmentForIndividualFields(data.outgoingEquipment);
    for (let i = 0; i < 10; i++) {
      const fieldName = `novo${i + 1}`;
      const itemText = outgoingItems[i] || '';

      try {
        const field = form.getTextField(fieldName);
        field.setText(itemText);

        if (itemText) {
          field.setFontSize(9);
        }
      } catch {
        console.warn(`Campo ${fieldName} nao encontrado no PDF`);
      }
    }

    form.flatten();
    return await pdfDoc.save();
  } catch (error) {
    console.error('Erro ao preencher PDF de troca:', error);
    throw error;
  }
}

export async function generateMemorandoTrocaBase64(data: MemorandoTrocaData): Promise<string> {
  const pdfBytes = await fillMemorandoTrocaPDF(data);
  return Buffer.from(pdfBytes).toString('base64');
}

export function formatEquipmentForIndividualFields(equipment: Equipment[]): string[] {
  if (!equipment || equipment.length === 0) {
    return [];
  }

  return equipment.map((item) => {
    const brand = item.brand || 'Marca nao informada';
    const serial = item.serialNumber || 'S/N nao informado';
    const itemLabel = buildItemDisplayName(item.name || item.model, brand);

    return `${itemLabel}\nNº Série: ${serial}`;
  });
}

export function formatEquipmentList(equipment: Equipment[]): string {
  if (!equipment || equipment.length === 0) {
    return 'Nenhum equipamento especificado';
  }

  return equipment
    .map((item, index) => {
      const brand = item.brand || 'Marca nao informada';
      const serial = item.serialNumber || 'S/N nao informado';
      const itemLabel = buildItemDisplayName(item.name || item.model, brand);

      return `${index + 1}. ${itemLabel}\nNº Série: ${serial}`;
    })
    .join('\n\n');
}

export function convertMemorandumDataForTroca(
  memorandum: any,
  fromSchool: any,
  toSchool: any,
  frontendData?: any
): MemorandoTrocaData {
  const outgoingEquipment: Equipment[] = [];
  const incomingEquipment: Equipment[] = [];

  const selectedFromCSDT = frontendData?.selectedFromCSDT || [];
  const selectedFromDestino = frontendData?.selectedFromDestino || [];

  memorandum.items.forEach((item: any) => {
    const equipment = {
      name: item.Item.name,
      brand: item.Item.brand,
      serialNumber: item.Item.serialNumber,
    };

    const itemId = item.Item.id;

    if (selectedFromCSDT.includes(itemId)) {
      outgoingEquipment.push(equipment);
    } else if (selectedFromDestino.includes(itemId)) {
      incomingEquipment.push(equipment);
    }
  });

  return {
    memorandumNumber: memorandum.number,
    fromSchool: 'CSDT',
    toSchool: toSchool?.name || 'Escola nao informada',
    fromDistrict: 'SEDE',
    toDistrict: toSchool?.district || 'nao informado',
    outgoingEquipment,
    incomingEquipment,
    date: new Date(),
  };
}
