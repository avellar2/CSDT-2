/**
 * Auditoria SOMENTE LEITURA das coordenadas das escolas.
 * Uso: npx tsx scripts/geo-audit.ts
 */
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  const { default: prisma } = await import("../src/utils/prisma");
  const { buildGeoQualityReport } = await import("../src/utils/routePlanner/geo");

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      district: true,
      geocoded: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: "asc" },
  });

  const report = buildGeoQualityReport(schools);

  console.log("=== RESUMO ===");
  console.log("total de escolas:", report.total);
  console.log("com coordenadas utilizáveis:", report.usable);
  console.log("sem coordenadas:", report.missingCoords.length);
  console.log("coordenadas inválidas:", report.invalidCoords.length);
  console.log("suspeitas:", report.suspicious.length);
  console.log("geocoded=true sem coordenadas:", report.geocodedWithoutCoords);
  console.log("grupos de coordenadas repetidas:", report.duplicateClusters.length);

  const line = (item: { schoolId: number; name: string }) => {
    const school = schools.find((candidate) => candidate.id === item.schoolId);
    return `  #${item.schoolId} ${item.name} (distrito ${school?.district ?? "?"})`;
  };

  if (report.missingCoords.length > 0) {
    console.log("\n=== SEM COORDENADAS ===");
    report.missingCoords.forEach((item) => console.log(line(item)));
  }

  if (report.invalidCoords.length > 0) {
    console.log("\n=== COORDENADAS INVÁLIDAS ===");
    report.invalidCoords.forEach((item) => console.log(line(item)));
  }

  if (report.duplicateClusters.length > 0) {
    console.log("\n=== COORDENADAS REPETIDAS ===");
    report.duplicateClusters.forEach((cluster) =>
      console.log(
        `  ${cluster.latitude.toFixed(5)},${cluster.longitude.toFixed(5)} -> ` +
          cluster.schoolNames.map((name, index) => `#${cluster.schoolIds[index]} ${name}`).join(" | ")
      )
    );
  }

  if (report.suspicious.length > 0) {
    console.log("\n=== SUSPEITAS ===");
    report.suspicious.forEach((item) =>
      console.log(`${line(item)} :: ${item.issues.map((issue) => issue.message).join(" / ")}`)
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Falhou:", error);
  process.exitCode = 1;
});
