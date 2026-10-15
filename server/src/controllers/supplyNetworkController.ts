import { Request, Response } from 'express';
import * as supplyNetworkService from '../services/supplyNetworkService';

/**
 * Create supply network node
 */
export async function createSupplyNetworkNode(req: Request, res: Response) {
  try {
    const node = await supplyNetworkService.createSupplyNetworkNode(req.body);
    res.status(201).json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get supply network node by ID
 */
export async function getSupplyNetworkNodeById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const node = await supplyNetworkService.getSupplyNetworkNodeById(id);
    
    if (!node) {
      return res.status(404).json({ error: 'Supply network node not found' });
    }
    
    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all supply network nodes
 */
export async function getAllSupplyNetworkNodes(req: Request, res: Response) {
  try {
    const { nodeType, country } = req.query;
    
    const nodes = await supplyNetworkService.getAllSupplyNetworkNodes(
      nodeType as string | undefined,
      country as string | undefined
    );
    
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update supply network node
 */
export async function updateSupplyNetworkNode(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const node = await supplyNetworkService.updateSupplyNetworkNode(id, req.body);
    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create supply network route
 */
export async function createSupplyNetworkRoute(req: Request, res: Response) {
  try {
    const route = await supplyNetworkService.createSupplyNetworkRoute(req.body);
    res.status(201).json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get supply network route by ID
 */
export async function getSupplyNetworkRouteById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const route = await supplyNetworkService.getSupplyNetworkRouteById(id);
    
    if (!route) {
      return res.status(404).json({ error: 'Supply network route not found' });
    }
    
    res.json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all supply network routes
 */
export async function getAllSupplyNetworkRoutes(req: Request, res: Response) {
  try {
    const { originNodeId, destinationNodeId } = req.query;
    
    const routes = await supplyNetworkService.getAllSupplyNetworkRoutes(
      originNodeId as string | undefined,
      destinationNodeId as string | undefined
    );
    
    res.json(routes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update supply network route
 */
export async function updateSupplyNetworkRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const route = await supplyNetworkService.updateSupplyNetworkRoute(id, req.body);
    res.json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Find shortest path
 */
export async function findShortestPath(req: Request, res: Response) {
  try {
    const { originNodeId, destinationNodeId, optimizeFor } = req.body;
    
    const path = await supplyNetworkService.findShortestPath(
      originNodeId,
      destinationNodeId,
      optimizeFor || 'cost'
    );
    
    res.json(path);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Optimize supply network
 */
export async function optimizeSupplyNetwork(req: Request, res: Response) {
  try {
    const { nodeIds, routeIds, demandScenario, objectiveFunction, constraints, createdBy } = req.body;
    
    const optimization = await supplyNetworkService.optimizeSupplyNetwork(
      nodeIds,
      routeIds,
      demandScenario,
      objectiveFunction,
      constraints,
      createdBy
    );
    
    res.status(201).json(optimization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get optimization by ID
 */
export async function getOptimizationById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const optimization = await supplyNetworkService.getOptimizationById(id);
    
    if (!optimization) {
      return res.status(404).json({ error: 'Optimization not found' });
    }
    
    res.json(optimization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all optimizations
 */
export async function getAllOptimizations(req: Request, res: Response) {
  try {
    const { status } = req.query;
    
    const optimizations = await supplyNetworkService.getAllOptimizations(status as string | undefined);
    res.json(optimizations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Calculate network statistics
 */
export async function calculateNetworkStatistics(req: Request, res: Response) {
  try {
    const statistics = await supplyNetworkService.calculateNetworkStatistics();
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Analyze network connectivity
 */
export async function analyzeNetworkConnectivity(req: Request, res: Response) {
  try {
    const analysis = await supplyNetworkService.analyzeNetworkConnectivity();
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
