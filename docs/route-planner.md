# Planejador de rotas viárias

Serviço de otimização de rotas de visita técnica usando **tempo de deslocamento
nas vias** (não distância em linha reta), com prioridades operacionais e
horários estimados em `America/Sao_Paulo`.

## Onde está

```
src/utils/routePlanner/
  types.ts        contratos (PlanRequest, PlanResult, RoutingProvider…)
  osrm.ts         adaptador OSRM: Table + Route, timeout, cache, rate limit
  solver.ts       TSP com bloco prioritário (exato ≤ 8, senão NN + 2-opt)
  schedule.ts     horários de chegada/saída em America/Sao_Paulo
  geo.ts          qualidade de coordenadas (sem coords, inválidas, duplicadas)
  planner.ts      orquestração + fallback aproximado explícito
  persistence.ts  gravação em RouteOptimization/RouteVisit e regras de acesso
```

Endpoints:

| Método | Rota | Função |
|---|---|---|
| POST | `/api/routes/optimize` | pré-visualização — **não grava nada** |
| GET | `/api/routes/optimizations?date=` | rotas salvas da data |
| POST | `/api/routes/optimizations` | confirma e grava |
| GET/PATCH/DELETE | `/api/routes/optimizations/[id]` | consultar / recalcular / excluir |
| GET | `/api/routes/[id]/stops` | escolas já atribuídas à rota operacional |
| GET | `/api/routes/geo-quality` | relatório de coordenadas (ADMIN/ADMTOTAL) |

Interface: `/route-optimizer`.

## Como a ordem é decidida

1. As escolas marcadas como **prioritárias** formam um bloco que é sempre
   visitado primeiro, mesmo que fiquem mais longe.
2. Dentro de cada bloco a ordem minimiza o **tempo** da matriz viária; a
   distância serve de desempate.
3. Blocos com até 8 paradas são resolvidos por **enumeração exata**. Acima
   disso: vizinho mais próximo com **múltiplas inicializações + 2-opt**.
4. `fixedFirstSchoolId` fixa a primeira parada do bloco a que a escola
   pertence.
5. `returnToStart` soma o trecho de volta ao ponto de partida.

A regra de prioridade também é validada ao salvar uma ordem ajustada à mão —
uma escola prioritária nunca fica depois de uma comum.

## Provedor de rotas

OSRM (`/table/v1/driving` + `/route/v1/driving`). Variáveis de ambiente:

| Variável | Padrão | Uso |
|---|---|---|
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | instância própria em produção |
| `ROUTING_PROVIDER` | — | `disabled` desliga o provedor |
| `OSRM_TIMEOUT_MS` | `8000` | timeout por requisição |
| `OSRM_MIN_INTERVAL_MS` | `250` | intervalo mínimo entre chamadas |

O servidor público do OSRM é **demonstrativo**: sem SLA e com limites de uso.
Para produção, aponte `OSRM_BASE_URL` para uma instância própria.

Sem trânsito em tempo real: o OSRM não fornece essa informação e a interface
não a promete.

### Falhas

- Provedor indisponível e `allowApproximate: false` → erro 503 com mensagem
  clara, nada é calculado.
- `allowApproximate: true` → matriz estimada (linha reta × 1,35 a 25 km/h) e o
  resultado vem com `approximate: true`; a UI exibe o aviso de estimativa.
- Trajeto impossível entre pontos → erro 422 listando os pares sem caminho.
- Falha só no traçado → mantém ordem/tempos da matriz e avisa que o mapa mostra
  apenas os pontos.

## Persistência

- `RouteOptimization` + `RouteVisit` já existentes. Nenhuma migração nova.
- Metadados do plano (rota operacional, serviço por escola, geometria,
  prioridades, excluídas) ficam no JSON `startLocation`; as paradas usam
  `visitOrder`, `distance` (metros do trecho), `estimatedTime` (atendimento),
  `arrivalTime` e `departureTime`.
- Salvar substitui o rascunho `PLANNED` da mesma data + rota operacional. Rota
  encerrada ou com visita já iniciada/concluída não é sobrescrita (409).
- O servidor **recalcula** a ordem recebida: métricas do cliente são ignoradas.

## Permissões

- Pré-visualizar: ADMIN, ADMTOTAL, TECH, ONLYREAD.
- Salvar: ADMIN, ADMTOTAL; TECH apenas em rota operacional da qual participa.
- Recalcular/excluir rota salva: ADMIN, ADMTOTAL.
- Alterar coordenadas e geocodificar: ADMIN, ADMTOTAL.

## Testes

```
npx vitest run tests/route-planner.test.ts tests/route-planner-api.test.ts
```

Verificação manual contra o OSRM real:

```
npx tsx scripts/verify-route-planner.ts
```
