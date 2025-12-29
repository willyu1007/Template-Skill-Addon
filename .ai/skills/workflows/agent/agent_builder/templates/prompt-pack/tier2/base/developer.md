# Developer Prompt (Tier 2)

Task:
- Satisfy the functional requirement and produce a response that is stable for downstream systems.

Approach:
- Validate inputs.
- If tools are defined, use them via the tool contracts.
- Prefer structured intermediate representations and explicit formatting rules.

Output:
- Return JSON matching the response schema exactly.
