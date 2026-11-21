# LivePilot third-party configuration

This directory is a sanitized adaptation of the Aflovia third-party configuration
template. It preserves the useful variable grouping and callback topology without
copying Aflovia credentials or domains.

The production file belongs outside Git, for example:

```text
/opt/live-pilot-os/infra/third-party/prod.env
```

Set permissions to `600`, keep ownership with `root`, and rotate credentials on
ownership changes. The current demo keeps `PLATFORM_ADAPTER_MODE=simulated`; real
TikTok credentials are not required for the demo scenarios.
