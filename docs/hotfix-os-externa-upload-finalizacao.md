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

### Banco (aditivo, não aplicado)
`prisma/migrations/20261127120000_add_os_externa_finalization_state/migration.sql`
cria somente a tabela `OsExternaFinalizationState`. **Nenhuma coluna existente
foi alterada.** Sem a migração, o sistema deriva o estado da própria OS; com
ela, a etapa exata fica registrada.

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
- `npm run test:run` ✅ **471 testes** (37 arquivos; 1 skip pré-existente)
- `npm run lint` ✅ (configuração ESLint do projeto é vazia)
- `npm run build` ✅
- Novos testes: `os-externa-finalization`, `image-compression`,
  `os-externa-pending-drafts` e casos de idempotência entre dias/`forceNew` em
  `os-externa-auth-regression`.

## Limitações
- HEIC não é convertido no navegador; exibe instrução para usar JPG.
- O IndexedDB é por aparelho/navegador; outro dispositivo exige selecionar as
  fotos novamente.
- A distinção exata de etapa sem a migração é derivada dos dados existentes;
  uma OS legitimamente sem fotos aparece como "fotos pendentes" até a tabela
  aditiva ser aplicada.
- Sem `lastEmailSent` não há como provar que um e-mail saiu; nesse caso a
  retomada reenvia (o backend ainda deduplica no mesmo dia).
