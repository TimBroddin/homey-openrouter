'use strict';

import Homey from 'homey';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface CreditsResponse {
  data?: {
    total_credits: number;
    total_usage: number;
  };
  error?: {
    message?: string;
  };
}

class OpenRouterDevice extends Homey.Device {
  private apiKey: string = '';
  private defaultModel: string = 'google/gemini-3-flash-preview';

  async onInit() {
    this.log('OpenRouter device initialized');

    this.apiKey = this.getSetting('apiKey') || '';
    this.defaultModel = this.getSetting('defaultModel') || 'google/gemini-3-flash-preview';

    // Check API status and credits on init
    await this.checkApiStatus();
    await this.checkCredits();

    // Periodically check API status and credits (every 5 minutes)
    this.homey.setInterval(() => {
      this.checkApiStatus();
      this.checkCredits();
    }, 5 * 60 * 1000);
  }

  async onSettings({
    newSettings,
  }: {
    oldSettings: { [key: string]: unknown };
    newSettings: { [key: string]: unknown };
    changedKeys: string[];
  }) {
    if (newSettings.apiKey) {
      this.apiKey = newSettings.apiKey as string;
    }
    if (newSettings.defaultModel) {
      this.defaultModel = newSettings.defaultModel as string;
    }

    await this.checkApiStatus();
    await this.checkCredits();
  }

  async checkCredits(): Promise<void> {
    if (!this.apiKey) return;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/credits', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.log('Credits endpoint not available');
        return;
      }

      const data = (await response.json()) as CreditsResponse;

      if (data.data) {
        const remaining = data.data.total_credits - data.data.total_usage;
        await this.setCapabilityValue('openrouter_credits', remaining).catch(this.error);
      }
    } catch (error) {
      this.error('Credits check failed:', error);
    }
  }

  async checkApiStatus(): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const isOnline = response.ok;
      await this.setCapabilityValue('openrouter_status', isOnline).catch(this.error);
      return isOnline;
    } catch (error) {
      this.error('API status check failed:', error);
      await this.setCapabilityValue('openrouter_status', false).catch(this.error);
      return false;
    }
  }

  async generateText(
    prompt: string,
    model?: string,
    systemPrompt?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const selectedModel = model || this.defaultModel;
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    this.log(`Generating text with model: ${selectedModel}`);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://homey.app',
          'X-Title': 'Homey OpenRouter',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.error('OpenRouter API error:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = (await response.json()) as OpenRouterResponse;

      if (data.error) {
        throw new Error(data.error.message || 'Unknown API error');
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received');
      }

      return content.trim();
    } catch (error) {
      this.error('Text generation failed:', error);
      throw error;
    }
  }
}

module.exports = OpenRouterDevice;
