# G-LIVE-002 FSM runtime specification

States: created, active, paused, ended, pending, unknown. Transitions: start created→active; pause active→paused; resume paused→active; end created|active|paused→ended. Invalid, stale, unauthorized, paused fail-closed, and duplicate commands produce typed non-success replies.

