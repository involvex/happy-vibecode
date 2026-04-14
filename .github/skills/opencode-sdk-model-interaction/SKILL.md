---
name: opencode-sdk-model-interaction
description: Implement and debug model interactions using the OpenCode SDK API. Use when prompts mention OpenCode, opencode.ai SDK docs, model calls, chat/completions, streaming output, provider configuration, tool calling, token limits, retries, or API integration patterns.
argument-hint: What OpenCode model interaction should be built, fixed, or reviewed?
user-invocable: true
disable-model-invocation: false
---

# OpenCode SDK Model Interaction

Build, troubleshoot, and harden model-facing flows that use the OpenCode SDK API.

## When to Use This Skill

- User asks to integrate models through OpenCode SDK.
- User shares OpenCode docs links, especially opencode.ai/docs/de/sdk.
- User needs chat/completion request code, streaming behavior, or response parsing.
- User reports model call failures (auth, schema mismatch, timeout, throttling, invalid model).
- User wants consistent production patterns for retries, observability, and safety.

## Scope and Outcomes

This skill produces:

- A concrete integration plan for OpenCode model calls.
- Implementation or fix for request construction, invocation, and response handling.
- Reliability improvements (timeouts, retries, structured errors, guardrails).
- Validation steps and completion checks.

## Prerequisites

- Confirm target runtime and language (TypeScript/JavaScript by default).
- Confirm OpenCode SDK package and version used in this codebase.
- Confirm environment variable names for API credentials and base URL.
- Confirm whether streaming, tool calling, or structured output is required.

## Workflow

1. Define the interaction contract.

- Identify input shape, required context, and expected output schema.
- Capture constraints: max latency, token budget, determinism vs creativity, fallback behavior.

2. Select model strategy.

- Choose a model and provider according to cost/latency/quality needs.
- Decide whether one model is enough or fallback chaining is required.

3. Configure client and auth.

- Load secrets from environment (never hardcode).
- Validate credentials at startup where possible.
- Fail closed if auth/config validation is ambiguous or broken.

4. Build request payload.

- Normalize user/system/developer messages before invocation.
- Add optional capabilities only when needed: streaming, tool definitions, response format/schema.
- Set explicit limits (tokens/timeouts) and conservative defaults.

5. Execute the model call.

- Wrap SDK calls with timeout and bounded retry policy for transient failures.
- Preserve cancellation support from upstream callers.

6. Parse and validate responses.

- Validate shape before business logic consumes data.
- Handle partial/stream chunks safely and finalize outputs deterministically.

7. Add safety and governance checks.

- Apply input checks for prompt injection, exfiltration patterns, and unsafe tool arguments.
- Apply output/use checks before triggering side effects.
- Deny unsafe operations on uncertainty (fail closed).

8. Add observability.

- Log metadata, not sensitive prompt content.
- Capture model, latency, retries, token usage (if available), and failure class.
- Emit trace IDs for request correlation.

9. Verify end-to-end.

- Run happy-path tests for normal generation.
- Run failure-path tests for auth errors, rate limits, malformed outputs, and timeout handling.
- Confirm behavior under streaming and non-streaming modes.

## Decision Points

- Streaming vs non-streaming:
  - Use streaming for long responses or realtime UX.
  - Use non-streaming for simple synchronous workflows.
- Structured output vs free-form text:
  - Use schema-validated responses when outputs drive automation.
  - Use free-form text when outputs are human-only.
- Single model vs fallback model:
  - Use fallback when availability is critical and outputs can tolerate minor style drift.
- Tool calling enabled vs disabled:
  - Enable only for tasks requiring external actions/data.
  - Disable for pure text generation to reduce risk.

## Completion Checks

- Integration uses environment-based secrets and no hardcoded credentials.
- Request and response shapes are explicit and validated.
- Retry and timeout behavior is bounded and tested.
- Error handling returns actionable categories (auth, throttling, transient, validation, unknown).
- Logs/metrics include operational metadata without leaking secrets.
- At least one test covers success and one covers each critical failure path.

## Troubleshooting Map

| Symptom                  | Likely Cause                         | First Fix                                           |
| ------------------------ | ------------------------------------ | --------------------------------------------------- |
| 401/403 from SDK         | Wrong key or env mapping             | Verify env name wiring and key scope                |
| 404 model/provider       | Invalid model identifier             | Check configured model name against docs            |
| Frequent timeouts        | Timeout too low or oversized payload | Reduce prompt size and raise timeout conservatively |
| Inconsistent JSON output | Missing schema constraints           | Enforce structured output and validate strictly     |
| Spiky latency/cost       | Large context or verbose prompts     | Trim context and set max token caps                 |

## Prompt Starters

- "Implement an OpenCode SDK helper that performs model calls with timeout, retry, and typed result validation."
- "Add streaming support for OpenCode model responses and aggregate chunks into a validated final payload."
- "Refactor our OpenCode model integration to separate request building, execution, and response validation."
- "Diagnose why our OpenCode model call fails with intermittent 429 and implement safe backoff."

## Notes for Maintainers

- Keep this file short and push long examples to a references folder if needed.
- Update trigger keywords in description when team vocabulary changes.
