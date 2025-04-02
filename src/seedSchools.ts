import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis supabaseUrl e supabaseKey são obrigatórias.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho do arquivo Excel
const filePath = path.resolve(__dirname, 'setores.xlsx');

async function seedSchools() {
  try {
    // Verifica se o arquivo Excel existe
    if (!fs.existsSync(filePath)) {
      console.error('Arquivo setores.xlsx não encontrado na raiz do projeto.');
      return;
    }

    // Lê o arquivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Considera a primeira aba
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<{ name: string }>(sheet);

    console.log('Dados extraídos do Excel:', data);

    // Itera sobre os dados e insere na tabela `school`
    for (const row of data) {
      const name = row.name?.trim();
      if (!name) continue; // Ignora linhas sem nome

      console.log(`Verificando escola: ${name}`);

      // Verifica se o nome já existe na tabela
      const { data: existingSchool, error: fetchError } = await supabase
        .from('school')
        .select('id')
        .eq('name', name)
        .single();

      if (fetchError) {
        console.error(`Erro ao verificar escola "${name}":`, fetchError.message);
        continue;
      }

      if (existingSchool) {
        console.log(`Escola "${name}" já existe. Ignorando...`);
        continue;
      }

      console.log(`Inserindo escola: ${name}`);

      // Insere o novo registro
      const { error: insertError } = await supabase.from('school').insert([
        {
          name,
          email: 'não informado',
          address: 'não informado',
          phone: 'não informado',
        },
      ]);

      if (insertError) {
        console.error(`Erro ao inserir escola "${name}":`, insertError.message);
      } else {
        console.log(`Escola "${name}" inserida com sucesso.`);
      }
    }

    console.log('Seed concluído.');
  } catch (error) {
    console.error('Erro ao executar o seed:', error);
  }
}

seedSchools();