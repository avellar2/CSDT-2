# Design System Standardization - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar o design visual de todas as 38 páginas do projeto CSDT-2, criando uma experiência coesa com base no design system definido.

**Architecture:** Atualização progressiva de páginas em fases, começando pelas principais e seguindo para as secundárias. Cada página é atualizada independentemente seguindo o mesmo padrão de estrutura e componentes.

**Tech Stack:** Next.js 15, React, Tailwind CSS, Framer Motion, shadcn/ui, TypeScript

---

## File Structure

### Arquivos a modificar:
```
src/pages/
├── dashboard.tsx                    # Fase 1
├── schools.tsx                      # Fase 1
├── items.tsx                        # Fase 1
├── internal-demands.tsx             # Fase 1
├── statistics.tsx                   # Fase 1
├── register.tsx                     # Fase 2
├── technical-tickets/create.tsx     # Fase 2
├── fill-pdf-form-2.tsx              # Fase 2
├── os-list.tsx                      # Fase 3
├── items-list.tsx                   # Fase 3
├── device-list.tsx                  # Fase 3
├── os-externas-list.tsx             # Fase 3
└── ... (demais páginas)             # Fase 4

src/styles/
└── globals.css                      # Tokens de design (já atualizado)
```

---

## Task 1: Atualizar página Dashboard (Fase 1)

**Files:**
- Modify: `src/pages/dashboard.tsx`

- [ ] **Step 1: Ler o arquivo atual**

```bash
# Localizar e ler o dashboard.tsx
```

- [ ] **Step 2: Aplicar estrutura padrão de página**

Atualizar o container principal para:

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
  <div className="container mx-auto px-4 py-8 max-w-7xl">
```

- [ ] **Step 3: Adicionar header com título em gradiente**

```tsx
<header className="text-center mb-12">
  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
    Dashboard
  </h1>
  <p className="text-lg text-gray-600 dark:text-gray-400">
    Visão geral do sistema
  </p>
</header>
```

- [ ] **Step 4: Atualizar cards de estatísticas com borda colorida**

```tsx
<Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
  <CardContent className="p-6">
    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{valor}</p>
  </CardContent>
</Card>

/* Repetir para outros cards com cores: amber-500, emerald-500, purple-500 */
```

- [ ] **Step 5: Adicionar animações com framer-motion nos cards**

```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>
  <Card>...</Card>
</motion.div>
```

- [ ] **Step 6: Garantir dark mode em todos os elementos**

Adicionar `dark:` variants em todos os elementos visuais:
- `dark:text-white`, `dark:text-gray-300`, `dark:text-gray-400`
- `dark:bg-slate-800`, `dark:border-gray-700`

- [ ] **Step 7: Testar a página**

```bash
# Abrir http://localhost:3000/dashboard e verificar:
# - Layout responsivo
# - Dark mode funcionando
# - Animações suaves
# - Cores consistentes
```

- [ ] **Step 8: Commit das mudanças**

```bash
git add src/pages/dashboard.tsx
git commit -m "design: apply design system to dashboard page"
```

---

## Task 2: Atualizar página Schools (Fase 1)

**Files:**
- Modify: `src/pages/schools.tsx`

- [ ] **Step 1: Ler o arquivo atual**

- [ ] **Step 2: Aplicar estrutura padrão de página**

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
  <div className="container mx-auto px-4 py-8 max-w-7xl">
```

- [ ] **Step 3: Adicionar header com título em gradiente**

```tsx
<header className="text-center mb-12">
  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
    Escolas
  </h1>
  <p className="text-lg text-gray-600 dark:text-gray-400">
    Gerenciamento de instituições de ensino
  </p>
</header>
```

- [ ] **Step 4: Atualizar barra de pesquisa**

```tsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-gray-600 dark:text-white"
  placeholder="Pesquisar escolas..."
/>
```

- [ ] **Step 5: Atualizar cards de escolas com hover effect**

```tsx
<Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-white">{school.name}</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 dark:text-gray-400">{school.details}</p>
  </CardContent>
</Card>
```

- [ ] **Step 6: Adicionar animações de stagger nos cards**

```tsx
{filteredSchools.map((school, index) => (
  <motion.div
    key={school.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
  >
    <Card>...</Card>
  </motion.div>
))}
```

- [ ] **Step 7: Garantir dark mode**

- [ ] **Step 8: Testar e commit**

```bash
git add src/pages/schools.tsx
git commit -m "design: apply design system to schools page"
```

---

## Task 3: Atualizar página Items (Fase 1)

**Files:**
- Modify: `src/pages/items.tsx`

- [ ] **Step 1: Ler e analisar estrutura atual**

- [ ] **Step 2: Aplicar estrutura padrão**

- [ ] **Step 3: Adicionar header com gradiente**

- [ ] **Step 4: Atualizar tabela de itens**

```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
  <table className="w-full">
    <thead className="bg-gray-50/50 dark:bg-slate-800/50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nome</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map((item, index) => (
        <motion.tr
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: index * 0.03 }}
          className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
        >
          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.name}</td>
          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.type}</td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {item.status}
            </span>
          </td>
        </motion.tr>
      ))}
    </tbody>
  </table>
</div>
```

- [ ] **Step 5: Atualizar filtros e busca**

- [ ] **Step 6: Garantir dark mode**

- [ ] **Step 7: Testar e commit**

```bash
git add src/pages/items.tsx
git commit -m "design: apply design system to items page"
```

---

## Task 4: Atualizar página Internal Demands (Fase 1)

**Files:**
- Modify: `src/pages/internal-demands.tsx`

- [ ] **Step 1: Ler estrutura atual**

- [ ] **Step 2: Aplicar estrutura padrão com gradiente**

- [ ] **Step 3: Atualizar header**

```tsx
<header className="text-center mb-12">
  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
    Demandas Internas
  </h1>
  <p className="text-lg text-gray-600 dark:text-gray-400">
    Gerencie as demandas da equipe
  </p>
</header>
```

- [ ] **Step 4: Atualizar cards de demanda com status badges**

- [ ] **Step 5: Adicionar animações**

- [ ] **Step 6: Dark mode**

- [ ] **Step 7: Testar e commit**

```bash
git add src/pages/internal-demands.tsx
git commit -m "design: apply design system to internal-demands page"
```

---

## Task 5: Atualizar página Statistics (Fase 1)

**Files:**
- Modify: `src/pages/statistics.tsx`

- [ ] **Step 1: Analisar gráficos e visualizações atuais**

- [ ] **Step 2: Aplicar estrutura padrão**

- [ ] **Step 3: Atualizar header**

```tsx
<header className="text-center mb-12">
  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
    Estatísticas
  </h1>
  <p className="text-lg text-gray-600 dark:text-gray-400">
    Análise e métricas do sistema
  </p>
</header>
```

- [ ] **Step 4: Atualizar cards de métricas**

```tsx
<Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Métrica</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <Icon className="text-purple-500" size={32} />
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 5: Atualizar gráficos com cores do design system**

- [ ] **Step 6: Dark mode para gráficos**

- [ ] **Step 7: Testar e commit**

```bash
git add src/pages/statistics.tsx
git commit -m "design: apply design system to statistics page"
```

---

## Task 6-8: Fase 2 - Páginas de Formulários

**Repetir o padrão para:**
- `src/pages/register.tsx`
- `src/pages/technical-tickets/create.tsx`
- `src/pages/fill-pdf-form-2.tsx`

Para cada página:

- [ ] Aplicar estrutura padrão com gradiente de fundo
- [ ] Adicionar header com título em gradiente
- [ ] Atualizar inputs com estilo padronizado:

```tsx
<input className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-gray-600 dark:text-white" />
```

- [ ] Atualizar botões:

```tsx
<Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
```

- [ ] Garantir dark mode
- [ ] Testar e commit individual para cada página

---

## Task 9-12: Fase 3 - Listas e Tabelas

**Repetir o padrão para:**
- `src/pages/os-list.tsx`
- `src/pages/items-list.tsx`
- `src/pages/device-list.tsx`
- `src/pages/os-externas-list.tsx`

Para cada página:

- [ ] Aplicar estrutura padrão
- [ ] Adicionar header com gradiente
- [ ] Atualizar tabelas com estrutura padronizada
- [ ] Adicionar status badges com cores corretas
- [ ] Adicionar animações de stagger
- [ ] Dark mode
- [ ] Testar e commit

---

## Task 13-38: Fase 4 - Demais Páginas

**Aplicar o mesmo padrão para todas as páginas restantes:**

Lista completa de páginas a atualizar (identificadas na análise):
- `apresentacao.tsx`
- `scales.tsx`
- `printers.tsx`
- `locados.tsx`
- `schools-map.tsx`
- `new-memorandums.tsx`
- `memorandums.tsx`
- `daily-demands.tsx`
- `open-technical-ticket.tsx`
- `view-deleted-tickets.tsx`
- `accepted-tickets.tsx`
- `internal-chat.tsx`
- `manual-usuario.tsx`
- `chada.tsx`
- E demais páginas encontradas

Para cada página:
- [ ] Seguir o padrão estabelecido
- [ ] Commit individual

---

## Task Final: Revisão Geral

**Files:**
- Test: Todas as páginas

- [ ] **Step 1: Checklist de validação**

Para cada página atualizada, verificar:
- [ ] Fundo com gradiente correto (light/dark)
- [ ] Título com gradiente de texto
- [ ] Cards com bordas arredondadas (8px)
- [ ] Botões seguindo padrão de cores
- [ ] Inputs com estilo padronizado
- [ ] Status badges com cores corretas
- [ ] Tabelas com estrutura padronizada
- [ ] Dark mode funcionando
- [ ] Animações suaves (motion)
- [ ] Espaçamentos consistentes

- [ ] **Step 2: Testar navegação entre páginas**

```bash
# Navegar por todas as páginas e verificar consistência visual
```

- [ ] **Step 3: Testar dark mode global**

```bash
# Ativar dark mode e verificar todas as páginas
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "design: complete design system standardization across all pages"
```

- [ ] **Step 5: Atualizar task**

```bash
# Marcar tarefa como concluída
```

---

## Notas de Implementação

1. **Preservar funcionalidade**: Não alterar lógica de negócio, apenas estilo
2. **Commits pequenos**: Cada página em seu próprio commit
3. **Testar após cada mudança**: Verificar visualmente antes de commitar
4. **Dark mode é obrigatório**: Todas as páginas devem funcionar em modo escuro
5. **Animações devem ser sutis**: Não exagerar nos efeitos
6. **Manter acessibilidade**: Contraste e tamanhos adequados

---

## Critérios de Sucesso

- [ ] Todas as 38 páginas seguindo o design system
- [ ] Cores consistentes em toda a aplicação
- [ ] Dark mode funcionando em todas as páginas
- [ ] Animações suaves sem prejudicar performance
- [ ] Acessibilidade mantida (contraste, tamanhos)
- [ ] Nenhum console error
- [ ] Todas as páginas responsivas
