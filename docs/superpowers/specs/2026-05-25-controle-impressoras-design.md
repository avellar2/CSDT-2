# Controle de Impressoras — Design Spec

## Contexto

O sistema CSDT já possui um cadastro de impressoras (tabela `Printer` com sigla, setor, modelo, fabricante, serial, IP) e uma página de monitoramento (`printers.tsx`), mas não tem funcionalidade para gerar relatórios em PDF das impressoras cadastradas. O usuário precisa de uma forma de selecionar impressoras, revisar/editar os dados e exportar um PDF profissional para impressão ou arquivo.

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Acesso | Card no Dashboard → Página dedicada `/controle-impressoras` |
| Permissão | ADMTOTAL e ADMIN |
| Layout | Toggle entre vista Tabela e vista Cards |
| Dados | Pré-preenchidos do banco, editáveis antes de gerar PDF |
| Seleção | Filtros (busca, escola, setor, fabricante) + checkboxes |
| PDF | Profissional com cabeçalho, cards de resumo e tabela estilizada |

## Componentes

### 1. Card no Dashboard

**Arquivo**: `src/components/Dashboard.tsx` (modificação)

- Adicionar novo card no array `allCards` na categoria "Escolas e Equipamentos"
- Props: `{ id: 'controle-impressoras', title: 'Controle de Impressoras', icon: PrinterCheck, color: 'bg-indigo-500 hover:bg-indigo-700', path: '/controle-impressoras', roles: ['ADMTOTAL', 'ADMIN'], category: cardCategories[3] }`
- Ícone `PrinterCheck` importado do `lucide-react`
- Seguir o padrão existente de cards (mesmo estilo das outras opções da categoria)

### 2. Header Component

**Arquivo**: `src/components/Header.tsx` (modificação)

- Adicionar item "Controle de Impressoras" na lista de navegação do header
- Path: `/controle-impressoras`
- Roles: ADMTOTAL e ADMIN

### 3. Página Dedicada

**Arquivo**: `src/pages/controle-impressoras.tsx` (novo)

Estrutura da página:

```
┌──────────────────────────────────────────────────────┐
│ 🖨 Controle de Impressoras          [≡ Tabela | ▦ Cards] │
│ Gerencie e exporte os dados das impressoras          │
├──────────────────────────────────────────────────────┤
│ 🔍 Buscar... | 🏫 Escola | 📍 Setor | 🏷 Fabricante | ✅ Todos │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Vista Tabela ou Vista Cards - depende do toggle]  │
│                                                      │
├──────────────────────────────────────────────────────┤
│ 2 de 3 selecionadas                  [Cancelar] [📄 Gerar PDF] │
└──────────────────────────────────────────────────────┘
```

**Vista Tabela**:
- Tabela com colunas: checkbox, Sigla, Modelo, Fabricante, Serial, IP, Setor
- Linhas zebradas (alternância white/bg-gray-50)
- Células editáveis com destaque visual (fundo amarelo suave, borda dashed)
- Checkbox no header para selecionar/deselecionar todos

**Vista Cards**:
- Grid de cards (2-3 colunas responsivo)
- Cada card mostra: sigla + modelo como título, dados em grid 2x2
- Card selecionado: borda azul, fundo azul claro, badge ✓
- Card não selecionado: borda cinza, opacidade reduzida
- Campos editáveis inline com mesmo destaque visual

**Filtros**:
- Busca: texto livre (filtra por sigla, modelo, fabricante, serial, IP)
- Escola: dropdown (valores únicos do campo setor ou join com School)
- Setor: dropdown (valores únicos do campo setor)
- Fabricante: dropdown (valores únicos do campo fabricante)
- Botão "Selecionar Todos" / "Desselecionar Todos"

**Edição**:
- Campos editáveis: modelo, fabricante, serial, IP, setor
- Campo sigla: somente leitura (identificador)
- Edição inline — clique na célula para editar (tabela) ou clique no campo (cards)
- Validação: IP deve ter formato válido, serial e campos obrigatórios não podem ficar vazios

**Botão "Gerar PDF"**:
- Desabilitado se nenhuma impressora selecionada
- Ao clicar, envia lista de impressoras (com dados editados) para a API
- Gera e faz download do PDF automaticamente

### 4. API de Geração de PDF

**Arquivo**: `src/pages/api/generate-printer-control-pdf.ts` (novo)

**Método**: POST

**Request body**:
```json
{
  "printers": [
    {
      "sigla": "IMP-01",
      "modelo": "L210",
      "fabricante": "Epson",
      "serial": "SN12345",
      "ip": "10.0.1.50",
      "setor": "Lab Informática"
    }
  ],
  "responsavel": "Vanderson"
}
```

**Response**: PDF binário (Content-Type: application/pdf, Content-Disposition: attachment)

**Geração do PDF** (usando `pdf-lib` programático, mesmo padrão de `generate-sem-os-pdf.ts`):

Estrutura do PDF:
1. **Cabeçalho**: Título "Controle de Impressoras", subtítulo "Centro de Suporte e Desenvolvimento Tecnológico", data e responsável à direita, indicação de página
2. **Cards de resumo**: Total de impressoras, fabricantes únicos, setores únicos
3. **Tabela estilizada**: Cabeçalho com gradiente azul (#1e40af → #3b82f6), linhas zebradas, colunas: #, Sigla, Modelo, Fabricante, Serial, IP, Setor
4. **Rodapé**: Nome do sistema e timestamp de geração

**Paginação**: Se mais de ~25 impressoras, criar múltiplas páginas repetindo cabeçalho

### 5. Modelo de Dados

Usa a tabela `Printer` existente no Prisma:

```prisma
model Printer {
  id            Int             @id @default(autoincrement())
  sigla         String
  setor         String
  modelo        String
  fabricante    String
  serial        String          @unique
  ip            String
  PrinterStatus PrinterStatus[]
}
```

- A API `GET /api/printers` já retorna todos os campos necessários
- Filtros de escola/setor são feitos no cliente com os dados carregados
- Não é necessário criar novos modelos ou rotas de API para busca

### 6. Autenticação e Autorização

- Página protegida por `ProtectedRoute` (mesmo padrão de `dashboard.tsx`)
- Verificação de role: ADMTOTAL ou ADMIN (mesmo padrão do `get-role`)
- Se role não autorizada, redirecionar para dashboard

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/components/Dashboard.tsx` | Adicionar card "Controle de Impressoras" |
| `src/components/Header.tsx` | Adicionar item de navegação |
| `src/pages/controle-impressoras.tsx` | **Novo** — Página dedicada |
| `src/pages/api/generate-printer-control-pdf.ts` | **Novo** — API de geração de PDF |

## Verificação

1. Acessar `/dashboard` e verificar que o card "Controle de Impressoras" aparece para ADMTOTAL/ADMIN
2. Clicar no card e verificar que navega para `/controle-impressoras`
3. Verificar que a lista de impressoras carrega do banco
4. Testar filtros de busca, escola, setor e fabricante
5. Alternar entre vista Tabela e Cards com o toggle
6. Editar campos inline e verificar que as mudanças são refletidas
7. Selecionar/deselecionar impressoras com checkboxes
8. Clicar "Gerar PDF" e verificar que o PDF é baixado com layout correto
9. Verificar que roles não autorizadas (TECH, ONLYREAD, SCHOOL) não veem o card
10. Verificar que o PDF contém cabeçalho, resumo, tabela estilizada e rodapé