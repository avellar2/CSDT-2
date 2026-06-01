/**
 * Script v2 para adicionar ProtectedRoute em todas as páginas.
 * Abordagem: wrapper no export default, sem modificar o componente original.
 * Uso: node scripts/add-page-auth-v2.js
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

// Arquivos que NÃO devem ser protegidos
const EXCLUDED = [
  '_app.tsx', '_document.tsx', 'login.tsx', 'register.tsx', 'index.tsx',
  'confirm-os.tsx', 'confirmar-os.tsx', 'confirmar-os-externa.tsx', 'preencher-impressoras.tsx',
  'dashboard.tsx', 'chada.tsx', 'internal-chat.tsx', 'route-optimizer.tsx',
  'daily-demands.tsx', 'printers.tsx', 'controle-impressoras.tsx',
  'technical-tickets/create.tsx', 'technical-tickets/accepted.tsx', 'technical-tickets/deleted.tsx',
];

function getAllPageFiles(dir, baseDir = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = baseDir ? `${baseDir}/${entry.name}` : entry.name;
    if (entry.isDirectory() && entry.name !== 'api') {
      files.push(...getAllPageFiles(path.join(dir, entry.name), relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      const relPath = baseDir ? `${baseDir}/${entry.name}` : entry.name;
      if (!EXCLUDED.includes(relPath)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files;
}

function addProtectedRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Pula se já tem ProtectedRoute
  if (content.includes('ProtectedRoute')) {
    console.log(`  SKIP (já tem ProtectedRoute): ${fileName}`);
    return false;
  }

  // Pula se já tem auth check próprio com redirect
  if (content.includes('supabase.auth.getUser') || content.includes('supabase.auth.getSession')) {
    console.log(`  SKIP (auth própria): ${fileName}`);
    return false;
  }

  const lines = content.split('\n');

  // 1. Encontra o índice do último import
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`  SKIP (sem imports): ${fileName}`);
    return false;
  }

  // 2. Insere import do ProtectedRoute após o último import
  lines.splice(lastImportIndex + 1, 0, `import ProtectedRoute from "@/components/ProtectedRoute";`);

  // 3. Encontra e modifica o export default
  let componentName = null;

  // Padrão 1: export default function ComponentName() {
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^export default function (\w+)\s*\(/);
    if (match) {
      componentName = match[1];
      lines[i] = lines[i].replace('export default function ' + componentName, 'function ' + componentName);
      console.log(`  Padrão 1 (export default function): ${componentName}`);
      break;
    }
  }

  // Padrão 2: export default ComponentName; ou export default ComponentName
  if (!componentName) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^export default (\w+);?\s*$/);
      if (match) {
        componentName = match[1];
        // Remove esta linha
        lines.splice(i, 1);
        console.log(`  Padrão 2 (export default Name): ${componentName}`);
        break;
      }
    }
  }

  // Padrão 3: export default () => { ... } (arrow function anônima) — não suportado
  if (!componentName) {
    // Verifica se é export default com arrow function
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^export default\s*\(\s*\)\s*=>\s*\{/)) {
        console.log(`  SKIP (export default arrow anônimo, precisa refatorar): ${fileName}`);
        return false;
      }
    }
    console.log(`  SKIP (não encontrou export default): ${fileName}`);
    return false;
  }

  // 4. Adiciona wrapper no final do arquivo
  const wrapperName = `Protected${componentName}`;
  lines.push('');
  lines.push(`export default function ${wrapperName}() {`);
  lines.push(`  return <ProtectedRoute><${componentName} /></ProtectedRoute>;`);
  lines.push(`}`);

  content = lines.join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  OK: ${fileName} → ${wrapperName}`);
  return true;
}

const files = getAllPageFiles(PAGES_DIR);
console.log(`Encontrados ${files.length} arquivos para processar.\n`);

let ok = 0, skip = 0;
for (const file of files) {
  const result = addProtectedRoute(file);
  if (result) ok++; else skip++;
}

console.log(`\nConcluído! ${ok} páginas protegidas, ${skip} ignoradas.`);