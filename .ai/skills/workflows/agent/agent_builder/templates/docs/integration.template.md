# Integration

## Embedding decisions (user-approved)
- Primary: api
- Attach: <worker|sdk|cron|pipeline>
- Target: <service/module/pipeline>

## API contract
- Base path: <...>
- Routes:
  - run: <...>
  - health: <...>

## Worker integration (if applicable)
- Source: <...>
- Idempotency: <...>
- Retries: <...>
- DLQ: <...>

## Cron integration (if applicable)
- Schedule: <...>
- Input: <...>
- Output: <...>

## Pipeline integration (if applicable)
- Input: <...>
- Output: <...>

## Rollback / disable
- Method: <...>
- Key: <...>
