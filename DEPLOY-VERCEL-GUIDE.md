# 🚀 Guia de Deploy - Vercel com Solução Híbrida

## 📋 Pré-requisitos

- ✅ Conta na Vercel
- ✅ Banco PostgreSQL (Supabase, Neon, etc.)
- ✅ Repositório Git com as modificações híbridas

## ⚡ Deploy Rápido

### 1. Preparar Deploy

```bash
npm run deploy:prepare
```

Este comando:
- ✅ Verifica se todos os arquivos híbridos estão presentes
- ✅ Instala dependências
- ✅ Gera cliente Prisma
- ✅ Faz build do Next.js
- ✅ Mostra informações importantes

### 2. Configurar Variáveis de Ambiente na Vercel

No painel da Vercel, adicione estas variáveis:

#### **Variáveis Existentes (que você já tem):**
```env
DATABASE_URL=postgresql://user:pass@host:port/db
DIRECT_URL=postgresql://user:pass@host:port/db
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Nova Variável Híbrida:**
```env
LOCAL_AGENT_API_KEY=sua-chave-secreta-muito-forte-aqui
```

💡 **Gerar chave forte:**
```bash
node -p "require('crypto').randomBytes(32).toString('hex')"
```

### 3. Fazer Deploy

**Opção A - Via CLI:**
```bash
npm run deploy:vercel
```

**Opção B - Via Interface Vercel:**
1. Conecte seu repositório
2. Configure as variáveis de ambiente
3. Clique em "Deploy"

### 4. Configurar Agente Local (Após Deploy)

```bash
cd local-agent
npm install
npm run setup
```

Use a **mesma `LOCAL_AGENT_API_KEY`** nos dois lugares!

## 🔧 Configurações Detalhadas

### Arquivo `vercel.json`

```json
{
  "version": 2,
  "name": "csdt2-hybrid",
  "framework": "nextjs",
  "functions": {
    "src/pages/api/printer-status.ts": {
      "maxDuration": 30
    },
    "src/pages/api/printer-status-from-agent.ts": {
      "maxDuration": 10
    }
  },
  "regions": ["gru1"]
}
```

### Arquivos Ignorados (`.vercelignore`)

```
local-agent/
*.md
!README.md
logs/
*.log
```

## 🧪 Testar Deploy

### 1. Verificar Aplicação Web

1. Acesse sua URL da Vercel
2. Faça login no sistema
3. Vá em "Impressoras"
4. Deve mostrar: **"☁️ Vercel SNMP"** (sem agente local ainda)

### 2. Configurar Agente Local

```bash
cd local-agent
npm run setup
# Configure com a URL da Vercel e a mesma API Key
```

### 3. Testar Comunicação

```bash
npm run test-connection
```

Deve mostrar:
- ✅ Conexão com Vercel OK
- ✅ Endpoint do agente OK
- ✅ SNMP OK para impressoras

### 4. Executar Agente

```bash
npm run install-service  # Como Administrador
```

### 5. Verificar Funcionamento Híbrido

1. Vá na página "Impressoras" da web
2. Deve mostrar: **"🏠 Agente Local"**
3. Status das impressoras deve estar detalhado

## 🔍 Solução de Problemas

### ❌ Erro: "Module not found: printer-status-from-agent"

**Solução:** Certifique-se que o arquivo existe:
```bash
ls src/pages/api/printer-status-from-agent.ts
```

### ❌ Erro: "Unauthorized - Invalid API Key"

**Soluções:**
1. Verifique se `LOCAL_AGENT_API_KEY` está configurada na Vercel
2. Use a mesma chave no agente local
3. Redeploy na Vercel após adicionar variável

### ❌ Erro: "Function timeout"

**Solução:** Aumente timeout no `vercel.json`:
```json
"functions": {
  "src/pages/api/printer-status.ts": {
    "maxDuration": 60
  }
}
```

### ❌ Impressoras não aparecem

**Verificações:**
1. ✅ Banco de dados está conectado?
2. ✅ Tabela `Printer` tem dados?
3. ✅ Agente local está rodando?
4. ✅ API Key está correta?

## 📊 Monitoramento Pós-Deploy

### Logs da Vercel

```bash
vercel logs --follow
```

### Status do Agente Local

```bash
curl http://localhost:3001/status
```

### Teste Manual das APIs

```bash
# Testar API de impressoras
curl https://sua-app.vercel.app/api/printers

# Testar endpoint híbrido (precisa da API Key)
curl -H "Authorization: Bearer sua-api-key" \
     https://sua-app.vercel.app/api/printer-status-from-agent
```

## 🎯 Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Arquivos híbridos criados
- [ ] API modificada para suporte híbrido
- [ ] Build funcionando localmente
- [ ] Variáveis de ambiente preparadas

### ✅ Deploy
- [ ] Conectar repositório na Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Deploy executado com sucesso
- [ ] Aplicação acessível na web

### ✅ Pós-Deploy
- [ ] Agente local configurado
- [ ] Teste de comunicação OK
- [ ] Serviço Windows instalado
- [ ] Interface mostra "🏠 Agente Local"

## 🚀 Comandos Úteis

```bash
# Preparar e fazer deploy
npm run deploy:vercel

# Apenas preparar (verificar erros)
npm run deploy:prepare

# Deploy manual
vercel --prod

# Ver logs em tempo real
vercel logs --follow

# Configurar agente local
cd local-agent && npm run setup

# Testar tudo
cd local-agent && npm run test-connection
```

## 🎉 Resultado Final

Após deploy completo, você terá:

- 🌐 **Aplicação web** na Vercel (acesso global)
- 🏠 **Agente local** na sua rede (monitoramento SNMP)
- 🔄 **Comunicação híbrida** automática
- 📊 **Interface unificada** mostrando origem dos dados
- 🛡️ **Fallback inteligente** em caso de falhas

**A página de impressoras mostrará "🏠 Agente Local" quando tudo estiver funcionando!** ✨