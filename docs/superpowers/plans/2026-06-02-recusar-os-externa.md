# Recusar OS Externa - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar botão "Recusar" na página de confirmação de OS externa, permitindo que o diretor rejeite uma OS com justificativa.

**Architecture:** A página de confirmação de OS externa é pública (acessada via link com token). Será adicionado um botão "Recusar" ao lado do botão "Confirmar" existente. Ao clicar, abre um modal com textarea para o diretor explicar o motivo. A API salva o motivo no banco, mantendo a OS com status "Pendente" mas marcada como recusada. A listagem de OS externas mostra um indicador visual de recusa.

**Tech Stack:** Next.js 15 Pages Router, TypeScript, Prisma, TailwindCSS, lucide-react

---

## File Structure

```
prisma/schema.prisma                    ← adicionar campos motivoRecusa, recusadoEm
prisma/migrations/                      ← migration gerada automática
src/pages/api/recusar-os-externa.ts     ← CREATE: API pública (sem auth) para registrar recusa
src/pages/api/get-os-externa.ts         ← MODIFY: incluir motivoRecusa/recusadoEm na resposta
src/pages/confirmar-os-externa.tsx      ← MODIFY: adicionar botão Recusar + modal com textarea
src/pages/os-externas-list.tsx          ← MODIFY: mostrar badge/tooltip de recusa
```

---

### Task 1: Adicionar campos no Prisma e rodar migration

**Files:**
- Modify: `prisma/schema.prisma:285-288`

- [ ] **Step 1: Adicionar campos motivoRecusa e recusadoEm**

No arquivo `prisma/schema.prisma`, adicionar após `temImpressoraComProblema`:

```prisma
  motivoRecusa                       String?
  recusadoEm                         DateTime?
```

- [ ] **Step 2: Rodar migration**

```bash
npx prisma migrate dev --name add-motivo-recusa-os-externa
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: adicionar campos motivoRecusa e recusadoEm no modelo OSExterna"
```

---

### Task 2: Criar API de recusa

**Files:**
- Create: `src/pages/api/recusar-os-externa.ts`

- [ ] **Step 1: Criar arquivo da API**

Criar `src/pages/api/recusar-os-externa.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, token, motivo } = req.body;

    if (!numeroOs || !token) {
      return res.status(400).json({ error: 'Número da OS e token são obrigatórios' });
    }

    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({ error: 'O motivo da recusa é obrigatório' });
    }

    // Buscar a OS pelo número e token
    const osExterna = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs,
        assinado: token,
        status: "Pendente",
      },
    });

    if (!osExterna) {
      return res.status(404).json({
        error: 'OS não encontrada, token inválido ou OS já confirmada',
      });
    }

    // Atualizar com os dados de recusa
    await prisma.oSExterna.update({
      where: { id: osExterna.id },
      data: {
        motivoRecusa: motivo.trim(),
        recusadoEm: new Date(),
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'OS recusada com sucesso',
      numeroOs: osExterna.numeroOs,
    });
  } catch (error) {
    console.error('Erro ao recusar OS Externa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    await prisma.$disconnect();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/recusar-os-externa.ts
git commit -m "feat: criar API de recusa de OS externa"
```

---

### Task 3: Atualizar API get-os-externa para incluir campos de recusa

**Files:**
- Modify: `src/pages/api/get-os-externa.ts`

- [ ] **Step 1: Verificar se a API já retorna todos os campos**

A API `src/pages/api/get-os-externa.ts` usa `prisma.oSExterna.findFirst()` que por padrão retorna todos os campos, incluindo os novos `motivoRecusa` e `recusadoEm`. Verificar se há algum `select` explícito que filtre campos — se houver, adicionar os novos campos.

Ler o arquivo para confirmar:

```bash
cat src/pages/api/get-os-externa.ts
```

Se a API faz `findFirst` sem `select`, não precisa alterar nada — os novos campos já virão na resposta automaticamente.

- [ ] **Step 2: Se precisar de ajuste, fazer e comitar**

```bash
git add src/pages/api/get-os-externa.ts
git commit -m "fix: incluir campos motivoRecusa e recusadoEm na resposta de get-os-externa"
```

---

### Task 4: Adicionar botão Recusar no frontend

**Files:**
- Modify: `src/pages/confirmar-os-externa.tsx`

- [ ] **Step 1: Adicionar estado para modal de recusa**

Adicionar os estados após os estados existentes (linha ~21):

```typescript
const [showRecusarModal, setShowRecusarModal] = useState(false);
const [motivoRecusa, setMotivoRecusa] = useState('');
const [recusando, setRecusando] = useState(false);
```

- [ ] **Step 2: Adicionar função handleRecusar**

Adicionar após `handleSubmit`:

```typescript
const handleRecusar = async () => {
  if (!motivoRecusa.trim()) {
    setMessage('Por favor, informe o motivo da recusa.');
    return;
  }

  setRecusando(true);
  try {
    const response = await fetch('/api/recusar-os-externa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numeroOs,
        token,
        motivo: motivoRecusa,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      setSuccess(true);
      setMessage('OS recusada com sucesso!');
      setShowRecusarModal(false);
    } else {
      setMessage(result.error || 'Erro ao recusar OS.');
    }
  } catch (error) {
    setMessage('Erro ao recusar OS.');
  } finally {
    setRecusando(false);
  }
};
```

- [ ] **Step 3: Adicionar botão Recusar ao lado do Confirmar**

No JSX, encontrar o botão de submit "Confirmar" e adicionar um botão "Recusar" ao lado. A estrutura aproximada é no formulário onde tem o botão submit.

```tsx
<div className="flex gap-4">
  <Button type="submit" disabled={loading}>
    {loading ? 'Confirmando...' : 'Confirmar OS'}
  </Button>
  <Button
    type="button"
    variant="destructive"
    onClick={() => setShowRecusarModal(true)}
    disabled={loading}
  >
    Recusar OS
  </Button>
</div>
```

- [ ] **Step 4: Adicionar modal de recusa**

Adicionar no final do componente (antes do return), similar ao modal de imagem:

```tsx
{/* Modal de Recusa */}
{showRecusarModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Recusar OS</h3>
        <button
          onClick={() => setShowRecusarModal(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      <p className="text-gray-600 mb-4">
        Por que você não aceita esta OS? Descreva o motivo:
      </p>
      <textarea
        value={motivoRecusa}
        onChange={(e) => setMotivoRecusa(e.target.value)}
        placeholder="Ex: equipamento não foi entregue, serviço não realizado, fotos não conferem..."
        className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
      />
      <div className="flex gap-3 mt-4 justify-end">
        <Button
          variant="outline"
          onClick={() => setShowRecusarModal(false)}
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={handleRecusar}
          disabled={recusando}
        >
          {recusando ? 'Recusando...' : 'Confirmar Recusa'}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/confirmar-os-externa.tsx
git commit -m "feat: adicionar botão Recusar com modal de justificativa na confirmação de OS"
```

---

### Task 5: Mostrar indicador de recusa na listagem de OS externas

**Files:**
- Modify: `src/pages/os-externas-list.tsx`

- [ ] **Step 1: Adicionar coluna/badge de recusa na tabela**

Na tabela de listagem de OS externas, adicionar um badge "Recusada" quando `os.motivoRecusa` existir. O badge deve ter um tooltip com o motivo.

Procurar a coluna de status na tabela e adicionar antes ou depois dela:

```tsx
{os.motivoRecusa && (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 cursor-help"
    title={os.motivoRecusa}
  >
    Recusada
  </span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/os-externas-list.tsx
git commit -m "feat: mostrar badge de recusa com tooltip do motivo na listagem de OS externas"
```

---

### Task 6: Build e push

- [ ] **Step 1: Rodar build**

```bash
npx next build
```

- [ ] **Step 2: Push**

```bash
git push
```

---

## Verificação Final

- [ ] Página `/confirmar-os-externa?numeroOs=X&token=Y` mostra botão Recusar ao lado de Confirmar
- [ ] Ao clicar Recusar, abre modal com textarea
- [ ] Textarea vazio → mostra erro
- [ ] Ao confirmar recusa, salva no banco
- [ ] OS recusada aparece com badge "Recusada" na listagem `/os-externas-list`
- [ ] OS recusada mantém status "Pendente" (não muda para Assinado)
- [ ] API `/api/recusar-os-externa` funciona sem auth (pública como a de confirmação)
