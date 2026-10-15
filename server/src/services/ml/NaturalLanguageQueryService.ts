/**
 * Natural Language Query Service
 * Converts natural language queries to SQL and returns results in natural language
 * Requirements: 16.8
 */


// @ts-ignore
import nlp from 'compromise';

import prisma from '../../config/prisma';

export interface NLQueryInput {
  query: string;
  userId?: string;
  context?: QueryContext;
}

export interface QueryContext {
  dateRange?: { start: Date; end: Date };
  filters?: Record<string, any>;
  limit?: number;
}

export interface NLQueryResult {
  originalQuery: string;
  interpretation: string;
  sqlQuery: string;
  results: any[];
  naturalLanguageResponse: string;
  confidence: number;
  suggestions?: string[];
}

export interface QueryIntent {
  action: 'count' | 'sum' | 'average' | 'list' | 'find' | 'compare';
  entity: string;
  attributes: string[];
  filters: QueryFilter[];
  aggregation?: string;
  timeframe?: string;
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'between';
  value: any;
}

export class NaturalLanguageQueryService {
  private entityMapping!: Map<string, string>;
  private attributeMapping!: Map<string, Map<string, string>>;

  constructor() {
    this.initializeMappings();
  }

  /**
   * Initialize entity and attribute mappings
   */
  private initializeMappings(): void {
    // Map natural language terms to database entities
    this.entityMapping = new Map([
      ['order', 'order'],
      ['orders', 'order'],
      ['sale', 'order'],
      ['sales', 'order'],
      ['customer', 'customer'],
      ['customers', 'customer'],
      ['client', 'customer'],
      ['clients', 'customer'],
      ['product', 'product'],
      ['products', 'product'],
      ['item', 'product'],
      ['items', 'product'],
      ['inventory', 'inventoryItem'],
      ['stock', 'inventoryItem'],
      ['employee', 'employee'],
      ['employees', 'employee'],
      ['staff', 'employee'],
      ['invoice', 'invoice'],
      ['invoices', 'invoice'],
      ['bill', 'invoice'],
      ['bills', 'invoice'],
    ]);

    // Map attributes for each entity
    this.attributeMapping = new Map([
      [
        'order',
        new Map([
          ['total', 'totalAmount'],
          ['amount', 'totalAmount'],
          ['value', 'totalAmount'],
          ['date', 'orderDate'],
          ['status', 'status'],
          ['customer', 'customerId'],
        ]),
      ],
      [
        'customer',
        new Map([
          ['name', 'name'],
          ['email', 'email'],
          ['phone', 'phone'],
          ['address', 'address'],
        ]),
      ],
      [
        'product',
        new Map([
          ['name', 'name'],
          ['price', 'price'],
          ['cost', 'cost'],
          ['category', 'category'],
          ['sku', 'sku'],
        ]),
      ],
    ]);
  }

  /**
   * Parse natural language query to extract intent
   */
  private parseQuery(query: string): QueryIntent {
    const doc = nlp(query.toLowerCase());

    // Detect action
    let action: QueryIntent['action'] = 'list';
    if (doc.has('how many') || doc.has('count')) {
      action = 'count';
    } else if (doc.has('total') || doc.has('sum')) {
      action = 'sum';
    } else if (doc.has('average') || doc.has('mean')) {
      action = 'average';
    } else if (doc.has('find') || doc.has('show') || doc.has('get')) {
      action = 'list';
    } else if (doc.has('compare')) {
      action = 'compare';
    }

    // Detect entity
    let entity = 'order'; // default
    for (const [key, value] of this.entityMapping.entries()) {
      if (query.toLowerCase().includes(key)) {
        entity = value;
        break;
      }
    }

    // Extract attributes
    const attributes: string[] = [];
    const entityAttrs = this.attributeMapping.get(entity);
    if (entityAttrs) {
      for (const [key, value] of entityAttrs.entries()) {
        if (query.toLowerCase().includes(key)) {
          attributes.push(value);
        }
      }
    }

    // Extract filters
    const filters: QueryFilter[] = [];

    // Time-based filters
    if (doc.has('today')) {
      filters.push({
        field: 'date',
        operator: 'equals',
        value: new Date().toISOString().split('T')[0],
      });
    } else if (doc.has('this month')) {
      const now = new Date();
      filters.push({
        field: 'date',
        operator: 'greater',
        value: new Date(now.getFullYear(), now.getMonth(), 1),
      });
    } else if (doc.has('this year')) {
      const now = new Date();
      filters.push({
        field: 'date',
        operator: 'greater',
        value: new Date(now.getFullYear(), 0, 1),
      });
    } else if (doc.has('last month')) {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.push({
        field: 'date',
        operator: 'between',
        value: [lastMonth, thisMonth],
      });
    }

    // Status filters
    if (doc.has('completed') || doc.has('complete')) {
      filters.push({
        field: 'status',
        operator: 'equals',
        value: 'completed',
      });
    } else if (doc.has('pending')) {
      filters.push({
        field: 'status',
        operator: 'equals',
        value: 'pending',
      });
    } else if (doc.has('cancelled') || doc.has('canceled')) {
      filters.push({
        field: 'status',
        operator: 'equals',
        value: 'cancelled',
      });
    }

    // Extract numbers for value filters
    const numbers = doc.numbers().out('array');
    if (numbers.length > 0 && (doc.has('greater than') || doc.has('more than'))) {
      filters.push({
        field: 'totalAmount',
        operator: 'greater',
        value: parseFloat(numbers[0]),
      });
    } else if (numbers.length > 0 && (doc.has('less than') || doc.has('under'))) {
      filters.push({
        field: 'totalAmount',
        operator: 'less',
        value: parseFloat(numbers[0]),
      });
    }

    return {
      action,
      entity,
      attributes,
      filters,
    };
  }

  /**
   * Convert intent to SQL query
   */
  private async intentToSQL(intent: QueryIntent): Promise<{ sql: string; results: any[] }> {
    const { action, entity, filters } = intent;

    // Build Prisma query based on intent
    let results: any[] = [];

    try {
      if (entity === 'order') {
        const where: any = {};

        // Apply filters
        for (const filter of filters) {
          if (filter.field === 'date') {
            if (filter.operator === 'equals') {
              where.createdAt = {
                gte: new Date(filter.value),
                lt: new Date(new Date(filter.value).getTime() + 86400000),
              };
            } else if (filter.operator === 'greater') {
              where.createdAt = { gte: filter.value };
            } else if (filter.operator === 'between') {
              where.createdAt = { gte: filter.value[0], lt: filter.value[1] };
            }
          } else if (filter.field === 'status') {
            where.status = filter.value;
          } else if (filter.field === 'totalAmount') {
            if (filter.operator === 'greater') {
              where.total = { gte: filter.value };
            } else if (filter.operator === 'less') {
              where.total = { lte: filter.value };
            }
          }
        }

        if (action === 'count') {
          const count = await prisma.order.count({ where });
          results = [{ count }];
        } else if (action === 'sum') {
          const aggregate = await prisma.order.aggregate({
            where,
            _sum: { total: true },
          });
          results = [{ total: aggregate._sum.total || 0 }];
        } else if (action === 'average') {
          const aggregate = await prisma.order.aggregate({
            where,
            _avg: { total: true },
          });
          results = [{ average: aggregate._avg.total || 0 }];
        } else {
          results = await prisma.order.findMany({
            where,
            take: 10,
            orderBy: { createdAt: 'desc' },
          });
        }
      } else if (entity === 'product') {
        if (action === 'count') {
          const count = await prisma.product.count();
          results = [{ count }];
        } else {
          results = await prisma.product.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
          });
        }
      }
    } catch (error) {
      console.error('Error executing query:', error);
      results = [];
    }

    // Generate SQL representation (simplified)
    const sql = `SELECT * FROM ${entity} WHERE ${filters.map((f) => `${f.field} ${f.operator} ${f.value}`).join(' AND ')}`;

    return { sql, results };
  }

  /**
   * Format results as natural language response
   */
  private formatNaturalLanguageResponse(
    intent: QueryIntent,
    results: any[]
  ): string {
    const { action, entity } = intent;

    if (results.length === 0) {
      return `I couldn't find any ${entity}s matching your criteria.`;
    }

    if (action === 'count') {
      const count = results[0].count;
      return `There ${count === 1 ? 'is' : 'are'} ${count} ${entity}${count === 1 ? '' : 's'} matching your query.`;
    }

    if (action === 'sum') {
      const total = results[0].total;
      return `The total is $${total.toFixed(2)}.`;
    }

    if (action === 'average') {
      const avg = results[0].average;
      return `The average is $${avg.toFixed(2)}.`;
    }

    if (action === 'list') {
      if (entity === 'order') {
        const orderList = results
          .slice(0, 5)
          .map(
            (o, i) =>
              `${i + 1}. Order #${o.orderNo || o.id.slice(0, 8)} - $${o.total?.toFixed(2) || '0.00'} (${o.status})`
          )
          .join('\n');
        return `Here are the top ${Math.min(5, results.length)} orders:\n${orderList}${results.length > 5 ? `\n...and ${results.length - 5} more` : ''}`;
      } else if (entity === 'product') {
        const productList = results
          .slice(0, 5)
          .map((p, i) => `${i + 1}. ${p.name} - $${p.price?.toFixed(2) || '0.00'}`)
          .join('\n');
        return `Here are the top ${Math.min(5, results.length)} products:\n${productList}${results.length > 5 ? `\n...and ${results.length - 5} more` : ''}`;
      }
    }

    return `Found ${results.length} ${entity}${results.length === 1 ? '' : 's'}.`;
  }

  /**
   * Generate query suggestions
   */
  private generateSuggestions(intent: QueryIntent): string[] {
    const { entity } = intent;

    const suggestions: string[] = [];

    if (entity === 'order') {
      suggestions.push('Show me orders from this month');
      suggestions.push('What is the total value of completed orders?');
      suggestions.push('How many pending orders do we have?');
      suggestions.push('Show me orders greater than $1000');
    } else if (entity === 'customer') {
      suggestions.push('How many customers do we have?');
      suggestions.push('Show me recent customers');
      suggestions.push('List all customers');
    } else if (entity === 'product') {
      suggestions.push('How many products do we have?');
      suggestions.push('Show me products under $50');
      suggestions.push('List all products');
    }

    return suggestions;
  }

  /**
   * Process natural language query
   */
  async processQuery(input: NLQueryInput): Promise<NLQueryResult> {
    const { query } = input;

    // Parse query to extract intent
    const intent = this.parseQuery(query);

    // Generate interpretation
    const interpretation = `I understand you want to ${intent.action} ${intent.entity}s${intent.filters.length > 0 ? ' with filters' : ''}.`;

    // Convert to SQL and execute
    const { sql, results } = await this.intentToSQL(intent);

    // Format natural language response
    const naturalLanguageResponse = this.formatNaturalLanguageResponse(
      intent,
      results
    );

    // Generate suggestions
    const suggestions = this.generateSuggestions(intent);

    // Calculate confidence based on query clarity
    let confidence = 0.7;
    if (intent.filters.length > 0) confidence += 0.1;
    if (intent.attributes.length > 0) confidence += 0.1;
    if (results.length > 0) confidence += 0.1;

    return {
      originalQuery: query,
      interpretation,
      sqlQuery: sql,
      results,
      naturalLanguageResponse,
      confidence,
      suggestions,
    };
  }

  /**
   * Get query examples for help
   */
  getQueryExamples(): string[] {
    return [
      'How many orders do we have this month?',
      'Show me completed orders from last month',
      'What is the total value of all orders?',
      'How many customers do we have?',
      'Show me orders greater than $1000',
      'What is the average order value?',
      'List all pending orders',
      'Show me products under $50',
      'How many orders were completed today?',
      'What is the total revenue this year?',
    ];
  }

  /**
   * Train query understanding (placeholder for future ML enhancement)
   */
  async trainQueryUnderstanding(
    query: string,
    correctIntent: QueryIntent
  ): Promise<void> {
    // In a production system, this would store training data
    // and periodically retrain an NLP model
    console.log('Training data recorded:', { query, correctIntent });
  }
}

export default NaturalLanguageQueryService;
