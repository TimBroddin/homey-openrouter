# OpenRouter for Homey

Integrate AI language models into your Homey smart home using [OpenRouter](https://openrouter.ai). Generate dynamic text, announcements, and responses using models from OpenAI, Anthropic, Google, Meta, and more.

## Features

- **Generate text** using any model available on OpenRouter
- **Model autocomplete** - search and select from 200+ available models
- **System prompts** - customize AI behavior with context
- **Credits tracking** - monitor your OpenRouter balance directly in Homey
- **API status** - see connection status at a glance

## Installation

1. Install the app from the Homey App Store
2. Add the OpenRouter device
3. Enter your OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys))
4. Start building flows!

## Flow Cards

### Actions

#### Generate text
Generate text using a prompt and selected model.

**Inputs:**
- **Model** - Select from available OpenRouter models
- **Prompt** - The text prompt to send

**Returns:**
- **Response** - The generated text (available as a flow token)

#### Generate text with context
Generate text with a system prompt for customized behavior.

**Inputs:**
- **Model** - Select from available OpenRouter models
- **Context / System Prompt** - Instructions for the AI (e.g., "You are a friendly home assistant")
- **Prompt** - The text prompt to send

**Returns:**
- **Response** - The generated text (available as a flow token)

## Example Flows

### Dynamic Doorbell Announcement
```
WHEN: Doorbell rings
THEN: Generate text with OpenRouter
      Model: google/gemini-3-flash-preview
      Prompt: "Create a short, friendly announcement that someone is at the front door"
THEN: Speak [[response]]
```

### Weather-Based Greeting
```
WHEN: Time is 7:00 AM
THEN: Generate text with context
      Model: openai/gpt-4.1-mini
      Context: "You are a cheerful home assistant. Keep responses under 50 words."
      Prompt: "Good morning greeting mentioning it's [[weather_condition]] and [[temperature]]°C outside"
THEN: Speak [[response]]
```

### Smart Notification Summary
```
WHEN: Daily at 9:00 PM
THEN: Generate text with OpenRouter
      Model: anthropic/claude-opus-4.5
      Prompt: "Summarize these home events in 2-3 sentences: [[daily_events]]"
THEN: Send notification [[response]]
```

## Device Capabilities

| Capability | Description |
|------------|-------------|
| Credits Remaining | Your current OpenRouter balance in USD |
| API Status | Connection status to OpenRouter API |

## Featured Models

All 200+ OpenRouter models are available via search.

## Support

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Report Issues](https://github.com/timbroddin/homey-openrouter/issues)

## License

MIT License - see [LICENSE](LICENSE) for details.
