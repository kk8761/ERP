/**
 * What-If Simulation Service
 * Provides scenario modeling and business impact simulation
 * Requirements: 16.7
 */



import prisma from '../../config/prisma';

export interface ScenarioInput {
  scenarioName: string;
  scenarioType: 'pricing' | 'demand' | 'cost' | 'capacity' | 'custom';
  baselineDate: Date;
  parameters: ScenarioParameter[];
  duration: number; // in days
}

export interface ScenarioParameter {
  entity: string; // e.g., 'product', 'supplier', 'warehouse'
  entityId?: string;
  attribute: string; // e.g., 'price', 'demand', 'cost'
  changeType: 'percentage' | 'absolute' | 'multiplier';
  changeValue: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  baselineMetrics: BusinessMetrics;
  simulatedMetrics: BusinessMetrics;
  impact: ImpactAnalysis;
  recommendations: string[];
  confidence: number;
}

export interface BusinessMetrics {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  volume: number;
  inventoryValue: number;
  cashFlow: number;
}

export interface ImpactAnalysis {
  revenueChange: number;
  revenueChangePercent: number;
  profitChange: number;
  profitChangePercent: number;
  marginChange: number;
  volumeChange: number;
  volumeChangePercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  opportunities: string[];
  risks: string[];
}

export interface ComparisonReport {
  scenarios: ScenarioComparison[];
  bestScenario: string;
  worstScenario: string;
  recommendation: string;
}

export interface ScenarioComparison {
  scenarioName: string;
  profit: number;
  profitChange: number;
  revenue: number;
  revenueChange: number;
  riskLevel: string;
  score: number;
}

export class WhatIfSimulationService {
  /**
   * Calculate baseline business metrics
   */
  private async calculateBaselineMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<BusinessMetrics> {
    // Fetch orders in the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['completed', 'delivered'],
        },
      },
    });

    let revenue = 0;
    let cost = 0;
    let volume = 0;

    for (const order of orders) {
      // Use order total and subtotal as proxies
      revenue += order.total || 0;
      cost += (order.subtotal || 0) * 0.6; // Assume 60% cost ratio
      volume += 1; // Count orders as volume
    }

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Calculate inventory value (simplified)
    const inventoryValue = 0; // Placeholder

    return {
      revenue,
      cost,
      profit,
      margin,
      volume,
      inventoryValue,
      cashFlow: profit, // Simplified
    };
  }

  /**
   * Apply scenario parameters to simulate changes
   */
  private applyScenarioChanges(
    baseline: BusinessMetrics,
    parameters: ScenarioParameter[]
  ): BusinessMetrics {
    let simulated = { ...baseline };

    for (const param of parameters) {
      if (param.attribute === 'price' || param.attribute === 'revenue') {
        // Price/revenue changes
        if (param.changeType === 'percentage') {
          simulated.revenue *= 1 + param.changeValue / 100;
        } else if (param.changeType === 'absolute') {
          simulated.revenue += param.changeValue;
        } else if (param.changeType === 'multiplier') {
          simulated.revenue *= param.changeValue;
        }

        // Price elasticity: volume changes inversely with price
        const priceChange = param.changeValue;
        const elasticity = -0.5; // Assume moderate elasticity
        const volumeChange = priceChange * elasticity;
        simulated.volume *= 1 + volumeChange / 100;
      } else if (param.attribute === 'demand' || param.attribute === 'volume') {
        // Demand/volume changes
        if (param.changeType === 'percentage') {
          simulated.volume *= 1 + param.changeValue / 100;
          simulated.revenue *= 1 + param.changeValue / 100;
          simulated.cost *= 1 + param.changeValue / 100;
        } else if (param.changeType === 'multiplier') {
          simulated.volume *= param.changeValue;
          simulated.revenue *= param.changeValue;
          simulated.cost *= param.changeValue;
        }
      } else if (param.attribute === 'cost') {
        // Cost changes
        if (param.changeType === 'percentage') {
          simulated.cost *= 1 + param.changeValue / 100;
        } else if (param.changeType === 'absolute') {
          simulated.cost += param.changeValue;
        } else if (param.changeType === 'multiplier') {
          simulated.cost *= param.changeValue;
        }
      }
    }

    // Recalculate derived metrics
    simulated.profit = simulated.revenue - simulated.cost;
    simulated.margin = simulated.revenue > 0 ? (simulated.profit / simulated.revenue) * 100 : 0;
    simulated.cashFlow = simulated.profit;

    return simulated;
  }

  /**
   * Analyze impact of scenario
   */
  private analyzeImpact(
    baseline: BusinessMetrics,
    simulated: BusinessMetrics
  ): ImpactAnalysis {
    const revenueChange = simulated.revenue - baseline.revenue;
    const revenueChangePercent =
      baseline.revenue > 0 ? (revenueChange / baseline.revenue) * 100 : 0;

    const profitChange = simulated.profit - baseline.profit;
    const profitChangePercent =
      baseline.profit > 0 ? (profitChange / baseline.profit) * 100 : 0;

    const marginChange = simulated.margin - baseline.margin;

    const volumeChange = simulated.volume - baseline.volume;
    const volumeChangePercent =
      baseline.volume > 0 ? (volumeChange / baseline.volume) * 100 : 0;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (profitChangePercent < -20 || marginChange < -10) {
      riskLevel = 'high';
    } else if (profitChangePercent < -10 || marginChange < -5) {
      riskLevel = 'medium';
    }

    // Identify opportunities
    const opportunities: string[] = [];
    if (revenueChangePercent > 10) {
      opportunities.push('Significant revenue growth potential');
    }
    if (profitChangePercent > 15) {
      opportunities.push('Strong profit improvement opportunity');
    }
    if (marginChange > 5) {
      opportunities.push('Margin expansion opportunity');
    }
    if (volumeChangePercent > 20) {
      opportunities.push('Market share growth potential');
    }

    // Identify risks
    const risks: string[] = [];
    if (profitChangePercent < -10) {
      risks.push('Significant profit decline risk');
    }
    if (marginChange < -5) {
      risks.push('Margin compression risk');
    }
    if (volumeChangePercent < -15) {
      risks.push('Volume loss risk');
    }
    if (simulated.cashFlow < baseline.cashFlow * 0.8) {
      risks.push('Cash flow deterioration risk');
    }

    return {
      revenueChange,
      revenueChangePercent,
      profitChange,
      profitChangePercent,
      marginChange,
      volumeChange,
      volumeChangePercent,
      riskLevel,
      opportunities,
      risks,
    };
  }

  /**
   * Generate recommendations based on impact analysis
   */
  private generateRecommendations(impact: ImpactAnalysis): string[] {
    const recommendations: string[] = [];

    if (impact.profitChangePercent > 10 && impact.riskLevel === 'low') {
      recommendations.push('RECOMMENDED: Proceed with this scenario');
      recommendations.push('Expected positive impact on profitability');
    } else if (impact.profitChangePercent > 5 && impact.riskLevel === 'medium') {
      recommendations.push('CONSIDER: Moderate profit improvement with manageable risk');
      recommendations.push('Monitor key metrics closely during implementation');
    } else if (impact.profitChangePercent < 0) {
      recommendations.push('NOT RECOMMENDED: Negative profit impact');
      recommendations.push('Consider alternative scenarios');
    }

    if (impact.marginChange > 5) {
      recommendations.push('Focus on maintaining margin improvements');
    } else if (impact.marginChange < -3) {
      recommendations.push('Implement cost control measures to protect margins');
    }

    if (impact.volumeChangePercent < -10) {
      recommendations.push('Develop customer retention strategies');
    }

    if (impact.riskLevel === 'high') {
      recommendations.push('Develop risk mitigation plan before implementation');
      recommendations.push('Consider phased rollout approach');
    }

    return recommendations;
  }

  /**
   * Run a what-if simulation
   */
  async runSimulation(input: ScenarioInput): Promise<ScenarioResult> {
    const { scenarioName, baselineDate, parameters, duration } = input;

    // Calculate date range
    const startDate = new Date(baselineDate);
    const endDate = new Date(baselineDate);
    endDate.setDate(endDate.getDate() + duration);

    // Calculate baseline metrics
    const baselineMetrics = await this.calculateBaselineMetrics(
      startDate,
      endDate
    );

    // Apply scenario changes
    const simulatedMetrics = this.applyScenarioChanges(
      baselineMetrics,
      parameters
    );

    // Analyze impact
    const impact = this.analyzeImpact(baselineMetrics, simulatedMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(impact);

    // Calculate confidence based on data quality and scenario complexity
    const confidence = Math.max(0.6, 0.9 - parameters.length * 0.05);

    const scenarioId = `scenario_${Date.now()}`;

    return {
      scenarioId,
      scenarioName,
      baselineMetrics,
      simulatedMetrics,
      impact,
      recommendations,
      confidence,
    };
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    scenarios: ScenarioInput[]
  ): Promise<ComparisonReport> {
    const results: ScenarioResult[] = [];

    // Run all scenarios
    for (const scenario of scenarios) {
      const result = await this.runSimulation(scenario);
      results.push(result);
    }

    // Create comparison
    const comparisons: ScenarioComparison[] = results.map((result) => ({
      scenarioName: result.scenarioName,
      profit: result.simulatedMetrics.profit,
      profitChange: result.impact.profitChange,
      revenue: result.simulatedMetrics.revenue,
      revenueChange: result.impact.revenueChange,
      riskLevel: result.impact.riskLevel,
      score: this.calculateScenarioScore(result),
    }));

    // Sort by score
    comparisons.sort((a, b) => b.score - a.score);

    const bestScenario = comparisons[0].scenarioName;
    const worstScenario = comparisons[comparisons.length - 1].scenarioName;

    // Generate overall recommendation
    const best = results.find((r) => r.scenarioName === bestScenario);
    let recommendation = `Recommended scenario: ${bestScenario}. `;
    if (best) {
      recommendation += `Expected profit increase of ${best.impact.profitChangePercent.toFixed(1)}% `;
      recommendation += `with ${best.impact.riskLevel} risk level.`;
    }

    return {
      scenarios: comparisons,
      bestScenario,
      worstScenario,
      recommendation,
    };
  }

  /**
   * Calculate overall score for a scenario
   */
  private calculateScenarioScore(result: ScenarioResult): number {
    let score = 50; // Base score

    // Profit impact (40 points max)
    score += Math.min(40, result.impact.profitChangePercent * 2);

    // Revenue impact (20 points max)
    score += Math.min(20, result.impact.revenueChangePercent);

    // Risk penalty
    if (result.impact.riskLevel === 'high') {
      score -= 30;
    } else if (result.impact.riskLevel === 'medium') {
      score -= 15;
    }

    // Margin improvement bonus
    if (result.impact.marginChange > 0) {
      score += result.impact.marginChange * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create predefined scenario templates
   */
  createScenarioTemplate(
    templateType: 'price_increase' | 'cost_reduction' | 'volume_growth' | 'market_expansion'
  ): Partial<ScenarioInput> {
    const templates: Record<string, Partial<ScenarioInput>> = {
      price_increase: {
        scenarioName: 'Price Increase 10%',
        scenarioType: 'pricing',
        parameters: [
          {
            entity: 'product',
            attribute: 'price',
            changeType: 'percentage',
            changeValue: 10,
          },
        ],
        duration: 90,
      },
      cost_reduction: {
        scenarioName: 'Cost Reduction 15%',
        scenarioType: 'cost',
        parameters: [
          {
            entity: 'product',
            attribute: 'cost',
            changeType: 'percentage',
            changeValue: -15,
          },
        ],
        duration: 90,
      },
      volume_growth: {
        scenarioName: 'Volume Growth 25%',
        scenarioType: 'demand',
        parameters: [
          {
            entity: 'product',
            attribute: 'volume',
            changeType: 'percentage',
            changeValue: 25,
          },
        ],
        duration: 90,
      },
      market_expansion: {
        scenarioName: 'Market Expansion',
        scenarioType: 'demand',
        parameters: [
          {
            entity: 'product',
            attribute: 'volume',
            changeType: 'percentage',
            changeValue: 50,
          },
          {
            entity: 'product',
            attribute: 'cost',
            changeType: 'percentage',
            changeValue: 10,
          },
        ],
        duration: 180,
      },
    };

    return templates[templateType];
  }
}

export default WhatIfSimulationService;
