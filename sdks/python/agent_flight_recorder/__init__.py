import os
import requests
import uuid
import time
import functools
from contextlib import contextmanager
from typing import Optional, Dict, Any, List, Callable


class FlightRecorder:
    """
    The core recorder class for LLM agents.
    """
    def __init__(self, api_url: str = None):
        """
        Create a new FlightRecorder instance.
        :param api_url: The URL of the backend API.
        """
        self.api_url = api_url or os.getenv("FLIGHT_RECORDER_API_URL", "http://localhost:3001/api")
        self.current_run_id = None
        self._api_key = os.getenv("AFR_API_KEY")

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def start_run(self, name: str = None, model: str = None, temperature: float = None,
                  metadata: Dict = None, tags: List[str] = None) -> Optional[str]:
        """
        Start a new recording run.
        :returns: The run ID, or None if the start failed.
        """
        payload = {
            "name": name,
            "model": model,
            "temperature": temperature,
            "metadata": metadata,
            "tags": tags,
        }
        try:
            response = requests.post(
                f"{self.api_url}/runs/start",
                json=payload,
                headers=self._headers(),
                timeout=5,
            )
            response.raise_for_status()
            self.current_run_id = response.json()["run_id"]
            return self.current_run_id
        except Exception as e:
            print(f"Warning: Failed to start run: {e}")
            return None

    def record_step(self, type: str, payload: Dict, duration: int = None,
                    timestamp: str = None) -> Optional[str]:
        """
        Record a single step in the current run.
        :returns: The step ID, or None if the recording failed.
        """
        if not self.current_run_id:
            return None

        step_data = {
            "type": type,
            "payload": payload,
            "duration": duration,
            "timestamp": timestamp,
        }
        try:
            response = requests.post(
                f"{self.api_url}/runs/{self.current_run_id}/step",
                json=step_data,
                headers=self._headers(),
                timeout=5,
            )
            response.raise_for_status()
            return response.json()["step_id"]
        except Exception as e:
            print(f"Warning: Failed to record step: {e}")
            return None

    def finish_run(self, status: str = "success", metadata: Dict = None):
        """
        Finish the current recording run.
        """
        if not self.current_run_id:
            return

        payload = {
            "status": status,
            "metadata": metadata,
        }
        try:
            response = requests.post(
                f"{self.api_url}/runs/{self.current_run_id}/finish",
                json=payload,
                headers=self._headers(),
                timeout=5,
            )
            response.raise_for_status()
            self.current_run_id = None
        except Exception as e:
            print(f"Warning: Failed to finish run: {e}")

    @contextmanager
    def run(self, name: str = None, model: str = None, temperature: float = None,
            metadata: Dict = None, tags: List[str] = None):
        """
        Context manager to record a block of code as a single run.
        """
        self.start_run(name, model, temperature, metadata, tags)
        try:
            yield self
        except Exception as e:
            self.finish_run(status="error", metadata={"error": str(e)})
            raise
        else:
            self.finish_run()

    def record_llm_call(self, prompt: Any, response: Any, model: str = None,
                        duration: int = None) -> Optional[str]:
        """
        Record a specific LLM_CALL step.
        """
        payload = {
            "prompt": prompt,
            "response": response,
            "model": model,
        }
        return self.record_step("LLM_CALL", payload, duration)

    def record_tool_call(self, name: str, args: Dict, result: Any,
                         duration: int = None) -> Optional[str]:
        """
        Record a specific TOOL_CALL step.
        """
        payload = {
            "name": name,
            "args": args,
            "result": result,
        }
        return self.record_step("TOOL_CALL", payload, duration)

    def record_system_event(self, event: str, details: Any = None,
                            duration: int = None) -> Optional[str]:
        """
        Record a SYSTEM_EVENT step (e.g. context-window flush, tool-use
        limit reached, agent restart, guardrail trigger).

        :param event:   Short label for the event type (e.g. "context_flush").
        :param details: Optional structured metadata about the event.
        """
        payload: Dict[str, Any] = {"event": event}
        if details is not None:
            payload["details"] = details
        return self.record_step("SYSTEM_EVENT", payload, duration)

    def record_state_snapshot(self, name: str, state: Dict[str, Any]) -> Optional[str]:
        """
        Record a STATE_SNAPSHOT step.
        """
        return self.record_step("STATE_SNAPSHOT", {"name": name, "state": state})

    def replay(self, run_id: str, on_llm_call: Callable = None,
               on_tool_call: Callable = None, handlers: Dict[str, Callable] = None) -> Optional[str]:
        """
        Replay a previous run. Fetches the steps from the original run and
        allows re-executing them via provided handlers.

        :param run_id:      The original run ID to replay.
        :param on_llm_call: Callback for LLM_CALL steps.
        :param on_tool_call: Callback for TOOL_CALL steps.
        :param handlers:    A dictionary containing on_llm_call and/or on_tool_call.
        :returns:           The new run ID, or None if failed.
        """
        # Merge handlers
        h_llm = on_llm_call or (handlers.get("on_llm_call") if handlers else None)
        h_tool = on_tool_call or (handlers.get("on_tool_call") if handlers else None)

        try:
            # 1. Trigger replay on backend (mode=live creates a shell run)
            response = requests.post(
                f"{self.api_url}/runs/{run_id}/replay?mode=live",
                headers=self._headers(),
                timeout=10,
            )
            response.raise_for_status()
            replay_data = response.json()
            new_run_id = replay_data["run_id"]

            # 2. Fetch original steps
            steps_res = requests.get(
                f"{self.api_url}/runs/{run_id}/steps",
                headers=self._headers(),
                timeout=10,
            )
            steps_res.raise_for_status()
            original_steps = steps_res.json()

            # 3. Set current run ID so recordings go to the new run
            self.current_run_id = new_run_id

            # 4. Iterate and replay
            for step in original_steps:
                if step["type"] == "LLM_CALL" and h_llm:
                    h_llm(step)
                elif step["type"] == "TOOL_CALL" and h_tool:
                    h_tool(step)

            self.finish_run(status="success")
            return new_run_id
        except Exception as e:
            print(f"Warning: Replay failed: {e}")
            return None

    def create_replay_adapter(self, llm: Callable = None, tools: Dict[str, Callable] = None,
                               use_original_results: bool = False):
        """
        Creates a high-level replay adapter that simplifies swapping LLM and tool
        implementations during a replay.
        """
        def on_llm_call(step):
            payload = step.get("payload", {})
            prompt = payload.get("prompt")
            model = payload.get("model")
            original_response = payload.get("response")

            if llm:
                response = llm(prompt, model)
                self.record_llm_call(prompt=prompt, response=response, model=model)
                return response
            elif use_original_results:
                self.record_llm_call(prompt=prompt, response=original_response, model=model)
                return original_response

        def on_tool_call(step):
            payload = step.get("payload", {})
            name = payload.get("name")
            args = payload.get("args")
            original_result = payload.get("result")

            tool_fn = tools.get(name) if tools else None
            if tool_fn:
                result = tool_fn(args)
                self.record_tool_call(name=name, args=args, result=result)
                return result
            elif use_original_results:
                self.record_tool_call(name=name, args=args, result=original_result)
                return original_result

        return {
            "on_llm_call": on_llm_call,
            "on_tool_call": on_tool_call,
        }


# ---------------------------------------------------------------------------
# OpenAI wrapper (item 15)
# ---------------------------------------------------------------------------
def wrap_openai(client, recorder: FlightRecorder = None):
    """
    Monkey-patch an OpenAI client so all chat.completions.create calls
    are automatically recorded as LLM_CALL steps.

    Usage:
        from openai import OpenAI
        from agent_flight_recorder import FlightRecorder, wrap_openai

        client = OpenAI()
        recorder = FlightRecorder()
        wrap_openai(client, recorder)

        with recorder.run(name="My run", model="gpt-4"):
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "Hello"}]
            )
            # ^ automatically recorded as LLM_CALL step
    """
    if recorder is None:
        recorder = _default_recorder

    # Patch chat.completions.create
    if not hasattr(client, "chat") or not hasattr(client.chat, "completions"):
        print("Warning: wrap_openai expects an OpenAI client with chat.completions")
        return client

    original_create = client.chat.completions.create

    @functools.wraps(original_create)
    def patched_create(*args, **kwargs):
        start_time = time.time()
        error_msg = None
        result = None
        try:
            result = original_create(*args, **kwargs)
            return result
        except Exception as e:
            error_msg = str(e)
            raise
        finally:
            duration_ms = int((time.time() - start_time) * 1000)
            # Extract relevant info
            messages = kwargs.get("messages", args[0] if args else None)
            model = kwargs.get("model", None)

            response_data = None
            if result is not None:
                try:
                    # Handle ChatCompletion object
                    if hasattr(result, "choices") and result.choices:
                        choice = result.choices[0]
                        response_data = {
                            "content": getattr(choice.message, "content", None),
                            "role": getattr(choice.message, "role", None),
                            "finish_reason": getattr(choice, "finish_reason", None),
                        }
                        if hasattr(result, "usage") and result.usage:
                            response_data["usage"] = {
                                "prompt_tokens": getattr(result.usage, "prompt_tokens", None),
                                "completion_tokens": getattr(result.usage, "completion_tokens", None),
                                "total_tokens": getattr(result.usage, "total_tokens", None),
                            }
                    elif hasattr(result, "model_dump"):
                        response_data = result.model_dump()
                    else:
                        response_data = str(result)
                except Exception:
                    response_data = str(result)

            if error_msg is not None:
                response_data = {"error": error_msg}

            recorder.record_llm_call(
                prompt=messages,
                response=response_data,
                model=model,
                duration=duration_ms,
            )

    client.chat.completions.create = patched_create
    return client


# ---------------------------------------------------------------------------
# Anthropic wrapper
# ---------------------------------------------------------------------------
def wrap_anthropic(client, recorder: "FlightRecorder" = None):
    """
    Monkey-patch an Anthropic client so all messages.create calls are
    automatically recorded as LLM_CALL steps.

    Usage:
        import anthropic
        from agent_flight_recorder import FlightRecorder, wrap_anthropic

        client = anthropic.Anthropic()
        recorder = FlightRecorder()
        wrap_anthropic(client, recorder)

        with recorder.run(name="My run", model="claude-3-5-sonnet-20241022"):
            msg = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": "Hello"}],
            )
            # ^ automatically recorded as LLM_CALL step
    """
    if recorder is None:
        recorder = _default_recorder

    if not hasattr(client, "messages") or not hasattr(client.messages, "create"):
        print("Warning: wrap_anthropic expects an Anthropic client with messages.create")
        return client

    original_create = client.messages.create

    @functools.wraps(original_create)
    def patched_create(*args, **kwargs):
        start_time = time.time()
        error_msg = None
        result = None
        try:
            result = original_create(*args, **kwargs)
            return result
        except Exception as e:
            error_msg = str(e)
            raise
        finally:
            duration_ms = int((time.time() - start_time) * 1000)
            messages = kwargs.get("messages", args[0] if args else None)
            model = kwargs.get("model", None)

            response_data = None
            if result is not None:
                try:
                    content_text = None
                    if hasattr(result, "content") and result.content:
                        block = result.content[0]
                        content_text = getattr(block, "text", None)
                    usage = None
                    if hasattr(result, "usage") and result.usage:
                        usage = {
                            "input_tokens": getattr(result.usage, "input_tokens", None),
                            "output_tokens": getattr(result.usage, "output_tokens", None),
                        }
                    response_data = {
                        "content": content_text,
                        "stop_reason": getattr(result, "stop_reason", None),
                        "usage": usage,
                    }
                except Exception:
                    response_data = str(result)

            if error_msg is not None:
                response_data = {"error": error_msg}

            recorder.record_llm_call(
                prompt=messages,
                response=response_data,
                model=model,
                duration=duration_ms,
            )

    client.messages.create = patched_create
    return client


# ---------------------------------------------------------------------------
# @record decorator (item 15)
# ---------------------------------------------------------------------------
def record(name: str = None, recorder: FlightRecorder = None, step_type: str = "TOOL_CALL"):
    """
    Decorator to automatically record a function call as a step.

    Usage:
        @record(name="fetch_weather")
        def fetch_weather(city: str) -> dict:
            return {"temp": 72, "city": city}

        # When called inside a recorder.run() context, the call is recorded
        # as a TOOL_CALL step with args and result.
    """
    if recorder is None:
        recorder_ref = [None]  # Use list for closure mutability
    else:
        recorder_ref = [recorder]

    def decorator(fn: Callable) -> Callable:
        fn_name = name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            rec = recorder_ref[0] or _default_recorder
            start_time = time.time()
            error_msg = None
            result = None
            try:
                result = fn(*args, **kwargs)
                return result
            except Exception as e:
                error_msg = str(e)
                raise
            finally:
                duration_ms = int((time.time() - start_time) * 1000)
                # Serialize args safely
                try:
                    safe_args = {"args": list(args), "kwargs": kwargs}
                except Exception:
                    safe_args = {"args": str(args), "kwargs": str(kwargs)}

                if error_msg is not None:
                    payload = {"name": fn_name, "args": safe_args, "error": error_msg}
                else:
                    try:
                        payload = {"name": fn_name, "args": safe_args, "result": result}
                    except Exception:
                        payload = {"name": fn_name, "args": safe_args, "result": str(result)}

                rec.record_step(step_type, payload, duration_ms)

        return wrapper
    return decorator


# ---------------------------------------------------------------------------
# Module-level convenience functions (singleton)
# ---------------------------------------------------------------------------
_default_recorder = FlightRecorder()


def start_run(*args, **kwargs):
    return _default_recorder.start_run(*args, **kwargs)


def record_step(*args, **kwargs):
    return _default_recorder.record_step(*args, **kwargs)


def finish_run(*args, **kwargs):
    return _default_recorder.finish_run(*args, **kwargs)


@contextmanager
def run(*args, **kwargs):
    with _default_recorder.run(*args, **kwargs) as r:
        yield r


def record_llm_call(*args, **kwargs):
    return _default_recorder.record_llm_call(*args, **kwargs)


def record_tool_call(*args, **kwargs):
    return _default_recorder.record_tool_call(*args, **kwargs)


def record_system_event(*args, **kwargs):
    return _default_recorder.record_system_event(*args, **kwargs)


def record_state_snapshot(*args, **kwargs):
    return _default_recorder.record_state_snapshot(*args, **kwargs)


def replay(*args, **kwargs):
    return _default_recorder.replay(*args, **kwargs)


def create_replay_adapter(*args, **kwargs):
    return _default_recorder.create_replay_adapter(*args, **kwargs)
