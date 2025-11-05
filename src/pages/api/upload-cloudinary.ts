import type { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Desabilitar o body parser padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Parse do form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    const folder = fields.folder?.[0];
    const fileName = fields.fileName?.[0];

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!folder) {
      return res.status(400).json({ error: 'Pasta não especificada' });
    }

    // Fazer upload para o Cloudinary
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: folder,
      public_id: fileName ? fileName.replace(/\.[^/.]+$/, '') : undefined, // Remove extensão do nome
      resource_type: 'auto',
    });

    // Deletar arquivo temporário
    fs.unlinkSync(file.filepath);

    // Retornar URL pública
    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error: any) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    return res.status(500).json({
      error: 'Erro ao fazer upload',
      message: error.message,
    });
  }
}
