# Funcionalidade: Cancelar Memorando

## Descrição

Esta funcionalidade permite que administradores cancelem memorandos criados anteriormente. Quando um memorando é cancelado, todos os itens vinculados a ele são **automaticamente restaurados** para suas localizações anteriores.

---

## Como Funciona

### 1. Interface do Usuário

Na página `/new-memorandums`, agora existem **3 botões** para cada memorando:

| Botão | Ícone | Cor | Função |
|-------|-------|-----|--------|
| **Ver itens** | 👁️ | Laranja | Abre modal com lista de itens do memorando |
| **PDF** | 📄 | Vermelho | Gera e faz download do PDF do memorando |
| **Cancelar** | 🗑️ | Rosa | Cancela o memorando e restaura itens |

### 2. Fluxo de Cancelamento

```
1. Usuário clica em "Cancelar" em um memorando
                ↓
2. Modal de confirmação é exibido com:
   - Número do memorando
   - Quantidade de itens
   - Tipo (Entrega/Troca)
   - Escola e Distrito
   - Avisos sobre a ação
                ↓
3. Usuário confirma o cancelamento
                ↓
4. API é chamada: POST /api/cancel-memorandum
                ↓
5. Backend executa (em transação):
   - Busca histórico de cada item
   - Restaura Item.schoolId para localização anterior
   - Deleta registros de NewMemorandumItem
   - Deleta registros de ItemHistory relacionados
   - Deleta o NewMemorandum
                ↓
6. Mensagem de sucesso é exibida
                ↓
7. Lista de memorandos é atualizada automaticamente
```

---

## O Que Acontece ao Cancelar?

### Exemplo Prático:

**Antes do Memorando:**
- Item #123 (Notebook Dell) → estava na **Escola A**
- Item #456 (Monitor LG) → estava no **CSDT** (sem escola)

**Memorando Criado:**
- Tipo: Entrega
- Destino: Escola B
- Itens: #123, #456

**Após criação do memorando:**
- Item #123 → movido para **Escola B**
- Item #456 → movido para **Escola B**

**Após CANCELAR o memorando:**
- Item #123 → **volta para Escola A** (onde estava antes)
- Item #456 → **volta para CSDT** (sem escola, onde estava antes)
- Memorando é deletado permanentemente

---

## Permissões

Apenas usuários com as seguintes roles podem cancelar memorandos:
- **ADMTOTAL** (Administrador Total)
- **ADMIN** (Administrador)

Outros usuários verão erro 403 (Acesso Negado) se tentarem cancelar.

---

## Validações e Segurança

### Validações na API:

1. ✅ Token de autenticação obrigatório
2. ✅ Role de ADMIN ou ADMTOTAL necessária
3. ✅ Memorando deve existir no banco
4. ✅ Memorando deve ter itens vinculados
5. ✅ Busca histórico de movimentação para restaurar corretamente

### Segurança:

- Modal de confirmação antes de cancelar (dupla verificação)
- Aviso claro sobre as consequências da ação
- Todas as operações executadas em **transação** (rollback em caso de erro)
- Logs detalhados no console do servidor

---

## API: POST /api/cancel-memorandum

### Endpoint

```
POST /api/cancel-memorandum
```

### Headers

```json
{
  "Authorization": "Bearer <token_do_supabase>",
  "Content-Type": "application/json"
}
```

### Body

```json
{
  "memorandumId": 123
}
```

### Respostas

**Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Memorando #1/2025 cancelado com sucesso",
  "restoredItems": 15,
  "memorandumNumber": "1/2025"
}
```

**Erros:**

- **401 Unauthorized**: Token ausente ou inválido
- **403 Forbidden**: Usuário sem permissão (não é ADMIN/ADMTOTAL)
- **404 Not Found**: Memorando não encontrado
- **400 Bad Request**: ID do memorando inválido ou sem itens
- **500 Internal Server Error**: Erro no servidor

---

## Operações Executadas no Banco

### Transação completa:

```sql
BEGIN;

-- 1. Para cada item do memorando:
UPDATE Item
SET schoolId = <id_escola_anterior>,
    updatedAt = NOW()
WHERE id IN (item1, item2, item3...);

-- 2. Deletar histórico de movimentação
DELETE FROM ItemHistory
WHERE itemId IN (item1, item2, item3...)
  AND generatedBy = '<nome_do_gerador>'
  AND movedAt BETWEEN <createdAt - 5s> AND <createdAt + 5s>;

-- 3. Deletar vínculo de itens com memorando
DELETE FROM NewMemorandumItem
WHERE memorandumId = <id_do_memorando>;

-- 4. Deletar o memorando
DELETE FROM NewMemorandum
WHERE id = <id_do_memorando>;

COMMIT;
```

Se alguma operação falhar, **todas são revertidas** (rollback).

---

## Arquivos Modificados/Criados

### Arquivos Criados:

1. **src/pages/api/cancel-memorandum.ts**
   - API que processa o cancelamento
   - Restaura itens para localização anterior
   - Deleta memorando e registros relacionados

2. **FUNCIONALIDADE-CANCELAR-MEMORANDO.md** (este arquivo)
   - Documentação completa da funcionalidade

### Arquivos Modificados:

1. **src/pages/new-memorandums.tsx**
   - Adicionado botão "Cancelar"
   - Adicionado modal de confirmação
   - Adicionadas funções de cancelamento
   - Novos estados: `cancellingId`, `showCancelConfirm`, `memorandumToCancel`

---

## Logs e Debugging

### Console do Navegador (F12):

Ao cancelar um memorando, você verá logs como:
```
Cancelando memorando: 123
```

### Console do Servidor (Terminal):

Logs detalhados são exibidos no terminal do servidor:
```
[Cancelamento] Memorando #1/2025 - Cancelando...
[Cancelamento] Itens a restaurar: 15
[Cancelamento] Item 45 restaurado para: E.M. ESCOLA ANTIGA
[Cancelamento] Item 67 restaurado para: CSDT (sem escola)
[Cancelamento] Histórico de 15 itens removido
[Cancelamento] Vínculo de 15 itens removido
[Cancelamento] Memorando #1/2025 deletado
```

---

## Melhorias Futuras (Sugestões)

1. **Soft Delete**: Em vez de deletar permanentemente, marcar como "cancelado" e manter no banco
2. **Histórico de Cancelamentos**: Registrar quem cancelou e quando
3. **Restauração de Memorandos**: Poder "descancelar" um memorando
4. **Notificações**: Enviar email quando memorando for cancelado
5. **Auditoria**: Log completo de todas as ações

---

## Testando a Funcionalidade

### Passo a Passo:

1. Acesse a página `/new-memorandums`
2. Localize um memorando na lista
3. Clique no botão **"Cancelar"** (ícone de lixeira, cor rosa)
4. Leia as informações no modal de confirmação
5. Clique em **"Sim, cancelar memorando"**
6. Aguarde o processamento (aparece "Cancelando...")
7. Veja a mensagem de sucesso
8. Verifique que o memorando sumiu da lista
9. Confirme que os itens voltaram para suas localizações anteriores

### Verificação Manual no Banco:

```sql
-- Verificar se o memorando foi deletado
SELECT * FROM "NewMemorandum" WHERE id = <id>;

-- Verificar localização dos itens
SELECT id, name, schoolId FROM "Item" WHERE id IN (<ids_dos_itens>);

-- Verificar histórico
SELECT * FROM "ItemHistory" WHERE itemId IN (<ids_dos_itens>);
```

---

## Perguntas Frequentes

### 1. O que acontece se o histórico não for encontrado?

O item é restaurado para `schoolId = null`, ou seja, volta para o CSDT (sem escola).

### 2. Posso cancelar um memorando muito antigo?

Sim, desde que ele ainda exista no banco de dados e você tenha permissão de ADMIN.

### 3. O cancelamento pode ser desfeito?

Não. O cancelamento é permanente e deleta o memorando e seus registros relacionados.

### 4. Os itens podem ter sido movidos novamente após o memorando?

Sim! A função busca o histórico mais recente relacionado ao memorando específico para restaurar corretamente.

### 5. O que acontece se a API falhar no meio do processo?

Todas as operações estão dentro de uma **transação**. Se alguma falhar, TODAS são revertidas (rollback), mantendo a integridade do banco.

---

## Conclusão

A funcionalidade de cancelamento de memorandos traz mais flexibilidade ao sistema CSDT, permitindo corrigir erros ou reverter movimentações indesejadas de equipamentos.

**Principais benefícios:**
- ✅ Restauração automática de itens
- ✅ Interface intuitiva com confirmação
- ✅ Segurança com permissões de ADMIN
- ✅ Transações que garantem integridade dos dados
- ✅ Logs detalhados para auditoria

---

**Data de Criação**: 05/11/2025
**Versão**: 1.0
**Desenvolvido por**: Claude Code
