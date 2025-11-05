# Configuração do Cloudinary para CSDT

Este guia explica como configurar o Cloudinary como storage alternativo ao Supabase para as imagens do sistema CSDT.

## Por que Cloudinary?

O Cloudinary oferece:
- **25 GB de storage gratuito** (vs. Supabase cheio)
- **25 GB de bandwidth/mês**
- CDN global automático
- URLs estáveis e confiáveis
- Processamento de imagens integrado

---

## Passo 1: Criar Conta no Cloudinary

1. Acesse: https://cloudinary.com/users/register/free
2. Crie uma conta gratuita
3. Após login, você verá o **Dashboard** com suas credenciais

## Passo 2: Copiar Credenciais

No dashboard do Cloudinary, você verá:

```
Cloud name: seu-cloud-name
API Key: 123456789012345
API Secret: AbC123-xYz456_DeF789
```

## Passo 3: Configurar no Projeto

Abra o arquivo `.env` na raiz do projeto e atualize:

```env
# Cloudinary - Storage de Imagens
CLOUDINARY_CLOUD_NAME="seu-cloud-name-aqui"
CLOUDINARY_API_KEY="sua-api-key-aqui"
CLOUDINARY_API_SECRET="seu-api-secret-aqui"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="seu-cloud-name-aqui"

# Storage Provider - Escolha entre "cloudinary" ou "supabase"
NEXT_PUBLIC_STORAGE_PROVIDER="cloudinary"
```

### Exemplo com valores reais:

```env
CLOUDINARY_CLOUD_NAME="csdt-sistema"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="AbC123-xYz456_DeF789"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="csdt-sistema"
NEXT_PUBLIC_STORAGE_PROVIDER="cloudinary"
```

---

## Passo 4: Testar a Configuração

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Tente criar uma nova OS Externa com fotos
3. Verifique no console do navegador se aparecem logs como:
   ```
   [Storage] Usando provider: cloudinary
   [Cloudinary] Fazendo upload do arquivo: ...
   [Cloudinary] Upload bem-sucedido: https://res.cloudinary.com/...
   ```

4. Acesse o dashboard do Cloudinary e veja suas imagens na pasta `os-externa-img`

---

## Passo 5: Migrar Imagens Antigas (OPCIONAL)

Se você já tem imagens no Supabase e quer migrar para o Cloudinary:

### Antes de Migrar:

1. **FAÇA BACKUP DO BANCO DE DADOS!**
2. Certifique-se que as credenciais do Cloudinary estão corretas
3. Tenha conexão estável com a internet

### Executar Migração:

```bash
node scripts/migrate-images-to-cloudinary.js
```

O script vai:
- Buscar todas as imagens do Supabase no banco
- Fazer upload de cada uma para o Cloudinary
- Atualizar as URLs no banco de dados
- Mostrar estatísticas ao final

**Tempo estimado**: Depende da quantidade de imagens (cerca de 2-5 segundos por imagem)

---

## Como Funciona o Sistema

### Sistema de Storage Unificado

O projeto agora tem um sistema que permite escolher entre Cloudinary e Supabase:

**Arquivo principal**: `src/utils/storageProvider.ts`

#### Para OS Externas:
```typescript
import { uploadFiles } from "@/utils/storageProvider";

// Faz upload automaticamente para o provider configurado (.env)
const urls = await uploadFiles(files, "fotos-antes", numeroOs);
```

#### Para CHADA:
```typescript
import { uploadChadaFiles } from "@/utils/storageProvider";

// Upload de diagnósticos CHADA
const urls = await uploadChadaFiles(files, itemId);
```

### Alternar entre Cloudinary e Supabase

Basta alterar no `.env`:

**Usar Cloudinary** (novo):
```env
NEXT_PUBLIC_STORAGE_PROVIDER="cloudinary"
```

**Voltar para Supabase** (antigo):
```env
NEXT_PUBLIC_STORAGE_PROVIDER="supabase"
```

Não precisa alterar código! O sistema troca automaticamente.

---

## Estrutura de Pastas no Cloudinary

As imagens são organizadas assim:

```
cloudinary.com/seu-cloud-name/
├── os-externa-img/
│   ├── fotos-antes/
│   │   └── 123/
│   │       └── 1704067200000-foto1.jpg
│   └── fotos-depois/
│       └── 123/
│           └── 1704067300000-foto2.jpg
└── os-images/
    └── abc-1704067200000-diagnostic.jpg
```

### Formato das URLs:

Cloudinary:
```
https://res.cloudinary.com/seu-cloud-name/image/upload/os-externa-img/fotos-antes/123/1704067200000-foto.jpg
```

Supabase (antigo):
```
https://psjscaacxpwcmepjrxhf.supabase.co/storage/v1/object/public/os-externa-img/fotos-antes/123/1704067200000-foto.jpg
```

---

## Arquivos Modificados

Os seguintes arquivos foram atualizados para usar o novo sistema:

1. **src/utils/storageProvider.ts** - Sistema unificado de storage
2. **src/pages/api/upload-cloudinary.ts** - API route para Cloudinary
3. **src/pages/fill-pdf-form-2.tsx** - Formulário de OS Externa
4. **src/pages/chada.tsx** - Sistema CHADA
5. **src/lib/cloudinaryClient.ts** - Cliente Cloudinary
6. **.env** - Variáveis de ambiente

O código antigo do Supabase foi **mantido como comentário** para referência.

---

## Monitoramento de Uso

Acesse o dashboard do Cloudinary para ver:
- Quantidade de imagens armazenadas
- Bandwidth usado no mês
- Transformações realizadas
- Análise de uso

**Link**: https://console.cloudinary.com/console

---

## Solução de Problemas

### Erro: "Credenciais do Cloudinary inválidas"

- Verifique se copiou corretamente do dashboard
- Cloud Name não tem espaços ou caracteres especiais
- API Key e Secret estão completos

### Upload falha mas não dá erro

- Verifique o console do navegador (F12)
- Veja os logs do servidor (terminal do `npm run dev`)
- Confirme que `.env` está configurado corretamente

### Imagens antigas não aparecem

- Execute o script de migração (Passo 5)
- Ou altere `NEXT_PUBLIC_STORAGE_PROVIDER="supabase"` temporariamente

### Limite de storage atingido

- Cloudinary free tier: 25 GB
- Verifique uso no dashboard
- Delete imagens antigas não utilizadas
- Ou faça upgrade do plano

---

## Vantagens do Novo Sistema

✅ **Flexível**: Troca entre Cloudinary e Supabase facilmente
✅ **Organizado**: Código limpo e centralizado
✅ **Confiável**: URLs permanentes e estáveis
✅ **Rápido**: CDN global do Cloudinary
✅ **Econômico**: 25 GB gratuitos
✅ **Reversível**: Pode voltar para Supabase a qualquer momento

---

## Contato e Suporte

Se tiver problemas, verifique:
1. Documentação oficial do Cloudinary: https://cloudinary.com/documentation
2. Console de logs no navegador (F12)
3. Logs do servidor Next.js

---

**Data de criação**: 05/11/2025
**Versão**: 1.0
