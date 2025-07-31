/**
 * BIG BROTHER COMPLIANT - AutoHealer v2 Main Server
 * SINGLE RESPONSIBILITY: HTTP server orchestration
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { getFeatureFlagManager } = require('./config/featureFlags');

// Initialize Big Brother feature flags
const flagManager = getFeatureFlagManager();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://autohealer-bigbrother.onrender.com']
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  req.initialMemory = process.memoryUsage();
  next();
});

// Health check - Big Brother compliant
app.get('/health', (req, res) => {
  const executionTime = Date.now() - req.startTime;
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    service: 'AutoHealer Big Brother v2',
    version: '2.0.0',
    bigBrotherCompliant: true,
    performance: {
      executionTime,
      memoryMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      compliant: executionTime < 100 && memoryUsage.heapUsed < 50 * 1024 * 1024
    },
    featureFlags: {
      v2Enabled: flagManager.isV2Enabled(),
      totalFlags: Object.keys(flagManager.getAllFlags()).length
    },
    timestamp: new Date().toISOString()
  });
});

// V2 Routes (Big Brother Compliant)
if (flagManager.isV2Enabled()) {
  const errorFixingRoutes = require('./routes/v2/errorFixing');
  app.use('/api/v2/error-fixing', errorFixingRoutes);
  
  logger.info('Big Brother v2 routes loaded');
} else {
  logger.info('V2 routes disabled via feature flags');
}

// Legacy v1 routes (for comparison/benchmarking)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoHealer Legacy v1',
    version: '1.0.0',
    bigBrotherCompliant: false,
    timestamp: new Date().toISOString()
  });
});

// Feature flag management endpoint
app.get('/api/feature-flags', (req, res) => {
  const executionTime = Date.now() - req.startTime;
  
  res.json({
    success: true,
    flags: flagManager.getAllFlags(),
    health: flagManager.getHealthStatus(),
    performance: {
      executionTime,
      compliant: executionTime < 100
    },
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for Render deployments
app.post('/webhook/render', (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Render webhook received', {
      headers: req.headers,
      body: req.body
    });
    
    // Process webhook in background to maintain <100ms response
    setImmediate(async () => {
      try {
        if (flagManager.isV2Enabled()) {
          const { getErrorFixerFactory } = require('./services/v2/errorFixerFactory');
          const factory = getErrorFixerFactory();
          
          // Process webhook with v2 architecture
          logger.info('Processing webhook with Big Brother v2 architecture');
          // TODO: Implement webhook processing
        } else {
          logger.info('Processing webhook with legacy v1 system');
        }
      } catch (error) {
        logger.error('Webhook processing failed', { error: error.message });
      }
    });
    
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Webhook received and queued for processing',
      version: flagManager.isV2Enabled() ? 'v2' : 'v1',
      performance: {
        executionTime,
        compliant: executionTime < 100
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Webhook endpoint failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Performance monitoring endpoint
app.get('/api/performance', (req, res) => {
  const executionTime = Date.now() - req.startTime;
  const memoryUsage = process.memoryUsage();
  const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
  
  res.json({
    success: true,
    bigBrotherCompliance: {
      responseTime: {
        actual: executionTime,
        target: 100,
        compliant: executionTime < 100
      },
      memory: {
        actualMB: memoryMB.toFixed(2),
        targetMB: 50,
        compliant: memoryMB < 50
      }
    },
    system: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  const executionTime = Date.now() - req.startTime;
  
  logger.error('Server error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    service: 'AutoHealer Big Brother v2',
    performance: {
      executionTime,
      compliant: executionTime < 100
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  const executionTime = Date.now() - req.startTime;
  
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/feature-flags',
      'GET /api/performance',
      'POST /webhook/render',
      'POST /api/v2/error-fixing/fix',
      'GET /api/v2/error-fixing/health'
    ],
    performance: {
      executionTime,
      compliant: executionTime < 100
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Big Brother AutoHealer v2 Server started`);
  logger.info(`📍 Running on port ${PORT}`);
  logger.info(`🏗️  Architecture: Big Brother Compliant`);
  logger.info(`⚡ Performance: <100ms response, <50MB memory`);
  logger.info(`🎛️  Feature Flags: V2 ${flagManager.isV2Enabled() ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`🔗 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;