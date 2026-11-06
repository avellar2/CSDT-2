import { describe, expect, it } from "vitest";

/**
 * Teste de integração com o banco configurado.
 *
 * Roda SOMENTE quando RUN_DB_ROUTE_TESTS=1 e dentro de uma transação que é
 * sempre revertida (nenhum dado fictício é persistido). Valida as constraints,
 * FKs e índices criados pela migration `20261106120000_add_operational_daily_routes`.
 */
const RUN = process.env.RUN_DB_ROUTE_TESTS === "1";

const ROLLBACK = "__ROLLBACK_ROUTE_TESTS__";

describe.skipIf(!RUN)("Rotas operacionais — integração com banco", () => {
  it(
    "preserva histórico, bloqueia dupla alocação e mantém integridade referencial",
    async () => {
      const { default: prisma } = await import("@/utils/prisma");

      const [profiles, school, beforeCounts] = await Promise.all([
        prisma.profile.findMany({ take: 4, select: { id: true } }),
        prisma.school.findFirst({ select: { id: true } }),
        Promise.all([
          prisma.dailyRoute.count(),
          prisma.dailyRouteTechnician.count(),
          prisma.routeTransfer.count(),
        ]),
      ]);

      if (!school || profiles.length < 3) {
        console.warn("Dados insuficientes para o teste de integração; ignorando.");
        return;
      }

      const evidence: string[] = [];

      try {
        await prisma.$transaction(
          async (tx) => {
            const dateKey = "2099-01-01";
            const date = new Date(`${dateKey}T00:00:00.000Z`);

            const route1 = await tx.dailyRoute.create({
              data: { date, name: "TESTE ROTA 1", createdBy: "vitest" },
            });
            const route2 = await tx.dailyRoute.create({
              data: { date, name: "TESTE ROTA 2", createdBy: "vitest" },
            });
            evidence.push("Cenário B: duas rotas na mesma data criadas");

            const [techA, techB, techC] = profiles;

            await tx.dailyRouteTechnician.create({
              data: {
                routeId: route1.id,
                technicianId: techA.id,
                routeDate: date,
                conflictKey: `${techA.id}:${dateKey}`,
              },
            });
            // Cenário A: uma rota (um carro) com dois técnicos.
            await tx.dailyRouteTechnician.create({
              data: {
                routeId: route1.id,
                technicianId: techC.id,
                routeDate: date,
                conflictKey: `${techC.id}:${dateKey}`,
              },
            });
            await tx.dailyRouteTechnician.create({
              data: {
                routeId: route2.id,
                technicianId: techB.id,
                routeDate: date,
                conflictKey: `${techB.id}:${dateKey}`,
              },
            });
            evidence.push(
              "Cenário A/B: uma rota com dois técnicos e outra rota com um técnico"
            );

            // Mesmo técnico em duas rotas ativas no mesmo dia deve falhar.
            // ON CONFLICT DO NOTHING evita abortar a transação de teste.
            const duplicatedInsert = await tx.$executeRaw`
              INSERT INTO "DailyRouteTechnician"
                ("routeId", "technicianId", "routeDate", "conflictKey", "createdAt")
              VALUES (${route2.id}, ${techA.id}, ${date}, ${`${techA.id}:${dateKey}`}, now())
              ON CONFLICT ("conflictKey") DO NOTHING
            `;
            expect(duplicatedInsert).toBe(0);
            evidence.push("Cenário J: conflictKey impede técnico em duas rotas no mesmo dia");

            const demand = await tx.schoolDemand.create({
              data: {
                schoolId: school.id,
                demand: "TESTE — demanda com rota",
                routeId: route1.id,
                createdAt: new Date(`${dateKey}T12:00:00-03:00`),
              },
            });

            const legacyDemand = await tx.schoolDemand.create({
              data: {
                schoolId: school.id,
                demand: "TESTE — demanda antiga sem rota",
                createdAt: new Date(`${dateKey}T12:00:00-03:00`),
              },
            });

            expect(demand.routeId).toBe(route1.id);
            expect(legacyDemand.routeId).toBeNull();

            // Cenário A: três demandas na mesma rota (mesmo carro).
            await tx.schoolDemand.create({
              data: {
                schoolId: school.id,
                demand: "TESTE — demanda 2 da Rota 1",
                routeId: route1.id,
                createdAt: new Date(`${dateKey}T12:00:00-03:00`),
              },
            });
            await tx.schoolDemand.create({
              data: {
                schoolId: school.id,
                demand: "TESTE — demanda 3 da Rota 1",
                routeId: route1.id,
                createdAt: new Date(`${dateKey}T12:00:00-03:00`),
              },
            });

            const demandsOnRoute1 = await tx.schoolDemand.count({
              where: { routeId: route1.id },
            });
            expect(demandsOnRoute1).toBe(3);
            evidence.push(
              "Cenário A: três demandas associadas à rota do carro X (sem duplicação de contagem)"
            );

            evidence.push("Cenário E: demanda antiga sem rota continua válida no banco");

            // Cenário C: transferência entre rotas preserva histórico e demanda.
            await tx.schoolDemand.update({
              where: { id: demand.id },
              data: { routeId: route2.id },
            });
            await tx.routeTransfer.create({
              data: {
                entityType: "DEMAND",
                entityId: demand.id,
                fromRouteId: route1.id,
                toRouteId: route2.id,
                movedBy: "vitest",
                note: "Teste de transferência",
              },
            });

            const moved = await tx.schoolDemand.findUnique({
              where: { id: demand.id },
            });
            expect(moved?.routeId).toBe(route2.id);

            const audits = await tx.routeTransfer.count({
              where: { entityType: "DEMAND", entityId: demand.id },
            });
            expect(audits).toBe(1);
            evidence.push("Cenários C/G: transferência mantém a demanda e gera auditoria");

            // Cenário F: reagendamento vinculado a rota (mesma FK anulável).
            const chamado = await tx.chamados_escalas.create({
              data: {
                escola: "Escola de teste",
                titulo: "Reagendamento de teste",
                descricao: "Teste",
                categoria: "REDE",
                tecnico: "vitest",
                routeId: route1.id,
                dataAgendamento: new Date(`${dateKey}T09:00:00-03:00`),
                updatedAt: new Date(),
              },
            });
            expect(chamado.routeId).toBe(route1.id);
            evidence.push("Cenário F: reagendamento aceita a rota responsável");

            // Problem B: a regra de visibilidade é por chamado e pela data
            // operacional dele, não pela existência global de rotas.
            const ticketOwnRoute = await tx.technicalTicket.create({
              data: {
                schoolId: school.id,
                title: "TESTE — chamado da Rota 1",
                description: "Teste",
                createdBy: "vitest",
                routeId: route1.id,
                scheduledDate: new Date(`${dateKey}T09:00:00-03:00`),
                updatedAt: new Date(),
              },
            });
            const ticketOtherRoute = await tx.technicalTicket.create({
              data: {
                schoolId: school.id,
                title: "TESTE — chamado da Rota 2",
                description: "Teste",
                createdBy: "vitest",
                routeId: route2.id,
                scheduledDate: new Date(`${dateKey}T10:00:00-03:00`),
                updatedAt: new Date(),
              },
            });
            const ticketUnassignedToday = await tx.technicalTicket.create({
              data: {
                schoolId: school.id,
                title: "TESTE — chamado sem rota no dia com rotas",
                description: "Teste",
                createdBy: "vitest",
                scheduledDate: new Date(`${dateKey}T11:00:00-03:00`),
                updatedAt: new Date(),
              },
            });
            const ticketOldDay = await tx.technicalTicket.create({
              data: {
                schoolId: school.id,
                title: "TESTE — chamado antigo em dia sem rotas",
                description: "Teste",
                createdBy: "vitest",
                scheduledDate: new Date("2026-10-01T12:00:00-03:00"),
                updatedAt: new Date(),
              },
            });

            const { buildTechnicianTicketWhere } = await import(
              "@/utils/operationalRoutes"
            );
            const techAVisible = await tx.technicalTicket.findMany({
              where: {
                AND: [
                  {
                    id: {
                      in: [
                        ticketOwnRoute.id,
                        ticketOtherRoute.id,
                        ticketUnassignedToday.id,
                        ticketOldDay.id,
                      ],
                    },
                  },
                  buildTechnicianTicketWhere({
                    routeIds: [route1.id],
                    daysWithRoutes: [dateKey],
                  }),
                ],
              },
              select: { id: true },
            });

            expect(techAVisible.map((ticket) => ticket.id).sort()).toEqual(
              [ticketOwnRoute.id, ticketOldDay.id].sort()
            );
            evidence.push(
              "Problem B/C: chamado antigo de dia sem rota continua visível; outra rota e fila administrativa ficam ocultas"
            );

            // Ao excluir a rota, nada é apagado: apenas o vínculo fica nulo.
            await tx.dailyRouteTechnician.deleteMany({
              where: { routeId: route2.id },
            });
            await tx.dailyRoute.delete({ where: { id: route2.id } });

            const demandAfterDelete = await tx.schoolDemand.findUnique({
              where: { id: demand.id },
            });
            const chamadoAfterDelete = await tx.chamados_escalas.findUnique({
              where: { id: chamado.id },
            });

            expect(demandAfterDelete).not.toBeNull();
            expect(demandAfterDelete?.routeId).toBeNull();
            expect(chamadoAfterDelete).not.toBeNull();
            evidence.push(
              "Cenário C/J: excluir rota não apaga demandas nem OS e preserva histórico"
            );

            throw new Error(ROLLBACK);
          },
          { timeout: 30000 }
        );
      } catch (error) {
        if (!(error instanceof Error) || error.message !== ROLLBACK) {
          throw error;
        }
      }

      const afterCounts = await Promise.all([
        prisma.dailyRoute.count(),
        prisma.dailyRouteTechnician.count(),
        prisma.routeTransfer.count(),
      ]);

      // A transação foi revertida: o banco permanece com os mesmos totais.
      expect(afterCounts).toEqual(beforeCounts);
      evidence.push("Rollback confirmado: nenhum dado de teste permaneceu no banco");

      console.info(evidence.join("\n"));
    },
    60000
  );
});
