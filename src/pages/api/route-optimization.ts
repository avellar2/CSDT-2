import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface School {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RouteOptimizationRequest {
  technicianId: number;
  date: string;
  schools: number[];
  startLocation?: { lat: number; lng: number };
}

// Algoritmo do Vizinho Mais Próximo (TSP Heuristic)
function nearestNeighborTSP(schools: School[], startLocation?: { lat: number; lng: number }) {
  if (schools.length === 0) return [];
  
  const visited = new Set<number>();
  const route: School[] = [];
  
  // Ponto de partida (primeira escola ou localização inicial)
  let currentLocation = startLocation || 
    { lat: schools[0].latitude || 0, lng: schools[0].longitude || 0 };
  
  while (visited.size < schools.length) {
    let nearestSchool: School | null = null;
    let minDistance = Infinity;
    
    // Encontra a escola mais próxima não visitada
    for (const school of schools) {
      if (!visited.has(school.id) && school.latitude && school.longitude) {
        const distance = calculateDistance(
          currentLocation.lat, 
          currentLocation.lng,
          school.latitude, 
          school.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestSchool = school;
        }
      }
    }
    
    if (nearestSchool) {
      visited.add(nearestSchool.id);
      route.push(nearestSchool);
      currentLocation = { lat: nearestSchool.latitude!, lng: nearestSchool.longitude! };
    } else {
      break;
    }
  }
  
  return route;
}

// Calcula distância entre dois pontos (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Algoritmo Genético (para casos complexos)
function geneticAlgorithmTSP(schools: School[], generations = 100, populationSize = 50) {
  if (schools.length <= 3) return nearestNeighborTSP(schools);
  
  // Inicializa população
  const population: School[][] = [];
  for (let i = 0; i < populationSize; i++) {
    population.push([...schools].sort(() => Math.random() - 0.5));
  }
  
  for (let gen = 0; gen < generations; gen++) {
    // Avalia fitness (menor distância é melhor)
    const fitness = population.map(route => 1 / (1 + calculateTotalDistance(route)));
    
    // Seleção e crossover
    const newPopulation: School[][] = [];
    for (let i = 0; i < populationSize; i++) {
      const parent1 = tournamentSelection(population, fitness);
      const parent2 = tournamentSelection(population, fitness);
      const child = orderCrossover(parent1, parent2);
      
      // Mutação
      if (Math.random() < 0.1) {
        mutate(child);
      }
      
      newPopulation.push(child);
    }
    
    population.splice(0, populationSize, ...newPopulation);
  }
  
  // Retorna a melhor rota
  const bestRoute = population.reduce((best, current) => 
    calculateTotalDistance(current) < calculateTotalDistance(best) ? current : best
  );
  
  return bestRoute;
}

function calculateTotalDistance(route: School[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    if (route[i].latitude && route[i].longitude && 
        route[i + 1].latitude && route[i + 1].longitude) {
      total += calculateDistance(
        route[i].latitude!, route[i].longitude!,
        route[i + 1].latitude!, route[i + 1].longitude!
      );
    }
  }
  return total;
}

function tournamentSelection(population: School[][], fitness: number[]): School[] {
  const tournamentSize = 3;
  const tournament = [];
  
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    tournament.push({ route: population[randomIndex], fitness: fitness[randomIndex] });
  }
  
  return tournament.reduce((best, current) => 
    current.fitness > best.fitness ? current : best
  ).route;
}

function orderCrossover(parent1: School[], parent2: School[]): School[] {
  const start = Math.floor(Math.random() * parent1.length);
  const end = Math.floor(Math.random() * parent1.length);
  const [startIdx, endIdx] = [Math.min(start, end), Math.max(start, end)];
  
  const child: (School | null)[] = new Array(parent1.length).fill(null);
  
  // Copia segmento do parent1
  for (let i = startIdx; i <= endIdx; i++) {
    child[i] = parent1[i];
  }
  
  // Preenche com parent2
  let parent2Index = 0;
  for (let i = 0; i < child.length; i++) {
    if (child[i] === null) {
      while (child.includes(parent2[parent2Index])) {
        parent2Index++;
      }
      child[i] = parent2[parent2Index];
      parent2Index++;
    }
  }
  
  return child as School[];
}

function mutate(route: School[]): void {
  const i = Math.floor(Math.random() * route.length);
  const j = Math.floor(Math.random() * route.length);
  [route[i], route[j]] = [route[j], route[i]];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { technicianId, date, schools: schoolIds, startLocation }: RouteOptimizationRequest = req.body;

    // Busca dados das escolas
    const schools = await prisma.school.findMany({
      where: { id: { in: schoolIds } },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true
      }
    });

    // Verifica se todas as escolas têm coordenadas
    const schoolsWithCoords = schools.filter(s => s.latitude && s.longitude);
    
    if (schoolsWithCoords.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhuma escola tem coordenadas geográficas. Execute o geocoding primeiro.' 
      });
    }

    // Escolhe algoritmo baseado no número de escolas
    let optimizedRoute: School[];
    if (schoolsWithCoords.length <= 5) {
      optimizedRoute = nearestNeighborTSP(schoolsWithCoords, startLocation);
    } else {
      optimizedRoute = geneticAlgorithmTSP(schoolsWithCoords);
    }

    // Calcula métricas
    const totalDistance = calculateTotalDistance(optimizedRoute);
    const estimatedTime = Math.round(totalDistance * 2 + (optimizedRoute.length * 30)); // 2 min/km + 30min por escola

    // Salva no banco
    const routeOptimization = await prisma.routeOptimization.create({
      data: {
        technicianId,
        date: new Date(date),
        totalDistance,
        totalTime: estimatedTime,
        optimized: true,
        visits: {
          create: optimizedRoute.map((school, index) => ({
            school: {
              connect: { id: school.id }
            },
            visitOrder: index + 1,
            estimatedTime: 30, // 30 minutos por escola
            status: 'PENDING'
          }))
        }
      },
      include: {
        visits: {
          include: { school: true },
          orderBy: { visitOrder: 'asc' }
        }
      }
    });

    return res.status(200).json({
      success: true,
      optimization: routeOptimization,
      metrics: {
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTime: estimatedTime,
        schoolsCount: optimizedRoute.length,
        algorithm: optimizedRoute.length <= 5 ? 'nearest_neighbor' : 'genetic'
      }
    });

  } catch (error) {
    console.error('Erro na otimização de rota:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}