# 🚀 Guia de Instalação - Solução Híbrida CSDT-2

## 📋 Problema Resolvido

Quando você hospeda a aplicação CSDT-2 na Vercel, ela perde acesso às impressoras da sua rede local via SNMP. Esta solução híbrida resolve isso mantendo:

- ✅ **Frontend na Vercel** (acesso web de qualquer lugar)
- ✅ **Monitoramento local** (agente na sua rede)
- ✅ **Comunicação automática** entre os dois

## 🏗️ Arquitetura

```
[Impressoras LAN] ←→ [Agente Local] ←→ [Internet] ←→ [Vercel App] ←→ [Usuários]
     SNMP            HTTP API           HTTPS         React/Next.js
```

## ⚡ Instalação Rápida

### 1. Configurar Variável na Vercel

No painel da Vercel, adicione a variável de ambiente:

```
LOCAL_AGENT_API_KEY=sua-chave-secreta-muito-forte-aqui
```

💡 **Dica:** Gere uma chave forte com: `node -p "require('crypto').randomBytes(32).toString('hex')"`

### 2. Instalar o Agente Local

```bash
cd local-agent
npm install
npm run setup
```

O setup irá:
- ✅ Gerar API Key automaticamente
- ✅ Configurar URLs e timeouts
- ✅ Criar arquivo `.env`
- ✅ Mostrar próximos passos

### 3. Testar a Configuração

```bash
npm run test-connection
```

Este comando verifica:
- 🌐 Conectividade com Vercel
- 🔐 Autenticação da API Key
- 📡 Comunicação SNMP com impressoras
- 📤 Envio de dados para a nuvem

### 4. Executar o Agente

**Modo desenvolvimento:**
```bash
npm run dev
```

**Como serviço Windows (recomendado):**
```bash
# Execute como Administrador
npm run install-service
```

### 5. Verificar Funcionamento

1. **Interface do agente:** http://localhost:3001/status
2. **Aplicação web:** Vá em "Impressoras" - deve mostrar "🏠 Agente Local"

## 🔧 Como Funciona

### Fluxo de Dados

1. **Agente Local** monitora impressoras via SNMP (a cada 30s)
2. **Envia dados** para Vercel via HTTPS
3. **Vercel armazena** em cache (5 minutos)
4. **Frontend** usa dados do agente ou fallback local

### Estratégia de Fallback

```typescript
// Prioridade dos dados
1. Dados do agente local (< 5 min) ✅ Preferido
2. SNMP direto da Vercel ⚠️ Limitado
3. Ping básico 🔄 Último recurso
```

## 📊 Monitoramento

### Status do Agente
```bash
curl http://localhost:3001/status
```

### Forçar Verificação
```bash
curl -X POST http://localhost:3001/check-now
```

### Logs
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Tudo

## ⚙️ Configurações Importantes

### Performance por Tamanho de Rede

**Rede pequena (< 20 impressoras):**
```env
CHECK_INTERVAL=30
SNMP_TIMEOUT=3000
```

**Rede média (20-50 impressoras):**
```env
CHECK_INTERVAL=45
SNMP_TIMEOUT=5000
```

**Rede grande (> 50 impressoras):**
```env
CHECK_INTERVAL=60
SNMP_TIMEOUT=8000
```

## 🛠️ Resolução de Problemas

### ❌ "Nenhuma impressora detectada"

1. Verifique se o agente está rodando:
   ```bash
   curl http://localhost:3001/status
   ```

2. Teste SNMP manual:
   ```bash
   snmpwalk -v2c -c public IP_IMPRESSORA 1.3.6.1.2.1.1.1.0
   ```

### ❌ "Erro de autenticação"

1. Verifique se a `LOCAL_AGENT_API_KEY` está configurada na Vercel
2. Compare com o valor em `local-agent/.env`
3. Redeploy na Vercel após adicionar variável

### ❌ "Timeout na comunicação"

1. Verifique conectividade:
   ```bash
   ping sua-app.vercel.app
   ```

2. Teste o endpoint:
   ```bash
   npm run test-connection
   ```

## 🔐 Segurança

### ✅ Boas Práticas

1. **API Key forte** (32+ caracteres aleatórios)
2. **Firewall configurado** (apenas IPs necessários)
3. **Logs monitorados** regularmente
4. **Atualizações automáticas** do agente

### 🚨 Alertas de Segurança

O agente logga tentativas de acesso não autorizado:
```
[WARN] Tentativa de acesso não autorizada ao endpoint do agente local
```

## 📈 Vantagens da Solução

### ✅ Benefícios

- 🌐 **Acesso global** via web
- 🏠 **Monitoramento local** preciso
- 🔄 **Fallback automático** em falhas
- 📊 **Cache inteligente** para performance
- 🛡️ **Segurança** com API Keys
- 💻 **Instalação simples** como serviço Windows

### 📊 Comparação

| Funcionalidade | Só Vercel | Só Local | **Híbrido** |
|----------------|-----------|----------|-------------|
| Acesso remoto | ✅ | ❌ | ✅ |
| SNMP preciso | ❌ | ✅ | ✅ |
| Escalabilidade | ✅ | ⚠️ | ✅ |
| Confiabilidade | ⚠️ | ✅ | ✅ |
| Setup simples | ✅ | ✅ | ✅ |

## 🎯 Próximos Passos

Após instalação:

1. **Configure alertas** para impressoras críticas
2. **Monitore logs** do agente
3. **Documente IPs** das impressoras
4. **Treine usuários** na nova interface
5. **Configure backup** do agente

## 📞 Suporte

Se encontrar problemas:

1. ✅ Execute `npm run test-connection`
2. ✅ Verifique logs em `logs/`
3. ✅ Teste ping nas impressoras
4. ✅ Valide variáveis de ambiente
5. ✅ Consulte este guia

---

## 🎉 Pronto!

Sua solução híbrida está funcionando quando você vê **"🏠 Agente Local"** na página de impressoras da aplicação web.

**Aproveite o melhor dos dois mundos: acesso global + monitoramento local preciso!** 🚀