# FSM Runtime Spec: G-EXEC-008: Deployment Lifecycle

`Provision` -> `MigrateDB` -> `DeployContainer` -> `HealthProbeCheck` -> `LiveTraffic`
Rollback triggers fail-closed if `/readyz` fails 3 times during startup grace period.
