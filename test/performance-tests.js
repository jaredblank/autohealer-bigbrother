#!/usr/bin/env node
/**
 * PERFORMANCE TESTS for Big Brother Architecture
 * Verify <100ms response time and <50MB memory compliance
 */

process.env.NODE_ENV = 'test';
process.env.ERROR_FIXER_V2_ENABLED = 'true';

console.log('⚡ Big Brother Performance Tests\n');

async function runPerformanceTests() {
  let passed = 0;
  let failed = 0;

  function perfTest(name, testFn) {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      try {
        console.log(`⏱️  Testing: ${name}`);
        
        await testFn();
        
        const executionTime = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        const memoryMB = memoryDelta / 1024 / 1024;
        
        // Big Brother compliance checks
        const timeCompliant = executionTime < 100;
        const memoryCompliant = memoryMB < 50;
        
        console.log(`   ⏱️  Execution: ${executionTime}ms ${timeCompliant ? '✅' : '❌'}`);
        console.log(`   💾 Memory: ${memoryMB.toFixed(2)}MB ${memoryCompliant ? '✅' : '❌'}`);
        
        if (timeCompliant && memoryCompliant) {
          console.log(`✅ PASS: ${name} (Big Brother Compliant)\n`);
          passed++;
        } else {
          console.log(`❌ FAIL: ${name} (Not Big Brother Compliant)\n`);
          failed++;
        }
        
      } catch (error) {
        console.log(`❌ FAIL: ${name} - ${error.message}\n`);
        failed++;
      }
      
      resolve();
    });
  }

  // Test 1: Feature Flag Manager Performance
  await perfTest('Feature Flag Manager - Initialization & Access', async () => {
    const runs = 1000;
    const { getFeatureFlagManager } = require('../src/config/featureFlags');
    
    for (let i = 0; i < runs; i++) {
      const manager = getFeatureFlagManager();
      manager.isV2Enabled();
      manager.getAllFlags();
    }
  });

  // Test 2: Deterministic Fixer Performance
  await perfTest('Deterministic Fixer - Pattern Matching', async () => {
    const DeterministicFixer = require('../src/services/v2/deterministicFixer');
    const fixer = new DeterministicFixer();
    
    const testCases = [
      'SyntaxError: from __future__ imports must occur at the beginning of the file',
      'ModuleNotFoundError: No module named \'missing_module\'',
      'SyntaxError: invalid syntax. Missing colon?',
      'IndentationError: expected an indented block',
      'NameError: name \'undefined_var\' is not defined'
    ];
    
    for (const error of testCases) {
      fixer.attemptFix(error, { filePath: 'test.py' }, []);
    }
  });

  // Test 3: AI Client Manager Performance
  await perfTest('AI Client Manager - Client Access', async () => {
    const { getAIClientManager } = require('../src/services/v2/aiClientManager');
    const manager = getAIClientManager();
    
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      manager.getAvailableClients();
      manager.getHealthStatus();
      try {
        manager.isClientAvailable('openai');
        manager.isClientAvailable('anthropic');
      } catch (e) {
        // Expected for test environment
      }
    }
  });

  // Test 4: Error Fixer Core Performance
  await perfTest('Error Fixer Core - Validation & Processing', async () => {
    const ErrorFixerCore = require('../src/services/v2/errorFixerCore');
    const core = new ErrorFixerCore();
    
    const runs = 200;
    const testData = {
      error: 'Test error message',
      context: { filePath: 'test.py', language: 'python' },
      files: ['test content', 'more content']
    };
    
    for (let i = 0; i < runs; i++) {
      core.validateInput(testData);
      core.formatResponse({ success: true, test: true });
    }
  });

  // Test 5: Memory Stress Test
  await perfTest('Memory Stress Test - Large Data Processing', async () => {
    const DeterministicFixer = require('../src/services/v2/deterministicFixer');
    const fixer = new DeterministicFixer();
    
    // Create large file content
    const largeContent = 'import os\n'.repeat(1000) + 
                        'def function():\n    pass\n'.repeat(500);
    
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      fixer.attemptFix(
        'SyntaxError: from __future__ imports must occur at the beginning of the file',
        { filePath: 'large_file.py' },
        [largeContent]
      );
    }
  });

  // Test 6: Concurrent Access Performance
  await perfTest('Concurrent Access - Multiple Services', async () => {
    const { getFeatureFlagManager } = require('../src/config/featureFlags');
    const { getAIClientManager } = require('../src/services/v2/aiClientManager');
    const DeterministicFixer = require('../src/services/v2/deterministicFixer');
    
    const promises = [];
    const runs = 100;
    
    for (let i = 0; i < runs; i++) {
      promises.push(
        Promise.resolve().then(() => {
          const flagManager = getFeatureFlagManager();
          const aiManager = getAIClientManager();
          const fixer = new DeterministicFixer();
          
          flagManager.isV2Enabled();
          aiManager.getHealthStatus();
          fixer.attemptFix('Test error', { filePath: 'test.py' }, []);
        })
      );
    }
    
    await Promise.all(promises);
  });

  // Test 7: Factory Pattern Performance
  await perfTest('Factory Pattern - Service Creation', async () => {
    const runs = 100;
    
    for (let i = 0; i < runs; i++) {
      // Test factory pattern performance
      const { getErrorFixerFactory } = require('../src/services/v2/errorFixerFactory');
      const factory = getErrorFixerFactory();
      
      // Simulate service creation
      factory.getHealthStatus();
    }
  });

  // Summary
  console.log('📊 PERFORMANCE TEST SUMMARY:');
  console.log(`✅ Big Brother Compliant: ${passed}`);
  console.log(`❌ Non-Compliant: ${failed}`);
  console.log(`📈 Compliance Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🚀 All performance tests passed! Ready for production.');
    console.log('⚡ Big Brother Architecture: <100ms response, <50MB memory ✅');
  } else {
    console.log('\n⚠️  Performance issues detected. Optimization needed.');
  }
  
  return failed === 0;
}

runPerformanceTests().catch(console.error);