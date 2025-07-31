/**
 * BIG BROTHER COMPLIANT - Feature Flags Configuration
 * SINGLE RESPONSIBILITY: Centralized feature flag management
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../utils/logger');

/**
 * Feature Flags for Big Brother Compliant Architecture
 * ALL new features must have toggles for safe rollout
 */
const FEATURE_FLAGS = {
  // === ERROR FIXER V2 FLAGS ===
  ERROR_FIXER_V2_ENABLED: process.env.ERROR_FIXER_V2_ENABLED === 'true',
  DETERMINISTIC_FIXES_ENABLED: process.env.DETERMINISTIC_FIXES_ENABLED !== 'false',
  AI_FALLBACK_ENABLED: process.env.AI_FALLBACK_ENABLED !== 'false',
  USE_V1_FALLBACK: process.env.USE_V1_FALLBACK === 'true',
  
  // === AI SERVICE FLAGS ===
  OPENAI_ENABLED: process.env.OPENAI_ENABLED !== 'false',
  ANTHROPIC_ENABLED: process.env.ANTHROPIC_ENABLED !== 'false',
  CLAUDE_CODE_ENABLED: process.env.CLAUDE_CODE_ENABLED !== 'false',
  
  // === SPECIFIC FIX TYPE FLAGS ===
  IMPORT_FIXES_ENABLED: process.env.IMPORT_FIXES_ENABLED !== 'false',
  SYNTAX_FIXES_ENABLED: process.env.SYNTAX_FIXES_ENABLED !== 'false',
  MODULE_FIXES_ENABLED: process.env.MODULE_FIXES_ENABLED !== 'false',
  
  // === PERFORMANCE FLAGS ===
  PERFORMANCE_MONITORING_ENABLED: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
  MEMORY_LIMIT_ENFORCEMENT: process.env.MEMORY_LIMIT_ENFORCEMENT !== 'false',
  RESPONSE_TIME_TRACKING: process.env.RESPONSE_TIME_TRACKING !== 'false',
  
  // === SAFETY FLAGS ===
  BACKWARDS_COMPATIBILITY_MODE: process.env.BACKWARDS_COMPATIBILITY_MODE !== 'false',
  STRICT_VALIDATION_MODE: process.env.STRICT_VALIDATION_MODE === 'true',
  ERROR_REPORTING_ENABLED: process.env.ERROR_REPORTING_ENABLED !== 'false'
};

/**
 * Feature flag validation rules
 */
const FLAG_RULES = {
  // If v2 is enabled, we should have at least one fix method enabled
  ERROR_FIXER_V2_VALIDATION: () => {
    if (FEATURE_FLAGS.ERROR_FIXER_V2_ENABLED) {
      const hasFixMethod = FEATURE_FLAGS.DETERMINISTIC_FIXES_ENABLED || 
                          FEATURE_FLAGS.AI_FALLBACK_ENABLED;
      
      if (!hasFixMethod) {
        logger.warn('ERROR_FIXER_V2_ENABLED but no fix methods enabled');
        return false;
      }
    }
    return true;
  },
  
  // If AI is enabled, we should have at least one AI service
  AI_SERVICE_VALIDATION: () => {
    if (FEATURE_FLAGS.AI_FALLBACK_ENABLED) {
      const hasAIService = FEATURE_FLAGS.OPENAI_ENABLED || 
                          FEATURE_FLAGS.ANTHROPIC_ENABLED || 
                          FEATURE_FLAGS.CLAUDE_CODE_ENABLED;
      
      if (!hasAIService) {
        logger.warn('AI_FALLBACK_ENABLED but no AI services enabled');
        return false;
      }
    }
    return true;
  }
};

/**
 * Feature Flag Manager Class
 */
class FeatureFlagManager {
  constructor() {
    this.flags = FEATURE_FLAGS;
    this.rules = FLAG_RULES;
    this.initialized = false;
  }

  /**
   * Initialize and validate all feature flags
   */
  initialize() {
    try {
      logger.info('Initializing Big Brother Compliant feature flags');
      
      // Validate flag combinations
      const validationResults = this.validateFlags();
      
      if (!validationResults.isValid) {
        logger.error('Feature flag validation failed', validationResults.errors);
        // Continue anyway but with warnings
      }
      
      // Log active flags
      this.logActiveFlags();
      
      this.initialized = true;
      return true;
      
    } catch (error) {
      logger.error('Feature flag initialization failed', { error: error.message });
      return false;
    }
  }

  /**
   * Validate feature flag combinations
   */
  validateFlags() {
    const results = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Run validation rules
      for (const [ruleName, ruleFunction] of Object.entries(this.rules)) {
        try {
          const isValid = ruleFunction();
          if (!isValid) {
            results.errors.push(`Validation failed: ${ruleName}`);
            results.isValid = false;
          }
        } catch (error) {
          results.errors.push(`Validation error in ${ruleName}: ${error.message}`);
          results.isValid = false;
        }
      }
      
    } catch (error) {
      results.errors.push(`Validation process failed: ${error.message}`);
      results.isValid = false;
    }
    
    return results;
  }

  /**
   * Log currently active flags
   */
  logActiveFlags() {
    const activeFlags = Object.entries(this.flags)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);
    
    logger.info('Active feature flags', { flags: activeFlags });
    
    // Log important combinations
    if (this.flags.ERROR_FIXER_V2_ENABLED) {
      logger.info('Big Brother Compliant v2 architecture ENABLED');
    } else {
      logger.info('Using legacy v1 architecture');
    }
  }

  /**
   * Get flag value with fallback
   */
  getFlag(flagName, fallback = false) {
    if (!this.initialized) {
      this.initialize();
    }
    
    return this.flags[flagName] !== undefined ? this.flags[flagName] : fallback;
  }

  /**
   * Check if v2 features are enabled
   */
  isV2Enabled() {
    return this.getFlag('ERROR_FIXER_V2_ENABLED', false);
  }

  /**
   * Get all flags (read-only)
   */
  getAllFlags() {
    return { ...this.flags };
  }

  /**
   * Health status for monitoring
   */
  getHealthStatus() {
    return {
      service: 'FeatureFlagManager',
      initialized: this.initialized,
      totalFlags: Object.keys(this.flags).length,
      activeFlags: Object.values(this.flags).filter(Boolean).length,
      v2Enabled: this.isV2Enabled(),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let flagManagerInstance = null;

/**
 * Get singleton feature flag manager
 */
function getFeatureFlagManager() {
  if (!flagManagerInstance) {
    flagManagerInstance = new FeatureFlagManager();
    flagManagerInstance.initialize();
  }
  return flagManagerInstance;
}

module.exports = {
  FEATURE_FLAGS,
  FeatureFlagManager,
  getFeatureFlagManager
};