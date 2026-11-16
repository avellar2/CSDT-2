import { describe, expect, it } from "vitest";
import {
  CostMatrix,
  LatLng,
  PlannerSchool,
  RoutingError,
  RoutingProvider,
} from "@/utils/routePlanner/types";
import { createPlanner, PlannerError } from "@/utils/routePlanner/planner";
import { solveRoute, validatePriorityOrder } from "@/utils/routePlanner/solver";
import {
  addDaysToDateKey,
  buildSchedule,
  formatDuration,
  formatSaoPauloDateTime,
  normalizeServiceMinutes,
  parseStartTime,
} from "@/utils/routePlanner/schedule";
import { buildGeoQualityReport, haversineMeters } from "@/utils/routePlanner/geo";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const coordKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

/** Provedor falso que devolve a matriz real de um grafo de nós conhecidos. */
function providerFromNodes(
  costs: number[][],
  nodes: Record<string, LatLng>
): RoutingProvider {
  const indexByKey = new Map(
    Object.entries(nodes).map(([name, point]) => [coordKey(point.lat, point.lng), Number(name)])
  );

  return {
    name: "fake-osrm",
    enabled: true,
    async table(points: LatLng[]): Promise<CostMatrix> {
      const indices = points.map((point) => {
        const index = indexByKey.get(coordKey(point.lat, point.lng));
        if (index === undefined) throw new Error("ponto desconhecido no provedor de teste");
        return index;
      });

      const durations = indices.map((i) => indices.map((j) => costs[i][j]));
      const distances = durations.map((row) => row.map((value) => value * 10));
      return { durations, distances };
    },
    async route(points: LatLng[]) {
      return {
        coordinates: points.map((point) => [point.lat, point.lng] as [number, number]),
        distanceMeters: 0,
        durationSeconds: 0,
      };
    },
  };
}

function school(
  id: number,
  name: string,
  lat: number | null,
  lng: number | null,
  geocoded = true
): PlannerSchool {
  return {
    id,
    name,
    address: `Rua ${name}, Duque de Caxias`,
    district: "1",
    latitude: lat,
    longitude: lng,
    geocoded,
  };
}

function depsFor(schools: PlannerSchool[], provider: RoutingProvider) {
  return {
    provider,
    loadSchools: async (ids: number[]) =>
      schools.filter((item) => ids.includes(item.id)),
  };
}

const START = { lat: -22.78986385281102, lng: -43.30904663652884, name: "CSDT" };

/* ------------------------------------------------------------------ */
/* Cenário base: prioridade distante x comum próxima                   */
/* ------------------------------------------------------------------ */

const P_START = { lat: -22.7, lng: -43.3 };
const P_A = { lat: -22.75, lng: -43.31 }; // comum, perto
const P_B = { lat: -22.78, lng: -43.33 }; // prioritária, longe
const P_C = { lat: -22.8, lng: -43.29 }; // comum, média

// nós: 0 = partida, 1 = A, 2 = B, 3 = C
const BASE_COSTS = [
  [0, 120, 900, 240],
  [120, 0, 900, 120],
  [900, 900, 0, 800],
  [240, 120, 800, 0],
];

const BASE_NODES = { 0: P_START, 1: P_A, 2: P_B, 3: P_C };

const baseSchools = [
  school(1, "Escola A", P_A.lat, P_A.lng),
  school(2, "Escola B", P_B.lat, P_B.lng),
  school(3, "Escola C", P_C.lat, P_C.lng),
];

describe("Planejador — prioridades", () => {
  it("visita a escola prioritária distante antes da comum próxima", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 2, 3],
      prioritySchools: [2],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.stops.map((stop) => stop.schoolId)).toEqual([2, 3, 1]);
    expect(plan.stops[0].priority).toBe(true);
    expect(plan.stops[0].schoolId).toBe(2);

    // 900 (partida → B) + 800 (B → C) + 120 (C → A)
    expect(plan.totals.drivingSeconds).toBe(1820);
  });

  it("respeita múltiplas prioridades antes de qualquer escola comum", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 2, 3],
      prioritySchools: [1, 2],
      start: P_START,
      dateKey: "2026-11-16",
    });

    const ids = plan.stops.map((stop) => stop.schoolId);
    expect(ids[ids.length - 1]).toBe(3);
    expect(new Set(ids.slice(0, 2))).toEqual(new Set([1, 2]));
    expect(plan.stops.filter((stop) => stop.priority)).toHaveLength(2);
  });

  it("otimiza a ordem dentro do bloco prioritário pelo tempo viário", async () => {
    // 0 → 1 custa 900 e 0 → 2 custa 120: a ordem correta é 2 antes de 1.
    const costs = [
      [0, 900, 120],
      [900, 0, 200],
      [120, 200, 0],
    ];
    const nodes = {
      0: P_START,
      1: { lat: -22.6, lng: -43.4 },
      2: { lat: -22.62, lng: -43.41 },
    };

    const planner = createPlanner(
      depsFor(
        [
          school(10, "Prioritária longe", -22.6, -43.4),
          school(11, "Prioritária perto", -22.62, -43.41),
        ],
        providerFromNodes(costs, nodes)
      )
    );

    const plan = await planner.plan({
      schools: [10, 11],
      prioritySchools: [10, 11],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.stops.map((stop) => stop.schoolId)).toEqual([11, 10]);
  });

  it("permite fixar a primeira parada", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 2, 3],
      prioritySchools: [],
      fixedFirstSchoolId: 3,
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.stops[0].schoolId).toBe(3);
  });

  it("não deixa escola prioritária depois de escola comum ao salvar ordem manual", () => {
    expect(validatePriorityOrder([2, 1, 3], [2])).toBeNull();
    expect(validatePriorityOrder([1, 2, 3], [2])).toContain("prioritária");
    expect(validatePriorityOrder([1, 3], [])).toBeNull();
  });
});

describe("Planejador — ponto de partida", () => {
  const S1 = { lat: -22.7, lng: -43.3 };
  const S2 = { lat: -22.9, lng: -43.2 };

  // nós: 0 = S1, 1 = S2, 2 = A, 3 = B
  const costs = [
    [0, 999, 100, 500],
    [999, 0, 500, 100],
    [100, 500, 0, 400],
    [500, 100, 400, 0],
  ];
  const nodes = { 0: S1, 1: S2, 2: P_A, 3: P_B };
  const schools = [
    school(1, "Escola A", P_A.lat, P_A.lng),
    school(2, "Escola B", P_B.lat, P_B.lng),
  ];

  it("muda a ordem quando o ponto de partida muda", async () => {
    const provider = providerFromNodes(costs, nodes);
    const planner = createPlanner(depsFor(schools, provider));

    const fromS1 = await planner.plan({
      schools: [1, 2],
      start: { ...S1, name: "Partida 1" },
      dateKey: "2026-11-16",
    });

    const fromS2 = await planner.plan({
      schools: [1, 2],
      start: { ...S2, name: "Partida 2" },
      dateKey: "2026-11-16",
    });

    expect(fromS1.stops.map((stop) => stop.schoolId)).toEqual([1, 2]);
    expect(fromS2.stops.map((stop) => stop.schoolId)).toEqual([2, 1]);
    expect(fromS1.start.name).toBe("Partida 1");
  });
});

describe("Planejador — casos básicos", () => {
  it("monta rota com uma única escola", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1],
      start: P_START,
      serviceMinutes: 45,
      startTime: "08:00",
      dateKey: "2026-11-16",
    });

    expect(plan.stops).toHaveLength(1);
    expect(plan.stops[0].arrivalTime).toBe("2026-11-16T08:02:00-03:00");
    expect(plan.stops[0].departureTime).toBe("2026-11-16T08:47:00-03:00");
    expect(plan.totals.serviceMinutes).toBe(45);
    expect(plan.totals.drivingSeconds).toBe(120);
  });

  it("monta rota com várias escolas sem repetir paradas", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 2, 3],
      start: P_START,
      dateKey: "2026-11-16",
    });

    const ids = plan.stops.map((stop) => stop.schoolId);
    expect(new Set(ids).size).toBe(3);
    expect(plan.stops.map((stop) => stop.order)).toEqual([1, 2, 3]);

    const legSum = plan.stops.reduce((sum, stop) => sum + stop.legDurationSeconds, 0);
    expect(plan.totals.drivingSeconds).toBe(legSum);
  });

  it("mantém dois carros com roteiros independentes", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const car1 = await planner.plan({
      schools: [1, 2],
      prioritySchools: [2],
      start: P_START,
      dateKey: "2026-11-16",
    });

    const car2 = await planner.plan({
      schools: [3],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(car1.stops.map((stop) => stop.schoolId).sort()).toEqual([1, 2]);
    expect(car2.stops.map((stop) => stop.schoolId)).toEqual([3]);
  });

  it("soma o retorno ao ponto de partida no modo ida e volta", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const oneWay = await planner.plan({
      schools: [1],
      start: P_START,
      returnToStart: false,
      dateKey: "2026-11-16",
    });

    const roundTrip = await planner.plan({
      schools: [1],
      start: P_START,
      returnToStart: true,
      dateKey: "2026-11-16",
    });

    expect(oneWay.totals.returnMinutes).toBe(0);
    expect(roundTrip.totals.returnMinutes).toBe(2);
    expect(roundTrip.totals.drivingSeconds).toBe(oneWay.totals.drivingSeconds + 120);
    expect(roundTrip.totals.distanceMeters).toBe(2400);
  });
});

describe("Planejador — dados geográficos incompletos", () => {
  it("não descarta silenciosamente escola sem coordenadas", async () => {
    const schools = [
      school(1, "Escola A", P_A.lat, P_A.lng),
      school(2, "Escola sem coordenadas", null, null, true),
    ];

    const planner = createPlanner(
      depsFor(schools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 2],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.stops.map((stop) => stop.schoolId)).toEqual([1]);
    expect(plan.excluded).toHaveLength(1);
    expect(plan.excluded[0].schoolId).toBe(2);
    expect(plan.excluded[0].reason).toContain("geocodificada");
  });

  it("falha de forma explícita quando nenhuma escola tem coordenadas", async () => {
    const schools = [school(2, "Sem coordenadas", null, null, false)];
    const planner = createPlanner(
      depsFor(schools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    await expect(
      planner.plan({ schools: [2], start: P_START, dateKey: "2026-11-16" })
    ).rejects.toMatchObject({ code: "NO_USABLE_SCHOOLS", statusCode: 422 });
  });

  it("ignora escola que não existe no cadastro", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    const plan = await planner.plan({
      schools: [1, 999],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.excluded.map((item) => item.schoolId)).toEqual([999]);
  });
});

describe("Planejador — falhas do serviço de roteamento", () => {
  const failingProvider: RoutingProvider = {
    name: "osrm",
    enabled: true,
    async table() {
      throw new RoutingError("timeout", "O serviço de roteamento não respondeu em 8s.");
    },
    async route() {
      throw new RoutingError("timeout", "timeout");
    },
  };

  it("devolve erro claro e não inventa rota quando a aproximação não é aceita", async () => {
    const planner = createPlanner(depsFor(baseSchools, failingProvider));

    await expect(
      planner.plan({ schools: [1, 2], start: P_START, dateKey: "2026-11-16" })
    ).rejects.toMatchObject({ code: "ROUTING_UNAVAILABLE", statusCode: 503 });
  });

  it("marca o resultado como estimativa quando a aproximação é permitida", async () => {
    const planner = createPlanner(depsFor(baseSchools, failingProvider));

    const plan = await planner.plan({
      schools: [1, 2],
      start: P_START,
      dateKey: "2026-11-16",
      allowApproximate: true,
    });

    expect(plan.approximate).toBe(true);
    expect(plan.provider).toBe("estimativa");
    expect(plan.warnings.join(" ")).toContain("ESTIMATIVAS");
    expect(plan.stops).toHaveLength(2);
  });

  it("recusa trajeto impossível entre escolas", async () => {
    const costs = [
      [0, 100, 200],
      [100, 0, Number.POSITIVE_INFINITY],
      [200, Number.POSITIVE_INFINITY, 0],
    ];
    const nodes = {
      0: P_START,
      1: P_A,
      2: P_B,
    };

    const planner = createPlanner(
      depsFor(
        [school(1, "A", P_A.lat, P_A.lng), school(2, "B", P_B.lat, P_B.lng)],
        providerFromNodes(costs, nodes)
      )
    );

    await expect(
      planner.plan({ schools: [1, 2], start: P_START, dateKey: "2026-11-16" })
    ).rejects.toMatchObject({ code: "NO_ROUTE", statusCode: 422 });
  });

  it("continua válido quando só o traçado viário falha", async () => {
    const provider: RoutingProvider = {
      name: "osrm",
      enabled: true,
      table: providerFromNodes(BASE_COSTS, BASE_NODES).table,
      async route() {
        throw new RoutingError("http", "falhou");
      },
    };

    const planner = createPlanner(depsFor(baseSchools, provider));
    const plan = await planner.plan({
      schools: [1, 2],
      start: P_START,
      dateKey: "2026-11-16",
    });

    expect(plan.stops).toHaveLength(2);
    expect(plan.warnings.join(" ")).toContain("traçado");
    // A distância continua vindo da matriz viária, não do desenho.
    expect(plan.totals.distanceMeters).toBeGreaterThan(0);
  });
});

describe("Resolvedor — qualidade da solução", () => {
  it("melhora o tempo total em relação à ordem original", () => {
    // Ordem original 0 → 1 → 2 → 3 → 4 é ruim; a boa é 0 → 4 → 3 → 2 → 1.
    const durations = [
      [0, 500, 900, 900, 100],
      [500, 0, 400, 900, 900],
      [900, 400, 0, 300, 900],
      [900, 900, 300, 0, 200],
      [100, 900, 900, 200, 0],
    ];
    const distances = durations.map((row) => row.map((value) => value * 10));

    const original = [1, 2, 3, 4];
    const originalCost = original.reduce(
      (sum, node, index) =>
        sum + durations[index === 0 ? 0 : original[index - 1]][node],
      0
    );

    const solved = solveRoute({
      durations,
      distances,
      startNode: 0,
      stopNodes: [1, 2, 3, 4],
      returnToStart: false,
    });

    expect(solved.totalDuration).toBeLessThan(originalCost);
    expect(solved.order).toEqual([4, 3, 2, 1]);
    expect(solved.totalDuration).toBe(1000);
  });

  it("resolve de forma exata conjuntos pequenos", () => {
    const durations = [
      [0, 10, 20, 30],
      [10, 0, 15, 25],
      [20, 15, 0, 5],
      [30, 25, 5, 0],
    ];
    const distances = durations.map((row) => row.map((value) => value * 100));

    const solved = solveRoute({
      durations,
      distances,
      startNode: 0,
      stopNodes: [1, 2, 3],
      returnToStart: false,
    });

    expect(solved.algorithm).toBe("exact");
    expect(solved.order).toEqual([1, 2, 3]);
    expect(solved.totalDuration).toBe(30);
  });

  it("respeita o bloco prioritário mesmo quando ele encarece a rota", () => {
    const durations = [
      [0, 10, 500, 20],
      [10, 0, 500, 10],
      [500, 500, 0, 480],
      [20, 10, 480, 0],
    ];
    const distances = durations.map((row) => row.map((value) => value * 10));

    const solved = solveRoute({
      durations,
      distances,
      startNode: 0,
      stopNodes: [1, 2, 3],
      priorityNodes: [2],
      returnToStart: false,
    });

    expect(solved.order[0]).toBe(2);
    // Sem prioridade a rota custaria 500s; com a prioridade custa 990s.
    expect(solved.totalDuration).toBe(990);
  });
});

describe("Agenda — horários em America/Sao_Paulo", () => {
  it("formata horários com offset de São Paulo", () => {
    expect(formatSaoPauloDateTime("2026-11-16", 8 * 60)).toBe(
      "2026-11-16T08:00:00-03:00"
    );
    expect(formatSaoPauloDateTime("2026-11-16", 8 * 60 + 7)).toBe(
      "2026-11-16T08:07:00-03:00"
    );
  });

  it("avança para o dia seguinte quando a jornada passa da meia-noite", () => {
    expect(formatSaoPauloDateTime("2026-11-16", 23 * 60 + 90)).toBe(
      "2026-11-17T00:30:00-03:00"
    );
    expect(addDaysToDateKey("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("acumula deslocamento e atendimento por parada", () => {
    const schedule = buildSchedule("2026-11-16", "08:00", [
      { travelSeconds: 600, serviceMinutes: 30 },
      { travelSeconds: 900, serviceMinutes: 30 },
    ]);

    expect(schedule[0].arrivalTime).toBe("2026-11-16T08:10:00-03:00");
    expect(schedule[0].departureTime).toBe("2026-11-16T08:40:00-03:00");
    expect(schedule[1].arrivalTime).toBe("2026-11-16T08:55:00-03:00");
    expect(schedule[1].departureTime).toBe("2026-11-16T09:25:00-03:00");
  });

  it("valida horário e duração do atendimento", () => {
    expect(parseStartTime("08:00")).toBe(480);
    expect(parseStartTime("8:05")).toBe(485);
    expect(parseStartTime("24:00")).toBeNull();
    expect(parseStartTime("08:60")).toBeNull();
    expect(parseStartTime(undefined)).toBeNull();

    expect(normalizeServiceMinutes(undefined)).toBe(30);
    expect(normalizeServiceMinutes(45)).toBe(45);
    expect(normalizeServiceMinutes(-10)).toBe(0);
    expect(normalizeServiceMinutes(9999)).toBe(480);
  });

  it("formata duração legível", () => {
    expect(formatDuration(45)).toBe("45min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(85)).toBe("1h 25min");
  });
});

describe("Qualidade das coordenadas", () => {
  it("trata geocoded=true sem coordenadas como problema", () => {
    const report = buildGeoQualityReport([
      { id: 1, name: "Sem coords", geocoded: true, latitude: null, longitude: null },
      { id: 2, name: "Ok", geocoded: true, latitude: -22.78, longitude: -43.31 },
    ]);

    expect(report.usable).toBe(1);
    expect(report.missingCoords.map((item) => item.schoolId)).toEqual([1]);
    expect(report.geocodedWithoutCoords).toBe(1);
  });

  it("detecta coordenadas fora da área de Duque de Caxias", () => {
    const report = buildGeoQualityReport([
      { id: 1, name: "Outra cidade", geocoded: true, latitude: -23.5505, longitude: -46.6333 },
    ]);

    expect(report.suspicious.map((item) => item.schoolId)).toEqual([1]);
    expect(report.suspicious[0].issues[0].code).toBe("OUTSIDE_BOUNDS");
  });

  it("detecta coordenadas repetidas entre escolas", () => {
    const report = buildGeoQualityReport([
      { id: 1, name: "A", geocoded: true, latitude: -22.78, longitude: -43.31 },
      { id: 2, name: "B", geocoded: true, latitude: -22.780001, longitude: -43.310001 },
      { id: 3, name: "C", geocoded: true, latitude: -22.79, longitude: -43.32 },
    ]);

    expect(report.duplicateClusters).toHaveLength(1);
    expect(report.duplicateClusters[0].schoolIds.sort()).toEqual([1, 2]);
  });

  it("rejeita coordenadas inválidas e (0,0)", () => {
    const report = buildGeoQualityReport([
      { id: 1, name: "Zero", geocoded: true, latitude: 0, longitude: 0 },
      { id: 2, name: "Fora", geocoded: true, latitude: 999, longitude: 999 },
    ]);

    expect(report.usable).toBe(0);
    expect(report.invalidCoords.map((item) => item.schoolId).sort()).toEqual([1, 2]);
  });

  it("calcula distância Haversine em metros", () => {
    const meters = haversineMeters(-22.78, -43.31, -22.79, -43.31);
    expect(meters).toBeGreaterThan(1100);
    expect(meters).toBeLessThan(1120);
  });
});

describe("Planejador — entrada inválida", () => {
  it("rejeita data fora do formato", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    await expect(
      planner.plan({ schools: [1], start: P_START, dateKey: "16/11/2026" })
    ).rejects.toBeInstanceOf(PlannerError);
  });

  it("rejeita lista vazia de escolas", async () => {
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, BASE_NODES))
    );

    await expect(
      planner.plan({ schools: [], start: P_START, dateKey: "2026-11-16" })
    ).rejects.toMatchObject({ code: "NO_SCHOOLS" });
  });

  it("usa o CSDT como partida padrão", async () => {
    const csdtNodes = { ...BASE_NODES, 0: START };
    const planner = createPlanner(
      depsFor(baseSchools, providerFromNodes(BASE_COSTS, csdtNodes))
    );

    const plan = await planner.plan({ schools: [1], dateKey: "2026-11-16" });
    expect(plan.start.name).toContain("CSDT");
    expect(plan.startTime).toBe("08:00");
    expect(plan.serviceMinutes).toBe(30);
  });
});
