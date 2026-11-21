# G-CORE-093: FSM Runtime Specification

| State | Trigger | Guard | Failure handling |
|---|---|---|---|
| startup | process launch | immutable config and schema valid | fail fast / no traffic |
| live | process responds | event loop healthy | restart on liveness failure |
| ready | durable dependencies usable | probes and control state valid | remove from traffic |
| degraded | dependency unavailable | safe mode defined | hold consequential work |
| recovered | probes and smoke pass | evidence captured | admit traffic or release |
