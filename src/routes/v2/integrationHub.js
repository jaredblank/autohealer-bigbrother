/**
 * BIG BROTHER COMPLIANT - Integration Hub Routes v2
 * SINGLE RESPONSIBILITY: API Gateway for BB ecosystem
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const express = require('express');
const logger = require('../../utils/logger');
const { getServiceRegistry } = require('../../services/v2/serviceRegistry');
const { getWebhookHub } = require('../../services/v2/webhookHub');
const { getHealthMonitor } = require('../../services/v2/healthMonitor');
const { getFeatureFlagManager } = require('../../config/featureFlags');

const router = express.Router();
const flagManager = getFeatureFlagManager();

/**
 * Performance monitoring middleware
 */
function performanceMonitoring(req, res, next) {
  req.startTime = Date.now();
  req.initialMemory = process.memoryUsage();
  next();
}

/**
 * Big Brother compliance check middleware
 */
function complianceCheck(req, res, next) {
  const executionTime = Date.now() - req.startTime;
  const memoryUsage = process.memoryUsage();
  const memoryDelta = memoryUsage.heapUsed - req.initialMemory.heapUsed;
  
  // Add compliance data to response
  res.locals.performance = {
    executionTime,
    memoryDelta: memoryDelta / 1024 / 1024, // MB
    compliant: executionTime < 100 && memoryDelta < 50 * 1024 * 1024
  };
  
  next();
}

/**
 * GET /api/v2/integration/services
 * Get all registered Big Brother services
 */
router.get('/services', 
  performanceMonitoring,
  complianceCheck,
  (req, res) => {
    try {
      const serviceRegistry = getServiceRegistry();
      const services = serviceRegistry.getAllServices();
      const stats = serviceRegistry.getStats();
      
      res.json({
        success: true,
        services,
        stats,
        metadata: {
          version: 'v2',
          bigBrotherCompliant: true,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get services', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve services',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v2/integration/services/register
 * Register a new Big Brother service
 */
router.post('/services/register',
  performanceMonitoring,
  complianceCheck,
  (req, res) => {
    try {
      const serviceRegistry = getServiceRegistry();
      const result = serviceRegistry.registerService(req.body);
      
      if (result.success) {
        logger.info('Service registered via API', {
          serviceId: result.serviceId,
          name: req.body.name
        });
        
        res.status(201).json({
          success: true,
          serviceId: result.serviceId,
          message: 'Service registered successfully',
          metadata: {
            version: 'v2',
            bigBrotherCompliant: true,
            performance: res.locals.performance,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      logger.error('Service registration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Service registration failed',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v2/integration/health
 * Get system-wide health status
 */
router.get('/health',
  performanceMonitoring,
  complianceCheck,
  async (req, res) => {
    try {
      const healthMonitor = getHealthMonitor();
      const systemHealth = healthMonitor.getSystemHealth();
      
      res.json({
        success: true,
        systemHealth,
        metadata: {
          version: 'v2',
          bigBrotherCompliant: true,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get system health', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v2/integration/health/check
 * Trigger immediate health check
 */
router.post('/health/check',
  performanceMonitoring,
  complianceCheck,
  async (req, res) => {
    try {
      const healthMonitor = getHealthMonitor();
      const result = await healthMonitor.performHealthChecks();
      
      res.json({
        success: true,
        healthCheck: result,
        metadata: {
          version: 'v2',
          bigBrotherCompliant: true,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/v2/integration/webhook
 * Process incoming webhooks from any service
 */
router.post('/webhook',
  performanceMonitoring,
  complianceCheck,
  async (req, res) => {
    try {
      const webhookHub = getWebhookHub();
      const result = await webhookHub.processWebhook(req.body);
      
      if (result.success) {
        res.json({
          success: true,
          eventId: result.eventId,
          routesMatched: result.routesMatched,
          message: 'Webhook processed successfully',
          metadata: {
            version: 'v2',
            bigBrotherCompliant: true,
            performance: res.locals.performance,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      logger.error('Webhook processing failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v2/integration/stats
 * Get integration layer statistics
 */
router.get('/stats',
  performanceMonitoring,
  complianceCheck,
  (req, res) => {
    try {
      const serviceRegistry = getServiceRegistry();
      const webhookHub = getWebhookHub();
      const healthMonitor = getHealthMonitor();
      
      const stats = {
        serviceRegistry: serviceRegistry.getStats(),
        webhookHub: webhookHub.getStats(),
        healthMonitor: healthMonitor.getSystemHealth(),
        integrationHub: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          bigBrotherCompliant: true
        }
      };
      
      res.json({
        success: true,
        stats,
        metadata: {
          version: 'v2',
          bigBrotherCompliant: true,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get integration stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve integration statistics',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v2/integration/dashboard
 * Get dashboard data for Big Brother ecosystem
 */
router.get('/dashboard',
  performanceMonitoring,
  complianceCheck,
  (req, res) => {
    try {
      const serviceRegistry = getServiceRegistry();
      const healthMonitor = getHealthMonitor();
      
      const services = serviceRegistry.getAllServices();
      const systemHealth = healthMonitor.getSystemHealth();
      const registryStats = serviceRegistry.getStats();
      
      const dashboard = {
        ecosystem: {
          totalServices: registryStats.totalServices,
          bigBrotherCompliant: registryStats.bigBrotherCompliant,
          complianceRate: registryStats.complianceRate,
          healthRate: systemHealth.stats.healthRate
        },
        services: services.map(service => ({
          id: service.id,
          name: service.name,
          type: service.type,
          version: service.version,
          bigBrotherCompliant: service.bigBrotherCompliant,
          status: service.status,
          url: service.url
        })),
        health: systemHealth,
        performance: {
          avgResponseTime: calculateAvgResponseTime(systemHealth.services),
          complianceIssues: getComplianceIssues(systemHealth.services)
        }
      };
      
      res.json({
        success: true,
        dashboard,
        metadata: {
          version: 'v2',
          bigBrotherCompliant: true,
          performance: res.locals.performance,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get dashboard data', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        performance: res.locals.performance,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Calculate average response time
 */
function calculateAvgResponseTime(services) {
  const responseTimes = services
    .filter(s => s.responseTime && s.responseTime > 0)
    .map(s => s.responseTime);
    
  if (responseTimes.length === 0) return 0;
  
  const sum = responseTimes.reduce((a, b) => a + b, 0);
  return Math.round(sum / responseTimes.length);
}

/**
 * Get compliance issues
 */
function getComplianceIssues(services) {
  return services
    .filter(s => !s.bigBrotherCompliant)
    .map(s => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      issue: 'Not Big Brother compliant'
    }));
}

module.exports = router;