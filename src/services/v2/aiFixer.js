/**
 * BIG BROTHER COMPLIANT - AI Error Fixer v2
 * SINGLE RESPONSIBILITY: Handle complex errors using AI cascade
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');
const { getAIClientManager } = require('./aiClientManager');

class AIFixer {
  constructor() {
    this.aiClientManager = getAIClientManager();
    this.maxRetries = 3;
  }

  /**
   * Input validation
   */
  validateInput(error, context, files) {
    if (!error || typeof error !== 'string') {
      throw new Error('Error message is required and must be a string');
    }
    
    if (!context) {
      throw new Error('Context is required for AI fixes');
    }
    
    return true;
  }

  /**
   * Main execution - attempt AI-based fix using cascade
   */
  async attemptFix(error, context, files = []) {
    const startTime = Date.now();
    
    try {
      this.validateInput(error, context, files);
      
      // AI Cascade: Try each available AI service
      const availableClients = this.aiClientManager.getAvailableClients();
      
      for (const clientName of availableClients) {
        try {
          logger.info(`Attempting AI fix with ${clientName}`);
          const result = await this.callAIService(clientName, error, context, files);
          
          if (result.success) {
            const executionTime = Date.now() - startTime;
            return {
              success: true,
              aiService: clientName,
              changes: result.changes,
              confidence: result.confidence || 0.8,
              executionTime
            };
          }
        } catch (aiError) {
          logger.warn(`AI service ${clientName} failed`, { error: aiError.message });
          continue; // Try next service
        }
      }
      
      // All AI services failed
      return {
        success: false,
        reason: 'All AI services failed or unavailable',
        suggestions: ['Manual review required', 'Check AI service configurations']
      };
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Call specific AI service using client manager
   */
  async callAIService(clientName, error, context, files) {
    const prompt = this.aiClientManager.buildPrompt(error, context, files);
    
    if (clientName === 'openai') {
      const response = await this.aiClientManager.callOpenAI(prompt);
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }
      return this.aiClientManager.parseAIResponse(content);
    } else if (clientName === 'anthropic') {
      const response = await this.aiClientManager.callAnthropic(prompt);
      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No response from Anthropic');
      }
      return this.aiClientManager.parseAIResponse(content);
    }
    
    throw new Error(`Unknown AI service: ${clientName}`);
  }

  /**
   * Error handling
   */
  handleError(error) {
    logger.error('AIFixer failed', { error: error.message });
    return {
      success: false,
      error: 'AI fix attempt failed',
      details: error.message
    };
  }

  /**
   * Health check
   */
  getHealthStatus() {
    return {
      service: 'AIFixer',
      version: 'v2',
      availableServices: this.aiClientManager.getAvailableClients(),
      clientManagerHealth: this.aiClientManager.getHealthStatus()
    };
  }
}

module.exports = AIFixer;