/**
 * BIG BROTHER COMPLIANT - Error Fixer Core v2
 * SINGLE RESPONSIBILITY: Core error fixing orchestration
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');

const FEATURE_FLAGS = {
  ERROR_FIXER_V2_ENABLED: process.env.ERROR_FIXER_V2_ENABLED === 'true',
  DETERMINISTIC_FIXES_ENABLED: process.env.DETERMINISTIC_FIXES_ENABLED !== 'false',
  AI_FALLBACK_ENABLED: process.env.AI_FALLBACK_ENABLED !== 'false'
};

class ErrorFixerCore {
  constructor(deterministicFixer, aiFixer) {
    this.deterministicFixer = deterministicFixer;
    this.aiFixer = aiFixer;
    this.stats = {
      deterministicFixes: 0,
      aiFixes: 0,
      failures: 0
    };
  }

  /**
   * Input validation - REQUIRED by Big Brother rules
   */
  validateInput(errorData) {
    if (!errorData) {
      throw new Error('Error data is required');
    }
    
    if (!errorData.error || typeof errorData.error !== 'string') {
      throw new Error('Error message is required and must be a string');
    }
    
    if (!errorData.context) {
      throw new Error('Error context is required');
    }
    
    return true;
  }

  /**
   * Main logic - SINGLE RESPONSIBILITY: Orchestrate error fixing
   */
  async execute(validatedData) {
    const { error, context, files } = validatedData;
    
    try {
      // Try deterministic fixes first (fast path)
      if (FEATURE_FLAGS.DETERMINISTIC_FIXES_ENABLED) {
        const deterministicResult = await this.deterministicFixer.attemptFix(error, context);
        
        if (deterministicResult.success) {
          this.stats.deterministicFixes++;
          logger.info('Deterministic fix applied successfully');
          
          return this.formatResponse({
            success: true,
            fixType: 'deterministic',
            changes: deterministicResult.changes,
            confidence: 0.95,
            executionTime: deterministicResult.executionTime
          });
        }
      }
      
      // Fallback to AI if deterministic fails
      if (FEATURE_FLAGS.AI_FALLBACK_ENABLED && this.aiFixer) {
        logger.info('Attempting AI-based fix');
        const aiResult = await this.aiFixer.attemptFix(error, context, files);
        
        if (aiResult.success) {
          this.stats.aiFixes++;
          
          return this.formatResponse({
            success: true,
            fixType: 'ai',
            changes: aiResult.changes,
            confidence: aiResult.confidence || 0.8,
            executionTime: aiResult.executionTime
          });
        }
      }
      
      // No fix available
      this.stats.failures++;
      return this.formatResponse({
        success: false,
        reason: 'No applicable fix found',
        suggestions: ['Manual review required', 'Check logs for more details']
      });
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Error handling - REQUIRED by Big Brother rules
   */
  handleError(error) {
    logger.error('ErrorFixerCore execution failed', { error: error.message });
    this.stats.failures++;
    
    return this.formatResponse({
      success: false,
      error: 'Internal error during fix attempt',
      code: 'EXECUTION_FAILED'
    });
  }

  /**
   * Response formatting - REQUIRED by Big Brother rules
   */
  formatResponse(result) {
    const response = {
      timestamp: new Date().toISOString(),
      version: 'v2',
      result,
      stats: { ...this.stats }
    };
    
    // Ensure response is under memory limit
    const responseSize = JSON.stringify(response).length;
    if (responseSize > 1000000) { // 1MB limit
      logger.warn('Response size exceeds limit, truncating');
      delete response.result.changes?.fullContent;
    }
    
    return response;
  }

  /**
   * Health check for monitoring
   */
  getHealthStatus() {
    return {
      service: 'ErrorFixerCore',
      version: 'v2',
      status: 'healthy',
      stats: this.stats,
      featureFlags: FEATURE_FLAGS
    };
  }
}

module.exports = ErrorFixerCore;