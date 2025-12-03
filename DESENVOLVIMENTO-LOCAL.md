# 🚀 Guia de Desenvolvimento Local

Este guia explica como usar o banco de dados local para desenvolvimento/testes sem afetar o banco de produção.

## 📋 Pré-requisitos

- ✅ PostgreSQL 18 instalado localmente
- ✅ Senha do PostgreSQL: `36595145v`
- ✅ Banco de dados: `csdt_dev`

## 🔧 Configuração Inicial (já feito!)

Os seguintes arquivos já foram configurados:

- ✅ `.env` - Banco de **PRODUÇÃO** (Supabase)
- ✅ `.env.local` - Banco **LOCAL** (PostgreSQL)
- ✅ Scripts em `scripts/`:
  - `setup-local-db.js` - Criar banco local
  - `copy-prod-to-local.js` - Copiar dados de produção

## 🎯 Como Usar

### 1. Desenvolvimento (Banco LOCAL)

```bash
# Next.js automaticamente usa .env.local quando existe
npm run dev
```

A aplicação vai rodar em `http://localhost:3000` usando o **banco LOCAL**.

### 2. Produção (Banco Supabase)

```bash
# Renomear temporariamente o .env.local
mv .env.local .env.local.backup

# Rodar aplicação
npm run dev

# Restaurar .env.local
mv .env.local.backup .env.local
```

## 🔄 Atualizar Dados do Banco Local

Se quiser atualizar o banco local com dados mais recentes de produção:

```bash
node scripts/copy-prod-to-local.js
```

Isso vai copiar:
- ✅ Todas as escolas (269)
- ✅ Todos os usuários/técnicos (15)
- ✅ Escalas dos últimos 30 dias
- ⚠️ **NÃO copia**: OS, Items, Memorandos, etc. (adicione no script se precisar)

## 🗄️ Gerenciar Banco Local

### Via pgAdmin (Interface Gráfica)

1. Abrir pgAdmin 4
2. Conectar em `localhost:5432`
3. Banco: `csdt_dev`
4. Senha: `36595145v`

### Via Linha de Comando

```bash
# Conectar no banco
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d csdt_dev

# Listar tabelas
\dt

# Ver dados
SELECT * FROM "School" LIMIT 10;

# Sair
\q
```

## ⚠️ Importante

### ✅ Vantagens

- Testa sem afetar produção
- Pode fazer testes de migração
- Pode "quebrar" à vontade
- Mais rápido (sem latência de rede)

### ❌ Limitações

- Auth ainda usa Supabase (produção)
- Dados não são sincronizados automaticamente
- Precisa rodar `copy-prod-to-local.js` para atualizar

## 🛠️ Troubleshooting

### Erro de conexão com PostgreSQL

```bash
# Verificar se serviço está rodando
net start | findstr -i postgres

# Se não estiver, iniciar
net start postgresql-x64-18
```

### Banco está desatualizado

```bash
# Recriar estrutura
npx prisma db push

# Copiar dados novamente
node scripts/copy-prod-to-local.js
```

### Limpar banco e recomeçar

```bash
# 1. Dropar banco
"C:\Program Files\PostgreSQL\18\bin\dropdb.exe" -U postgres csdt_dev

# 2. Recriar tudo
node scripts/setup-local-db.js
npx prisma db push
node scripts/copy-prod-to-local.js
```

## 📝 Notas

- `.env.local` tem prioridade sobre `.env` no Next.js
- `.env.local` não sobe pro Git (está no .gitignore)
- Sempre use `.env.local` para desenvolvimento
- Nunca altere `.env` (produção)

---

**Dúvidas?** Leia a documentação do Next.js sobre [variáveis de ambiente](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables).
