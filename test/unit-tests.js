#!/usr/bin/env node
/**
 * UNIT TESTS for Big Brother v2 Architecture
 * Test individual components without external dependencies
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.ERROR_FIXER_V2_ENABLED = 'true';
process.env.DETERMINISTIC_FIXES_ENABLED = 'true';

console.log('🧪 Big Brother v2 Unit Tests\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, testFn) {
    try {
      console.log(`🔍 Testing: ${name}`);
      testFn();
      console.log(`✅ PASS: ${name}\n`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Test 1: Feature Flag Manager
  test('Feature Flag Manager - Initialization', () => {
    const { getFeatureFlagManager } = require('../src/config/featureFlags');
    const flagManager = getFeatureFlagManager();
    
    assert(flagManager, 'Flag manager should be initialized');
    assert(typeof flagManager.isV2Enabled === 'function', 'Should have isV2Enabled method');
    assert(flagManager.isV2Enabled() === true, 'V2 should be enabled in test');
  });

  // Test 2: AI Client Manager
  test('AI Client Manager - Singleton Pattern', () => {
    const { getAIClientManager } = require('../src/services/v2/aiClientManager');
    const manager1 = getAIClientManager();
    const manager2 = getAIClientManager();
    
    assert(manager1 === manager2, 'Should return same singleton instance');
    assert(typeof manager1.getAvailableClients === 'function', 'Should have getAvailableClients method');
  });

  // Test 3: Deterministic Fixer Patterns
  test('Deterministic Fixer - Future Import Pattern', () => {
    const DeterministicFixer = require('../src/services/v2/deterministicFixer');
    const fixer = new DeterministicFixer();
    
    const error = 'SyntaxError: from __future__ imports must occur at the beginning of the file';
    const context = { filePath: 'test.py', language: 'python' };
    const files = ['import os\nfrom __future__ import annotations'];
    
    const result = fixer.attemptFix(error, context, files);
    
    assert(result.success === true, 'Should successfully fix future import error');
    assert(result.fixType === 'future_import_order', 'Should identify correct fix type');
  });

  // Test 4: Error Fixer Core Validation
  test('Error Fixer Core - Input Validation', () => {
    const ErrorFixerCore = require('../src/services/v2/errorFixerCore');
    const core = new ErrorFixerCore();
    
    // Valid input
    const validData = {
      error: 'Test error',
      context: { filePath: 'test.py' },
      files: []
    };
    
    const validation = core.validateInput(validData);
    assert(validation.isValid === true, 'Should validate correct input');
    
    // Invalid input
    try {
      core.validateInput({ error: null });
      assert(false, 'Should throw error for invalid input');
    } catch (error) {
      assert(error.message.includes('Error message is required'), 'Should have proper error message');
    }
  });

  // Test 5: Performance Compliance
  test('Big Brother Performance Compliance', () => {
    const startTime = Date.now();
    
    // Simulate quick operation
    const { getFeatureFlagManager } = require('../src/config/featureFlags');
    const flagManager = getFeatureFlagManager();
    const flags = flagManager.getAllFlags();
    
    const executionTime = Date.now() - startTime;
    
    assert(executionTime < 100, `Should complete under 100ms (took ${executionTime}ms)`);
    assert(typeof flags === 'object', 'Should return flags object');
  });

  // Test 6: Error Handling Cascade
  test('Error Handling Cascade Logic', () => {
    const ErrorFixerCore = require('../src/services/v2/errorFixerCore');
    const core = new ErrorFixerCore();
    
    // Test error handling
    const error = new Error('Test error');
    const handled = core.handleError(error);
    
    assert(handled.success === false, 'Should return failure for errors');
    assert(handled.error === 'Error fixing failed', 'Should have standard error message');
    assert(handled.details.includes('Test error'), 'Should include original error details');
  });

  // Test 7: Health Status Reporting
  test('Health Status Reporting', () => {
    const { getAIClientManager } = require('../src/services/v2/aiClientManager');
    const manager = getAIClientManager();
    
    const health = manager.getHealthStatus();
    
    assert(health.service === 'AIClientManager', 'Should identify correct service');
    assert(health.version === 'v2', 'Should report v2 version');
    assert(typeof health.timestamp === 'string', 'Should include timestamp');
  });

  // Test 8: Line Count Compliance
  test('Big Brother Line Count Compliance', () => {
    const fs = require('fs');
    const path = require('path');
    
    const v2Files = [
      '../src/services/v2/aiClientManager.js',
      '../src/services/v2/aiFixer.js',
      '../src/services/v2/deterministicFixer.js',
      '../src/services/v2/errorFixerCore.js',
      '../src/services/v2/errorFixerFactory.js',
      '../src/routes/v2/errorFixing.js'
    ];
    
    for (const filePath of v2Files) {
      const fullPath = path.join(__dirname, filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lineCount = content.split('\n').length;
      
      assert(lineCount <= 250, `${filePath} has ${lineCount} lines (max 250)`);
    }
  });

  // Summary
  console.log('📊 UNIT TEST SUMMARY:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All unit tests passed! Big Brother v2 architecture is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before deployment.');
    process.exit(1);
  }
}

runTests().catch(console.error);