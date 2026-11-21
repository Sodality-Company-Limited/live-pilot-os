export interface PauseState {
  isPaused: boolean;
  pauseReason?: string;
  pausedAt?: string;
  pausedBy?: string;
}

export class EmergencyPauseHandler {
  private pauseStates = new Map<string, PauseState>();

  setPause(sessionId: string, state: PauseState): void {
    this.pauseStates.set(sessionId, state);
  }

  isPaused(sessionId: string): boolean {
    return this.pauseStates.get(sessionId)?.isPaused ?? false;
  }

  assertExecutionPermitted(sessionId: string): void {
    const state = this.pauseStates.get(sessionId);
    if (state?.isPaused) {
      const err = new Error(`Emergency pause active for session ${sessionId}: ${state.pauseReason ?? 'Control lock'}`);
      (err as any).code = 'LP40003';
      throw err;
    }
  }
}
