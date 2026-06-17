const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const JOÃO_USERID = '3d72274c-c84a-4216-9822-0781e92b5b12';
  const JOÃO_PROFILEID = 50;

  console.log(`=== DEEP SEARCH FOR JOÃO ===`);
  console.log(`Profile ID: ${JOÃO_PROFILEID}, User ID: ${JOÃO_USERID}\n`);

  // InternalOS - tecnicoId uses Profile.id
  const internalOs = await prisma.internalOS.findMany({
    where: { tecnicoId: JOÃO_PROFILEID },
    take: 20
  });
  console.log(`InternalOS (tecnicoId=${JOÃO_PROFILEID}): ${internalOs.length}`);

  // ScheduleEvent
  const scheduleEvents = await prisma.scheduleEvent.findMany({
    where: {
      OR: [
        { createdBy: JOÃO_USERID },
        { assignedTo: JOÃO_USERID }
      ]
    },
    take: 20
  });
  console.log(`ScheduleEvent: ${scheduleEvents.length}`);

  // TechnicalTicket
  const tickets = await prisma.technicalTicket.findMany({
    where: {
      OR: [
        { createdBy: JOÃO_USERID },
        { assignedTo: JOÃO_USERID }
      ]
    },
    take: 20
  });
  console.log(`TechnicalTicket: ${tickets.length}`);

  // chamados_escola
  const chamados = await prisma.chamados_escola.findMany({
    where: {
      OR: [
        { createdBy: JOÃO_USERID },
        { assignedTo: JOÃO_USERID }
      ]
    },
    take: 20
  });
  console.log(`chamados_escola: ${chamados.length}`);

  // internal_tickets
  const internalTickets = await prisma.internal_tickets.findMany({
    where: { assignedTo: JOÃO_USERID },
    take: 20
  });
  console.log(`internal_tickets: ${internalTickets.length}`);

  // Items
  const items = await prisma.item.findMany({
    where: { userId: JOÃO_USERID },
    take: 10
  });
  console.log(`Items (userId): ${items.length}`);

  // DailyDemandOsRelease
  const demands = await prisma.dailyDemandOsRelease.findMany({
    where: {
      OR: [
        { technicianId: JOÃO_PROFILEID },
        { releasedById: JOÃO_PROFILEID }
      ]
    },
    take: 10
  });
  console.log(`DailyDemandOsRelease: ${demands.length}`);

  // RouteOptimization
  const routes = await prisma.routeOptimization.findMany({
    where: { technicianId: JOÃO_PROFILEID },
    take: 10
  });
  console.log(`RouteOptimization: ${routes.length}`);

  // OffTechnician, BaseTechnician, VisitTechnician
  const offTech = await prisma.offTechnician.findMany({
    where: { technicianId: JOÃO_PROFILEID }
  });
  console.log(`OffTechnician: ${offTech.length}`);

  const baseTech = await prisma.baseTechnician.findMany({
    where: { technicianId: JOÃO_PROFILEID }
  });
  console.log(`BaseTechnician: ${baseTech.length}`);

  const visitTech = await prisma.visitTechnician.findMany({
    where: { technicianId: JOÃO_PROFILEID }
  });
  console.log(`VisitTechnician: ${visitTech.length}`);

  // ChadaDiagnostic
  const chadaDiag = await prisma.chadaDiagnostic.findMany({
    where: { createdBy: JOÃO_USERID },
    take: 10
  });
  console.log(`ChadaDiagnostic (createdBy): ${chadaDiag.length}`);

  // Internal_chat_messages
  const chatMsgs = await prisma.internal_chat_messages.findMany({
    where: { senderId: JOÃO_USERID },
    take: 10
  });
  console.log(`internal_chat_messages (senderId): ${chatMsgs.length}`);

  // Calendar
  const calendars = await prisma.calendar.findMany({
    where: { ownerId: JOÃO_USERID },
    take: 10
  });
  console.log(`Calendar (ownerId): ${calendars.length}`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Profile: displayName="João", id=${JOÃO_PROFILEID}, userId=${JOÃO_USERID}, role=TECH, schoolId=225`);
  console.log(`User table: NO matching user found (empty result)`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});