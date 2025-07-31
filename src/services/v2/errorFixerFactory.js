/**
 * BIG BROTHER COMPLIANT - Error Fixer Factory v2
 * SINGLE RESPONSIBILITY: Create and configure error fixing services
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const ErrorFixerCore = require('./errorFixerCore');
const DeterministicFixer = require('./deterministicFixer');
const AIFixer = require('./aiFixer');
const logger = require('../../utils/logger');

const FEATURE_FLAGS = {
  ERROR_FIXER_V2_ENABLED: process.env.ERROR_FIXER_V2_ENABLED === 'true',
  USE_V1_FALLBACK: process.env.USE_V1_FALLBACK === 'true'
};

class ErrorFixerFactory {
  constructor() {
    this.v2Instance = null;
    this.v1Instance = null;
  }

  /**
   * Input validation
   */
  validateConfig(config = {}) {
    // Config is optional, but if provided must be object
    if (config && typeof config !== 'object') {
      throw new Error('Config must be an object');
    }
    
    return true;
  }

  /**
   * Create v2 error fixer instance
   */
  createV2ErrorFixer(config = {}) {
    try {
      this.validateConfig(config);
      
      if (this.v2Instance) {
        return this.v2Instance;
      }
      
      logger.info('Creating Big Brother Compliant ErrorFixer v2');
      
      // Create component services
      const deterministicFixer = new DeterministicFixer();
      const aiFixer = new AIFixer();
      
      // Create core orchestrator
      this.v2Instance = new ErrorFixerCore(deterministicFixer, aiFixer);
      
      logger.info('ErrorFixer v2 created successfully');
      return this.v2Instance;
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get appropriate error fixer based on feature flags
   */
  getErrorFixer(config = {}) {
    try {
      // Use v2 if enabled
      if (FEATURE_FLAGS.ERROR_FIXER_V2_ENABLED) {
        logger.info('Using ErrorFixer v2 (Big Brother Compliant)');
        return this.createV2ErrorFixer(config);
      }
      
      // Fallback to v1 if enabled
      if (FEATURE_FLAGS.USE_V1_FALLBACK) {
        logger.info('Using ErrorFixer v1 (legacy fallback)');
        return this.getV1ErrorFixer();
      }
      
      // No error fixer available
      throw new Error('No error fixer version enabled');
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get legacy v1 error fixer (DO NOT MODIFY - Big Brother rule)
   */
  getV1ErrorFixer() {
    if (this.v1Instance) {
      return this.v1Instance;
    }
    
    // Import v1 WITHOUT modifying it
    const ErrorFixerV1 = require('../errorFixer');
    this.v1Instance = new ErrorFixerV1();
    
    logger.info('ErrorFixer v1 instance created (legacy mode)');
    return this.v1Instance;
  }

  /**
   * Health check for all error fixer services
   */
  async getHealthStatus() {
    const health = {
      factory: 'ErrorFixerFactory',
      version: 'v2',
      timestamp: new Date().toISOString(),
      services: {},
      featureFlags: FEATURE_FLAGS
    };
    
    try {
      // Check v2 if enabled
      if (FEATURE_FLAGS.ERROR_FIXER_V2_ENABLED) {
        const v2Fixer = this.createV2ErrorFixer();
        health.services.v2 = v2Fixer.getHealthStatus();
      }
      
      // Check v1 if enabled
      if (FEATURE_FLAGS.USE_V1_FALLBACK) {
        health.services.v1 = { status: 'available', version: 'v1' };
      }
      
      health.status = 'healthy';
      
    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }
    
    return health;
  }

  /**
   * Process error fix request with proper routing
   */
  async processErrorFix(errorData) {
    const startTime = Date.now();
    
    try {
      // Get appropriate fixer
      const fixer = this.getErrorFixer();
      
      if (!fixer) {
        throw new Error('No error fixer available');
      }
      
      // Route to appropriate version
      let result;
      if (FEATURE_FLAGS.ERROR_FIXER_V2_ENABLED && fixer.validateInput) {
        // v2 Big Brother Compliant flow
        fixer.validateInput(errorData);
        result = await fixer.execute(errorData);
      } else {
        // v1 legacy flow (DO NOT MODIFY)
        result = await fixer.fixError(errorData);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result,
        version: FEATURE_FLAGS.ERROR_FIXER_V2_ENABLED ? 'v2' : 'v1',
        executionTime
      };
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Error handling
   */
  handleError(error) {
    logger.error('ErrorFixerFactory error', { error: error.message });
    
    return {
      success: false,
      error: 'ErrorFixerFactory failed',
      details: error.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset instances (for testing/development)
   */
  reset() {
    this.v2Instance = null;
    this.v1Instance = null;
    logger.info('ErrorFixerFactory instances reset');
  }
}

// Singleton instance
let factoryInstance = null;

/**
 * Get singleton factory instance
 */
function getErrorFixerFactory() {
  if (!factoryInstance) {
    factoryInstance = new ErrorFixerFactory();
  }
  return factoryInstance;
}

module.exports = {
  ErrorFixerFactory,
  getErrorFixerFactory
};