import prisma from '../config/prisma';

/**
 * Global Supply Network Service
 * Handles supply network nodes, routes, and optimization
 */

export interface SupplyNetworkNodeData {
  nodeCode: string;
  nodeName: string;
  nodeType: string;
  country: string;
  state?: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  capacityUnit?: string;
  currentUtilization?: number;
  fixedCost?: number;
  variableCost?: number;
  currency?: string;
  operatingHours?: string;
  leadTime?: number;
  isActive?: boolean;
  status?: string;
  notes?: string;
}

export interface SupplyNetworkRouteData {
  routeCode: string;
  routeName?: string;
  originNodeId: string;
  destinationNodeId: string;
  transportMode: string;
  carrier?: string;
  costPerUnit: number;
  costPerKm?: number;
  currency?: string;
  leadTime: number;
  transitTime?: number;
  capacity?: number;
  capacityUnit?: string;
  distance?: number;
  minShipmentSize?: number;
  maxShipmentSize?: number;
  reliabilityScore?: number;
  onTimeDelivery?: number;
  isActive?: boolean;
  notes?: string;
}

export interface OptimizationConstraints {
  maxCost?: number;
  maxTime?: number;
  minServiceLevel?: number;
  capacityConstraints?: Record<string, number>;
  routeConstraints?: string[];
}

export interface DemandScenario {
  productId: string;
  locationId: string;
  quantity: number;
  priority?: number;
}

/**
 * Create a supply network node
 */
export async function createSupplyNetworkNode(data: SupplyNetworkNodeData) {
  return await prisma.supplyNetworkNode.create({
    data: {
      ...data,
      currency: data.currency || 'USD',
      isActive: data.isActive ?? true,
      status: data.status || 'operational',
      currentUtilization: data.currentUtilization || 0,
      fixedCost: data.fixedCost || 0,
      variableCost: data.variableCost || 0,
    },
  });
}

/**
 * Get supply network node by ID
 */
export async function getSupplyNetworkNodeById(id: string) {
  return await prisma.supplyNetworkNode.findUnique({
    where: { id },
    include: {
      outboundRoutes: {
        include: { destinationNode: true },
      },
      inboundRoutes: {
        include: { originNode: true },
      },
    },
  });
}

/**
 * Get all supply network nodes
 */
export async function getAllSupplyNetworkNodes(nodeType?: string, country?: string) {
  return await prisma.supplyNetworkNode.findMany({
    where: {
      isActive: true,
      ...(nodeType && { nodeType }),
      ...(country && { country }),
    },
    orderBy: { nodeName: 'asc' },
  });
}

/**
 * Update supply network node
 */
export async function updateSupplyNetworkNode(id: string, data: Partial<SupplyNetworkNodeData>) {
  return await prisma.supplyNetworkNode.update({
    where: { id },
    data,
  });
}

/**
 * Create a supply network route
 */
export async function createSupplyNetworkRoute(data: SupplyNetworkRouteData) {
  return await prisma.supplyNetworkRoute.create({
    data: {
      ...data,
      currency: data.currency || 'USD',
      isActive: data.isActive ?? true,
      reliabilityScore: data.reliabilityScore || 100,
      onTimeDelivery: data.onTimeDelivery || 100,
    },
  });
}

/**
 * Get supply network route by ID
 */
export async function getSupplyNetworkRouteById(id: string) {
  return await prisma.supplyNetworkRoute.findUnique({
    where: { id },
    include: {
      originNode: true,
      destinationNode: true,
    },
  });
}

/**
 * Get all supply network routes
 */
export async function getAllSupplyNetworkRoutes(originNodeId?: string, destinationNodeId?: string) {
  return await prisma.supplyNetworkRoute.findMany({
    where: {
      isActive: true,
      ...(originNodeId && { originNodeId }),
      ...(destinationNodeId && { destinationNodeId }),
    },
    include: {
      originNode: true,
      destinationNode: true,
    },
    orderBy: { routeCode: 'asc' },
  });
}

/**
 * Update supply network route
 */
export async function updateSupplyNetworkRoute(id: string, data: Partial<SupplyNetworkRouteData>) {
  return await prisma.supplyNetworkRoute.update({
    where: { id },
    data,
  });
}

/**
 * Find shortest path between two nodes (Dijkstra's algorithm)
 */
export async function findShortestPath(originNodeId: string, destinationNodeId: string, optimizeFor: 'cost' | 'time' = 'cost') {
  // Get all nodes and routes
  const nodes = await prisma.supplyNetworkNode.findMany({ where: { isActive: true } });
  const routes = await prisma.supplyNetworkRoute.findMany({ where: { isActive: true } });
  
  // Build adjacency list
  const graph: Record<string, Array<{ nodeId: string; cost: number; time: number; routeId: string }>> = {};
  
  nodes.forEach((node) => {
    graph[node.id] = [];
  });
  
  routes.forEach((route) => {
    graph[route.originNodeId].push({
      nodeId: route.destinationNodeId,
      cost: route.costPerUnit,
      time: route.leadTime,
      routeId: route.id,
    });
  });
  
  // Dijkstra's algorithm
  const distances: Record<string, number> = {};
  const previous: Record<string, { nodeId: string; routeId: string } | null> = {};
  const unvisited = new Set(nodes.map((n) => n.id));
  
  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
  });
  
  distances[originNodeId] = 0;
  
  while (unvisited.size > 0) {
    // Find node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach((nodeId) => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNode = nodeId;
      }
    });
    
    if (currentNode === null || currentNode === destinationNodeId) break;
    
    unvisited.delete(currentNode);
    
    // Update distances to neighbors
    graph[currentNode].forEach((neighbor) => {
      if (unvisited.has(neighbor.nodeId)) {
        const weight = optimizeFor === 'cost' ? neighbor.cost : neighbor.time;
        const alt = distances[currentNode!] + weight;
        
        if (alt < distances[neighbor.nodeId]) {
          distances[neighbor.nodeId] = alt;
          previous[neighbor.nodeId] = { nodeId: currentNode!, routeId: neighbor.routeId };
        }
      }
    });
  }
  
  // Reconstruct path
  const path: Array<{ nodeId: string; routeId?: string }> = [];
  let current: string | null = destinationNodeId;
  
  while (current !== null) {
    const prev = previous[current];
    path.unshift({ nodeId: current, routeId: prev?.routeId });
    current = prev?.nodeId || null;
  }
  
  return {
    path,
    totalCost: distances[destinationNodeId],
    totalTime: distances[destinationNodeId],
  };
}

/**
 * Optimize supply network for given demand scenario
 */
export async function optimizeSupplyNetwork(
  nodeIds: string[],
  routeIds: string[],
  demandScenario: DemandScenario[],
  objectiveFunction: string,
  constraints: OptimizationConstraints,
  createdBy: string
) {
  const optimizationNumber = `OPT-${Date.now()}`;
  
  // Create optimization record
  const optimization = await prisma.supplyNetworkOptimization.create({
    data: {
      optimizationNumber,
      optimizationName: `Optimization ${new Date().toISOString()}`,
      nodeIds,
      routeIds,
      objectiveFunction,
      constraints: JSON.stringify(constraints),
      demandScenario: JSON.stringify(demandScenario),
      status: 'pending',
      createdBy,
    },
  });
  
  // Run optimization asynchronously
  runOptimization(optimization.id, nodeIds, routeIds, demandScenario, objectiveFunction, constraints).catch((error) => {
    console.error('Optimization failed:', error);
    prisma.supplyNetworkOptimization.update({
      where: { id: optimization.id },
      data: { status: 'failed' },
    });
  });
  
  return optimization;
}

/**
 * Run optimization algorithm (simplified greedy algorithm)
 */
async function runOptimization(
  optimizationId: string,
  nodeIds: string[],
  routeIds: string[],
  demandScenario: DemandScenario[],
  objectiveFunction: string,
  constraints: OptimizationConstraints
) {
  const startTime = Date.now();
  
  // Update status to running
  await prisma.supplyNetworkOptimization.update({
    where: { id: optimizationId },
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  });
  
  // Get nodes and routes
  const nodes = await prisma.supplyNetworkNode.findMany({
    where: { id: { in: nodeIds }, isActive: true },
  });
  
  const routes = await prisma.supplyNetworkRoute.findMany({
    where: { id: { in: routeIds }, isActive: true },
  });
  
  // Simple greedy optimization: for each demand, find the cheapest/fastest route
  const solution: Array<{
    demandId: string;
    sourceNodeId: string;
    destinationNodeId: string;
    routeId: string;
    quantity: number;
    cost: number;
    time: number;
  }> = [];
  
  let totalCost = 0;
  let totalTime = 0;
  
  for (const demand of demandScenario) {
    // Find suppliers (nodes of type 'supplier' or 'manufacturer')
    const suppliers = nodes.filter((n) => n.nodeType === 'supplier' || n.nodeType === 'manufacturer');
    
    let bestRoute: any = null;
    let bestCost = Infinity;
    let bestTime = Infinity;
    
    for (const supplier of suppliers) {
      // Find route from supplier to demand location
      const route = routes.find((r) => r.originNodeId === supplier.id && r.destinationNodeId === demand.locationId);
      
      if (route) {
        const cost = route.costPerUnit * demand.quantity;
        const time = route.leadTime;
        
        if (objectiveFunction === 'minimize_cost' && cost < bestCost) {
          bestCost = cost;
          bestTime = time;
          bestRoute = { supplier, route };
        } else if (objectiveFunction === 'minimize_time' && time < bestTime) {
          bestCost = cost;
          bestTime = time;
          bestRoute = { supplier, route };
        }
      }
    }
    
    if (bestRoute) {
      solution.push({
        demandId: demand.productId,
        sourceNodeId: bestRoute.supplier.id,
        destinationNodeId: demand.locationId,
        routeId: bestRoute.route.id,
        quantity: demand.quantity,
        cost: bestCost,
        time: bestTime,
      });
      
      totalCost += bestCost;
      totalTime += bestTime;
    }
  }
  
  const executionTime = Math.floor((Date.now() - startTime) / 1000);
  
  // Calculate service level (percentage of demand fulfilled)
  const serviceLevel = (solution.length / demandScenario.length) * 100;
  
  // Update optimization with results
  await prisma.supplyNetworkOptimization.update({
    where: { id: optimizationId },
    data: {
      status: 'completed',
      totalCost,
      totalTime,
      serviceLevel,
      algorithm: 'greedy',
      iterations: 1,
      convergenceScore: 1.0,
      solution: JSON.stringify(solution),
      completedAt: new Date(),
      executionTime,
    },
  });
}

/**
 * Get optimization by ID
 */
export async function getOptimizationById(id: string) {
  return await prisma.supplyNetworkOptimization.findUnique({
    where: { id },
  });
}

/**
 * Get all optimizations
 */
export async function getAllOptimizations(status?: string) {
  return await prisma.supplyNetworkOptimization.findMany({
    where: {
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Calculate network statistics
 */
export async function calculateNetworkStatistics() {
  const nodes = await prisma.supplyNetworkNode.findMany({ where: { isActive: true } });
  const routes = await prisma.supplyNetworkRoute.findMany({ where: { isActive: true } });
  
  const nodesByType: Record<string, number> = {};
  const nodesByCountry: Record<string, number> = {};
  
  nodes.forEach((node) => {
    nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1;
    nodesByCountry[node.country] = (nodesByCountry[node.country] || 0) + 1;
  });
  
  const routesByMode: Record<string, number> = {};
  let totalDistance = 0;
  let avgReliability = 0;
  
  routes.forEach((route) => {
    routesByMode[route.transportMode] = (routesByMode[route.transportMode] || 0) + 1;
    totalDistance += route.distance || 0;
    avgReliability += route.reliabilityScore || 0;
  });
  
  avgReliability /= routes.length || 1;
  
  return {
    totalNodes: nodes.length,
    totalRoutes: routes.length,
    nodesByType,
    nodesByCountry,
    routesByMode,
    totalDistance,
    avgReliability,
  };
}

/**
 * Analyze network connectivity
 */
export async function analyzeNetworkConnectivity() {
  const nodes = await prisma.supplyNetworkNode.findMany({ where: { isActive: true } });
  const routes = await prisma.supplyNetworkRoute.findMany({ where: { isActive: true } });
  
  // Build adjacency list
  const adjacency: Record<string, Set<string>> = {};
  
  nodes.forEach((node) => {
    adjacency[node.id] = new Set();
  });
  
  routes.forEach((route) => {
    adjacency[route.originNodeId].add(route.destinationNodeId);
  });
  
  // Find isolated nodes (no outbound routes)
  const isolatedNodes = nodes.filter((node) => adjacency[node.id].size === 0);
  
  // Calculate average connectivity
  const avgConnectivity = Object.values(adjacency).reduce((sum, set) => sum + set.size, 0) / nodes.length;
  
  return {
    totalNodes: nodes.length,
    totalRoutes: routes.length,
    isolatedNodes: isolatedNodes.length,
    avgConnectivity,
    isolatedNodeDetails: isolatedNodes.map((n) => ({ id: n.id, name: n.nodeName, type: n.nodeType })),
  };
}
