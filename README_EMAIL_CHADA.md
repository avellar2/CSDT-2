# Configuração do Sistema de Email Automático para CHADA

## 📋 Resumo

Este sistema automatiza o envio de emails para a CHADA quando um item é adicionado, e captura automaticamente o número de OS que a CHADA responde.

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente (.env)

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
# Email do CSDT (para enviar e receber emails)
CSDT_EMAIL_USER="csdt@smeduquedecaxias.rj.gov.br"
CSDT_EMAIL_PASS="sua-senha-aqui"

# Configurações SMTP (envio)
CSDT_EMAIL_HOST="smtp.gmail.com"
CSDT_EMAIL_PORT="587"

# Configurações IMAP (recebimento)
CSDT_EMAIL_IMAP_HOST="imap.gmail.com"
CSDT_EMAIL_IMAP_PORT="993"

# Email da CHADA (destinatário)
CHADA_EMAIL="sac@xscan.com.br"
CHADA_EMAIL_DOMAIN="xscan.com.br"
```

### 2. Para Teste (usando seu próprio email)

Se quiser testar primeiro com seu próprio email antes de usar o email real da CHADA:

```env
# Substitua temporariamente por:
CHADA_EMAIL="seu-email-de-teste@gmail.com"
```

### 3. Configurações do Gmail

Se o email do CSDT for Google Workspace (gmail):

1. Acesse https://myaccount.google.com/apppasswords
2. Crie uma "Senha de Aplicativo" com nome "CSDT System"
3. Use essa senha de 16 dígitos no `CSDT_EMAIL_PASS`

### 4. Configurações de outros provedores

**Microsoft 365 / Outlook:**
```env
CSDT_EMAIL_HOST="smtp.office365.com"
CSDT_EMAIL_PORT="587"
CSDT_EMAIL_IMAP_HOST="outlook.office365.com"
CSDT_EMAIL_IMAP_PORT="993"
```

**Servidor próprio da prefeitura:**
Consulte o TI para obter:
- Host SMTP (envio)
- Porta SMTP (geralmente 587 ou 465)
- Host IMAP (recebimento)
- Porta IMAP (geralmente 993)

## 🚀 Como Funciona

### Fluxo Automático:

1. **Usuário adiciona item à CHADA** na página `/chada`
2. **Sistema envia email automaticamente** para `CHADA_EMAIL`
3. **Email contém:**
   - Dados do equipamento (marca, modelo, serial)
   - Problema relatado
   - Setor de origem
   - Solicitante

4. **CHADA responde** com número de OS
5. **Sistema verifica emails** a cada 2 horas (cron job automático)
6. **Número de OS é capturado** e salvo automaticamente
7. **Aparece na interface** junto com o item

### Verificação Manual:

Você também pode clicar no botão **"Verificar Emails"** na página `/chada` para forçar uma verificação imediata.

## 📧 Formatos de OS Reconhecidos

O sistema reconhece os seguintes padrões de número de OS no email de resposta:

- `OS: 12345`
- `O.S. 12345`
- `OS #12345`
- `Protocolo: 12345`
- `Número: 12345`
- `número da OS: 12345`

## 🔍 Testando o Sistema

### Teste 1: Envio de Email

1. Adicione um item de teste à CHADA
2. Verifique se o email foi enviado (pode ver nos logs do servidor)
3. Confira se o email chegou no destinatário

### Teste 2: Captura de OS

**Opção A - Com seu próprio email:**
1. Configure `CHADA_EMAIL` com seu email de teste
2. Adicione um item à CHADA
3. Você vai receber o email
4. Responda com algo como: "Seu chamado foi registrado. OS: 12345"
5. Clique em "Verificar Emails" na página /chada
6. O número 12345 deve aparecer no item

**Opção B - Simulação:**
1. Vá em `/chada`
2. Clique em "Verificar Emails"
3. Veja o resultado no alerta

## 🐛 Troubleshooting

### Erro: "Erro ao enviar email"

**Causas comuns:**
- Senha incorreta no `.env`
- Senha de aplicativo não gerada (Gmail)
- Firewall bloqueando porta 587
- Servidor SMTP incorreto

**Solução:**
1. Verifique as credenciais
2. Teste login manual no email
3. Para Gmail, gere senha de aplicativo

### Erro: "Erro ao verificar emails"

**Causas comuns:**
- Porta IMAP bloqueada (993)
- Credenciais incorretas
- IMAP não habilitado no email

**Solução:**
1. Verifique se IMAP está ativado no email
2. Para Gmail: Configurações → Encaminhamento e POP/IMAP → Ativar IMAP
3. Teste acesso IMAP manual

### Número de OS não é capturado

**Causas comuns:**
- Email da CHADA não corresponde ao configurado em `CHADA_EMAIL_DOMAIN`
- Formato do número de OS diferente dos padrões reconhecidos
- Email ainda não chegou (aguardar cron job ou clicar em "Verificar Emails")

**Solução:**
1. Verifique o email da CHADA em `CHADA_EMAIL_DOMAIN`
2. Se o formato for diferente, adicione novo padrão em `/api/chada/check-emails.ts`
3. Use o botão "Verificar Emails" para forçar verificação

## 📅 Cron Job (Vercel)

O sistema está configurado para verificar emails **automaticamente a cada 2 horas**.

Configuração em `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/chada/check-emails",
    "schedule": "0 */2 * * *"
  }]
}
```

**Para alterar a frequência:**
- `"0 */1 * * *"` - A cada hora
- `"0 */4 * * *"` - A cada 4 horas
- `"0 9,14,17 * * *"` - Às 9h, 14h e 17h

## 🎯 Campos no Banco de Dados

Novos campos adicionados em `ItemsChada`:

- `numeroChadaOS` - Número da OS fornecido pela CHADA
- `emailSentAt` - Data/hora que o email foi enviado
- `emailMessageId` - ID da mensagem para rastreamento

## 📝 APIs Criadas

### `/api/chada/check-emails` (POST/GET)

Verifica inbox e captura números de OS.

**Resposta:**
```json
{
  "success": true,
  "totalEmails": 5,
  "processed": 2,
  "updated": 1,
  "results": [...]
}
```

## 🔐 Segurança

- **NUNCA** commite o arquivo `.env` no git
- Use senha de aplicativo, não a senha principal
- Mantenha as credenciais seguras
- Use HTTPS/TLS sempre

## 📚 Mais Informações

Para suporte, entre em contato com o desenvolvedor do sistema.
