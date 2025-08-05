# CSDT-2 Local Agent

Agente local para monitoramento SNMP das impressoras quando a aplicação principal está hospedada na Vercel.

## 📋 Visão Geral

Este agente resolve o problema de conectividade LAN quando a aplicação web está na nuvem (Vercel). Ele roda localmente na sua rede e monitora as impressoras via SNMP, enviando os dados para a aplicação web.

### 🏗️ Arquitetura Híbrida

```
[Impressoras LAN] ←→ [Agente Local] ←→ [Internet] ←→ [Vercel App] ←→ [Usuários]
```

## 🚀 Instalação e Configuração

### 1. Instalar Dependências

```bash
cd local-agent
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
copy .env.example .env
```

Edite o arquivo `.env`:

```env
# URL da sua aplicação na Vercel
VERCEL_APP_URL=https://sua-app.vercel.app

# Chave de API (crie uma chave segura)
API_KEY=sua-chave-secreta-muito-forte-aqui

# Intervalo de verificação em segundos
CHECK_INTERVAL=30

# Porta do servidor local
LOCAL_PORT=3001

# Configurações SNMP
SNMP_TIMEOUT=5000
SNMP_RETRIES=2
SNMP_COMMUNITY=public

# Nível de log
LOG_LEVEL=info
```

### 3. Configurar a Aplicação Vercel

Adicione estas variáveis de ambiente na Vercel:

```env
LOCAL_AGENT_API_KEY=sua-chave-secreta-muito-forte-aqui
```

## 🎯 Execução

### Modo Desenvolvimento

```bash
npm run dev
```

### Modo Produção

```bash
npm start
```

### Como Serviço Windows (Recomendado)

**Execute como Administrador:**

```bash
# Instalar como serviço
npm run install-service

# Remover serviço
npm run uninstall-service
```

## 📊 Monitoramento

### Interface Web Local

Acesse: `http://localhost:3001/status`

```json
{
  "status": "running",
  "lastCheck": "2025-01-08T10:30:00.000Z",
  "totalPrinters": 25,
  "config": {
    "vercelAppUrl": "https://sua-app.vercel.app",
    "checkInterval": 30,
    "localPort": 3001
  }
}
```

### Endpoints Disponíveis

- `GET /status` - Status do agente
- `POST /check-now` - Forçar verificação imediata
- `GET /last-results` - Últimos resultados

## 📝 Logs

Os logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs

## 🔧 Funcionalidades

### ✅ Monitoramento SNMP Completo
- Status das impressoras
- Níveis de toner e papel
- Detecção de erros
- Tempo de resposta
- Classificação por severidade

### ✅ Comunicação Híbrida
- Envia dados para Vercel automaticamente
- Fallback local quando Vercel está indisponível
- Cache inteligente para otimização

### ✅ Robustez
- Retry automático em falhas
- Timeout configurável
- Logs detalhados
- Instalação como serviço Windows

## 🛠️ Resolução de Problemas

### Problema: Impressoras não são detectadas

1. **Verifique conectividade:**
   ```bash
   ping IP_DA_IMPRESSORA
   ```

2. **Teste SNMP manual:**
   ```bash
   snmpwalk -v2c -c public IP_DA_IMPRESSORA 1.3.6.1.2.1.1.1.0
   ```

3. **Verifique logs:**
   ```
   tail -f logs/combined.log
   ```

### Problema: Não consegue enviar para Vercel

1. **Verifique URL:** Certifique-se que `VERCEL_APP_URL` está correto
2. **Verifique API Key:** Deve ser igual na Vercel e no agente
3. **Teste conectividade:**
   ```bash
   curl https://sua-app.vercel.app/api/printer-status-from-agent
   ```

### Problema: Serviço não inicia

1. **Execute como Administrador**
2. **Verifique se Node.js está no PATH**
3. **Verifique logs do Windows:** Event Viewer → Applications

## 📈 Performance

### Configurações Recomendadas

**Rede pequena (< 20 impressoras):**
```env
CHECK_INTERVAL=30
SNMP_TIMEOUT=3000
SNMP_RETRIES=1
```

**Rede média (20-50 impressoras):**
```env
CHECK_INTERVAL=45
SNMP_TIMEOUT=5000
SNMP_RETRIES=2
```

**Rede grande (> 50 impressoras):**
```env
CHECK_INTERVAL=60
SNMP_TIMEOUT=8000
SNMP_RETRIES=2
```

## 🔐 Segurança

### Recomendações

1. **Gere uma API Key forte:**
   ```bash
   node -p "require('crypto').randomBytes(32).toString('hex')"
   ```

2. **Limite acesso de rede:** Configure firewall para permitir apenas IPs necessários

3. **Monitor logs:** Acompanhe tentativas de acesso não autorizado

4. **Atualize regularmente:** Mantenha dependências atualizadas

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs em `logs/`
2. Teste conectividade com impressoras
3. Valide configuração do `.env`
4. Verifique status em `http://localhost:3001/status`

## 🔄 Atualizações

Para atualizar o agente:

```bash
# Parar serviço
net stop CSDT2-LocalAgent

# Atualizar código
git pull
npm install

# Reiniciar serviço
net start CSDT2-LocalAgent
```