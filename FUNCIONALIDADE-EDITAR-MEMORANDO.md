# Funcionalidade: Editar Memorando

## Descrição

Esta funcionalidade permite que administradores editem memorandos existentes, **adicionando ou removendo itens** conforme necessário. Ideal para quando você esquece de incluir um item ou precisa fazer ajustes sem precisar excluir e refazer o memorando completo.

---

## Como Funciona

### 1. Interface do Usuário

Na página `/new-memorandums`, agora existem **4 botões** para cada memorando:

| Botão | Ícone | Cor | Função |
|-------|-------|-----|--------|
| **Ver itens** | 👁️ | Laranja | Abre modal com lista de itens do memorando |
| **PDF** | 📄 | Vermelho | Gera e faz download do PDF do memorando |
| **Editar** | ✏️ | Azul | Edita o memorando (adicionar ou remover itens) |
| **Cancelar** | 🗑️ | Rosa | Cancela o memorando e restaura itens |

### 2. Fluxo de Edição

```
1. Usuário clica em "Editar" em um memorando
                ↓
2. Modal de edição é aberto com:
   - Informações do memorando
   - Lista de itens atuais (com checkbox para remover)
   - Lista de itens disponíveis (com checkbox para adicionar)
   - Campo de busca para filtrar itens
                ↓
3. Usuário marca itens para remover e/ou adicionar
                ↓
4. Resumo das alterações é exibido
                ↓
5. Usuário clica em "Salvar Alterações"
                ↓
6. API é chamada: POST /api/edit-memorandum
                ↓
7. Backend executa (em transação):
   - Para itens adicionados:
     • Cria NewMemorandumItem
     • Atualiza Item.schoolId para escola do memorando
     • Cria ItemHistory registrando a movimentação
   - Para itens removidos:
     • Deleta NewMemorandumItem
     • Restaura Item.schoolId para localização anterior
     • Deleta ItemHistory criado pelo memorando
                ↓
8. Mensagem de sucesso é exibida
                ↓
9. Lista de memorandos é atualizada automaticamente
```

---

## O Que Acontece ao Editar?

### Exemplo Prático:

**Memorando Original:**
- Número: #1/2025
- Tipo: Entrega para Escola B
- Itens: #123 (Notebook Dell), #456 (Monitor LG)

**Usuário Edita e:**
- ✅ **Adiciona**: Item #789 (Mouse Logitech)
- ❌ **Remove**: Item #456 (Monitor LG)

**Após salvar:**
- Item #789 → **movido para Escola B** (adicionado ao memorando)
- Item #456 → **volta para onde estava antes** (removido do memorando)
- Item #123 → **permanece na Escola B** (não foi alterado)

**Memorando Atualizado:**
- Itens: #123 (Notebook Dell), #789 (Mouse Logitech)

---

## Permissões

Apenas usuários com as seguintes roles podem editar memorandos:
- **ADMTOTAL** (Administrador Total)
- **ADMIN** (Administrador)

Outros usuários verão erro 403 (Acesso Negado) se tentarem editar.

---

## Validações e Segurança

### Validações na API:

1. ✅ Token de autenticação obrigatório
2. ✅ Role de ADMIN ou ADMTOTAL necessária
3. ✅ Memorando deve existir no banco
4. ✅ Pelo menos uma alteração (adicionar ou remover) é obrigatória
5. ✅ Itens a adicionar não podem já estar no memorando
6. ✅ Itens a remover devem estar no memorando
7. ✅ Busca histórico para restaurar localização correta ao remover itens

### Segurança:

- Todas as operações executadas em **transação** (rollback em caso de erro)
- Logs detalhados no console do servidor
- Validação de itens duplicados
- Restauração inteligente usando histórico de movimentações

---

## API: POST /api/edit-memorandum

### Endpoint

```
POST /api/edit-memorandum
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
  "memorandumId": 123,
  "itemsToAdd": [789, 101, 202],      // IDs dos itens a adicionar (opcional)
  "itemsToRemove": [456]              // IDs dos itens a remover (opcional)
}
```

### Respostas

**Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Memorando #1/2025 editado com sucesso",
  "addedItems": 3,
  "removedItems": 1,
  "memorandumNumber": "1/2025"
}
```

**Erros:**

- **401 Unauthorized**: Token ausente ou inválido
- **403 Forbidden**: Usuário sem permissão (não é ADMIN/ADMTOTAL)
- **404 Not Found**: Memorando não encontrado
- **400 Bad Request**: Nenhuma alteração especificada, ou IDs inválidos
- **500 Internal Server Error**: Erro no servidor

---

## API: GET /api/get-available-items-for-memorandum

### Endpoint

```
GET /api/get-available-items-for-memorandum?memorandumId=123
```

### Headers

```json
{
  "Authorization": "Bearer <token_do_supabase>"
}
```

### Descrição

Retorna todos os itens que **não estão** no memorando especificado, disponíveis para serem adicionados.

### Resposta (200 OK)

```json
{
  "success": true,
  "items": [
    {
      "id": 789,
      "name": "Mouse",
      "brand": "Logitech",
      "serialNumber": "SN-789",
      "status": "DISPONIVEL",
      "schoolName": "CSDT",
      "schoolId": null
    },
    {
      "id": 101,
      "name": "Teclado",
      "brand": "Razer",
      "serialNumber": "SN-101",
      "status": "DISPONIVEL",
      "schoolName": "E.M. ESCOLA A",
      "schoolId": 5
    }
  ],
  "total": 2
}
```

---

## Operações Executadas no Banco

### Transação completa ao editar:

```sql
BEGIN;

-- ========== ADICIONAR ITENS ==========

FOR EACH item_to_add:

  -- 1. Criar vínculo com memorando
  INSERT INTO NewMemorandumItem (memorandumId, itemId)
  VALUES (<memorandum_id>, <item_id>);

  -- 2. Atualizar localização do item
  UPDATE Item
  SET schoolId = <escola_do_memorando>,
      updatedAt = NOW()
  WHERE id = <item_id>;

  -- 3. Criar registro de histórico
  INSERT INTO ItemHistory (itemId, fromSchool, toSchool, generatedBy, movedAt)
  VALUES (<item_id>, '<escola_anterior>', '<escola_memorando>', '<gerador>', NOW());

END FOR;

-- ========== REMOVER ITENS ==========

FOR EACH item_to_remove:

  -- 1. Buscar localização anterior (histórico)
  SELECT * FROM ItemHistory
  WHERE itemId = <item_id>
    AND generatedBy = '<gerador_memorando>'
  ORDER BY movedAt DESC
  LIMIT 1;

  -- 2. Deletar vínculo com memorando
  DELETE FROM NewMemorandumItem
  WHERE memorandumId = <memorandum_id>
    AND itemId = <item_id>;

  -- 3. Restaurar localização do item
  UPDATE Item
  SET schoolId = <escola_anterior>,
      updatedAt = NOW()
  WHERE id = <item_id>;

  -- 4. Deletar histórico criado pelo memorando
  DELETE FROM ItemHistory
  WHERE id = <history_id>;

END FOR;

COMMIT;
```

Se alguma operação falhar, **todas são revertidas** (rollback).

---

## Modal de Edição

O modal de edição possui:

### 1. Header (Azul/Índigo)
- Ícone de edição
- Título "Editar Memorando"
- Número do memorando
- Botão X para fechar

### 2. Informações do Memorando
- Tipo (Entrega/Troca)
- Escola
- Distrito
- Gerado por

### 3. Itens Atuais do Memorando
- Lista com checkbox de todos os itens do memorando
- Marcar checkbox = item será removido
- Label vermelha "Será removido" nos selecionados

### 4. Adicionar Novos Itens
- Campo de busca (filtra por nome, marca, série, escola)
- Lista com checkbox de itens disponíveis
- Mostra escola atual de cada item
- Marcar checkbox = item será adicionado
- Label verde "Será adicionado" nos selecionados

### 5. Resumo das Alterações
- Aparece quando há alterações pendentes
- Mostra quantidade de itens a adicionar e remover

### 6. Footer
- Botão "Cancelar" (fecha sem salvar)
- Botão "Salvar Alterações" (executa a edição)

---

## Arquivos Criados

### 1. src/pages/api/edit-memorandum.ts
- API que processa a edição do memorando
- Adiciona novos itens (cria vínculos, move itens, registra histórico)
- Remove itens (deleta vínculos, restaura localização, remove histórico)

### 2. src/pages/api/get-available-items-for-memorandum.ts
- API que retorna itens disponíveis para adicionar
- Filtra itens que já estão no memorando

### 3. FUNCIONALIDADE-EDITAR-MEMORANDO.md (este arquivo)
- Documentação completa da funcionalidade

---

## Arquivos Modificados

### 1. src/pages/new-memorandums.tsx
- Adicionado botão "Editar" (azul)
- Adicionado modal completo de edição
- Adicionadas funções de gerenciamento:
  - `openEditModal` - abre modal e busca itens disponíveis
  - `closeEditModal` - fecha e limpa estados
  - `fetchAvailableItems` - busca itens disponíveis na API
  - `toggleItemToRemove` - marca/desmarca item para remoção
  - `toggleItemToAdd` - marca/desmarca item para adição
  - `saveEdit` - salva as alterações
- Novos estados:
  - `showEditModal`
  - `memorandumToEdit`
  - `availableItems`
  - `loadingAvailableItems`
  - `itemsToRemove`
  - `itemsToAdd`
  - `savingEdit`
  - `editSearchTerm`

---

## Logs e Debugging

### Console do Navegador (F12):

Ao editar um memorando, você verá logs como:
```
Editando memorando: 123
```

### Console do Servidor (Terminal):

Logs detalhados são exibidos:
```
[Edição] Memorando #1/2025 - Iniciando edição...
[Edição] Itens a adicionar: 3
[Edição] Itens a remover: 1
[Edição] Item 789 adicionado: CSDT → E.M. ESCOLA B
[Edição] Item 101 adicionado: E.M. ESCOLA A → E.M. ESCOLA B
[Edição] Item 202 adicionado: CSDT → E.M. ESCOLA B
[Edição] Item 456 removido e restaurado para: CSDT
[Edição] Memorando #1/2025 editado com sucesso
```

---

## Casos de Uso

### Caso 1: Esqueceu de incluir um item
**Problema**: Criou memorando mas esqueceu de incluir 2 itens
**Solução**:
1. Clique em "Editar"
2. Na seção "Adicionar Novos Itens", marque os 2 itens
3. Clique em "Salvar Alterações"
4. Os itens são adicionados ao memorando

### Caso 2: Incluiu item errado
**Problema**: Incluiu um item que não deveria estar no memorando
**Solução**:
1. Clique em "Editar"
2. Na seção "Itens Atuais", marque o item errado
3. Clique em "Salvar Alterações"
4. O item é removido e volta para onde estava

### Caso 3: Substituir itens
**Problema**: Quer trocar alguns itens do memorando
**Solução**:
1. Clique em "Editar"
2. Marque os itens a remover na seção "Itens Atuais"
3. Marque os itens a adicionar na seção "Adicionar Novos Itens"
4. Clique em "Salvar Alterações"
5. Ambas operações acontecem simultaneamente

---

## Melhorias Futuras (Sugestões)

1. **Histórico de Edições**: Registrar quem editou e quando
2. **Comparação de Versões**: Ver mudanças entre versões do memorando
3. **Notificações**: Enviar email quando memorando for editado
4. **Regenerar PDF**: Opção para regenerar PDF após edição
5. **Desfazer Edição**: Poder reverter para versão anterior

---

## Diferenças: Editar vs. Cancelar

| Característica | **Editar** | **Cancelar** |
|----------------|------------|--------------|
| **Memorando** | Permanece no sistema | É deletado |
| **Itens atuais** | Continuam no memorando | Todos voltam para origem |
| **Ajustes** | Adiciona/remove itens específicos | Remove tudo |
| **PDF** | Continua válido (pode regenerar se necessário) | Perde validade |
| **Histórico** | Mantém e adiciona novos registros | Apaga registros relacionados |
| **Quando usar** | Esqueceu item ou incluiu errado | Criou memorando errado completamente |

---

## Testando a Funcionalidade

### Passo a Passo:

1. Acesse a página `/new-memorandums`
2. Localize um memorando na lista
3. Clique no botão **"Editar"** (ícone de lápis, cor azul)
4. Veja as informações do memorando
5. **Para remover itens**: Marque checkbox na seção "Itens Atuais"
6. **Para adicionar itens**:
   - Use a busca para filtrar (opcional)
   - Marque checkbox na seção "Adicionar Novos Itens"
7. Veja o resumo das alterações
8. Clique em **"Salvar Alterações"**
9. Aguarde o processamento (aparece "Salvando...")
10. Veja a mensagem de sucesso
11. Verifique que a lista foi atualizada

### Verificação Manual no Banco:

```sql
-- Ver itens do memorando
SELECT * FROM "NewMemorandumItem" WHERE "memorandumId" = <id>;

-- Ver localização dos itens
SELECT id, name, schoolId FROM "Item" WHERE id IN (<ids_dos_itens>);

-- Ver histórico
SELECT * FROM "ItemHistory" WHERE itemId IN (<ids_dos_itens>) ORDER BY movedAt DESC;
```

---

## Perguntas Frequentes

### 1. Posso adicionar e remover itens na mesma edição?

Sim! Você pode marcar itens para remover E marcar itens para adicionar, tudo na mesma operação.

### 2. O que acontece se eu marcar um item que já está no memorando para adicionar?

A API detecta isso automaticamente e ignora, evitando duplicatas.

### 3. Os itens removidos voltam para onde?

Sim! O sistema busca no histórico de movimentações e restaura o item para a localização anterior ao memorando.

### 4. Preciso regenerar o PDF após editar?

Não é obrigatório, mas você pode clicar em "PDF" novamente para gerar uma versão atualizada com os novos itens.

### 5. Posso editar um memorando muito antigo?

Sim, desde que ele ainda exista no banco de dados e você tenha permissão de ADMIN.

### 6. A edição pode ser desfeita?

Não automaticamente. Mas você pode usar o botão "Editar" novamente para fazer o caminho inverso (adicionar o que removeu, remover o que adicionou).

---

## Conclusão

A funcionalidade de edição de memorandos traz **flexibilidade** ao sistema CSDT, permitindo ajustes rápidos sem precisar refazer todo o processo.

**Principais benefícios:**
- ✅ Adicionar itens esquecidos facilmente
- ✅ Remover itens incluídos por engano
- ✅ Interface intuitiva com busca e checkboxes
- ✅ Restauração automática ao remover itens
- ✅ Transações que garantem integridade dos dados
- ✅ Logs detalhados para auditoria
- ✅ Mantém o memorando válido (não precisa recriá-lo)

---

**Data de Criação**: 05/11/2025
**Versão**: 1.0
**Desenvolvido por**: Claude Code
