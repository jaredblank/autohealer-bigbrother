#!/usr/bin/env node
/**
 * LOCAL V2 TESTING SUITE
 * Test Big Brother Compliant v2 architecture without Render services
 */

const express = require('express');
const path = require('path');

// Set environment variables for v2 testing
process.env.NODE_ENV = 'test';
process.env.ERROR_FIXER_V2_ENABLED = 'true';
process.env.DETERMINISTIC_FIXES_ENABLED = 'true';
process.env.AI_FALLBACK_ENABLED = 'true';
process.env.PERFORMANCE_MONITORING_ENABLED = 'true';

// Mock AI API keys (use test keys or mock responses)
process.env.OPENAI_API_KEY = 'test-key-openai';
process.env.ANTHROPIC_API_KEY = 'test-key-anthropic';

const app = express();
app.use(express.json());

// Add v2 routes
const errorFixingRoutes = require('./src/routes/v2/errorFixing');
app.use('/api/v2/error-fixing', errorFixingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v2-test',
    timestamp: new Date().toISOString()
  });
});

// Test data for various error scenarios
const TEST_SCENARIOS = [
  {
    name: 'Import Error - Future Imports',
    data: {
      error: 'SyntaxError: from __future__ imports must occur at the beginning of the file',
      context: {
        filePath: 'test_file.py',
        language: 'python',
        framework: 'fastapi'
      },
      files: ['import os\nfrom __future__ import annotations\nprint("hello")']
    }
  },
  {
    name: 'Module Not Found',
    data: {
      error: 'ModuleNotFoundError: No module named \'missing_module\'',
      context: {
        filePath: 'main.py',
        language: 'python'
      },
      files: ['import missing_module\nprint("test")']
    }
  },
  {
    name: 'Syntax Error - Missing Colon',
    data: {
      error: 'SyntaxError: invalid syntax. Missing colon?',
      context: {
        filePath: 'app.py',
        language: 'python',
        line: 5
      },
      files: ['def test_function()\n    return "missing colon"']
    }
  },
  {
    name: 'Unknown Error (AI Fallback)',
    data: {
      error: 'CustomError: This is a very specific error that needs AI interpretation',
      context: {
        filePath: 'complex.py',
        language: 'python'
      },
      files: ['# Complex code that needs AI analysis']
    }
  }
];

// Test runner endpoint
app.post('/test/run-scenario/:index', async (req, res) => {
  const scenarioIndex = parseInt(req.params.index);
  
  if (scenarioIndex < 0 || scenarioIndex >= TEST_SCENARIOS.length) {
    return res.status(400).json({
      success: false,
      error: 'Invalid scenario index'
    });
  }

  const scenario = TEST_SCENARIOS[scenarioIndex];
  console.log(`\n🧪 Testing: ${scenario.name}`);
  
  const startTime = Date.now();
  
  try {
    // Make request to our v2 API
    const response = await fetch(`http://localhost:${PORT}/api/v2/error-fixing/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario.data)
    });
    
    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ ${scenario.name} completed in ${executionTime}ms`);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      scenario: scenario.name,
      executionTime,
      result,
      bigBrotherCompliant: executionTime < 100 // Check 100ms rule
    });
    
  } catch (error) {
    console.log(`❌ ${scenario.name} failed:`, error.message);
    
    res.json({
      success: false,
      scenario: scenario.name,
      error: error.message
    });
  }
});

// Run all scenarios
app.post('/test/run-all', async (req, res) => {
  console.log('\n🚀 Running Big Brother v2 Architecture Test Suite\n');
  
  const results = [];
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/test/run-scenario/${i}`, {
        method: 'POST'
      });
      const result = await response.json();
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.push({
        success: false,
        scenario: TEST_SCENARIOS[i].name,
        error: error.message
      });
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const bigBrotherCompliant = results.filter(r => r.bigBrotherCompliant).length;
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`✅ Successful: ${successful}/${TEST_SCENARIOS.length}`);
  console.log(`⚡ Big Brother Compliant (<100ms): ${bigBrotherCompliant}/${successful}`);
  
  res.json({
    success: true,
    summary: {
      total: TEST_SCENARIOS.length,
      successful,
      bigBrotherCompliant,
      completionRate: (successful / TEST_SCENARIOS.length * 100).toFixed(1) + '%'
    },
    results
  });
});

// Feature flag testing
app.get('/test/feature-flags', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/v2/error-fixing/feature-flags`);
    const flags = await response.json();
    
    res.json({
      success: true,
      featureFlags: flags,
      v2Enabled: flags.featureFlags?.ERROR_FIXER_V2_ENABLED || false
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Health check for v2 services
app.get('/test/health', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/v2/error-fixing/health`);
    const health = await response.json();
    
    res.json({
      success: true,
      health,
      bigBrotherCompliant: health.bigBrotherCompliant || false
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🧪 Big Brother v2 Test Server running on http://localhost:${PORT}`);
  console.log('\n📋 Available test endpoints:');
  console.log(`GET  /health - Server health`);
  console.log(`GET  /test/health - v2 services health`);
  console.log(`GET  /test/feature-flags - Feature flag status`);
  console.log(`POST /test/run-scenario/:index - Run specific test (0-${TEST_SCENARIOS.length-1})`);
  console.log(`POST /test/run-all - Run all test scenarios`);
  console.log('\n🚀 Quick start: POST http://localhost:3001/test/run-all');
});