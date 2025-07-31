/**
 * BIG BROTHER COMPLIANT - Error Fixing API Routes v2
 * SINGLE RESPONSIBILITY: Handle error fixing API requests
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const express = require('express');
const logger = require('../../utils/logger');
const { getErrorFixerFactory } = require('../../services/v2/errorFixerFactory');
const { getFeatureFlagManager } = require('../../config/featureFlags');

const router = express.Router();
const flagManager = getFeatureFlagManager();

/**
 * Input validation middleware
 */
function validateErrorFixRequest(req, res, next) {
  try {
    const { error, context } = req.body;
    
    // Required fields validation
    if (!error || typeof error !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Error message is required and must be a string',
        code: 'INVALID_ERROR_MESSAGE'
      });
    }
    
    if (!context || typeof context !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Context object is required',
        code: 'INVALID_CONTEXT'
      });
    }
    
    // Optional fields validation
    if (req.body.files && !Array.isArray(req.body.files)) {
      return res.status(400).json({
        success: false,
        error: 'Files must be an array if provided',
        code: 'INVALID_FILES'
      });
    }
    
    next();
    
  } catch (validationError) {
    logger.error('Request validation failed', { error: validationError.message });
    res.status(400).json({
      success: false,
      error: 'Request validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
}

/**
 * Performance monitoring middleware
 */
function performanceMonitoring(req, res, next) {
  req.startTime = Date.now();
  
  // Memory usage tracking
  const initialMemory = process.memoryUsage();
  req.initialMemory = initialMemory;
  
  next();
}

/**
 * POST /api/v2/error-fixing/fix
 * Fix an error using Big Brother Compliant v2 architecture
 */
router.post('/fix', 
  performanceMonitoring,
  validateErrorFixRequest,
  async (req, res) => {
    try {
      // Check if v2 is enabled
      if (!flagManager.isV2Enabled()) {
        return res.status(503).json({
          success: false,
          error: 'Error Fixer v2 is not enabled',
          code: 'V2_DISABLED',
          fallback: 'Use /api/v1/error-fixing/fix for legacy support'
        });
      }
      
      const { error, context, files = [] } = req.body;
      const factory = getErrorFixerFactory();
      
      // Process the error fix
      const result = await factory.processErrorFix({
        error,
        context,
        files
      });
      
      // Performance metrics
      const executionTime = Date.now() - req.startTime;
      const memoryUsage = process.memoryUsage();
      const memoryDelta = memoryUsage.heapUsed - req.initialMemory.heapUsed;
      
      // Big Brother compliance check
      if (executionTime > 100) {
        logger.warn('Response time exceeded 100ms target', { executionTime });
      }
      
      if (memoryDelta > 50 * 1024 * 1024) { // 50MB
        logger.warn('Memory usage exceeded 50MB target', { memoryDelta });
      }
      
      // Success response
      res.json({
        success: result.success,
        data: result.result,
        metadata: {
          version: 'v2',
          executionTime,
          memoryUsage: memoryDelta,
          timestamp: new Date().toISOString(),
          compliantWith: 'Big Brother Architecture'
        }
      });
      
    } catch (error) {
      logger.error('Error fixing API failed', { 
        error: error.message,
        stack: error.stack 
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during error fixing',
        code: 'EXECUTION_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v2/error-fixing/health
 * Health check for error fixing services
 */
router.get('/health', async (req, res) => {
  try {
    const factory = getErrorFixerFactory();
    const healthStatus = await factory.getHealthStatus();
    
    res.json({
      success: true,
      health: healthStatus,
      version: 'v2',
      bigBrotherCompliant: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v2/error-fixing/feature-flags
 * Get current feature flag status
 */
router.get('/feature-flags', (req, res) => {
  try {
    const flags = flagManager.getAllFlags();
    const healthStatus = flagManager.getHealthStatus();
    
    res.json({
      success: true,
      featureFlags: flags,
      health: healthStatus,
      version: 'v2',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Feature flags retrieval failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feature flags',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Error handling middleware for this router
 */
router.use((error, req, res, next) => {
  logger.error('Error fixing route error', { 
    error: error.message,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: 'Error fixing API error',
    code: 'ROUTE_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;