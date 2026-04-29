import { FlightRecorder } from '../sdks/typescript/src/index';

const recorder = new FlightRecorder('http://localhost:3001/api');

async function myFakeLlm(prompt: string) {
  console.log(`Calling LLM with prompt: ${prompt}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return "This is a fake response from the LLM.";
}

async function myFakeTool(name: string, args: any) {
  console.log(`Calling tool ${name} with args`, args);
  await new Promise(resolve => setTimeout(resolve, 200));
  return { status: "success", result: 42 };
}

async function runAgent() {
  console.log("Starting agent run...");
  
  await recorder.withRun({ name: "TS Test Agent Run", model: "gpt-4", tags: ["test", "ts-example"] }, async (r) => {
    // Step 1: LLM Call
    const prompt1 = "What is the meaning of life?";
    const start1 = Date.now();
    const response1 = await myFakeLlm(prompt1);
    const duration1 = Date.now() - start1;
    await r.recordLlmCall({
      prompt: prompt1,
      response: response1,
      model: "gpt-4",
      duration: duration1
    });

    // Step 2: Tool Call
    const toolName = "calculator";
    const toolArgs = { expression: "21 * 2" };
    const startTool = Date.now();
    const toolResult = await myFakeTool(toolName, toolArgs);
    const durationTool = Date.now() - startTool;
    await r.recordToolCall({
      name: toolName,
      args: toolArgs,
      result: toolResult,
      duration: durationTool
    });

    // Step 3: Another LLM Call
    const prompt2 = `The tool returned ${JSON.stringify(toolResult)}. What's next?`;
    const start2 = Date.now();
    const response2 = await myFakeLlm(prompt2);
    const duration2 = Date.now() - start2;
    await r.recordLlmCall({
      prompt: prompt2,
      response: response2,
      model: "gpt-4",
      duration: duration2
    });
  });

  console.log("Agent run complete!");
}

runAgent().catch(console.error);
