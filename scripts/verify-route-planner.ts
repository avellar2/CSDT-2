/**
 * Verificação manual do planejador contra o OSRM real.
 * Uso: npx tsx scripts/verify-route-planner.ts
 */
import { OsrmProvider } from "../src/utils/routePlanner/osrm";
import { solveRoute } from "../src/utils/routePlanner/solver";
import { buildSchedule, formatDuration } from "../src/utils/routePlanner/schedule";

const START = { lat: -22.78986385281102, lng: -43.30904663652884 };

const schools = [
  { id: 1, name: "Escola A (perto)", lat: -22.75, lng: -43.31, priority: false },
  { id: 2, name: "Escola B (longe)", lat: -22.62, lng: -43.42, priority: true },
  { id: 3, name: "Escola C (media)", lat: -22.78, lng: -43.33, priority: false },
];

async function main() {
  const provider = new OsrmProvider({ minIntervalMs: 1200, timeoutMs: 20000 });
  const points = [START, ...schools.map((s) => ({ lat: s.lat, lng: s.lng }))];

  const matrix = await provider.table(points);
  console.log("Matriz de durações (s):");
  console.table(matrix.durations.map((row) => row.map((v) => Math.round(v))));

  const priorityNodes = schools
    .map((school, index) => ({ school, node: index + 1 }))
    .filter((entry) => entry.school.priority)
    .map((entry) => entry.node);

  const solved = solveRoute({
    durations: matrix.durations,
    distances: matrix.distances,
    startNode: 0,
    stopNodes: schools.map((_, index) => index + 1),
    priorityNodes,
    returnToStart: false,
  });

  console.log("Ordem (nós):", solved.order, "algoritmo:", solved.algorithm);
  console.log(
    "Paradas:",
    solved.order.map((node) => schools[node - 1].name)
  );
  console.log("Tempo de condução:", formatDuration(solved.totalDuration / 60));
  console.log("Distância:", (solved.totalDistance / 1000).toFixed(1), "km");

  const naive = schools.map((_, index) => index + 1);
  const naiveCost = [0, ...naive].reduce(
    (sum, node, index, path) =>
      index === 0 ? 0 : sum + matrix.durations[path[index - 1]][node],
    0
  );
  console.log(
    "Custo da ordem original:",
    formatDuration(naiveCost / 60),
    "→ ganho:",
    formatDuration((naiveCost - solved.totalDuration) / 60)
  );

  const schedule = buildSchedule(
    "2026-11-16",
    "08:00",
    solved.order.map((node, index) => ({
      travelSeconds: matrix.durations[[0, ...solved.order][index]][node],
      serviceMinutes: 30,
    }))
  );
  console.log(
    "Horários:",
    schedule.map((slot) => slot.arrivalTime)
  );

  const geometry = await provider.route([START, ...solved.order.map((node) => points[node])]);
  console.log("Pontos da geometria viária:", geometry.coordinates.length);
  console.log(
    "Geometria vs matriz (km):",
    (geometry.distanceMeters / 1000).toFixed(2),
    "vs",
    (solved.totalDistance / 1000).toFixed(2)
  );
}

main().catch((error) => {
  console.error("Falhou:", error);
  process.exitCode = 1;
});
