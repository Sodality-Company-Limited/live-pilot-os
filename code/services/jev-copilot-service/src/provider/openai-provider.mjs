import { InferenceProviderInterface } from './provider-interface.mjs';

/**
 * Concrete OpenAI-compatible Provider implementation.
 * Performs direct operational inference with environment key validation.
 */
export class OpenAiProvider extends InferenceProviderInterface {
  /**
   * @param {object} options
   * @param {string} [options.apiKey] - OpenAI API Key (defaults to process.env.OPENAI_API_KEY)
   * @param {string} [options.modelVersion] - Model ID (e.g. 'gpt-4o-mini', 'gpt-4o')
   * @param {string} [options.endpoint] - API base URL (defaults to https://api.openai.com/v1/chat/completions)
   * @param {Function} [options.fetchFn] - Custom fetch function for runtime testing/injection
   */
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.modelVersion = options.modelVersion || 'gpt-4o-mini';
    this.endpoint = options.endpoint || 'https://api.openai.com/v1/chat/completions';
    this.fetchFn = options.fetchFn || globalThis.fetch;
    // Per million tokens pricing in USD micro-units (scale 6: 1 USD = 1,000,000 minor units)
    // gpt-4o-mini default: input = $0.150 / 1M = 150,000 minor, output = $0.600 / 1M = 600,000 minor
    this.inputCostPer1M = options.inputCostPer1M ?? 150000n;
    this.outputCostPer1M = options.outputCostPer1M ?? 600000n;
  }

  get name() {
    return 'openai';
  }

  /**
   * Validate configuration and readiness.
   */
  validateReady() {
    if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim().length === 0) {
      throw new Error('PROVIDER_CONFIG_ERROR: OPENAI_API_KEY is not configured');
    }
  }

  /**
   * Calculate cost in minor units (scale 6, USD) using integer math.
   * cost_minor = (inputTokens * inputCostPer1M + outputTokens * outputCostPer1M) / 1,000,000
   * Uses integer division with banker's half-even or ceiling to avoid undercharging.
   */
  calculateCostMinor(inputTokens, outputTokens) {
    const inputTotal = BigInt(inputTokens) * this.inputCostPer1M;
    const outputTotal = BigInt(outputTokens) * this.outputCostPer1M;
    const numerator = inputTotal + outputTotal;
    const divisor = 1000000n;
    // Ceiling division so micro-costs are never rounded down to zero
    return (numerator + (divisor - 1n)) / divisor;
  }

  async executeInference({
    promptTemplateId,
    promptRevision,
    systemInstruction,
    userPrompt,
    timeoutMs = 5000,
    maxOutputTokens = 1024,
    signal
  }) {
    this.validateReady();

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);

    // Chain external signal if provided
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    const startTime = Date.now();
    try {
      const payload = {
        model: this.modelVersion,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxOutputTokens,
        temperature: 0.1
      };

      const res = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`PROVIDER_HTTP_ERROR: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};
      const inputTokens = usage.prompt_tokens ?? 0;
      const outputTokens = usage.completion_tokens ?? 0;
      const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;

      const costMinor = this.calculateCostMinor(inputTokens, outputTokens);

      return {
        rawOutput: content,
        rawInput: JSON.stringify(payload),
        inputTokens,
        outputTokens,
        cachedTokens,
        latencyMs,
        costMinor,
        costCurrency: 'USD',
        costScale: 6,
        modelVersion: this.modelVersion,
        promptTemplateId,
        promptRevision
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
