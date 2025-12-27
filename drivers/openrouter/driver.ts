'use strict';

import Homey from 'homey';

interface PairSession {
  apiKey: string;
  defaultModel: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
}

interface ModelsResponse {
  data: OpenRouterModel[];
}

// Popular models to show at top of autocomplete results
const FEATURED_MODELS = [
  'google/gemini-3-flash-preview',
  'google/gemini-2.0-flash-exp:free',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1',
  'anthropic/claude-opus-4.5',
  'deepseek/deepseek-v3.2',
  'meta-llama/llama-4-maverick',
  'mistralai/mistral-large-2512',
];

class OpenRouterDriver extends Homey.Driver {
  private modelsCache: OpenRouterModel[] = [];
  private modelsCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async onInit() {
    this.log('OpenRouter driver initialized');

    // Register flow action: generate_text
    const generateTextAction = this.homey.flow.getActionCard('generate_text');
    generateTextAction.registerRunListener(async (args) => {
      const { device, model, prompt } = args;
      const response = await device.generateText(prompt, model.id);
      return { response };
    });

    // Register autocomplete for generate_text
    generateTextAction.registerArgumentAutocompleteListener('model', async (query, args) => {
      return this.getModelAutocomplete(query, args.device);
    });

    // Register flow action: generate_with_context
    const generateWithContextAction = this.homey.flow.getActionCard('generate_with_context');
    generateWithContextAction.registerRunListener(async (args) => {
      const { device, model, system_prompt, prompt } = args;
      const response = await device.generateText(prompt, model.id, system_prompt);
      return { response };
    });

    // Register autocomplete for generate_with_context
    generateWithContextAction.registerArgumentAutocompleteListener('model', async (query, args) => {
      return this.getModelAutocomplete(query, args.device);
    });
  }

  async getModelAutocomplete(query: string, device: Homey.Device) {
    const models = await this.fetchModels(device);
    const lowerQuery = query.toLowerCase();

    // Filter models based on query
    let filtered = models.filter((model) => {
      return (
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery)
      );
    });

    // Sort: featured models first, then alphabetically
    filtered.sort((a, b) => {
      const aFeatured = FEATURED_MODELS.includes(a.id);
      const bFeatured = FEATURED_MODELS.includes(b.id);

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      if (aFeatured && bFeatured) {
        return FEATURED_MODELS.indexOf(a.id) - FEATURED_MODELS.indexOf(b.id);
      }
      return a.name.localeCompare(b.name);
    });

    // Limit results
    return filtered.slice(0, 50).map((model) => ({
      id: model.id,
      name: model.name,
      description: model.id,
    }));
  }

  async fetchModels(device: Homey.Device): Promise<OpenRouterModel[]> {
    // Return cached models if still valid
    if (this.modelsCache.length > 0 && Date.now() - this.modelsCacheTime < this.CACHE_TTL) {
      return this.modelsCache;
    }

    try {
      const apiKey = device.getSetting('apiKey');
      if (!apiKey) {
        return this.getDefaultModels();
      }

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        this.error('Failed to fetch models:', response.status);
        return this.getDefaultModels();
      }

      const data = (await response.json()) as ModelsResponse;
      this.modelsCache = data.data.map((m) => ({ id: m.id, name: m.name }));
      this.modelsCacheTime = Date.now();

      return this.modelsCache;
    } catch (error) {
      this.error('Error fetching models:', error);
      return this.getDefaultModels();
    }
  }

  getDefaultModels(): OpenRouterModel[] {
    return FEATURED_MODELS.map((id) => ({
      id,
      name: id.split('/')[1] || id,
    }));
  }

  async onPair(session: Homey.Driver.PairSession) {
    let pairData: PairSession = {
      apiKey: '',
      defaultModel: 'google/gemini-3-flash-preview',
    };

    session.setHandler('login', async (data: { username: string; password: string }) => {
      // username = API key, password = default model (optional)
      const apiKey = data.username?.trim();
      const defaultModel = data.password?.trim() || 'google/gemini-3-flash-preview';

      if (!apiKey || !apiKey.startsWith('sk-or-')) {
        throw new Error('Invalid API key. It should start with sk-or-');
      }

      // Validate API key by making a test request
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        throw new Error('API key validation failed. Please check your key.');
      }

      pairData.apiKey = apiKey;
      pairData.defaultModel = defaultModel;

      return true;
    });

    session.setHandler('list_devices', async () => {
      return [
        {
          name: 'OpenRouter',
          data: {
            id: `openrouter-${Date.now()}`,
          },
          settings: {
            apiKey: pairData.apiKey,
            defaultModel: pairData.defaultModel,
          },
        },
      ];
    });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      this.error('API key validation error:', error);
      return false;
    }
  }
}

module.exports = OpenRouterDriver;
