import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  outgoingEquipment: Equipment[]; // Equipamentos que saem (vão para escola)
  incomingEquipment: Equipment[]; // Equipamentos que voltam (vão para CSDT)
  date?: Date;
}

export async function fillMemorandoTrocaPDF(data: MemorandoTrocaData): Promise<Uint8Array> {
  const pdfPath = path.join(process.cwd(), "public", "memorando-troca2.pdf");
  
  if (!fs.existsSync(pdfPath)) {
    throw new Error("Template memorando-troca2.pdf não encontrado");
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  try {
    // Carregar fonte em negrito oblíquo (itálico)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    
    // Data do memorando
    const formattedDate = format(data.date || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    // Preencher campos básicos
    const basicFields = {
      'data': formattedDate,
      'numero_memorando': data.memorandumNumber,
      'origem': data.fromSchool,
      'destino': data.toSchool,
      'distrito_origem': data.fromDistrict,
      'distrito_destino': data.toDistrict,
    };

    // Preencher campos básicos
    Object.entries(basicFields).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        
        // Aplicar formatação em negrito
        if (['numero_memorando', 'origem', 'destino'].includes(fieldName)) {
          try {
            field.setFontSize(10);
          } catch (fontError) {
            // Ignorar erro de fonte
          }
        }
      } catch (error) {
        // Ignorar campos não encontrados
      }
    });

    // Preencher campos ANTIGO (itens que voltam da escola para CSDT)
    const incomingItems = formatEquipmentForIndividualFields(data.incomingEquipment);
    
    for (let i = 0; i < 10; i++) {
      const fieldName = `antigo${i + 1}`; // antigo1, antigo2, ..., antigo10
      const itemText = incomingItems[i] || '';
      
      try {
        const field = form.getTextField(fieldName);
        field.setText(itemText);
        
        if (itemText) {
          try {
            field.setFontAndSize(boldFont, 9);
          } catch (fontError) {
            // Ignorar erro de fonte
          }
        }
      } catch (error) {
        console.warn(`Campo ${fieldName} não encontrado no PDF`);
      }
    }

    // Preencher campos NOVO (itens que vão do CSDT para escola)
    const outgoingItems = formatEquipmentForIndividualFields(data.outgoingEquipment);
    
    for (let i = 0; i < 10; i++) {
      const fieldName = `novo${i + 1}`; // novo1, novo2, ..., novo10
      const itemText = outgoingItems[i] || '';
      
      try {
        const field = form.getTextField(fieldName);
        field.setText(itemText);
        
        if (itemText) {
          try {
            field.setFontAndSize(boldFont, 9);
          } catch (fontError) {
            // Ignorar erro de fonte
          }
        }
      } catch (error) {
        console.warn(`Campo ${fieldName} não encontrado no PDF`);
      }
    }

    form.flatten();
    return await pdfDoc.save();

  } catch (error) {
    console.error("Erro ao preencher PDF de troca:", error);
    throw error;
  }
}

export async function generateMemorandoTrocaBase64(data: MemorandoTrocaData): Promise<string> {
  const pdfBytes = await fillMemorandoTrocaPDF(data);
  return Buffer.from(pdfBytes).toString("base64");
}

export function formatEquipmentForIndividualFields(equipment: Equipment[]): string[] {
  if (!equipment || equipment.length === 0) {
    return [];
  }

  return equipment.map((item, index) => {
    const itemName = item.name || item.model || "Equipamento";
    const brand = item.brand || "Marca não informada";
    const serial = item.serialNumber || "S/N não informado";
    
    // Formato individual para cada campo
    return `${itemName} - ${brand}\nNº Série: ${serial}`;
  });
}

// Manter função antiga para compatibilidade
export function formatEquipmentList(equipment: Equipment[]): string {
  if (!equipment || equipment.length === 0) {
    return "Nenhum equipamento especificado";
  }

  return equipment.map((item, index) => {
    const itemName = item.name || item.model || "Equipamento";
    const brand = item.brand || "Marca não informada";
    const serial = item.serialNumber || "S/N não informado";
    
    return `${index + 1}. ${itemName} - ${brand}\nNº Série: ${serial}`;
  }).join('\n\n');
}

// Função para converter dados do memorando do banco para formato do PDF
export function convertMemorandumDataForTroca(memorandum: any, fromSchool: any, toSchool: any, frontendData?: any): MemorandoTrocaData {
  // Separar equipamentos baseado nos arrays do frontend:
  const outgoingEquipment: Equipment[] = [];  // CSDT → Escola (campo "novo")
  const incomingEquipment: Equipment[] = [];  // Escola → CSDT (campo "antigo")

  // Usar os arrays selectedFromCSDT e selectedFromDestino do frontend
  const selectedFromCSDT = frontendData?.selectedFromCSDT || [];
  const selectedFromDestino = frontendData?.selectedFromDestino || [];
  
  memorandum.items.forEach((item: any) => {
    const equipment = {
      name: item.Item.name,
      brand: item.Item.brand,
      serialNumber: item.Item.serialNumber
    };

    const itemId = item.Item.id;
    
    // NOVA LÓGICA USANDO OS ARRAYS DO FRONTEND:
    if (selectedFromCSDT.includes(itemId)) {
      outgoingEquipment.push(equipment);
    } else if (selectedFromDestino.includes(itemId)) {
      incomingEquipment.push(equipment);
    }
  });

  return {
    memorandumNumber: memorandum.number,
    fromSchool: "CSDT", // SEMPRE CSDT como origem
    toSchool: toSchool?.name || "Escola não informada",
    fromDistrict: "SEDE", // CSDT sempre na sede
    toDistrict: toSchool?.district || "não informado",
    outgoingEquipment,
    incomingEquipment,
    date: new Date()
  };
}