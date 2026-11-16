/**
 * Resolvedor de ordem de visitas com prioridades.
 *
 * Regra obrigatória: **todas** as escolas marcadas como prioritárias são
 * visitadas antes das escolas comuns, independentemente da distância. A ordem
 * dentro de cada bloco é otimizada para minimizar o tempo total de viagem
 * (e, em caso de empate, a distância).
 *
 * Estratégia:
 * - blocos pequenos (até `exactMaxSize` paradas) → enumeração exata;
 * - blocos maiores → vizinho mais próximo com múltiplas inicializações
 *   (cada parada possível como primeira) + melhoria 2-opt.
 *
 * O custo primário é a duração (segundos) da matriz viária; a distância é o
 * critério de desempate. Nenhuma distância em linha reta entra aqui.
 */

export interface SolverInput {
  /** Matriz de durações (segundos), `[i][j]` = i → j. */
  durations: number[][];
  /** Matriz de distâncias (metros), usada como desempate. */
  distances: number[][];
  /** Índice da matriz que representa o ponto de partida. */
  startNode: number;
  /** Índices da matriz que representam as escolas. */
  stopNodes: number[];
  /** Subconjunto de `stopNodes` marcado como prioritário. */
  priorityNodes?: number[];
  /** Nó que deve ser a primeira parada do seu bloco. */
  fixedFirstNode?: number | null;
  /** Inclui o trecho de volta ao ponto de partida no custo. */
  returnToStart: boolean;
  /** Acima deste tamanho o bloco deixa de ser resolvido por enumeração. */
  exactMaxSize?: number;
}

export interface SolverResult {
  /** Índices da matriz na ordem de visita. */
  order: number[];
  totalDuration: number;
  totalDistance: number;
  algorithm: "exact" | "nearest_neighbor_2opt";
}

const DEFAULT_EXACT_MAX_SIZE = 8;
const EPSILON = 1e-9;

function isFiniteCost(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** Custo de percorrer `path` na ordem dada (sem retorno). */
function pathCost(path: number[], durations: number[][]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const leg = durations[path[i]][path[i + 1]];
    if (!isFiniteCost(leg)) return Number.POSITIVE_INFINITY;
    total += leg;
  }
  return total;
}

function pathDistance(path: number[], distances: number[][]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const leg = distances[path[i]][path[i + 1]];
    if (!isFiniteCost(leg)) return Number.POSITIVE_INFINITY;
    total += leg;
  }
  return total;
}

/** Compara duas soluções por tempo e, em empate, por distância. */
function isBetter(
  duration: number,
  distance: number,
  bestDuration: number,
  bestDistance: number
): boolean {
  if (duration < bestDuration - EPSILON) return true;
  if (Math.abs(duration - bestDuration) <= EPSILON) {
    return distance < bestDistance - EPSILON;
  }
  return false;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];

  const result: T[][] = [];
  const used = new Array(items.length).fill(false);
  const current: T[] = [];

  const walk = () => {
    if (current.length === items.length) {
      result.push(current.slice());
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);
      walk();
      current.pop();
      used[i] = false;
    }
  };

  walk();
  return result;
}

/** Vizinho mais próximo a partir de `entry`, forçando `first` como 1ª parada. */
function nearestNeighbor(
  entry: number,
  stops: number[],
  durations: number[][],
  first: number
): number[] | null {
  const remaining = new Set(stops);
  if (!remaining.has(first)) return null;
  remaining.delete(first);

  const order = [first];
  let current = first;

  while (remaining.size > 0) {
    let bestNode = -1;
    let bestCost = Number.POSITIVE_INFINITY;

    for (const node of remaining) {
      const cost = durations[current][node];
      if (isFiniteCost(cost) && cost < bestCost) {
        bestCost = cost;
        bestNode = node;
      }
    }

    if (bestNode === -1) {
      // Sem caminho viável a partir daqui: completa na ordem restante.
      for (const node of remaining) order.push(node);
      return order;
    }

    order.push(bestNode);
    remaining.delete(bestNode);
    current = bestNode;
  }

  // Confere que o trecho de entrada até a primeira parada é viável.
  if (!isFiniteCost(durations[entry][first])) return null;

  return order;
}

/**
 * Melhoria 2-opt para caminho aberto com início fixo.
 * O primeiro elemento do caminho (o ponto de entrada) nunca se move.
 */
function twoOpt(entry: number, order: number[], durations: number[][]): number[] {
  const path = [entry, ...order];
  let improved = true;
  let guard = 0;

  while (improved && guard < 500) {
    improved = false;
    guard++;

    for (let i = 1; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const prev = path[i - 1];
        const next = j + 1 < path.length ? path[j + 1] : null;

        const before =
          durations[prev][path[i]] +
          (next !== null ? durations[path[j]][next] : 0);
        const after =
          durations[prev][path[j]] +
          (next !== null ? durations[path[i]][next] : 0);

        if (!isFiniteCost(after)) continue;

        if (after < before - EPSILON) {
          const reversed = path.slice(i, j + 1).reverse();
          path.splice(i, reversed.length, ...reversed);
          improved = true;
        }
      }
    }
  }

  return path.slice(1);
}

interface BlockSolution {
  order: number[];
  duration: number;
  distance: number;
  algorithm: "exact" | "nearest_neighbor_2opt";
}

/**
 * Resolve um bloco de paradas partindo de `entry`.
 * `forcedFirst`, quando presente, é obrigatoriamente a primeira parada.
 */
function solveBlock(
  entry: number,
  stops: number[],
  durations: number[][],
  distances: number[][],
  forcedFirst: number | null,
  exactMaxSize: number
): BlockSolution {
  if (stops.length === 0) {
    return { order: [], duration: 0, distance: 0, algorithm: "exact" };
  }

  const forced = forcedFirst !== null && stops.includes(forcedFirst) ? forcedFirst : null;
  const remaining = forced === null ? stops.slice() : stops.filter((node) => node !== forced);

  // Enumeração exata para blocos pequenos.
  if (remaining.length <= exactMaxSize) {
    let best: BlockSolution | null = null;
    const candidates = forced === null ? permutations(stops) : permutations(remaining).map((perm) => [forced, ...perm]);

    for (const candidate of candidates) {
      const path = [entry, ...candidate];
      const duration = pathCost(path, durations);
      if (!Number.isFinite(duration)) continue;
      const distance = pathDistance(path, distances);

      if (
        best === null ||
        isBetter(duration, distance, best.duration, best.distance)
      ) {
        best = { order: candidate, duration, distance, algorithm: "exact" };
      }
    }

    if (best) return best;
    // Nenhuma ordem viável: cai para a heurística, que ainda reporta o problema.
  }

  // Heurística: múltiplas inicializações + 2-opt.
  let best: BlockSolution | null = null;
  const firstCandidates = forced === null ? stops : [forced];

  for (const first of firstCandidates) {
    const greedy = nearestNeighbor(entry, stops, durations, first);
    if (!greedy) continue;

    const improved = twoOpt(entry, greedy, durations);
    const path = [entry, ...improved];
    const duration = pathCost(path, durations);
    if (!Number.isFinite(duration)) continue;
    const distance = pathDistance(path, distances);

    if (
      best === null ||
      isBetter(duration, distance, best.duration, best.distance)
    ) {
      best = {
        order: improved,
        duration,
        distance,
        algorithm: "nearest_neighbor_2opt",
      };
    }
  }

  if (!best) {
    // Sem caminho viável entre todos os pares: devolve a ordem original para
    // que a camada de planejamento reporte o trajeto impossível.
    const fallbackOrder = forced === null ? stops.slice() : [forced, ...remaining];
    return {
      order: fallbackOrder,
      duration: Number.POSITIVE_INFINITY,
      distance: Number.POSITIVE_INFINITY,
      algorithm: "nearest_neighbor_2opt",
    };
  }

  return best;
}

/**
 * Resolve a rota completa respeitando o bloco prioritário.
 *
 * O bloco prioritário é resolvido primeiro, partindo do ponto de partida; o
 * bloco comum continua a partir da última parada prioritária. Com
 * `returnToStart`, o trecho de volta é somado ao custo final.
 */
export function solveRoute(input: SolverInput): SolverResult {
  const {
    durations,
    distances,
    startNode,
    stopNodes,
    priorityNodes = [],
    fixedFirstNode = null,
    returnToStart,
    exactMaxSize = DEFAULT_EXACT_MAX_SIZE,
  } = input;

  if (stopNodes.length === 0) {
    return {
      order: [],
      totalDuration: 0,
      totalDistance: 0,
      algorithm: "exact",
    };
  }

  const prioritySet = new Set(priorityNodes);
  const priorityStops = stopNodes.filter((node) => prioritySet.has(node));
  const normalStops = stopNodes.filter((node) => !prioritySet.has(node));

  // A primeira parada forçada pertence ao bloco do qual ela faz parte.
  const forcedIsPriority =
    fixedFirstNode !== null && prioritySet.has(fixedFirstNode);

  const priorityBlock = solveBlock(
    startNode,
    priorityStops,
    durations,
    distances,
    forcedIsPriority ? fixedFirstNode : null,
    exactMaxSize
  );

  const priorityEnd =
    priorityBlock.order.length > 0
      ? priorityBlock.order[priorityBlock.order.length - 1]
      : startNode;

  const normalBlock = solveBlock(
    priorityEnd,
    normalStops,
    durations,
    distances,
    !forcedIsPriority ? fixedFirstNode : null,
    exactMaxSize
  );

  const order = [...priorityBlock.order, ...normalBlock.order];
  const fullPath = [startNode, ...order];

  let totalDuration = pathCost(fullPath, durations);
  let totalDistance = pathDistance(fullPath, distances);

  if (returnToStart && order.length > 0) {
    const last = order[order.length - 1];
    const backDuration = durations[last][startNode];
    const backDistance = distances[last][startNode];
    if (isFiniteCost(backDuration)) totalDuration += backDuration;
    if (isFiniteCost(backDistance)) totalDistance += backDistance;
  }

  const algorithm =
    priorityBlock.algorithm === "exact" && normalBlock.algorithm === "exact"
      ? "exact"
      : "nearest_neighbor_2opt";

  return { order, totalDuration, totalDistance, algorithm };
}

/**
 * Verifica a regra de prioridade numa ordem já existente (usada ao salvar uma
 * ordem ajustada manualmente). Retorna `null` quando a ordem é válida ou a
 * mensagem do problema encontrado.
 */
export function validatePriorityOrder(
  order: number[],
  priorityNodes: number[]
): string | null {
  if (priorityNodes.length === 0) return null;

  const prioritySet = new Set(priorityNodes);
  let seenNormal = false;

  for (const node of order) {
    if (prioritySet.has(node)) {
      if (seenNormal) {
        return (
          "Uma escola prioritária ficou depois de uma escola comum. " +
          "Todas as prioritárias precisam ser visitadas primeiro."
        );
      }
    } else {
      seenNormal = true;
    }
  }

  return null;
}
