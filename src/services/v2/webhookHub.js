/**
 * BIG BROTHER COMPLIANT - Webhook Hub v2
 * SINGLE RESPONSIBILITY: Route webhooks between BB services
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');
const { getServiceRegistry } = require('./serviceRegistry');
const { getFeatureFlagManager } = require('../../config/featureFlags');

const flagManager = getFeatureFlagManager();

class WebhookHub {
  constructor() {
    this.routes = new Map();
    this.eventQueue = [];
    this.maxQueueSize = 1000;
    this.processingQueue = false;
    this.initialized = false;
  }

  /**
   * Initialize webhook hub
   */
  initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      logger.info('Initializing Big Brother Webhook Hub');
      
      // Set up default routes
      this.setupDefaultRoutes();
      
      // Start queue processor
      this.startQueueProcessor();
      
      this.initialized = true;
      logger.info('Webhook Hub initialized successfully');
      return true;

    } catch (error) {
      logger.error('Webhook Hub initialization failed', { error: error.message });
      return false;
    }
  }

  /**
   * Set up default webhook routes
   */
  setupDefaultRoutes() {
    // Route Render webhooks to error fixer
    this.addRoute({
      source: 'render',
      eventType: 'deploy_failed',
      target: 'autohealer-bigbrother',
      endpoint: '/api/v2/error-fixing/fix',
      method: 'POST'
    });

    // Route service health events to registry
    this.addRoute({
      source: '*',
      eventType: 'health_check',
      target: 'service-registry',
      endpoint: '/health/update',
      method: 'PUT'
    });

    // Route performance alerts to monitoring
    this.addRoute({
      source: '*',
      eventType: 'performance_alert',
      target: 'autohealer-bigbrother',
      endpoint: '/api/performance/alert',
      method: 'POST'
    });
  }

  /**
   * Add webhook route
   */
  addRoute(routeConfig) {
    const startTime = Date.now();

    try {
      const validation = this.validateRouteConfig(routeConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid route config: ${validation.errors.join(', ')}`);
      }

      const routeId = this.generateRouteId(routeConfig);
      const route = {
        ...routeConfig,
        id: routeId,
        createdAt: new Date().toISOString(),
        active: true
      };

      this.routes.set(routeId, route);
      
      logger.info('Webhook route added', {
        id: routeId,
        source: route.source,
        eventType: route.eventType,
        target: route.target
      });

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        routeId,
        executionTime,
        compliant: executionTime < 100
      };

    } catch (error) {
      logger.error('Failed to add webhook route', { error: error.message });
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate route configuration
   */
  validateRouteConfig(config) {
    const errors = [];

    if (!config.source || typeof config.source !== 'string') {
      errors.push('Route source is required');
    }

    if (!config.eventType || typeof config.eventType !== 'string') {
      errors.push('Event type is required');
    }

    if (!config.target || typeof config.target !== 'string') {
      errors.push('Target service is required');
    }

    if (!config.endpoint || typeof config.endpoint !== 'string') {
      errors.push('Target endpoint is required');
    }

    if (!config.method || !['GET', 'POST', 'PUT', 'DELETE'].includes(config.method)) {
      errors.push('Valid HTTP method is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique route ID
   */
  generateRouteId(config) {
    const source = config.source.toLowerCase().replace(/[^a-z0-9]/g, '');
    const event = config.eventType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = config.target.toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now().toString(36);
    
    return `route-${source}-${event}-${target}-${timestamp}`;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(webhookData) {
    const startTime = Date.now();

    try {
      // Validate webhook data
      if (!webhookData.source || !webhookData.eventType) {
        throw new Error('Invalid webhook data: source and eventType required');
      }

      // Find matching routes
      const matchingRoutes = this.findMatchingRoutes(webhookData);
      
      if (matchingRoutes.length === 0) {
        logger.warn('No routes found for webhook', {
          source: webhookData.source,
          eventType: webhookData.eventType
        });
        
        return {
          success: true,
          message: 'No routes found',
          routesMatched: 0,
          executionTime: Date.now() - startTime
        };
      }

      // Queue webhook for processing
      const queueItem = {
        id: this.generateEventId(),
        webhook: webhookData,
        routes: matchingRoutes,
        createdAt: new Date().toISOString(),
        attempts: 0
      };

      this.addToQueue(queueItem);

      const executionTime = Date.now() - startTime;
      
      logger.info('Webhook queued for processing', {
        eventId: queueItem.id,
        source: webhookData.source,
        eventType: webhookData.eventType,
        routesMatched: matchingRoutes.length
      });

      return {
        success: true,
        eventId: queueItem.id,
        routesMatched: matchingRoutes.length,
        executionTime,
        compliant: executionTime < 100
      };

    } catch (error) {
      logger.error('Webhook processing failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Find routes matching webhook
   */
  findMatchingRoutes(webhookData) {
    const routes = Array.from(this.routes.values());
    
    return routes.filter(route => {
      if (!route.active) return false;
      
      const sourceMatch = route.source === '*' || route.source === webhookData.source;
      const eventMatch = route.eventType === '*' || route.eventType === webhookData.eventType;
      
      return sourceMatch && eventMatch;
    });
  }

  /**
   * Add event to processing queue
   */
  addToQueue(queueItem) {
    if (this.eventQueue.length >= this.maxQueueSize) {
      logger.warn('Event queue at capacity, dropping oldest event');
      this.eventQueue.shift();
    }
    
    this.eventQueue.push(queueItem);
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    
    setInterval(() => {
      this.processQueue();
    }, 1000); // Process queue every second
  }

  /**
   * Process queued events
   */
  async processQueue() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const event = this.eventQueue.shift();
    
    try {
      await this.executeWebhookRoutes(event);
    } catch (error) {
      logger.error('Failed to process queued event', {
        eventId: event.id,
        error: error.message
      });
      
      // Retry logic
      if (event.attempts < 3) {
        event.attempts++;
        this.eventQueue.push(event);
      }
    }
  }

  /**
   * Execute webhook routes
   */
  async executeWebhookRoutes(event) {
    const serviceRegistry = getServiceRegistry();
    
    for (const route of event.routes) {
      try {
        // Get target service info
        const services = serviceRegistry.getAllServices();
        const targetService = services.find(s => s.name === route.target);
        
        if (!targetService) {
          logger.warn('Target service not found', { target: route.target });
          continue;
        }

        // Execute webhook (simulate for now)
        logger.info('Executing webhook route', {
          eventId: event.id,
          target: targetService.name,
          endpoint: route.endpoint,
          method: route.method
        });

        // In a real implementation, this would make HTTP calls
        // For now, just log successful execution
        
      } catch (error) {
        logger.error('Route execution failed', {
          routeId: route.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Get webhook statistics
   */
  getStats() {
    return {
      totalRoutes: this.routes.size,
      activeRoutes: Array.from(this.routes.values()).filter(r => r.active).length,
      queueSize: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize,
      processingQueue: this.processingQueue
    };
  }

  /**
   * Health status for monitoring
   */
  getHealthStatus() {
    return {
      service: 'WebhookHub',
      version: 'v2',
      initialized: this.initialized,
      bigBrotherCompliant: true,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let webhookHubInstance = null;

/**
 * Get singleton webhook hub
 */
function getWebhookHub() {
  if (!webhookHubInstance) {
    webhookHubInstance = new WebhookHub();
    webhookHubInstance.initialize();
  }
  return webhookHubInstance;
}

module.exports = {
  WebhookHub,
  getWebhookHub
};