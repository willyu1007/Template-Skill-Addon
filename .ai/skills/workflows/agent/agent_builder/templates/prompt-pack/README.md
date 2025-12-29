# Prompt Pack Templates

This directory contains **tiered prompt-pack templates** used by `agent_builder`.

- `tier1`: Simple, low-risk agents. Minimal examples.
- `tier2`: Default. Multi-step + tools + structured outputs.
- `tier3`: High-risk / complex. Strong guardrails and more examples.

`agent_builder` selects a tier using `prompting.complexity_tier` in the blueprint.
