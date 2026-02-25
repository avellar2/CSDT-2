# 📍 Guia: Atualizar Endereços das Escolas

## Status Atual
- ✅ **138 escolas** geocodificadas no mapa
- ⚠️ **135 escolas** precisam de endereços corretos

---

## Passo 1: Abrir a Planilha

Abra o arquivo: **`escolas-para-atualizar.csv`**

- Pode usar Excel, Google Sheets ou qualquer editor de planilhas
- As escolas **NÃO geocodificadas** aparecem primeiro

### Colunas:
| Coluna | Descrição |
|--------|-----------|
| ID | ID da escola no banco |
| Nome da Escola | Nome completo |
| Distrito | Distrito/região |
| Endereço Atual | Endereço atual no banco (pode estar errado) |
| Geocodificada | SIM ou NÃO |
| Latitude/Longitude | Coordenadas atuais (se houver) |
| **Novo Endereço** | 👈 **PREENCHA AQUI** |

---

## Passo 2: Pesquisar no Google Maps

Para cada escola **NÃO geocodificada**:

1. Copie o **nome da escola**
2. Pesquise no Google Maps: `[Nome da Escola], Duque de Caxias`
3. Clique na escola que aparecer
4. Copie o **endereço completo** que aparece no Google Maps
5. Cole na coluna **"Novo Endereço (Preencher)"**

### Exemplo:
```
Nome: CRECHE MUNICIPAL EXEMPLO
Google Maps: "R. Exemplo, 123 - Jardim Exemplo, Duque de Caxias - RJ, 25000-000"
→ Cole exatamente isso na coluna "Novo Endereço"
```

### 💡 Dica:
- Foque primeiro nas escolas **mais importantes**
- Não precisa atualizar todas de uma vez
- Deixe em branco as que não encontrar

---

## Passo 3: Salvar a Planilha

- Salve o arquivo como CSV (mesmo nome)
- Mantenha o nome: **`escolas-para-atualizar.csv`**

---

## Passo 4: Importar para o Banco

No terminal, execute:

```bash
node import-updated-addresses.js
```

Isso vai:
- Ler a planilha atualizada
- Atualizar os endereços no banco de dados
- Marcar as escolas para serem geocodificadas novamente

---

## Passo 5: Geocodificar Novamente

1. Abra o **Mapa de Escolas** no sistema
2. Clique no botão **"Geocodificar"** na header
3. Aguarde o processo terminar

As escolas com endereços novos/corretos do Google Maps agora serão encontradas! ✅

---

## ❓ Dúvidas?

- Se uma escola não aparecer no Google Maps, deixe a coluna vazia
- Você pode atualizar em lotes (10, 20, 50 escolas por vez)
- Execute quantas vezes quiser - só atualiza as linhas com "Novo Endereço" preenchido

---

**Boa sorte! 🚀**
