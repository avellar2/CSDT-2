import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";
import { buildGeoQualityReport } from "@/utils/routePlanner/geo";

/**
 * GET /api/routes/geo-quality
 *
 * Relatório de qualidade das coordenadas das escolas. `geocoded = true` não é
 * tratado como prova de localização correta: o relatório lista escolas sem
 * coordenadas, com coordenadas inválidas, fora da área esperada e grupos de
 * escolas empilhadas na mesma coordenada.
 *
 * Somente leitura: não corrige nem apaga nada.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({
      error: "Somente ADMIN ou ADMTOTAL podem consultar a qualidade das coordenadas.",
    });
  }

  try {
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

    const districtOf = new Map(schools.map((school) => [school.id, school.district]));

    return res.status(200).json({
      success: true,
      summary: {
        total: report.total,
        usable: report.usable,
        missingCoords: report.missingCoords.length,
        invalidCoords: report.invalidCoords.length,
        suspicious: report.suspicious.length,
        duplicateClusters: report.duplicateClusters.length,
        geocodedWithoutCoords: report.geocodedWithoutCoords,
      },
      missingCoords: report.missingCoords.map((item) => ({
        schoolId: item.schoolId,
        name: item.name,
        district: districtOf.get(item.schoolId) ?? null,
        reason: item.issues[0]?.message ?? null,
      })),
      invalidCoords: report.invalidCoords.map((item) => ({
        schoolId: item.schoolId,
        name: item.name,
        district: districtOf.get(item.schoolId) ?? null,
        reason: item.issues[0]?.message ?? null,
      })),
      suspicious: report.suspicious.map((item) => ({
        schoolId: item.schoolId,
        name: item.name,
        district: districtOf.get(item.schoolId) ?? null,
        latitude: item.latitude,
        longitude: item.longitude,
        issues: item.issues.map((issue) => issue.message),
      })),
      duplicateClusters: report.duplicateClusters,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de coordenadas:", error);
    return res.status(500).json({ error: "Erro interno ao gerar o relatório." });
  }
}
