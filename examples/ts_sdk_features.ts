import { FlightRecorder, wrapOpenAI, wrapAnthropic } from '../sdks/typescript/src/index';

// Mocking OpenAI and Anthropic for demonstration without actual API keys
const mockOpenAI = {
  chat: {
    completions: {
      create: async (params: any) => {
        console.log(`[Mock OpenAI] Creating completion for model: ${params.model}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          choices: [{ message: { content: "This is a mocked OpenAI response." } }],
          usage: { total_tokens: 10 }
        };
      }
    }
  }
};

const mockAnthropic = {
  messages: {
    create: async (params: any) => {
      console.log(`[Mock Anthropic] Creating message for model: ${params.model}`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        content: [{ text: "This is a mocked Anthropic response." }],
        usage: { input_tokens: 5, output_tokens: 5 }
      };
    }
  }
};

const recorder = new FlightRecorder('http://localhost:3001/api');

async function runDemo() {
  console.log("--- Starting TS SDK Features Demo ---");

  // 1. Wrap OpenAI
  wrapOpenAI(mockOpenAI as any, recorder);
  
  // 2. Wrap Anthropic
  wrapAnthropic(mockAnthropic as any, recorder);

  let runId: string = '';

  console.log("\n1. Recording a new run with auto-instrumentation...");
  await recorder.withRun({ name: "TS Features Demo", model: "multi-model", tags: ["demo"] }, async (run) => {
    runId = run.runId!;
    
    // This call is automatically recorded via wrapOpenAI
    await (mockOpenAI as any).chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello from OpenAI!" }]
    });

    // This call is automatically recorded via wrapAnthropic
    await (mockAnthropic as any).messages.create({
      model: "claude-3-opus",
      messages: [{ role: "user", content: "Hello from Anthropic!" }]
    });

    // Manual tool recording
    await run.recordToolCall({
      name: "get_weather",
      args: { city: "San Francisco" },
      result: { temp: 72, unit: "F" },
      duration: 50
    });
  });

  console.log(`Run complete! ID: ${runId}`);

  // 3. Replay the run using the low-level replay() method
  console.log("\n2. Replaying the run with low-level handlers...");
  await recorder.replay(runId, {
    onLlmCall: async (step) => {
      const promptStr = typeof step.payload.prompt === 'string' 
        ? step.payload.prompt 
        : JSON.stringify(step.payload.prompt);
      console.log(`   [Replay] LLM Call to ${step.payload.model}: ${promptStr.substring(0, 50)}...`);
      // In a real replay, you might call the LLM again or return cached data
      return `Replayed response for: ${promptStr.substring(0, 20)}...`;
    },
    onToolCall: async (step) => {
      console.log(`   [Replay] Tool Call: ${step.payload.name}`);
      return { ...step.payload.result, replayed: true };
    }
  });

  // 4. Replay using the higher-level ReplayAdapter
  console.log("\n3. Replaying the run using ReplayAdapter (simpler!)...");
  const adapter = recorder.createReplayAdapter({
    llm: async (prompt, model) => {
      console.log(`   [Adapter] Re-executing LLM for ${model}`);
      return "Response from ReplayAdapter";
    },
    tools: {
      get_weather: async (args) => {
        console.log(`   [Adapter] Re-executing tool get_weather with`, args);
        return { temp: 42, unit: "C", note: "Replayed via adapter" };
      }
    }
  });

  await recorder.replay(runId, adapter);

  console.log("\nDemo complete! Check the UI at http://localhost:3000 to see the results.");
}

runDemo().catch(console.error);
