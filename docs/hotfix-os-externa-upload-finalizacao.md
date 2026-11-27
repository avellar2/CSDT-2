# Hotfix — Upload de fotos e finalização de OS externas

Data: 27/11/2026  
Branch: `fix/os-externa-upload-finalizacao` (base: `main` @ `fccc658`)

## Causa raiz confirmada

1. **Fotos originais sem compressão + upload pela API da Vercel.**
   Cada foto saía do celular com 3–12 MB. O Cloudinary era acessado via
   `/api/upload-cloudinary`, e o corpo de uma função da Vercel tem limite de
   **4,5 MB**: fotos maiores recebiam HTTP 413. Como uma falha interrompia o
   lote inteiro, a OS ficava salva sem fotos.

2. **URLs vazias gravadas na criação da OS (OS 651/2026).**
   `save-os-externa` recebia `File` objects serializados como `{}` e fazia
   `file.url || ""`, gravando **uma string vazia por foto** — exatamente as 8
   referências vazias observadas na 651/2026. O array de fotos ficava
   "preenchido" (8 posições), mas sem nenhuma URL válida.

3. **Retomada automática presa à data.**
   Ao abrir o formulário, `readPendingFinalizations(...)[0]` restaurava o
   primeiro rascunho. A retomada só era considerada válida se
   `pendingResume.date === data de hoje`; no dia seguinte o rascunho não casava,
   o fluxo chamava `save-os-externa` de novo e criava outra OS. Foi assim que
   651 (25/11) → 652 (25/11) → 653 (26/11) viraram três OS com o mesmo conteúdo.

4. **Idempotência expirava em 10 minutos.**
   O `clientRequestId` era descartado após 10 min. Depois disso, uma nova
   tentativa recebia outro identificador e o backend não reconhecia a OS já
   criada. O fallback do servidor só olhava 2 minutos para trás.

5. **Rascunhos sumiam em 24 h / 5 registros**, sem aviso, e `File` não é
   serializável em `localStorage` — as fotos que falharam eram perdidas.

6. **E-mail e token.** 652 e 653 têm token gravado e `lastEmailSent` nulo: o
   token foi persistido, mas a etapa de e-mail não concluiu. Sem estado no
   banco, a retomada não sabia diferenciar "falta token" de "falta e-mail".

## Correções implementadas

### Upload de fotos
- `src/utils/imageCompression.ts`: valida tipo/integridade, respeita EXIF,
  redimensiona para no máximo **1920 px** e reencoda JPEG **0,82 → 0,60**.
  Rejeita HEIC/HEIF com mensagem específica (sem derrubar as demais fotos).
- `src/utils/storageProvider.ts`: compressão antes do envio, **upload direto
  assinado para o Cloudinary** (a foto não passa pela Vercel), retentativas
  limitadas para 408/429/5xx/rede e relatório por arquivo.
- `src/pages/api/cloudinary-signature.ts`: gera a assinatura no servidor. O
  `api_secret` nunca chega ao navegador. Pasta/nome validados.
- Fallback para `/api/upload-cloudinary` quando a assinatura não está
  configurada; provider Supabase preservado e também comprimido.
- CHADA continua usando Supabase/Cloudinary, agora com a mesma preparação.

### Finalização resiliente
- Uma foto com erro **não interrompe** as demais.
- Cada sucesso é persistido imediatamente em `update-os-externa-fotos`.
- Sucessos viram URLs no formulário; só os arquivos com falha permanecem para
  reenvio. A tela lista **nome + motivo** de cada falha.
- Falhas ficam em **IndexedDB** (`src/utils/pendingPhotoStore.ts`) e voltam ao
  retomar no mesmo aparelho. Em outro aparelho, a tela informa que as fotos
  precisam ser selecionadas novamente.
- Progresso na tela: salvando OS, foto X de N, gerando documento, enviando
  e-mail, finalizando atendimento. Sucesso só é declarado após o 200 do e-mail.

### Nova OS × retomada
- Removida a restauração automática. O formulário mostra um **aviso não
  bloqueante** com: retomar pendência, iniciar nova OS e ver todas.
- "Iniciar nova OS" preserva todos os rascunhos, gera novo `clientRequestId`
  e envia `forceNew` (ignora deduplicação por conteúdo).
- Retomada é explícita por **número da OS** (`?resume=...`), revalida
  autorização no backend, preserva número, data original, rota/demanda, e
  retoma direto na última etapa.
- Etapas já concluídas não repetem: fotos existentes não sobem de novo, token
  existente é reutilizado e **e-mail já enviado não é reenviado** mesmo que o
  dia tenha mudado.
- A aba **"Finalização pendente"** na lista vem do banco e distingue fotos,
  token, e-mail e chamado; "aguardando assinatura" não é pendência técnica.

### Idempotência
- Tentativa sem TTL, vinculada ao conteúdo (a data não entra na identidade).
- `OsExternaSubmission` continua serializando concorrência; o fallback do
  servidor agora olha 7 dias e só reutiliza OS **Pendente** do próprio técnico.
- Conteúdo diferente após uma OS salva gera **novo** `requestId` (atendimento
  legítimo), sem apagar a OS pendente anterior.

### Segurança
- `cloudinary-signature` passou a validar a **autorização sobre a OS
  específica** (`numeroOs`), não apenas a autenticação. A pasta é derivada no
  servidor e o `public_id` é gerado com UUID no servidor — o cliente não
  escolhe caminho nem nome, impedindo sobrescrever arquivos de outra OS.
- Uploads do **CHADA** continuam funcionando, restritos a TECH/ADMIN/ADMTOTAL,
  com `public_id` gerado no servidor.
- `/api/send-email` (envio **inicial**) agora é idempotente para sempre: se a
  OS já tem `lastEmailSent`, não reenvia em outro dia. O reenvio manual
  autorizado em `/api/resend-os-email` foi preservado (cooldown próprio).
- `/api/os-externa-finalization` valida no servidor que o estado
  "aguardando-assinatura" só é gravado com token, e-mail e chamado (quando
  aplicável). O cliente não consegue marcar conclusão sem as etapas.
- A etapa `pdf` foi incluída na classificação de finalizações pendentes.

### Banco (aditivo, aplicado e verificado)
`prisma/migrations/20261127120000_add_os_externa_finalization_state/migration.sql`
cria somente a tabela `OsExternaFinalizationState` + índices + RLS sem policies
+ revogação de anon/authenticated (tabela e sequence). **Nenhuma coluna
existente foi alterada.**

Aplicado manualmente em 27/11/2026 no Supabase de produção
(`psjscaacxpwcmepjrxhf`, pooler sa-east-1) via `prisma db execute` e registrado
com `prisma migrate resolve --applied` (sem `migrate deploy/reset/db push`).
Verificado: tabela/colunas/índices, RLS habilitado, zero policies, grants
apenas para `postgres`, sequence sem USAGE para anon/authenticated, leitura e
escrita via Prisma (teste com rollback, sem resíduo) e linha em
`_prisma_migrations`.

## Auditoria somente leitura (desde 24/11/2026)

Comando: `npx tsx scripts/audit-os-externas-finalizacao.ts 2026-11-24`

Resultado: 13 OS; **3 com finalização pendente**; 1 grupo de duplicidade.

| OS | Etapa | Fotos válidas | Token | E-mail | Plano |
|---|---|---|---|---|---|
| 651/2026 | fotos | 0 (8 refs vazias) | não | não | Recuperar/reproduzir as fotos originais e reenviar; só então gerar token/e-mail. Não criar outra OS. |
| 652/2026 | e-mail | 2 | sim | não | Token já válido: enviar somente o e-mail com o token existente. Conferir logs SMTP antes (evitar duplicidade). |
| 653/2026 | e-mail | 5 | sim | não | Mesmo plano da 652. Decidir com autorização qual das três mantém o atendimento; não excluir/alterar sem aprovação. |

Nenhuma escrita, exclusão, mesclagem ou reenvio foi executado.

## Testes
- `npm run typecheck` ✅
- `npm run test:run` ✅ **492 testes aprovados**, 1 ignorado (41 arquivos)
- `npm run lint` ✅ configuração efetiva (`next/core-web-vitals`), 0 erros
  (apenas avisos pré-existentes de dívida antiga)
- `npm run build` ✅
- Cloudinary: upload direto assinado validado com asset descartável; assinatura
  adulterada rejeitada (HTTP 401) e asset removido.
- Novos testes: `os-externa-finalization`, `image-compression`,
  `os-externa-pending-drafts`, `os-externa-finalization-state`,
  `os-externa-finalization-endpoint`, `cloudinary-signature` e idempotência de
  e-mail entre dias/`forceNew`.

## Limitações
- HEIC não é convertido no navegador; exibe instrução para usar JPG.
- O IndexedDB é por aparelho/navegador; outro dispositivo exige selecionar as
  fotos novamente.
- O teste E2E autenticado com perfil TECH em Android/iPhone não foi executado
  por ausência de conta de teste autorizada e de dispositivo físico nesta
  sessão. Foram executados testes unitários/de integração, build e validação
  do upload assinado no Cloudinary.
- Sem `lastEmailSent` não há como provar que um e-mail saiu; nesse caso a
  retomada reenvia (o backend deduplica o envio inicial para sempre).

## Rollback
1. **Código**: `git revert -m 1 <merge_sha>` e push normal (sem force).
2. **Vercel**: promover o deployment de produção anterior pelo dashboard/CLI
   (`vercel promote <url>`); o alias `csdt.vercel.app` volta à versão antiga.
3. **Banco**: a migração é aditiva. O código novo tolera a ausência da tabela;
   se necessário, `DROP TABLE IF EXISTS "OsExternaFinalizationState";`
   (perde apenas o estado de finalização, nunca dados de OS).
4. **Dados**: nenhuma OS existente foi alterada; não há rollback de dados.
