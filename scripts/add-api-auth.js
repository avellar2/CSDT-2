/**
 * Script para adicionar requireAuth em todas as APIs desprotegidas.
 * Uso: node scripts/add-api-auth.js
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'pages', 'api');

// APIs públicas (não devem ter auth)
const PUBLIC_APIS = new Set([
  'confirm-os.ts', 'confirmar-os-externa.ts', 'get-os-externa.ts',
  'update-os-externa-token.ts', 'register.ts',
  'send-printer-request.ts', 'submit-printer-info.ts',
  'get-printer-request.ts', 'list-printer-requests.ts',
  'printer-status-from-agent.ts',
  'get-user-displayname.ts', 'get-role.ts',
  'getProfile.ts', 'get-profile.ts', 'middleware.ts',
  'createItem.ts',
]);

// Padrões que indicam que o arquivo já tem auth
const AUTH_PATTERNS = [
  /requireAuth/,
  /supabase\.auth\.getUser/,
  /supabase\.auth\.getSession/,
  /jwt\.verify/,
  /verifyToken/,
  /authenticateUser/,
  /authMiddleware/,
];

function hasAuth(content) {
  return AUTH_PATTERNS.some(p => p.test(content));
}

const IMPORT_LINE = `import { requireAuth } from "@/utils/api-auth";`;

function addAuthToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Pula se já tem auth
  if (hasAuth(content)) {
    console.log(`  SKIP (já tem auth): ${path.relative(API_DIR, filePath)}`);
    return false;
  }

  // Adiciona import depois do último import existente
  const importRegex = /^import .+$/gm;
  const imports = content.match(importRegex);

  if (!imports || imports.length === 0) {
    console.log(`  SKIP (sem imports): ${path.relative(API_DIR, filePath)}`);
    return false;
  }

  const lastImport = imports[imports.length - 1];
  content = content.replace(lastImport, lastImport + '\n' + IMPORT_LINE);

  // Encontra o handler function e adiciona auth check depois do method check
  // Procura pelo padrão: return res.status(405)...
  const methodCheckRegex = /(if\s*\(req\.method\s*(!==?|===?)\s*['"](GET|POST|PUT|PATCH|DELETE|HEAD)['"])[^}]*?return\s+res\.status\(405\)[^;]+;/s;

  const match = content.match(methodCheckRegex);
  if (match) {
    const authBlock = `\n  // Requer autenticação\n  const auth = await requireAuth(req, res);\n  if (!auth) return;\n`;
    content = content.replace(match[0], match[0] + authBlock);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  OK: ${path.relative(API_DIR, filePath)}`);
    return true;
  }

  // Se não achou método check, tenta achar um try/catch no início e coloca antes
  const tryCatchRegex = /^\s*try\s*\{/m;
  const tryMatch = content.match(tryCatchRegex);
  if (tryMatch) {
    const authBlock = `\n  // Requer autenticação\n  const auth = await requireAuth(req, res);\n  if (!auth) return;\n`;
    content = content.replace(tryMatch[0], authBlock + tryMatch[0]);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  OK (antes do try): ${path.relative(API_DIR, filePath)}`);
    return true;
  }

  console.log(`  SKIP (sem método check ou try): ${path.relative(API_DIR, filePath)}`);
  return false;
}

function getAllFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && entry.name !== 'middleware.ts') {
      const relativePath = path.relative(API_DIR, fullPath);
      if (!PUBLIC_APIS.has(relativePath)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

console.log('Adicionando requireAuth às APIs...\n');

const allFiles = getAllFiles(API_DIR);
let ok = 0, skip = 0;

for (const file of allFiles) {
  const result = addAuthToFile(file);
  if (result) ok++;
  else skip++;
}

console.log(`\nConcluído! ${ok} arquivos alterados, ${skip} ignorados.`);
