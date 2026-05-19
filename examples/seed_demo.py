import time
import random
from agent_flight_recorder import FlightRecorder

def seed_demo():
    recorder = FlightRecorder("http://localhost:3001/api")
    
    print("🚀 Seeding demo run...")
    
    with recorder.run(name="Demo: Market Analysis Agent", model="gpt-4", tags=["demo", "finance"]):
        # Step 1: Planning
        print("Step 1: Planning...")
        recorder.record_system_event("planning", {"task": "Analyze NVIDIA stock performance"})
        time.sleep(0.5)
        
        # Step 2: Tool Call - Search
        print("Step 2: Searching...")
        recorder.record_tool_call(
            name="google_search",
            args={"query": "NVDA stock price news May 2026"},
            result={
                "price": "1,245.50",
                "change": "+2.3%",
                "news": "NVIDIA announces new Blackwell Ultra chips."
            },
            duration=850
        )
        time.sleep(0.8)
        
        # Step 3: LLM Call - Analysis
        print("Step 3: Analyzing...")
        recorder.record_llm_call(
            prompt=[
                {"role": "system", "content": "You are a financial analyst."},
                {"role": "user", "content": "Analyze the latest NVDA news."}
            ],
            response={
                "content": "NVIDIA's momentum continues with the Blackwell Ultra announcement. The market is pricing in sustained AI demand.",
                "role": "assistant"
            },
            model="gpt-4",
            duration=2400
        )
        time.sleep(0.4)
        
        # Step 4: Tool Call - Chart generation
        print("Step 4: Generating chart...")
        recorder.record_tool_call(
            name="generate_chart",
            args={"type": "line", "data": [1100, 1150, 1200, 1245]},
            result={"image_url": "https://raw.githubusercontent.com/gencersarp/agent-flight-recorder/main/media/demo-chart.png"},
            duration=1200
        )
        
        # Step 5: Final Answer
        print("Step 5: Finalizing...")
        recorder.record_llm_call(
            prompt="Summarize findings.",
            response="NVDA is a strong buy based on current momentum and technical breakthroughs.",
            model="gpt-4",
            duration=1100
        )

    print("✅ Demo run recorded! Check the UI at http://localhost:3000")

if __name__ == "__main__":
    seed_demo()
