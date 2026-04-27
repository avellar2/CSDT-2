# Especificação: Memorandos Multi-páginas

**Data:** 2026-04-27
**Status:** Aprovado
**Prioridade:** Alta

## Resumo

Implementar suporte a memorandos de entrega com múltiplas páginas quando o número de itens exceder 13. O sistema gerará automaticamente um único PDF com todas as páginas necessárias, mantendo o mesmo número de memorando em todas.

## Problema Atual

- Limite de 13 itens por memorando de entrega
- Usuário precisa criar múltiplos memorandos manualmente
- Cada memorando tem número diferente (ex: 120/2026, 121/2026)
- Dificulta organização para grandes entregas

## Solução Proposta

### Comportamento Esperado

1. Usuário seleciona qualquer quantidade de itens (sem limite)
2. Sistema calcula páginas necessárias: `Math.ceil(itens / 13)`
3. Mostra confirmação: "Serão geradas X páginas"
4. Gera único PDF com múltiplas páginas
5. Salva 1 registro no banco com `pageCount`
6. Download do PDF completo

### Exemplo Prático

**Entrada:** 28 itens para Escola Modelo

**Resultado:**
- 1 registro: `{ number: "120/2026", pageCount: 3, schoolName: "Escola Modelo" }`
- PDF: 3 páginas
  - Página 1/3: itens 1-13
  - Página 2/3: itens 14-26
  - Página 3/3: itens 27-28

## Arquitetura

### Camada de Dados

**Schema Prisma (NewMemorandum):**
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
  pageCount      Int                 @default(1) // NOVO CAMPO
  createdAt      DateTime            @default(now())
  updatedAt      DateTime
  items          NewMemorandumItem[]
}
```

**Migration necessária:**
```sql
ALTER TABLE "NewMemorandum" ADD COLUMN "pageCount" INTEGER NOT NULL DEFAULT 1;
```

### Camada de API

**Endpoint:** `POST /api/generate-memorandum`

**Mudanças:**
1. Remover validação `if (itemIds.length > 13)`
2. Calcular `pageCount = Math.ceil(itemIds.length / 13)`
3. Implementar geração de PDF multi-páginas
4. Salvar com `pageCount`

**Lógica de divisão:**
```javascript
const ITEMS_PER_PAGE = 13;
const totalPages = Math.ceil(itemIds.length / ITEMS_PER_PAGE);

for (let page = 0; page < totalPages; page++) {
  const startIdx = page * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, itemIds.length);
  const pageItems = itemIds.slice(startIdx, endIdx);

  // Gerar página com os itens pageItems
  // Adicionar indicador "Página ${page + 1}/${totalPages}"
}
```

### Camada de Frontend

**Componente:** `DeviceList.tsx`

**Mudanças:**
1. Remover alerta de limite de 13 itens
2. Adicionar contador de páginas no preview
3. Mostrar confirmação antes de gerar

**UI:**
```tsx
<div className="bg-blue-50 p-3 rounded">
  <span>📋 Itens Selecionados: {selectedFromCSDT.length}</span>
  <span className="ml-4">
    📄 Páginas: {Math.ceil(selectedFromCSDT.length / 13)}
  </span>
</div>
```

## Layout do PDF

### Estrutura de Cada Página

```
┌──────────────────────────────────────────┐
│  MEMORANDO Nº 120/2026                   │
│  Página 1/3                              │ ← NOVO
│                                          │
│  Data: 27 de abril de 2026               │
│  Escola: Escola Modelo                   │
│  Distrito: Norte                         │
│  Conferente: João Silva                  │
├──────────────────────────────────────────┤
│  Item 1:  Dell Optiplex  - SN12345      │
│  Item 2:  Dell Optiplex  - SN12346      │
│  Item 3:  Monitor Dell    - SN78901      │
│  ...                                     │
│  Item 13: Teclado ABNT   - SN45678      │
└──────────────────────────────────────────┘
```

### Campos do Template PDF

- `numeroMemorando`: "120/2026"
- `dataMemorando`: "27 de abril de 2026"
- `escola`: Nome da escola
- `distrito`: Nome do distrito
- `conferente`: Nome do usuário
- `item1` a `item13`: Marca/modelo dos itens
- `serial1` a `serial13`: Números de série
- **NOVO:** `paginaX`: "Página 1/3"

## Casos de Teste

### Caso 1: Entrega pequena (≤ 13 itens)
- **Entrada:** 8 itens
- **Saída:** 1 página, pageCount = 1
- **PDF:** 1 página com indicador "Página 1/1"

### Caso 2: Entrega média (14-26 itens)
- **Entrada:** 20 itens
- **Saída:** 2 páginas, pageCount = 2
- **PDF:** 2 páginas com "Página 1/2" e "Página 2/2"

### Caso 3: Entrega grande (> 26 itens)
- **Entrada:** 35 itens
- **Saída:** 3 páginas, pageCount = 3
- **PDF:** 3 páginas com "Página 1/3", "Página 2/3", "Página 3/3"

### Caso 4: Extremo (muitos itens)
- **Entrada:** 100 itens
- **Saída:** 8 páginas, pageCount = 8
- **PDF:** 8 páginas numeradas 1/8 a 8/8

## Tratamento de Erro

| Erro | Ação | Mensagem ao Usuário |
|------|------|---------------------|
| Falha na geração do PDF | Rollback banco | "Erro ao gerar PDF. Tente novamente." |
| Falha no salvamento | Não baixar PDF | "Erro ao salvar memorando." |
| Template PDF não encontrado | Log erro | "Template não encontrado. Contate suporte." |

## Limitações

- Não há limite máximo de itens/páginas
- Cada página contém no máximo 13 itens
- Apenas memorandos de entrega (não troca)

## Critérios de Sucesso

1. ✅ Usuário pode selecionar mais de 13 itens sem erro
2. ✅ Sistema calcula páginas corretamente
3. ✅ PDF gerado com todas as páginas numeradas
4. ✅ Registro único salvo no banco com pageCount
5. ✅ Download do PDF completo funciona
6. ✅ Histórico de itens mantido corretamente

## Implementação

### Arquivos a Modificar

1. `prisma/schema.prisma` - Adicionar campo `pageCount`
2. `src/pages/api/generate-memorandum.ts` - Lógica multi-páginas
3. `src/components/DeviceList.tsx` - UI de seleção
4. Template PDF - Adicionar campo de paginação

### Ordem de Implementação

1. Migration do banco de dados
2. Atualização da API
3. Atualização do frontend
4. Testes end-to-end
