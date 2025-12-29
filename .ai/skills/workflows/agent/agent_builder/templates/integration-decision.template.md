# Integration Decision (Stage A)

**Important:** This file is for the Stage A interview and must live in the **temporary workdir** (NOT committed).

## Decision summary
- Agent ID: <agent_id>
- Primary embedding: api
- Attach embeddings: <worker|sdk|cron|pipeline>
- Target system/module: <where this agent is embedded>
- Trigger mode: <sync_request|async_event|scheduled|manual|batch>

## Upstream contract (inputs)
- Source: <service/module/pipeline>
- Input schema ref: #/schemas/RunRequest
- Required fields: <list>
- Size/time constraints: <list>

## Downstream contract (outputs)
- Destination: <service/module/pipeline>
- Output schema ref: #/schemas/RunResponse
- Stability requirements: <e.g. must remain backward compatible>

## Failure contract (NO suppression allowed)
Choose one:
- propagate_error
- return_fallback
- enqueue_retry

Rationale: <why>

## Rollback / disable plan
Choose one:
- feature_flag
- config_toggle
- route_switch
- deployment_rollback

Key/location: <flag name or config key>

## Operational hooks
- Health endpoint: /health (fixed)
- Run endpoint: /run (fixed)
- Logs: <required fields>
- Metrics: <required metrics>

## Explicit user sign-off
- [ ] User confirms the embedding decisions above are correct
- [ ] User confirms any write actions / side effects are acceptable
- [ ] User confirms the rollback/disable plan is acceptable

Signed off by: <name/role>
Date: <YYYY-MM-DD>
