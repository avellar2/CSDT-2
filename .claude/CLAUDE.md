# CSDT-2 Project Configuration

## O que é o projeto

Sistema web interno de gestão da equipe de suporte técnico de escolas (CSDT). Cobre ordens de serviço (OS), chamados técnicos, controle de impressoras, memorandos, demandas, escalas, rotas e estatísticas.

**Domínio:** suporte técnico em rede de escolas públicas — visitas técnicas, equipamentos (PCs, notebooks, tablets, monitores, estabilizadores, impressoras), inventário por escola, e geração de documentos oficiais (OS assinada, memorando de entrega/transferência).

## Stack

- **Framework:** Next.js 15 (Pages Router, não App Router) + React 19
- **Linguagem:** TypeScript
- **Banco:** PostgreSQL via Prisma 6 + Supabase
- **Estilo:** TailwindCSS 3.4 + shadcn/ui (Radix UI primitives)
- **Estado:** Redux Toolkit + SWR para fetching
- **Auth:** JWT (`jsonwebtoken`) + bcryptjs
- **Animação:** Framer Motion
- **Deploy:** Vercel (com `vercel.json` e `deploy-vercel.js`)

## Módulos principais (mapa rápido)

| Módulo | Pages | APIs | O que faz |
|---|---|---|---|
| **OS interna** | `create-internal-os.tsx`, `confirm-os.tsx`, `confirmar-os.tsx`, `os/[id].tsx`, `os-list.tsx` | `api/save-internal-os.ts`, `api/confirm-os.ts`, `api/get-internal-os*.ts`, `api/update-internal-os.ts`, `api/delete-internal-os.ts` | Cria, lista, atualiza e confirma OS internas (modelo `InternalOS` + `Os` + `OsAssinada`) |
| **OS externa** | `confirmar-os-externa.tsx`, `os-externas-list.tsx` | `api/get-os-externa.ts`, `api/update-os-externa-token.ts` | OS para visitas externas com confirmação via token, fotos antes/depois (modelo `OSExterna`) |
| **Chamados técnicos** | `technical-tickets/create.tsx`, `technical-tickets/accepted.tsx`, `technical-tickets/deleted.tsx` | `api/technical-tickets/*` | Tickets com prioridade, categoria, comentários (modelos `TechnicalTicket`, `TicketComment`) |
| **Escolas** | `schools.tsx`, `schools/[id].tsx` | `api/schools.ts`, `api/schools/[school].ts`, `api/schools/[school]/items.ts`, `api/schools/[school]/stats.ts` | Cadastro de escolas com geocoding (lat/long), itens vinculados, estatísticas (modelo `School`) |
| **Impressoras (monitoramento)** | `printers.tsx`, `controle-impressoras.tsx`, `setup-impressora.tsx`, `preencher-impressoras.tsx` | `api/printers.ts`, `api/diagnose-snmp.ts`, `api/test-printer-detail.ts`, `api/generate-printer-control-pdf.ts` | Monitoramento SNMP via `local-agent`, controle de patrimônio, geração de PDF de controle (modelos `Printer`, `PrinterStatus`, `PrinterRequest`, `PrinterInfo`) |
| **Memorandos** | `memorandums.tsx`, `new-memorandums.tsx`, `fill-pdf-form-2.tsx` | (geração via `pdf-lib`) | Memorandos de entrega/transferência de equipamentos com numeração única (modelos `Memorandum`, `NewMemorandum`) |
| **Itens (inventário)** | `items.tsx`, `items-list.tsx`, `device-list.tsx` | `api/items/create.ts`, `api/items/[id]/history.ts`, `api/items/[id]/related-data.ts` | Inventário de equipamentos com histórico de movimentação entre escolas (modelos `Item`, `ItemHistory`) |
| **Demandas** | `daily-demands.tsx`, `internal-demands.tsx` | `api/daily-demands/[id].ts`, `api/school-demands.ts`, `api/debug-demands.ts` | Demandas diárias e por escola (modelos `SchoolDemand`, `DailyDemandOsRelease`) |
| **Chada (diagnósticos)** | `chada.tsx` | `api/chada-diagnostics/*` | Diagnósticos de peças (aguardando peça, instalado, etc) — modelos `ChadaDiagnostic`, `ItemsChada` |
| **Escalas e calendário** | `scales.tsx` | `api/saveScale.ts`, `api/getScaleHistory.ts`, `api/calendars/*`, `api/schedule/events.ts` | FullCalendar com eventos recorrentes, participantes, lembretes (modelos `Calendar`, `ScheduleEvent`, `EventParticipant`, `EventReminder`) |
| **Rotas** | `route-optimizer.tsx` | (via componente `MapWithRoutes.tsx`) | Otimização de rotas para visitas técnicas com Leaflet/Google Maps (modelos `RouteOptimization`, `RouteVisit`) |
| **Chat interno** | `internal-chat.tsx` | `api/internal-chat/*` | Chat por ticket (modelos `internal_tickets`, `internal_chat_messages`) |
| **Estatísticas** | `statistics.tsx`, `advanced-statistics.tsx`, `dashboard.tsx`, `apresentacao.tsx` | `api/statistics.ts`, `api/presentation-stats.ts`, `api/dashboard/chamados-abertos.ts` | Dashboards com chart.js / recharts |
| **Locados** | `locados.tsx` | `api/locados.ts` | Controle de equipamentos locados por escola (modelo `Locados`) |
| **Auth** | `login.tsx`, `register.tsx` | `api/register.ts`, `api/get-role.ts`, `api/getProfile.ts`, `api/users/admins.ts` | Login JWT, perfis com `Role` (ADMIN/TECH/ONLYREAD/ADMTOTAL/SCHOOL) — modelos `User`, `Profile` |

## Estrutura de pastas

```
src/
  pages/           ← rotas (Pages Router)
    api/           ← endpoints REST
  components/
    ui/            ← shadcn/ui (button, card, dialog, etc)
    ServiceOrderForm/, Scanner/, Item/  ← componentes de domínio
  context/         ← React Contexts (HeaderContext, PrinterNotificationContext)
  hooks/           ← useMultiStepForm
  lib/             ← utils (cn helper)
  utils/           ← prisma client, types, timezone, recurrence, itens, icalExport
  auth/            ← auth.ts (JWT helpers)
  types/           ← TS declarations
prisma/
  schema.prisma    ← schema único com ~30 models
  migrations/      ← histórico de migrations
local-agent/       ← daemon Node separado (monitoramento SNMP das impressoras)
docs/superpowers/  ← planos e specs (ex: 2026-05-25-controle-impressoras-design.md)
```

## local-agent

Daemon Node.js que roda **localmente na rede das escolas** porque a app web fica na Vercel (cloud) e não consegue alcançar impressoras na LAN. Faz polling SNMP a cada N segundos e empurra status (online, toner, contador de páginas, erros) pra API da Vercel via `LOCAL_AGENT_API_KEY`.

Ver `local-agent/README.md` para instalação como serviço Windows.

## Modelos Prisma importantes

- **`Profile`** + **`User`**: usuários do sistema. `Profile.role` determina permissões (`Role` enum). `Profile.schoolId` vincula técnico a uma escola base.
- **`School`**: ~225 escolas (id default 225 = escola "central"/admin). Tem geocoding, relação hierárquica via `parentSchoolId`.
- **`Item`**: equipamento individual com `serialNumber` único. Estado em `status` (`DISPONIVEL`, etc). Histórico de movimentação em `ItemHistory`.
- **`Os` vs `OsAssinada` vs `InternalOS` vs `OSExterna`**: quatro modelos distintos para diferentes fluxos de OS. `OsAssinada` é a versão final com assinatura/CPF do responsável.
- **`Memorandum` vs `NewMemorandum`**: migração em andamento — `NewMemorandum` é o modelo novo, com `pageCount`.
- **`Printer` + `PrinterStatus`**: cadastro de impressora + histórico de status SNMP (toner, páginas, erros).
- **`TechnicalTicket`** (interno do CSDT) ≠ **`chamados_escola`** (chamados que escolas abrem) ≠ **`internal_tickets`** (chat interno). Três sistemas paralelos de tickets.

## Convenções

- **Linguagem:** código e nomes de variáveis misturam **português** (modelos de domínio: `unidadeEscolar`, `tecnicoResponsavel`, `numeroOs`, `assinado`) e **inglês** (Prisma models em PascalCase inglês: `School`, `Printer`, `Item`). Mantenha esse padrão — não traduza.
- **IDs:** maioria autoincrement Int; alguns UUIDs (`ItemsChada`, `ChadaDiagnostic`, `RouteOptimization`, `chamados_escola`).
- **Timezone:** `America/Sao_Paulo` é o default em Calendar/ScheduleEvent. Há helper em `src/utils/timezone.ts`.
- **PDFs:** gerados via `pdf-lib` (não puppeteer). Exemplos: `api/generate-printer-control-pdf.ts`.
- **Validação:** sem Zod/Yup centralizado — validação ad-hoc nas APIs.

## Scripts úteis

```bash
npm run dev               # next dev
npm run build             # next build (roda prisma generate via postinstall)
npm run deploy:vercel     # deploy completo (prepare + vercel --prod)
npm run test:deploy-ready # checa se tá pronto pra deploy
```

## Trabalho recente (contexto vivo)

Os últimos commits estão concentrados em **`controle-impressoras.tsx`** + **`api/generate-printer-control-pdf.ts`**: nova página que combina impressoras de monitoramento (`Printer` model com SNMP) e de patrimônio, com tabela, cards, edição inline, campo de observação e geração de PDF. Specs em `docs/superpowers/specs/2026-05-25-controle-impressoras-design.md` e plano em `docs/superpowers/plans/2026-05-25-controle-impressoras.md`.

## gstack

Use the /browse skill from gstack for all web browsing, never use mcp__claude-in-chrome__* tools.

### Available Skills

- `/office-hours` - Schedule office hours
- `/plan-ceo-review` - Plan CEO review
- `/plan-eng-review` - Plan engineering review
- `/plan-design-review` - Plan design review
- `/design-consultation` - Design consultation
- `/design-shotgun` - Design shotgun
- `/design-html` - Design HTML
- `/review` - Review
- `/ship` - Ship
- `/land-and-deploy` - Land and deploy
- `/canary` - Canary
- `/benchmark` - Benchmark
- `/browse` - Browse (use for all web browsing)
- `/connect-chrome` - Connect Chrome
- `/qa` - QA
- `/qa-only` - QA only
- `/design-review` - Design review
- `/setup-browser-cookies` - Setup browser cookies
- `/setup-deploy` - Setup deploy
- `/setup-gbrain` - Setup gbrain
- `/retro` - Retro
- `/investigate` - Investigate
- `/document-release` - Document release
- `/codex` - Codex
- `/cso` - CSO
- `/autoplan` - Autoplan
- `/plan-devex-review` - Plan devex review
- `/devex-review` - Devex review
- `/careful` - Careful
- `/freeze` - Freeze
- `/guard` - Guard
- `/unfreeze` - Unfreeze
- `/gstack-upgrade` - Gstack upgrade
- `/learn` - Learn
