# LivePilot OS — UI Test Specification SOT

> **Status:** Required UI test-generation authority.

Every component/screen test maps `REQ → BDD → flow → component → API/event → test → receipt`.

Required classes: component/unit, visual regression, responsive viewport, keyboard,
screen reader/axe, RTL/LTR, localization expansion, API loading/empty/error/pending/
unknown, realtime reconnect/replay, simulation labeling, and browser compatibility.

No visual pass can certify incorrect state, authorization, API binding, or accessibility.
Each test declares fixture, viewport, locale, browser, entry command, expected state,
and evidence artifact.
