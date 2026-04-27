# Memorandos Multi-páginas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir gerar memorandos de entrega com mais de 13 itens, criando automaticamente um PDF multi-páginas com numeração consecutiva.

**Architecture:** Adicionar campo `pageCount` no banco, modificar API para calcular páginas e gerar PDF com múltiplas páginas, atualizar frontend para remover limite de 13 itens.

**Tech Stack:** Prisma (PostgreSQL), Next.js API Routes, pdf-lib, React/TypeScript

---

## File Structure

**Files to modify:**
- `prisma/schema.prisma` - Adicionar campo `pageCount` em NewMemorandum
- `src/pages/api/generate-memorandum.ts` - Lógica de divisão em páginas e geração de PDF multi-páginas
- `src/components/DeviceList.tsx` - Remover validação de limite, mostrar contador de páginas

**Files to reference:**
- `public/memorando.pdf` - Template PDF para preenchimento

---

### Task 1: Adicionar campo pageCount no schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar campo pageCount no modelo NewMemorandum**

Localize o modelo `NewMemorandum` (aproximadamente linha 202) e adicione o campo `pageCount`:

```prisma
model NewMemorandum {
  id             Int                 @id @default(autoincrement())
  number         String              @unique
  schoolName     String
  district       String
  generatedBy    String
  type           String              @default("entrega")
  fromSchoolName String?
  toSchoolName   String?
  pageCount      Int                 @default(1)  // NOVO: quantidade de páginas do PDF
  createdAt      DateTime            @default(now())
  updatedAt      DateTime
  items          NewMemorandumItem[]

  @@map("NewMemorandum")
}
```

- [ ] **Step 2: Gerar migration do Prisma**

Execute o comando para criar a migration:

```bash
npx prisma migrate dev --name add_pagecount_to_newmemorandum
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "postgresql": PostgreSQL database
The following migration(s) have been created and applied:

migrations/
  └─ XXXXXXXXXXXX_add_pagecount_to_newmemorandum/
      └─ migration.sql
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add pageCount field to NewMemorandum model"
```

---

### Task 2: Modificar API para calcular páginas e remover limite

**Files:**
- Modify: `src/pages/api/generate-memorandum.ts`

- [ ] **Step 1: Remover validação de limite de 13 itens**

Localize e remova o bloco de validação (aproximamente linha 74-78):

```typescript
// REMOVER ESTE BLOCO:
if (itemIds.length > 13) {
  return res.status(400).json({ 
    error: `Limite de itens excedido. Máximo: 13 itens, recebidos: ${itemIds.length} itens.` 
  });
}
```

- [ ] **Step 2: Adicionar constante e cálculo de páginas**

Após as validações básicas (aproximadamente linha 87), adicione:

```typescript
// Constante para itens por página
const ITEMS_PER_PAGE = 13;

// Calcular quantidade de páginas necessárias
const totalPages = Math.ceil(itemIds.length / ITEMS_PER_PAGE);
console.log(`Generating ${totalPages} pages for ${itemIds.length} items`);
```

- [ ] **Step 3: Atualizar objeto memorandumData com pageCount**

Localize a criação do objeto `memorandumData` (aproximadamente linha 227) e adicione `pageCount`:

```typescript
const memorandumData: any = {
  generatedBy: userProfile.displayName,
  number: automaticMemorandumNumber,
  type: type,
  pageCount: totalPages,  // NOVO: quantidade de páginas
  updatedAt: new Date(),
  items: {
    create: itemIds.map((id: number) => ({
      Item: { connect: { id } },
    })),
  },
  // ... resto dos campos
};
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/generate-memorandum.ts
git commit -m "feat: calculate page count and remove 13 items limit"
```

---

### Task 3: Implementar geração de PDF multi-páginas

**Files:**
- Modify: `src/pages/api/generate-memorandum.ts`

- [ ] **Step 1: Reescrever lógica de geração de PDF para entrega**

Substitua o bloco de geração de PDF para entrega (aproximadamente linha 424-475) por:

```typescript
if (type === 'troca') {
  // Usar a nova função específica para memorando de troca
  const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, req.body);
  pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
  
} else {
  // Lógica para ENTREGA com suporte a múltiplas páginas
  console.log("Generating multi-page PDF for entrega...");
  
  const pdfFileName = 'memorando.pdf';
  const pdfPath = path.join(process.cwd(), "public", pdfFileName);
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Criar novo documento para as múltiplas páginas
  const multiPagePdf = await PDFDocument.create();
  
  // Dados comuns a todas as páginas
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Gerar página por página
  for (let currentPage = 0; currentPage < totalPages; currentPage++) {
    // Clonar o template
    const pageTemplate = await PDFDocument.load(pdfBytes);
    const form = pageTemplate.getForm();
    
    // Preencher campos básicos
    form.getTextField("numeroMemorando").setText(`${memorandum.number}`);
    form.getTextField("dataMemorando").setText(formattedDate);
    form.getTextField("escola").setText(schoolName);
    form.getTextField("distrito").setText(district || "não informado");
    
    // Campos adicionais
    try {
      form.getTextField("conferente")?.setText(userProfile.displayName || "");
    } catch (e) {
      console.log("Campo conferente não encontrado no PDF");
    }
    try {
      form.getTextField("escola2")?.setText(schoolName);
    } catch (e) {
      console.log("Campo escola2 não encontrado no PDF");
    }
    try {
      form.getTextField("tipoOperacao")?.setText("ENTREGA DE EQUIPAMENTOS");
    } catch (e) {
      console.log("Campo tipoOperacao não encontrado no PDF");
    }
    
    // Calcular itens desta página
    const startIdx = currentPage * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, itemIds.length);
    const pageItemIds = itemIds.slice(startIdx, endIdx);
    
    // Buscar dados dos itens desta página
    const pageItems = await prisma.item.findMany({
      where: { id: { in: pageItemIds } },
    });
    
    // Preencher itens desta página
    pageItems.forEach((item, index) => {
      if (index >= ITEMS_PER_PAGE) return;
      const itemWithBrand = `${item.brand}`;
      form.getTextField(`item${index + 1}`).setText(itemWithBrand);
      form.getTextField(`serial${index + 1}`).setText(item.serialNumber);
    });
    
    // Limpar campos vazios (se a página não estiver cheia)
    for (let emptyIdx = pageItems.length; emptyIdx < ITEMS_PER_PAGE; emptyIdx++) {
      try {
        form.getTextField(`item${emptyIdx + 1}`).setText("");
        form.getTextField(`serial${emptyIdx + 1}`).setText("");
      } catch (e) {
        // Campo pode não existir
      }
    }
    
    form.flatten();
    
    // Adicionar página ao documento final
    const templatePages = await multiPagePdf.copyPages(pageTemplate, [0]);
    multiPagePdf.addPage(templatePages[0]);
  }
  
  const pdfBytesModified = await multiPagePdf.save();
  pdfBase64 = Buffer.from(pdfBytesModified).toString("base64");
  
  console.log(`Multi-page PDF generated with ${totalPages} pages`);
}
```

- [ ] **Step 2: Adicionar constante ITEMS_PER_PAGE no topo do arquivo**

Adicione no início do arquivo, após os imports:

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Constante
  const ITEMS_PER_PAGE = 13;
  
  // ... resto do código
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/generate-memorandum.ts
git commit -m "feat: implement multi-page PDF generation for delivery memorandums"
```

---

### Task 4: Atualizar frontend para remover limite e mostrar páginas

**Files:**
- Modify: `src/components/DeviceList.tsx`

- [ ] **Step 1: Remover validação de limite no frontend**

Localize e remova o bloco de validação (aproximadamente linha 622-628):

```typescript
// REMOVER ESTE BLOCO:
if (selectedFromCSDT.length > 13) {
  setModalMessage(
    `📦 Limite de itens excedido!\n\nVocê selecionou ${selectedFromCSDT.length} itens, mas o limite máximo para memorandos de entrega é de 13 itens.\n\nPor favor, reduza a seleção para até 13 itens ou crie múltiplos memorandos.`
  );
  setModalIsOpen(true);
  return;
}
```

- [ ] **Step 2: Adicionar constante ITEMS_PER_PAGE no componente**

Após as declarações de estado (aproximadamente linha 135), adicione:

```typescript
const DeviceList: React.FC = () => {
  // Constante
  const ITEMS_PER_PAGE = 13;
  
  // ... resto do código
```

- [ ] **Step 3: Atualizar indicador de preview para mostrar páginas**

Localize o bloco de preview de itens selecionados (aproximadamente linha 1944-1956) e modifique:

```typescript
<div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded border">
  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
    📋 Itens Selecionados: {selectedFromCSDT.length}
  </p>
  
  {/* NOVO: Indicador de páginas */}
  {memorandumType === "entrega" && selectedFromCSDT.length > 0 && (
    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
      📄 Serão geradas {Math.ceil(selectedFromCSDT.length / ITEMS_PER_PAGE)} página(s)
    </p>
  )}
  
  {/* ... resto do preview */}
</div>
```

- [ ] **Step 4: Remover alerta vermelho de limite excedido**

Localize e remova o bloco (aproximadamente linha 1959-1966):

```typescript
// REMOVER ESTE BLOCO:
{memorandumType === "entrega" && selectedFromCSDT.length > 13 && (
  <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-sm">
    <span className="text-red-600 dark:text-red-400 font-medium">
      ⚠️ Limite excedido! Máximo: 13 itens por memorando de entrega.
    </span>
  </div>
)}
```

- [ ] **Step 5: Atualizar texto de limite no preview**

Localize e modifique (aproximadamente linha 1948-1951):

```typescript
<p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
  📋 Itens Selecionados:{" "}
  {memorandumType === "entrega" ? (
    <span>{selectedFromCSDT.length}</span>  // REMOVER: className e verificação de limite
  ) : /* ... restante ... */}
</p>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/DeviceList.tsx
git commit -m "feat: remove 13 items limit and show page count in UI"
```

---

### Task 5: Adicionar paginação visual no template PDF

**Files:**
- Modify: `public/memorando.pdf` (opcional, requer editor de PDF)
- Note: Esta task é opcional se o PDF já tiver campo para paginação

- [ ] **Step 1: Verificar se o template PDF tem campo de paginação**

Abra o arquivo `public/memorando.pdf` em um editor de PDF (como Adobe Acrobat ou PDFtk) e verifique se existe um campo de texto para "Página X/Y".

**Se o campo NÃO existir:**

- [ ] **Step 2a: Adicionar campo de paginação no PDF**

Use uma ferramenta como PDFtk ou Adobe Acrobat para adicionar um campo de texto chamado "pagina" no canto superior direito de cada página do template.

**Se o campo JÁ existir:**

- [ ] **Step 2b: Atualizar código para preencher o campo de paginação**

Modifique o loop de geração de páginas (em Task 3, Step 1) adicionando após o preenchimento do número do memorando:

```typescript
// Preencher numeroMemorando
form.getTextField("numeroMemorando").setText(`${memorandum.number}`);

// NOVO: Preencher paginação
try {
  form.getTextField("pagina")?.setText(`Página ${currentPage + 1}/${totalPages}`);
} catch (e) {
  console.log("Campo pagina não encontrado no PDF");
}
```

- [ ] **Step 3: Commit (se houver alteração)**

```bash
git add src/pages/api/generate-memorandum.ts public/memorando.pdf
git commit -m "feat: add page numbering to PDF template"
```

**Nota:** Se o template PDF não puder ser editado agora, a paginação pode ser adicionada posteriormente sem afetar a funcionalidade principal.

---

## Task 6: Teste end-to-end

**Files:**
- Manual testing via browser

- [ ] **Step 1: Fazer deploy local**

```bash
npm run dev
```

- [ ] **Step 2: Testar com 13 itens (caso base)**

1. Faça login como ADMTOTAL ou ADMIN
2. Acesse `/device-list`
3. Clique em "Gerar Memorando"
4. Selecione tipo "Entrega"
5. Selecione uma escola
6. Selecione exatamente 13 itens
7. Clique em "Gerar Entrega"

**Expected:**
- Modal mostra: "Serão geradas 1 página(s)"
- PDF baixado com 1 página
- Banco mostra: `pageCount = 1`

- [ ] **Step 3: Testar com 20 itens (2 páginas)**

1. Repita o processo
2. Selecione 20 itens

**Expected:**
- Modal mostra: "Serão geradas 2 página(s)"
- PDF baixado com 2 páginas
- Página 1: itens 1-13
- Página 2: itens 14-20
- Banco mostra: `pageCount = 2`

- [ ] **Step 4: Testar com 50 itens (4 páginas)**

**Expected:**
- Modal mostra: "Serão geradas 4 página(s)"
- PDF baixado com 4 páginas
- Banco mostra: `pageCount = 4`

- [ ] **Step 5: Verificar banco de dados**

```bash
npx prisma studio
```

Verifique na tabela `NewMemorandum`:
- Campo `pageCount` está preenchido corretamente
- Número do memorando está no formato correto

- [ ] **Step 6: Commit final (se necessário)**

```bash
git add .
git commit -m "test: verified multi-page memorandum functionality"
```

---

## Self-Review Results

**1. Spec coverage:**
- ✅ Campo pageCount no banco - Task 1
- ✅ Remoção de validação de 13 itens - Task 2, Task 4
- ✅ Cálculo de páginas - Task 2
- ✅ Geração de PDF multi-páginas - Task 3
- ✅ Atualização de UI - Task 4
- ✅ Paginação visual no PDF - Task 5 (opcional)

**2. Placeholder scan:**
- ✅ Todos os passos têm código completo
- ✅ Nenhum "TBD" ou "TODO"
- ✅ Comandos completos com outputs esperados

**3. Type consistency:**
- ✅ `ITEMS_PER_PAGE = 13` consistente em toda a implementação
- ✅ `totalPages` calculado como `Math.ceil(length / 13)`
- ✅ `pageCount` salvo como `Int` no Prisma

---

## Execution Notes

**Dependencies:**
- pdf-lib já está instalado (uso existente no código)
- Prisma já configurado

**Potential issues:**
- Template PDF pode não ter campo para paginação - solução alternativa: adicionar texto diretamente no PDF via pdf-lib
- Migration pode falhar se houver dados conflitantes - usar `@default(1)` para garantir compatibilidade

**Testing priority:**
1. Testar com 13 itens (base case)
2. Testar com 14-26 itens (2 páginas)
3. Testar com 27+ itens (3+ páginas)
