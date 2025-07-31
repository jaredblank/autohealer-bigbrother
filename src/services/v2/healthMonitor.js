/**
 * BIG BROTHER COMPLIANT - Health Monitor v2
 * SINGLE RESPONSIBILITY: Monitor health of all BB services
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { getServiceRegistry } = require('./serviceRegistry');
const { getFeatureFlagManager } = require('../../config/featureFlags');

const flagManager = getFeatureFlagManager();

class HealthMonitor {
  constructor() {
    this.healthData = new Map();
    this.checkInterval = 30000; // 30 seconds
    this.timeout = 5000; // 5 second timeout
    this.monitoring = false;
    this.initialized = false;
  }

  /**
   * Initialize health monitor
   */
  initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      logger.info('Initializing Big Brother Health Monitor');
      
      if (flagManager.getFlag('HEALTH_MONITORING_ENABLED', true)) {
        this.startMonitoring();
      }
      
      this.initialized = true;
      logger.info('Health Monitor initialized successfully');
      return true;

    } catch (error) {
      logger.error('Health Monitor initialization failed', { error: error.message });
      return false;
    }
  }

  /**
   * Start monitoring all registered services
   */
  startMonitoring() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    
    logger.info('Starting Big Brother health monitoring', {
      interval: this.checkInterval,
      timeout: this.timeout
    });

    // Initial health check
    setImmediate(() => this.performHealthChecks());
    
    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.monitoring = false;
    logger.info('Health monitoring stopped');
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks() {
    const startTime = Date.now();
    
    try {
      const serviceRegistry = getServiceRegistry();
      const services = serviceRegistry.getAllServices();
      
      if (services.length === 0) {
        return {
          success: true,
          message: 'No services to monitor',
          executionTime: Date.now() - startTime
        };
      }

      logger.info('Performing health checks', { serviceCount: services.length });
      
      // Check all services concurrently
      const healthPromises = services.map(service => 
        this.checkServiceHealth(service).catch(error => ({
          serviceId: service.id,
          error: error.message,
          status: 'error'
        }))
      );

      const results = await Promise.all(healthPromises);
      
      // Update service registry with results
      results.forEach(result => {
        if (result.serviceId) {
          serviceRegistry.updateServiceStatus(
            result.serviceId, 
            result.status, 
            result
          );
        }
      });

      const executionTime = Date.now() - startTime;
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      
      logger.info('Health checks completed', {
        total: results.length,
        healthy: healthyCount,
        unhealthy: results.length - healthyCount,
        executionTime
      });

      return {
        success: true,
        totalServices: results.length,
        healthyServices: healthyCount,
        executionTime,
        compliant: executionTime < 100
      };

    } catch (error) {
      logger.error('Health check cycle failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check health of individual service
   */
  async checkServiceHealth(service) {
    const startTime = Date.now();
    
    try {
      const healthUrl = `${service.url}${service.healthEndpoint || '/health'}`;
      
      const response = await axios.get(healthUrl, {
        timeout: this.timeout,
        validateStatus: status => status < 500 // Accept 4xx as potentially valid
      });

      const executionTime = Date.now() - startTime;
      const responseTime = executionTime;
      
      // Analyze health response
      const healthData = response.data;
      const isHealthy = response.status === 200 && 
                       (healthData.status === 'ok' || healthData.status === 'healthy');
      
      // Big Brother compliance checks
      const compliance = this.checkBigBrotherCompliance(healthData, responseTime);
      
      const result = {
        serviceId: service.id,
        serviceName: service.name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        httpStatus: response.status,
        responseTime,
        compliance,
        timestamp: new Date().toISOString(),
        healthData: healthData
      };

      // Store health data
      this.healthData.set(service.id, result);
      
      if (!isHealthy) {
        logger.warn('Service health check failed', {
          service: service.name,
          status: response.status,
          responseTime
        });
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Service health check error', {
        service: service.name,
        error: error.message,
        executionTime
      });

      const result = {
        serviceId: service.id,
        serviceName: service.name,
        status: 'error',
        error: error.message,
        responseTime: executionTime,
        timestamp: new Date().toISOString()
      };

      this.healthData.set(service.id, result);
      return result;
    }
  }

  /**
   * Check Big Brother compliance from health response
   */
  checkBigBrotherCompliance(healthData, responseTime) {
    const compliance = {
      responseTime: {
        actual: responseTime,
        target: 100,
        compliant: responseTime < 100
      },
      bigBrotherCompliant: false,
      issues: []
    };

    // Check if service claims Big Brother compliance
    if (healthData.bigBrotherCompliant === true) {
      compliance.bigBrotherCompliant = true;
    } else {
      compliance.issues.push('Service not marked as Big Brother compliant');
    }

    // Check response time compliance
    if (!compliance.responseTime.compliant) {
      compliance.issues.push(`Response time ${responseTime}ms exceeds 100ms target`);
    }

    // Check for performance data
    if (healthData.performance) {
      const perf = healthData.performance;
      
      if (perf.memoryMB && parseFloat(perf.memoryMB) > 50) {
        compliance.issues.push(`Memory usage ${perf.memoryMB}MB exceeds 50MB target`);
      }
    }

    return compliance;
  }

  /**
   * Get current health status of all services
   */
  getSystemHealth() {
    const serviceRegistry = getServiceRegistry();
    const services = serviceRegistry.getAllServices();
    const healthData = Array.from(this.healthData.values());
    
    const stats = {
      totalServices: services.length,
      healthyServices: healthData.filter(h => h.status === 'healthy').length,
      unhealthyServices: healthData.filter(h => h.status === 'unhealthy').length,
      errorServices: healthData.filter(h => h.status === 'error').length,
      bigBrotherCompliant: healthData.filter(h => h.compliance?.bigBrotherCompliant).length
    };

    stats.healthRate = services.length > 0 ? 
      ((stats.healthyServices / services.length) * 100).toFixed(1) + '%' : '0%';
    
    stats.complianceRate = services.length > 0 ? 
      ((stats.bigBrotherCompliant / services.length) * 100).toFixed(1) + '%' : '0%';

    return {
      monitoring: this.monitoring,
      lastCheck: this.getLastCheckTime(),
      stats,
      services: healthData.map(h => ({
        serviceId: h.serviceId,
        serviceName: h.serviceName,
        status: h.status,
        responseTime: h.responseTime,
        bigBrotherCompliant: h.compliance?.bigBrotherCompliant || false,
        timestamp: h.timestamp
      }))
    };
  }

  /**
   * Get last check time
   */
  getLastCheckTime() {
    const healthTimes = Array.from(this.healthData.values())
      .map(h => new Date(h.timestamp).getTime())
      .filter(t => !isNaN(t));
    
    if (healthTimes.length === 0) {
      return null;
    }

    return new Date(Math.max(...healthTimes)).toISOString();
  }

  /**
   * Get health data for specific service
   */
  getServiceHealth(serviceId) {
    return this.healthData.get(serviceId) || null;
  }

  /**
   * Health status for monitoring
   */
  getHealthStatus() {
    return {
      service: 'HealthMonitor',
      version: 'v2',
      initialized: this.initialized,
      monitoring: this.monitoring,
      bigBrotherCompliant: true,
      systemHealth: this.getSystemHealth(),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let healthMonitorInstance = null;

/**
 * Get singleton health monitor
 */
function getHealthMonitor() {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor();
    healthMonitorInstance.initialize();
  }
  return healthMonitorInstance;
}

module.exports = {
  HealthMonitor,
  getHealthMonitor
};