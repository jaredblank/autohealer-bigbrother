/**
 * BIG BROTHER COMPLIANT - AI Client Manager v2
 * SINGLE RESPONSIBILITY: Manage AI service clients and configuration
 * MAX LINES: 250 | MEMORY: <50MB | RESPONSE: <100ms
 */

const logger = require('../../utils/logger');
const openai = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

const FEATURE_FLAGS = {
  OPENAI_ENABLED: process.env.OPENAI_ENABLED !== 'false',
  ANTHROPIC_ENABLED: process.env.ANTHROPIC_ENABLED !== 'false',
  CLAUDE_CODE_ENABLED: process.env.CLAUDE_CODE_ENABLED !== 'false'
};

class AIClientManager {
  constructor() {
    this.clients = {};
    this.initialized = false;
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Initialize all AI clients
   */
  initialize() {
    if (this.initialized) {
      return this.clients;
    }

    try {
      this.clients = this.initializeAIClients();
      this.initialized = true;
      logger.info('AI Client Manager initialized');
      return this.clients;
    } catch (error) {
      logger.error('AI Client Manager initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize AI clients based on feature flags
   */
  initializeAIClients() {
    const clients = {};
    
    // OpenAI GPT-4
    if (FEATURE_FLAGS.OPENAI_ENABLED && process.env.OPENAI_API_KEY) {
      try {
        clients.openai = new openai.OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        logger.info('OpenAI client initialized');
      } catch (error) {
        logger.error('OpenAI client initialization failed', { error: error.message });
      }
    }
    
    // Anthropic Claude
    if (FEATURE_FLAGS.ANTHROPIC_ENABLED && process.env.ANTHROPIC_API_KEY) {
      try {
        clients.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        logger.info('Anthropic client initialized');
      } catch (error) {
        logger.error('Anthropic client initialization failed', { error: error.message });
      }
    }
    
    return clients;
  }

  /**
   * Get client by name
   */
  getClient(clientName) {
    if (!this.initialized) {
      this.initialize();
    }
    
    const client = this.clients[clientName];
    if (!client) {
      throw new Error(`AI client '${clientName}' not available`);
    }
    
    return client;
  }

  /**
   * Get all available clients
   */
  getAvailableClients() {
    if (!this.initialized) {
      this.initialize();
    }
    
    return Object.keys(this.clients);
  }

  /**
   * Check if client is available
   */
  isClientAvailable(clientName) {
    if (!this.initialized) {
      this.initialize();
    }
    
    return this.clients[clientName] !== undefined;
  }

  /**
   * Call OpenAI with timeout
   */
  async callOpenAI(prompt) {
    const client = this.getClient('openai');
    
    return await Promise.race([
      client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: JSON.stringify(prompt) }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout')), this.timeout)
      )
    ]);
  }

  /**
   * Call Anthropic with timeout
   */
  async callAnthropic(prompt) {
    const client = this.getClient('anthropic');
    
    return await Promise.race([
      client.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          { role: "user", content: JSON.stringify(prompt) }
        ]
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Anthropic timeout')), this.timeout)
      )
    ]);
  }

  /**
   * Build standardized prompt for AI services
   */
  buildPrompt(error, context, files) {
    return {
      system: "You are an expert code fixer. Analyze the error and provide a specific fix.",
      error: error,
      context: {
        filePath: context.filePath,
        language: context.language || 'python',
        framework: context.framework
      },
      files: files.slice(0, 3), // Limit files to prevent token overflow
      instructions: [
        "Provide ONLY the fix, not explanations",
        "Return the corrected code section",
        "Indicate confidence level (0.0-1.0)"
      ]
    };
  }

  /**
   * Parse AI response into standardized format
   */
  parseAIResponse(content) {
    try {
      // Try to extract JSON if present
      const jsonMatch = content.match(/```json\n(.*?)\n```/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          changes: parsed,
          confidence: parsed.confidence || 0.8
        };
      }
      
      // Fallback: treat as plain text fix
      return {
        success: true,
        changes: {
          description: 'AI-generated fix',
          suggestion: content.trim(),
          confidence: 0.7
        },
        confidence: 0.7
      };
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
  }

  /**
   * Health status
   */
  getHealthStatus() {
    return {
      service: 'AIClientManager',
      version: 'v2',
      initialized: this.initialized,
      availableClients: this.getAvailableClients(),
      featureFlags: FEATURE_FLAGS,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let clientManagerInstance = null;

/**
 * Get singleton AI client manager
 */
function getAIClientManager() {
  if (!clientManagerInstance) {
    clientManagerInstance = new AIClientManager();
  }
  return clientManagerInstance;
}

module.exports = {
  AIClientManager,
  getAIClientManager
};