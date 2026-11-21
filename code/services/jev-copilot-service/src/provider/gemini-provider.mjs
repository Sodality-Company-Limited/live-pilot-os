import { InferenceProviderInterface } from './provider-interface.mjs';

/**
 * Concrete Gemini-compatible Provider implementation.
 * Performs direct operational inference with environment key validation.
 */
export class GeminiProvider extends InferenceProviderInterface {
  /**
   * @param {object} options
   * @param {string} [options.apiKey] - Google AI API Key (defaults to process.env.GEMINI_API_KEY)
   * @param {string} [options.modelVersion] - Model ID (e.g. 'gemini-1.5-flash', 'gemini-2.0-flash')
   * @param {string} [options.endpoint] - API endpoint base
   * @param {Function} [options.fetchFn] - Custom fetch function for runtime testing/injection
   */
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.modelVersion = options.modelVersion || 'gemini-1.5-flash';
    this.endpoint = options.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
    this.fetchFn = options.fetchFn || globalThis.fetch;
    // Per million tokens pricing in USD micro-units (scale 6: 1 USD = 1,000,000 minor units)
    // gemini-1.5-flash: input = $0.075 / 1M = 75,000 minor, output = $0.300 / 1M = 300,000 minor
    this.inputCostPer1M = options.inputCostPer1M ?? 75000n;
    this.outputCostPer1M = options.outputCostPer1M ?? 300000n;
  }

  get name() {
    return 'gemini';
  }

  /**
   * Validate configuration and readiness.
   */
  validateReady() {
    if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim().length === 0) {
      throw new Error('PROVIDER_CONFIG_ERROR: GEMINI_API_KEY is not configured');
    }
  }

  /**
   * Calculate cost in minor units (scale 6, USD) using integer math.
   * cost_minor = (inputTokens * inputCostPer1M + outputTokens * outputCostPer1M) / 1,000,000
   */
  calculateCostMinor(inputTokens, outputTokens) {
    const inputTotal = BigInt(inputTokens) * this.inputCostPer1M;
    const outputTotal = BigInt(outputTokens) * this.outputCostPer1M;
    const numerator = inputTotal + outputTotal;
    const divisor = 1000000n;
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

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    const startTime = Date.now();
    try {
      const url = `${this.endpoint}/models/${this.modelVersion}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens,
          temperature: 0.1
        }
      };

      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata || {};
      const inputTokens = usage.promptTokenCount ?? 0;
      const outputTokens = usage.candidatesTokenCount ?? 0;
      const cachedTokens = usage.cachedContentTokenCount ?? 0;

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
