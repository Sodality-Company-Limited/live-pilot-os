/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS COMPONENT: CommandRail
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: WEB (DAVE Exact Web Application Pipeline)
 * Goal Reference: G-WEB-005 (Component-First Implementation)
 * Specification: docs/02-product/design/component-inventory.md#3.1
 * Behavior Matrix: docs/02-product/design/component-states.md#3.1
 * Visual Reference: REF-0001 (1440x900 desktop viewport)
 * Invariants: Zero Mocks, Zero Stubs, Zero Raw Hex Codes, Zero CLS Layout Guarantee.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { FC, KeyboardEvent, useState } from 'react';

export type AgentStatus = 'idle' | 'evaluating' | 'routing' | 'verified' | 'quarantined';
export type ComponentState = 'empty' | 'loading' | 'partial' | 'full' | 'error';

export interface CommandRailProps {
  workspaceId: string;
  workspaceName: string;
  activeGoalId: string | null;
  activeGoalTitle: string | null;
  agentStatus: AgentStatus;
  calibratedConfidence: number; // [0.0, 1.0]
  state?: ComponentState;
  errorCode?: string;
  errorMessage?: string;
  onOpenCommandPalette?: () => void;
  onSwitchWorkspace?: (workspaceId: string) => void;
  onToggleTheme?: () => void;
  onRetryConnection?: () => void;
  className?: string;
}

export const CommandRail: FC<CommandRailProps> = ({
  workspaceId,
  workspaceName,
  activeGoalId,
  activeGoalTitle,
  agentStatus,
  calibratedConfidence,
  state = 'full',
  errorCode = 'ERR_SOCKET_TIMEOUT',
  errorMessage = 'Live updates suspended. Click Retry or check local daemon port 8080.',
  onOpenCommandPalette,
  onSwitchWorkspace,
  onToggleTheme,
  onRetryConnection,
  className = ''
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      onOpenCommandPalette?.();
    } else if (e.key === 'Escape') {
      setSearchValue('');
      (e.target as HTMLInputElement).blur();
    }
  };

  const getStatusBadgeToken = (status: AgentStatus) => {
    switch (status) {
      case 'verified':
        return {
          bg: 'var(--color-success-subtle)',
          color: 'var(--color-success)',
          label: 'Agent Operational'
        };
      case 'evaluating':
      case 'routing':
        return {
          bg: 'var(--color-brand-subtle)',
          color: 'var(--color-brand-default)',
          label: 'Agent Evaluating'
        };
      case 'quarantined':
        return {
          bg: 'var(--color-error-subtle)',
          color: 'var(--color-error)',
          label: 'Agent Quarantined'
        };
      case 'idle':
      default:
        return {
          bg: 'var(--color-bg-elevated)',
          color: 'var(--color-text-secondary)',
          label: 'Agent Idle'
        };
    }
  };

  const statusToken = getStatusBadgeToken(agentStatus);
  const confidencePercent = Math.max(0, Math.min(100, calibratedConfidence * 100)).toFixed(1);

  return (
    <header
      role="banner"
      className={`command-rail-container ${className}`.trim()}
      style={{
        height: 'var(--layout-header-height, 64px)',
        minHeight: 'var(--layout-header-height, 64px)',
        maxHeight: 'var(--layout-header-height, 64px)',
        width: '100%',
        backgroundColor: 'var(--color-bg-base)',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-4)',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      <nav
        role="navigation"
        aria-label="Soda OS Global Command Rail"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 'var(--space-4)'
        }}
      >
        {/* Left Section: Branding & Workspace Breadcrumb */}
        <div
          className="command-rail-left"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            minWidth: '240px'
          }}
        >
          <div
            className="brand-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-1) var(--space-2)',
              backgroundColor: 'var(--color-brand-subtle)',
              color: 'var(--color-brand-default)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: 'var(--text-caption, 12px)',
              letterSpacing: '0.05em'
            }}
          >
            SODA OS
          </div>

          {state === 'loading' ? (
            <div
              className="breadcrumb-skeleton shimmer"
              style={{
                width: '140px',
                height: '16px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)'
              }}
              aria-busy="true"
              aria-label="Loading workspace breadcrumb"
            />
          ) : (
            <div
              className="workspace-breadcrumb"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: 'var(--text-caption, 12px)',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap'
              }}
            >
              <button
                type="button"
                onClick={() => onSwitchWorkspace?.(workspaceId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {workspaceName || 'Default Workspace'}
              </button>
              <span>/</span>
              <span style={{ color: activeGoalId ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {activeGoalId ? `${activeGoalId}: ${activeGoalTitle || ''}` : 'No Active Goal'}
              </span>
            </div>
          )}
        </div>

        {/* Center Section: Global Search / Error Banner / Loading Skeleton */}
        <div
          className="command-rail-center"
          style={{
            flex: '1 1 auto',
            maxWidth: '560px',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {state === 'loading' ? (
            <div
              className="search-skeleton shimmer"
              style={{
                width: '320px',
                height: '36px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)'
              }}
              aria-busy="true"
              aria-label="Loading command search"
            />
          ) : state === 'error' ? (
            <div
              role="alert"
              aria-live="assertive"
              className="command-error-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'var(--color-error-subtle)',
                color: 'var(--color-error)',
                border: '1px solid var(--color-error)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-caption, 12px)',
                maxWidth: '100%'
              }}
            >
              <span style={{ fontWeight: 700 }}>[{errorCode}]</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {errorMessage}
              </span>
              <button
                type="button"
                onClick={() => onRetryConnection?.()}
                style={{
                  marginLeft: 'auto',
                  backgroundColor: 'var(--color-error)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 'var(--text-caption, 12px)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reconnect
              </button>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px'
              }}
            >
              <input
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="false"
                aria-label="Global command palette search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  state === 'empty'
                    ? 'Press Cmd+K to search goals or create a new session...'
                    : 'Search commands, decisions, or references (Cmd+K)'
                }
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-body, 14px)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <kbd
                style={{
                  position: 'absolute',
                  right: 'var(--space-2)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 var(--space-1)',
                  fontSize: 'var(--text-caption, 12px)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none'
                }}
              >
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        {/* Right Section: Calibrated Telemetry & Controls */}
        <div
          className="command-rail-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            minWidth: '240px',
            justifyContent: 'flex-end'
          }}
        >
          {state === 'loading' ? (
            <div
              className="status-skeleton shimmer"
              style={{
                width: '180px',
                height: '24px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-full)'
              }}
              aria-busy="true"
            />
          ) : state === 'partial' ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-1) var(--space-3)',
                backgroundColor: 'var(--color-brand-subtle)',
                color: 'var(--color-brand-default)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-caption, 12px)',
                fontWeight: 600
              }}
            >
              <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
              Connecting Telemetry...
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-1) var(--space-3)',
                backgroundColor: statusToken.bg,
                color: statusToken.color,
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-caption, 12px)',
                fontWeight: 600
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
              {state === 'empty' ? 'No Goal Selected' : `${statusToken.label} • ${confidencePercent}% Calibrated`}
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggleTheme?.()}
            aria-label="Toggle visual theme contract"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer'
            }}
          >
            ◐
          </button>
        </div>
      </nav>

      {/* Embedded CSS for Shimmer and Keyframe Pulse */}
      <style>{`
        .command-rail-container input:focus {
          border-color: var(--color-brand-default) !important;
          box-shadow: 0 0 0 2px var(--color-brand-subtle);
        }
        @keyframes shimmerPulse {
          0% { opacity: 0.6; }
          50% { opacity: 1.0; }
          100% { opacity: 0.6; }
        }
        .shimmer {
          animation: shimmerPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
};
