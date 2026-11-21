# Worktree & Rollout Plan: G-APPR-007

## Execution Environment
- Branch: `feature/G-APPR-007`
- Workspace: Root `/Users/batrarethsudprasert/projects/live-pilot-os`
- Verification: Zero-mock dry-run automated deployment via `infra/production/digitalocean-approval-deploy.sh --dry-run`

## Rollout Sequence
1. Static code analysis and unit tests: `npm test` inside `code/services/approval-control-service/`.
2. Multi-stage Docker build: `livepilot/approval-control-service:latest`.
3. Preflight dry-run: `bash infra/production/digitalocean-approval-deploy.sh --dry-run`.
4. Production release gated on explicit operator approval.
