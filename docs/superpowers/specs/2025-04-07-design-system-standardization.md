# Design System Standardization - CSDT-2

**Data:** 2025-04-07
**Status:** Aprovado
**Escopo:** Padronização visual de todas as 38 páginas do projeto

---

## Visão Geral

Este documento define o design system unificado para o projeto CSDT-2 (Sistema de Gestão de Educação/Tecnologia). O objetivo é eliminar inconsistências visuais e criar uma experiência coesa para todos os usuários.

---

## 1. Fundamentos Visuais

### Paleta de Cores

| Token | Tailwind | Hex | Uso |
|-------|----------|-----|-----|
| `--color-primary` | blue-500 | #3B82F6 | Ações principais |
| `--color-primary-dark` | blue-600 | #2563EB | Hover primário |
| `--color-primary-light` | blue-400 | #60A5FA | Estados suaves |
| `--color-secondary` | purple-500 | #A855F7 | Acentos secundários |
| `--color-secondary-dark` | purple-600 | #9333EA | Hover secundário |
| `--color-accent` | indigo-500 | #6366F1 | Detalhes |
| `--color-success` | emerald-500 | #10B981 | Estados positivos |
| `--color-warning` | amber-500 | #F59E0B | Estados de alerta |
| `--color-error` | red-500 | #EF4444 | Erros |
| `--color-bg-light` | slate-50 | #F8FAFC | Fundo claro |
| `--color-bg-dark` | slate-900 | #0F172A | Fundo escuro |
| `--color-surface` | white | #FFFFFF | Cards/superfícies |
| `--color-border` | slate-200 | #E2E8F0 | Bordas |

### Gradientes

```css
/* Fundo claro */
from-slate-50 via-white to-slate-100

/* Fundo escuro */
from-slate-900 via-slate-800 to-slate-900

/* Títulos/destaques */
from-blue-600 via-indigo-600 to-purple-600 (bg-clip-text)
```

---

## 2. Tipografia

### Hierarquia

| Elemento | Tamanho | Peso | Cor |
|----------|---------|------|-----|
| Hero | 48px | bold | gradient |
| H1 | 36px | bold | gray-900 |
| H2 | 28px | semibold | gray-900 |
| H3 | 20px | semibold | gray-900 |
| Body Large | 18px | normal | gray-600 |
| Body | 16px | normal | gray-600 |
| Small | 14px | normal | gray-500 |
| Caption | 12px | medium | gray-400 |

### Padrão de Título de Página

```tsx
<header className="text-center mb-12">
  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
    Título da Página
  </h1>
  <p className="text-lg text-gray-600 dark:text-gray-400">
    Descrição opcional
  </p>
</header>
```

---

## 3. Espaçamento e Layout

### Escala de Espaçamento (base 4px)

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | 4px | Espaçamento mínimo |
| `--space-2` | 8px | Gaps pequenos |
| `--space-3` | 12px | Padding compacto |
| `--space-4` | 16px | Padding padrão |
| `--space-6` | 24px | Padding de cards |
| `--space-8` | 32px | Gaps entre seções |
| `--space-12` | 48px | Margens de página |
| `--space-16` | 64px | Seções grandes |

### Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 6px | Inputs, badges |
| `--radius-md` | 8px | Botões, cards |
| `--radius-lg` | 12px | Modals |
| `--radius-xl` | 16px | Hero elements |

---

## 4. Estrutura de Página Padrão

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
  <div className="container mx-auto px-4 py-8 max-w-7xl">

    {/* Header */}
    <header className="text-center mb-12">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
        Título
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Subtítulo opcional
      </p>
    </header>

    {/* Stat Cards (opcional) */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Cards de estatísticas */}
    </div>

    {/* Conteúdo Principal */}
    <main>
      {/* Variável por página */}
    </main>

  </div>
</div>
```

---

## 5. Componentes Padrão

### Stat Card

```tsx
<Card className="border-l-4 border-l-blue-500">
  <CardContent className="p-4">
    <p className="text-sm text-gray-500 dark:text-gray-400">Label</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">Valor</p>
  </CardContent>
</Card>

/* Cores de borda: blue, amber, emerald, purple */
```

### Botões

```tsx
// Primário
<Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">

// Secundário
<Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">

// Destrutivo
<Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25">
```

### Inputs

```tsx
<input
  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-gray-600 dark:text-white"
/>

<textarea
  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none dark:bg-slate-800 dark:border-gray-600 dark:text-white"
  rows={4}
/>
```

### Status Badges

```tsx
// Pendente
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
  Pendente
</span>

// Aceita
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
  Aceita
</span>

// Concluído
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  Concluído
</span>

// Cancelado/Erro
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
  Cancelado
</span>
```

### Tabela

```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
  <table className="w-full">
    <thead className="bg-gray-50/50 dark:bg-slate-800/50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Coluna
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Dado</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 6. Animações

### Padrões com Framer Motion

```tsx
// Fade in + slide up para seções
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Stagger para listas
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: i * 0.05 }}
  >
))

// Hover effects
className="hover:scale-105 hover:shadow-lg transition-all duration-300"
```

---

## 7. Dark Mode

Todas as cores devem ter variante `dark:`:

- Fundos: `dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`
- Texto: `dark:text-white`, `dark:text-gray-300`, `dark:text-gray-400`
- Cards: `dark:bg-slate-800 dark:border-gray-700`
- Inputs: `dark:bg-slate-800 dark:border-gray-600 dark:text-white`
- Borders: `dark:border-gray-700`

---

## 8. Arquivos CSS Globais

Adicionar ao `globals.css`:

```css
/* React Select Styles */
.react-select-container {
  --select-bg: white;
  --select-text: #1f2937;
  --select-border: #d1d5db;
}

.dark .react-select-container {
  --select-bg: #1e293b;
  --select-text: #f1f5f9;
  --select-border: #475569;
}

/* ... (estilos completos do react-select já existem no globals.css) */
```

---

## 9. Páginas a Atualizar

### Fase 1 - Páginas Principais (prioridade alta)
1. `src/pages/dashboard.tsx`
2. `src/pages/schools.tsx`
3. `src/pages/items.tsx`
4. `src/pages/internal-demands.tsx`
5. `src/pages/statistics.tsx`

### Fase 2 - Páginas de Formulários
6. `src/pages/register.tsx`
7. `src/pages/technical-tickets/create.tsx`
8. `src/pages/fill-pdf-form-2.tsx`

### Fase 3 - Listas e Tabelas
9. `src/pages/os-list.tsx`
10. `src/pages/items-list.tsx`
11. `src/pages/device-list.tsx`
12. `src/pages/os-externas-list.tsx`

### Fase 4 - Outras páginas
13-38. Demais páginas identificadas na análise

---

## 10. Checklist de Validação

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

---

## 11. Critérios de Sucesso

- Todas as 38 páginas seguindo o design system
- Cores consistentes em toda a aplicação
- Dark mode funcionando em todas as páginas
- Animações suaves sem prejudicar performance
- Acessibilidade mantida (contraste, tamanhos)
- Código limpo e reutilizável

---

**Aprovado por:** Vanderson
**Data de aprovação:** 2025-04-07
