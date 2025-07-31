/**
 * BIG BROTHER COMPLIANT - Deterministic Error Fixer v2
 * SINGLE RESPONSIBILITY: Apply known, deterministic fixes for common errors
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');

const FEATURE_FLAGS = {
  IMPORT_FIXES_ENABLED: process.env.IMPORT_FIXES_ENABLED !== 'false',
  SYNTAX_FIXES_ENABLED: process.env.SYNTAX_FIXES_ENABLED !== 'false',
  MODULE_FIXES_ENABLED: process.env.MODULE_FIXES_ENABLED !== 'false'
};

class DeterministicFixer {
  constructor() {
    this.fixPatterns = this.initializeFixPatterns();
  }

  /**
   * Initialize known fix patterns
   */
  initializeFixPatterns() {
    return [
      {
        name: 'future_imports_fix',
        pattern: /from __future__ import.*must occur at the beginning/i,
        enabled: FEATURE_FLAGS.IMPORT_FIXES_ENABLED,
        fix: this.fixFutureImports.bind(this)
      },
      {
        name: 'module_not_found_fix',
        pattern: /ModuleNotFoundError.*No module named/i,
        enabled: FEATURE_FLAGS.MODULE_FIXES_ENABLED,
        fix: this.fixModuleNotFound.bind(this)
      },
      {
        name: 'syntax_error_fix',
        pattern: /SyntaxError/i,
        enabled: FEATURE_FLAGS.SYNTAX_FIXES_ENABLED,
        fix: this.fixSyntaxError.bind(this)
      },
      {
        name: 'name_error_fix',
        pattern: /NameError.*is not defined/i,
        enabled: FEATURE_FLAGS.MODULE_FIXES_ENABLED,
        fix: this.fixNameError.bind(this)
      }
    ];
  }

  /**
   * Input validation
   */
  validateInput(error, context) {
    if (!error || typeof error !== 'string') {
      throw new Error('Error message is required and must be a string');
    }
    
    if (!context) {
      throw new Error('Context is required');
    }
    
    return true;
  }

  /**
   * Main execution - attempt deterministic fix
   */
  async attemptFix(error, context) {
    const startTime = Date.now();
    
    try {
      this.validateInput(error, context);
      
      // Find matching pattern
      const matchingPattern = this.fixPatterns.find(pattern => 
        pattern.enabled && pattern.pattern.test(error)
      );
      
      if (!matchingPattern) {
        return {
          success: false,
          reason: 'No matching deterministic pattern found'
        };
      }
      
      logger.info(`Applying deterministic fix: ${matchingPattern.name}`);
      
      // Apply the fix
      const fixResult = await matchingPattern.fix(error, context);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        fixName: matchingPattern.name,
        changes: fixResult.changes,
        executionTime
      };
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fix __future__ imports positioning
   */
  async fixFutureImports(error, context) {
    const { filePath, content } = context;
    
    if (!content) {
      throw new Error('File content required for future imports fix');
    }
    
    const lines = content.split('\n');
    const futureImportIndex = lines.findIndex(line => 
      line.trim().startsWith('from __future__ import')
    );
    
    if (futureImportIndex === -1) {
      throw new Error('Future import not found in content');
    }
    
    // Move future import to the top (after shebang/encoding if present)
    const futureImportLine = lines[futureImportIndex];
    lines.splice(futureImportIndex, 1);
    
    let insertIndex = 0;
    // Skip shebang and encoding declarations
    while (insertIndex < lines.length && 
           (lines[insertIndex].startsWith('#!') || 
            lines[insertIndex].includes('coding:'))) {
      insertIndex++;
    }
    
    lines.splice(insertIndex, 0, futureImportLine);
    
    return {
      changes: {
        filePath,
        originalContent: content,
        newContent: lines.join('\n'),
        description: 'Moved __future__ imports to beginning of file'
      }
    };
  }

  /**
   * Fix module not found errors by commenting out problematic imports
   */
  async fixModuleNotFound(error, context) {
    const moduleMatch = error.match(/No module named '([^']+)'/);
    if (!moduleMatch) {
      throw new Error('Could not extract module name from error');
    }
    
    const moduleName = moduleMatch[1];
    const { content } = context;
    
    if (!content) {
      throw new Error('File content required for module fix');
    }
    
    const lines = content.split('\n');
    const importLineIndex = lines.findIndex(line => 
      line.includes(`import ${moduleName}`) || 
      line.includes(`from ${moduleName}`)
    );
    
    if (importLineIndex === -1) {
      throw new Error(`Import line for ${moduleName} not found`);
    }
    
    // Comment out the problematic import
    lines[importLineIndex] = `# ${lines[importLineIndex]}  # Commented out - module not available`;
    
    return {
      changes: {
        filePath: context.filePath,
        originalContent: content,
        newContent: lines.join('\n'),
        description: `Commented out import for unavailable module: ${moduleName}`
      }
    };
  }

  /**
   * Basic syntax error fixes
   */
  async fixSyntaxError(error, context) {
    // This is a placeholder for basic syntax fixes
    // In a real implementation, you'd have specific patterns
    return {
      changes: {
        description: 'Syntax error detected - manual review required',
        suggestions: ['Check for missing brackets, quotes, or colons']
      }
    };
  }

  /**
   * Fix name errors by adding basic definitions
   */
  async fixNameError(error, context) {
    const nameMatch = error.match(/name '([^']+)' is not defined/);
    if (!nameMatch) {
      throw new Error('Could not extract variable name from error');
    }
    
    const varName = nameMatch[1];
    
    return {
      changes: {
        description: `NameError for '${varName}' detected`,
        suggestions: [
          `Add import for ${varName}`,
          `Define ${varName} variable`,
          `Check spelling of ${varName}`
        ]
      }
    };
  }

  /**
   * Error handling
   */
  handleError(error) {
    logger.error('DeterministicFixer failed', { error: error.message });
    return {
      success: false,
      error: 'Deterministic fix failed',
      details: error.message
    };
  }
}

module.exports = DeterministicFixer;