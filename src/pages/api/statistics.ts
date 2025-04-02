import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const serviceOrders = await prisma.serviceOrder.findMany();

    const technicianData = serviceOrders.reduce((acc: any, order: any) => {
      order.technicians.forEach((technician: string) => {
        if (!acc[technician]) {
          acc[technician] = 0;
        }
        acc[technician]++;
      });
      return acc;
    }, {});

    const schoolData = serviceOrders.reduce((acc: any, order: any) => {
      if (!acc[order.school]) {
        acc[order.school] = 0;
      }
      acc[order.school]++;
      return acc;
    }, {});

    const timePeriodData = serviceOrders.reduce((acc: any, order: any) => {
      const date = new Date(order.visitDate).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {});

    const visitTypeData = serviceOrders.reduce((acc: any, order: any) => {
      if (!acc[order.visitObjective]) {
        acc[order.visitObjective] = 0;
      }
      acc[order.visitObjective]++;
      return acc;
    }, {});

    const problemSolvedData = serviceOrders.reduce((acc: any, order: any) => {
      if (!acc[order.problemSolved]) {
        acc[order.problemSolved] = 0;
      }
      acc[order.problemSolved]++;
      return acc;
    }, {});

    const itemCountData = serviceOrders.reduce((acc: any, order: any) => {
      if (!acc[order.school]) {
        acc[order.school] = {
          sieduca: 0,
          secretary: 0,
          otherLocations: 0,
          racks: 0,
          routers: 0,
          printers: 0,
        };
      }
      acc[order.school].sieduca += parseInt(order.sieducaEquipmentDetails || 0);
      acc[order.school].secretary += parseInt(order.secretaryEquipmentDetails || 0);
      acc[order.school].otherLocations += parseInt(order.otherLocationsEquipmentDetails || 0);
      acc[order.school].racks += parseInt(order.rackEquipmentDetails || 0);
      acc[order.school].routers += parseInt(order.internetDetails || 0);
      acc[order.school].printers += parseInt(order.printerEquipmentDetails || 0);
      return acc;
    }, {});

    res.status(200).json({
      technicianData: {
        labels: Object.keys(technicianData),
        datasets: [
          {
            label: 'Ordens de Serviço',
            data: Object.values(technicianData),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      },
      schoolData: {
        labels: Object.keys(schoolData),
        datasets: [
          {
            label: 'Visitas',
            data: Object.values(schoolData),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
        ],
      },
      timePeriodData: {
        labels: Object.keys(timePeriodData),
        datasets: [
          {
            label: 'Ordens de Serviço',
            data: Object.values(timePeriodData),
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
        ],
      },
      visitTypeData: {
        labels: Object.keys(visitTypeData),
        datasets: [
          {
            label: 'Tipos de Visita',
            data: Object.values(visitTypeData),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      problemSolvedData: {
        labels: Object.keys(problemSolvedData),
        datasets: [
          {
            label: 'Problemas Solucionados',
            data: Object.values(problemSolvedData),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      },
      itemCountData: {
        labels: Object.keys(itemCountData),
        datasets: [
          {
            label: 'SIEDUCA',
            data: Object.values(itemCountData).map((item: any) => item.sieduca),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Secretaria',
            data: Object.values(itemCountData).map((item: any) => item.secretary),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
          {
            label: 'Outros Locais',
            data: Object.values(itemCountData).map((item: any) => item.otherLocations),
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
          },
          {
            label: 'Racks',
            data: Object.values(itemCountData).map((item: any) => item.racks),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Roteadores',
            data: Object.values(itemCountData).map((item: any) => item.routers),
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
          {
            label: 'Impressoras',
            data: Object.values(itemCountData).map((item: any) => item.printers),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}