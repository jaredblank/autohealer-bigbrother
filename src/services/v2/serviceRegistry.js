/**
 * BIG BROTHER COMPLIANT - Service Registry v2
 * SINGLE RESPONSIBILITY: Manage BB service discovery and health
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');
const { getFeatureFlagManager } = require('../../config/featureFlags');

const flagManager = getFeatureFlagManager();

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.lastHealthCheck = null;
    this.initialized = false;
    this.maxServices = 50; // Big Brother limit
  }

  /**
   * Initialize service registry
   */
  initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      logger.info('Initializing Big Brother Service Registry');
      
      // Register the AutoHealer itself
      this.registerService({
        name: 'autohealer-bigbrother',
        type: 'core',
        version: '2.0.0',
        url: process.env.SERVICE_URL || 'https://autohealer-bigbrother.onrender.com',
        healthEndpoint: '/health',
        bigBrotherCompliant: true,
        capabilities: ['error-fixing', 'performance-monitoring', 'feature-flags']
      });

      this.initialized = true;
      logger.info('Service Registry initialized successfully');
      return true;

    } catch (error) {
      logger.error('Service Registry initialization failed', { error: error.message });
      return false;
    }
  }

  /**
   * Register a Big Brother service
   */
  registerService(serviceConfig) {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validateServiceConfig(serviceConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid service config: ${validation.errors.join(', ')}`);
      }

      // Check capacity
      if (this.services.size >= this.maxServices) {
        throw new Error('Service registry at capacity');
      }

      const service = {
        ...serviceConfig,
        id: this.generateServiceId(serviceConfig.name),
        registeredAt: new Date().toISOString(),
        lastHealthCheck: null,
        status: 'registered',
        bigBrotherCompliant: serviceConfig.bigBrotherCompliant || false
      };

      this.services.set(service.id, service);
      
      logger.info('Service registered', {
        id: service.id,
        name: service.name,
        type: service.type,
        bigBrotherCompliant: service.bigBrotherCompliant
      });

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        serviceId: service.id,
        executionTime,
        compliant: executionTime < 100
      };

    } catch (error) {
      logger.error('Service registration failed', { 
        error: error.message,
        service: serviceConfig.name 
      });
      
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate service configuration
   */
  validateServiceConfig(config) {
    const errors = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Service name is required');
    }

    if (!config.url || typeof config.url !== 'string') {
      errors.push('Service URL is required');
    }

    if (!config.type || !['core', 'api', 'middleware', 'assistant'].includes(config.type)) {
      errors.push('Valid service type is required (core, api, middleware, assistant)');
    }

    if (!config.version || typeof config.version !== 'string') {
      errors.push('Service version is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique service ID
   */
  generateServiceId(serviceName) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const sanitized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `bb-${sanitized}-${timestamp}-${random}`;
  }

  /**
   * Get service by ID
   */
  getService(serviceId) {
    return this.services.get(serviceId) || null;
  }

  /**
   * Get all services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get services by type
   */
  getServicesByType(type) {
    return this.getAllServices().filter(service => service.type === type);
  }

  /**
   * Get Big Brother compliant services only
   */
  getBigBrotherServices() {
    return this.getAllServices().filter(service => service.bigBrotherCompliant === true);
  }

  /**
   * Update service status
   */
  updateServiceStatus(serviceId, status, healthData = null) {
    const service = this.services.get(serviceId);
    
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    service.status = status;
    service.lastHealthCheck = new Date().toISOString();
    
    if (healthData) {
      service.healthData = healthData;
    }

    this.services.set(serviceId, service);
    
    return { success: true, service };
  }

  /**
   * Remove service from registry
   */
  unregisterService(serviceId) {
    const service = this.services.get(serviceId);
    
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    this.services.delete(serviceId);
    
    logger.info('Service unregistered', {
      id: serviceId,
      name: service.name
    });

    return { success: true, removedService: service };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const services = this.getAllServices();
    const bbServices = this.getBigBrotherServices();
    
    return {
      totalServices: services.length,
      bigBrotherCompliant: bbServices.length,
      complianceRate: services.length > 0 ? 
        ((bbServices.length / services.length) * 100).toFixed(1) + '%' : '0%',
      serviceTypes: {
        core: this.getServicesByType('core').length,
        api: this.getServicesByType('api').length,
        middleware: this.getServicesByType('middleware').length,
        assistant: this.getServicesByType('assistant').length
      },
      healthyServices: services.filter(s => s.status === 'healthy').length,
      capacity: {
        used: services.length,
        max: this.maxServices,
        available: this.maxServices - services.length
      }
    };
  }

  /**
   * Health status for monitoring
   */
  getHealthStatus() {
    return {
      service: 'ServiceRegistry',
      version: 'v2',
      initialized: this.initialized,
      bigBrotherCompliant: true,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let serviceRegistryInstance = null;

/**
 * Get singleton service registry
 */
function getServiceRegistry() {
  if (!serviceRegistryInstance) {
    serviceRegistryInstance = new ServiceRegistry();
    serviceRegistryInstance.initialize();
  }
  return serviceRegistryInstance;
}

module.exports = {
  ServiceRegistry,
  getServiceRegistry
};