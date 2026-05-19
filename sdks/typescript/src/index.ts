export type StepType =
  | "LLM_CALL"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "SYSTEM_EVENT"
  | "STATE_SNAPSHOT";

export interface StartRunOptions {
  name?: string;
  model?: string;
  temperature?: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface StepOptions {
  type: StepType;
  payload: Record<string, any>;
  duration?: number;
  timestamp?: string;
}

export interface FinishRunOptions {
  status: string;
  metadata?: Record<string, any>;
}

export interface LlmCallOptions {
  prompt: any;
  response: any;
  model?: string;
  duration?: number;
}

export interface ToolCallOptions {
  name: string;
  args: Record<string, any>;
  result: any;
  duration?: number;
}

/**
 * The core recorder class for LLM agents.
 */
export class FlightRecorder {
  private apiUrl: string;
  private currentRunId: string | null = null;
  private apiKey: string | null = null;

  /**
   * Create a new FlightRecorder instance.
   * @param apiUrl - The URL of the backend API (e.g. "http://localhost:3001/api").
   * @param apiKey - Optional API key for authentication.
   */
  constructor(apiUrl?: string, apiKey?: string) {
    this.apiUrl =
      apiUrl ||
      (typeof process !== "undefined" && process.env?.FLIGHT_RECORDER_API_URL) ||
      "http://localhost:3001/api";
    this.apiKey =
      apiKey ||
      (typeof process !== "undefined" && process.env?.AFR_API_KEY) ||
      null;
  }

  /**
   * Get the current run ID, if any.
   */
  get runId(): string | null {
    return this.currentRunId;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  /**
   * Start a new recording run.
   * @param options - Configuration for the run (name, model, tags, etc.)
   * @returns The run ID, or null if the start failed.
   */
  async startRun(options: StartRunOptions = {}): Promise<string | null> {
    try {
      const res = await fetch(`${this.apiUrl}/runs/start`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.currentRunId = data.run_id;
      return this.currentRunId;
    } catch (e) {
      console.warn(`FlightRecorder: Failed to start run: ${e}`);
      return null;
    }
  }

  /**
   * Record a single step in the current run.
   * @param options - Step data (type, payload, duration, etc.)
   * @returns The step ID, or null if the recording failed.
   */
  async recordStep(options: StepOptions): Promise<string | null> {
    if (!this.currentRunId) return null;
    try {
      const res = await fetch(
        `${this.apiUrl}/runs/${this.currentRunId}/step`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(options),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.step_id;
    } catch (e) {
      console.warn(`FlightRecorder: Failed to record step: ${e}`);
      return null;
    }
  }

  /**
   * Finish the current recording run.
   * @param options - Run finish data (status, final metadata, etc.)
   */
  async finishRun(
    options: FinishRunOptions = { status: "success" }
  ): Promise<void> {
    if (!this.currentRunId) return;
    try {
      const res = await fetch(
        `${this.apiUrl}/runs/${this.currentRunId}/finish`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(options),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.currentRunId = null;
    } catch (e) {
      console.warn(`FlightRecorder: Failed to finish run: ${e}`);
    }
  }

  /**
   * Record a specific LLM_CALL step.
   * @param options - LLM call details (prompt, response, model, duration).
   * @returns The step ID, or null if failed.
   */
  async recordLlmCall(options: LlmCallOptions): Promise<string | null> {
    return this.recordStep({
      type: "LLM_CALL",
      payload: {
        prompt: options.prompt,
        response: options.response,
        model: options.model,
      },
      duration: options.duration,
    });
  }

  /**
   * Record a specific TOOL_CALL step.
   * @param options - Tool call details (name, args, result, duration).
   * @returns The step ID, or null if failed.
   */
  async recordToolCall(options: ToolCallOptions): Promise<string | null> {
    return this.recordStep({
      type: "TOOL_CALL",
      payload: {
        name: options.name,
        args: options.args,
        result: options.result,
      },
      duration: options.duration,
    });
  }

  /**
   * Record a STATE_SNAPSHOT step.
   * @param name - A name for the state snapshot.
   * @param state - The state object to record.
   * @returns The step ID, or null if failed.
   */
  async recordStateSnapshot(
    name: string,
    state: Record<string, any>
  ): Promise<string | null> {
    return this.recordStep({
      type: "STATE_SNAPSHOT",
      payload: { name, state },
    });
  }

  /**
   * Run a block of code within a recorded run. Automatically starts and
   * finishes the run, marking it as "error" if the function throws.
   */
  async withRun<T>(
    options: StartRunOptions,
    fn: (recorder: FlightRecorder) => Promise<T>
  ): Promise<T> {
    await this.startRun(options);
    try {
      const result = await fn(this);
      await this.finishRun({ status: "success" });
      return result;
    } catch (e) {
      await this.finishRun({
        status: "error",
        metadata: { error: String(e) },
      });
      throw e;
    }
  }

  /**
   * Wrap an async function so that its execution is automatically recorded
   * as a step of the given type.
   */
  wrap<TArgs extends any[], TResult>(
    type: StepType,
    name: string,
    fn: (...args: TArgs) => Promise<TResult>
  ): (...args: TArgs) => Promise<TResult> {
    const recorder = this;
    return async function (...args: TArgs): Promise<TResult> {
      const start = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - start;
        await recorder.recordStep({
          type,
          payload: { name, args, result },
          duration,
        });
        return result;
      } catch (e) {
        const duration = Date.now() - start;
        await recorder.recordStep({
          type,
          payload: { name, args, error: String(e) },
          duration,
        });
        throw e;
      }
    };
  }

  /**
   * Replay a previous run. Fetches the steps from the original run and
   * allows re-executing them via provided handlers.
   *
   * @param runId - The original run ID to replay.
   * @param handlers - Callbacks for each step type. Return the result of the re-execution.
   */
  async replay(
    runId: string,
    handlers: {
      onLlmCall?: (step: any) => Promise<any>;
      onToolCall?: (step: any) => Promise<any>;
    }
  ): Promise<string | null> {
    try {
      // 1. Trigger replay on backend (creates a new run shell)
      const res = await fetch(`${this.apiUrl}/runs/${runId}/replay?mode=live`, {
        method: "POST",
        headers: this.headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const replayData = await res.json();
      const newRunId = replayData.run_id;

      // 2. Fetch original steps to know what to replay
      const stepsRes = await fetch(`${this.apiUrl}/runs/${runId}/steps`, {
        headers: this.headers(),
      });
      const originalSteps = await stepsRes.json();

      // 3. Set the current run ID to the new one so recordings go there
      this.currentRunId = newRunId;

      // 4. Iterate and replay
      for (const step of originalSteps) {
        if (step.type === "LLM_CALL" && handlers.onLlmCall) {
          await handlers.onLlmCall(step);
        } else if (step.type === "TOOL_CALL" && handlers.onToolCall) {
          await handlers.onToolCall(step);
        }
      }

      await this.finishRun({ status: "success" });
      return newRunId;
    } catch (e) {
      console.warn(`FlightRecorder: Replay failed: ${e}`);
      return null;
    }
  }

  /**
   * Creates a high-level replay adapter that simplifies swapping LLM and tool
   * implementations during a replay.
   */
  createReplayAdapter(options: {
    llm?: (prompt: any, model?: string) => Promise<any>;
    tools?: Record<string, (args: any) => Promise<any>>;
    useOriginalResults?: boolean;
  }) {
    return {
      onLlmCall: async (step: any) => {
        if (options.llm) {
          const response = await options.llm(
            step.payload.prompt,
            step.payload.model
          );
          await this.recordLlmCall({
            prompt: step.payload.prompt,
            response,
            model: step.payload.model,
          });
          return response;
        }
        if (options.useOriginalResults) {
          await this.recordLlmCall({
            prompt: step.payload.prompt,
            response: step.payload.response,
            model: step.payload.model,
          });
          return step.payload.response;
        }
      },
      onToolCall: async (step: any) => {
        const toolFn = options.tools?.[step.payload.name];
        if (toolFn) {
          const result = await toolFn(step.payload.args);
          await this.recordToolCall({
            name: step.payload.name,
            args: step.payload.args,
            result,
          });
          return result;
        }
        if (options.useOriginalResults) {
          await this.recordToolCall({
            name: step.payload.name,
            args: step.payload.args,
            result: step.payload.result,
          });
          return step.payload.result;
        }
      },
    };
  }

  /**
   * Convenience method to create a recorder and wrap an OpenAI client in one go.
   */
  static autoOpenAI(client: any, apiUrl?: string): FlightRecorder {
    const rec = new FlightRecorder(apiUrl);
    wrapOpenAI(client, rec);
    return rec;
  }

  /**
   * Convenience method to create a recorder and wrap an Anthropic client in one go.
   */
  static autoAnthropic(client: any, apiUrl?: string): FlightRecorder {
    const rec = new FlightRecorder(apiUrl);
    wrapAnthropic(client, rec);
    return rec;
  }
}

// ---------------------------------------------------------------------------
// wrapFetch (item 16)
// ---------------------------------------------------------------------------

/** URLs that look like LLM API endpoints */
const LLM_URL_PATTERNS = [
  /api\.openai\.com\/v1\/chat\/completions/,
  /api\.anthropic\.com/,
  /generativelanguage\.googleapis\.com/,
  /api\.cohere\.ai/,
  /api\.mistral\.ai/,
];

/**
 * Wraps globalThis.fetch to automatically record requests to known LLM API
 * endpoints as LLM_CALL steps.
 *
 * Returns a cleanup function that restores the original fetch.
 */
export function wrapFetch(recorder: FlightRecorder): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any).url || "";
    const isLlmCall = LLM_URL_PATTERNS.some((p) => p.test(url));

    if (!isLlmCall || !recorder.runId) {
      return originalFetch(input, init);
    }

    const start = Date.now();
    let responseBody: any = null;
    let errorMsg: string | null = null;

    try {
      const res = await originalFetch(input, init);
      const duration = Date.now() - start;

      // Clone so we can read body without consuming
      const cloned = res.clone();
      try {
        responseBody = await cloned.json();
      } catch {
        responseBody = await cloned.text();
      }

      let requestBody: any = null;
      if (init?.body) {
        try {
          requestBody = JSON.parse(init.body as string);
        } catch {
          requestBody = String(init.body);
        }
      }

      await recorder.recordStep({
        type: "LLM_CALL",
        payload: {
          url,
          prompt: requestBody?.messages || requestBody,
          response: responseBody,
          model: requestBody?.model,
          status: res.status,
        },
        duration,
      });

      return res;
    } catch (e) {
      const duration = Date.now() - start;
      errorMsg = String(e);

      let requestBody: any = null;
      if (init?.body) {
        try {
          requestBody = JSON.parse(init.body as string);
        } catch {
          requestBody = String(init.body);
        }
      }

      await recorder.recordStep({
        type: "LLM_CALL",
        payload: {
          url,
          prompt: requestBody?.messages || requestBody,
          error: errorMsg,
          model: requestBody?.model,
        },
        duration,
      });

      throw e;
    }
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

// ---------------------------------------------------------------------------
// wrapOpenAI (item 16)
// ---------------------------------------------------------------------------

/**
 * Monkey-patches an OpenAI client's chat.completions.create to automatically
 * record calls as LLM_CALL steps.
 *
 * Works with the official `openai` npm package (v4+).
 */
export function wrapOpenAI(client: any, recorder: FlightRecorder): void {
  if (!client?.chat?.completions?.create) {
    console.warn("wrapOpenAI: client does not have chat.completions.create");
    return;
  }

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = async function (
    params: any,
    options?: any
  ): Promise<any> {
    const start = Date.now();
    let result: any = null;
    let errorMsg: string | null = null;

    try {
      result = await originalCreate(params, options);
      return result;
    } catch (e) {
      errorMsg = String(e);
      throw e;
    } finally {
      const duration = Date.now() - start;

      let responseData: any;
      if (result) {
        try {
          responseData = {
            content: result.choices?.[0]?.message?.content,
            role: result.choices?.[0]?.message?.role,
            finish_reason: result.choices?.[0]?.finish_reason,
            usage: result.usage
              ? {
                  prompt_tokens: result.usage.prompt_tokens,
                  completion_tokens: result.usage.completion_tokens,
                  total_tokens: result.usage.total_tokens,
                }
              : undefined,
          };
        } catch {
          responseData = result;
        }
      }

      if (errorMsg) {
        responseData = { error: errorMsg };
      }

      await recorder.recordStep({
        type: "LLM_CALL",
        payload: {
          prompt: params.messages,
          response: responseData,
          model: params.model,
        },
        duration,
      });
    }
  };
}

/**
 * Monkey-patches an Anthropic client's messages.create to automatically
 * record calls as LLM_CALL steps.
 *
 * Works with the official `@anthropic-ai/sdk` npm package.
 */
export function wrapAnthropic(client: any, recorder: FlightRecorder): void {
  if (!client?.messages?.create) {
    console.warn("wrapAnthropic: client does not have messages.create");
    return;
  }

  const originalCreate = client.messages.create.bind(client.messages);

  client.messages.create = async function (
    params: any,
    options?: any
  ): Promise<any> {
    const start = Date.now();
    let result: any = null;
    let errorMsg: string | null = null;

    try {
      result = await originalCreate(params, options);
      return result;
    } catch (e) {
      errorMsg = String(e);
      throw e;
    } finally {
      const duration = Date.now() - start;

      let responseData: any;
      if (result) {
        try {
          responseData = {
            content: result.content?.[0]?.text,
            role: result.role,
            stop_reason: result.stop_reason,
            usage: result.usage
              ? {
                  input_tokens: result.usage.input_tokens,
                  output_tokens: result.usage.output_tokens,
                }
              : undefined,
          };
        } catch {
          responseData = result;
        }
      }

      if (errorMsg) {
        responseData = { error: errorMsg };
      }

      await recorder.recordStep({
        type: "LLM_CALL",
        payload: {
          prompt: params.messages,
          response: responseData,
          model: params.model,
        },
        duration,
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Default singleton instance + convenience exports
// ---------------------------------------------------------------------------
const defaultRecorder = new FlightRecorder();

export async function startRun(
  options?: StartRunOptions
): Promise<string | null> {
  return defaultRecorder.startRun(options);
}

export async function recordStep(
  options: StepOptions
): Promise<string | null> {
  return defaultRecorder.recordStep(options);
}

export async function finishRun(options?: FinishRunOptions): Promise<void> {
  return defaultRecorder.finishRun(options);
}

export async function recordLlmCall(
  options: LlmCallOptions
): Promise<string | null> {
  return defaultRecorder.recordLlmCall(options);
}

export async function recordToolCall(
  options: ToolCallOptions
): Promise<string | null> {
  return defaultRecorder.recordToolCall(options);
}

export async function recordStateSnapshot(
  name: string,
  state: Record<string, any>
): Promise<string | null> {
  return defaultRecorder.recordStateSnapshot(name, state);
}

export default FlightRecorder;
