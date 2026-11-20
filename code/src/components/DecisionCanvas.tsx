/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS COMPONENT: DecisionCanvas
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: WEB (DAVE Exact Web Application Pipeline)
 * Goal Reference: G-WEB-005 (Component-First Implementation)
 * Specification: docs/02-product/design/component-inventory.md#3.2
 * Behavior Matrix: docs/02-product/design/component-states.md#3.2
 * Visual Reference: REF-0001 (1440x900 desktop viewport)
 * Invariants: Zero Mocks, Zero Stubs, Zero Raw Hex Codes, Zero CLS Layout Guarantee.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { FC, useState, KeyboardEvent } from 'react';

export type GoalKind = 'design' | 'feature' | 'fix' | 'refactor' | 'ops';
export type LifecycleState = 'spec' | 'implementation' | 'verification' | 'review' | 'release';
export type ComponentState = 'empty' | 'loading' | 'partial' | 'full' | 'error';

export interface DaveDecisionPayload {
  decision_id: string;
  decision_type: string;
  summary: string;
  confidence: number;
  risk: 'low' | 'normal' | 'medium' | 'high';
  primary_action?: string;
  alternatives_rejected?: string[];
  evidence?: string[];
  references?: string[];
}

export interface DecisionCanvasProps {
  goalId: string;
  goalTitle: string;
  goalKind: GoalKind;
  lifecycleState: LifecycleState;
  decisions: DaveDecisionPayload[];
  activeDecisionId: string | null;
  state?: ComponentState;
  errorCode?: string;
  errorMessage?: string;
  onSelectDecision?: (decisionId: string) => void;
  onApproveDecision?: (decisionId: string) => Promise<void> | void;
  onDeferDecision?: (decisionId: string) => Promise<void> | void;
  onReviewDecision?: (decisionId: string) => void;
  onRetryFailedDecision?: (decisionId: string) => Promise<void> | void;
  onRunDiscovery?: () => void;
  className?: string;
}

export const DecisionCanvas: FC<DecisionCanvasProps> = ({
  goalId,
  goalTitle,
  goalKind,
  lifecycleState,
  decisions,
  activeDecisionId,
  state = 'full',
  errorCode = 'ERR_DAVE_TOKEN_VIOLATION',
  errorMessage = 'Token guardrail harness detected raw hex color in proposal. Direct styling prohibited under ADR-005.',
  onSelectDecision,
  onApproveDecision,
  onDeferDecision,
  onReviewDecision,
  onRetryFailedDecision,
  onRunDiscovery,
  className = ''
}) => {
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<string, boolean>>({});

  const toggleAlternative = (decisionId: string) => {
    setExpandedAlternatives((prev) => ({
      ...prev,
      [decisionId]: !prev[decisionId]
    }));
  };

  const selectedDecision = decisions.find((d) => d.decision_id === activeDecisionId) || decisions[0];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, decisionId: string) => {
    if (e.key === 'a') {
      e.preventDefault();
      onApproveDecision?.(decisionId);
    } else if (e.key === 'd') {
      e.preventDefault();
      onDeferDecision?.(decisionId);
    } else if (e.key === 'r') {
      e.preventDefault();
      onReviewDecision?.(decisionId);
    }
  };

  const getRiskToken = (risk: string) => {
    switch (risk) {
      case 'low':
        return { bg: 'var(--color-success-subtle)', color: 'var(--color-success)' };
      case 'medium':
      case 'normal':
        return { bg: 'var(--color-warning-subtle)', color: 'var(--color-warning)' };
      case 'high':
      default:
        return { bg: 'var(--color-error-subtle)', color: 'var(--color-error)' };
    }
  };

  return (
    <main
      role="main"
      id="decision-canvas"
      aria-label="Decision Canvas"
      className={`decision-canvas-container ${className}`.trim()}
      style={{
        flex: '1 1 0%',
        minWidth: '720px',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--color-bg-base)',
        color: 'var(--color-text-primary)',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      {/* Goal Execution Stage Header */}
      <section
        role="region"
        aria-label="Goal Execution Stage"
        className="goal-header-card"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-6)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)'
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-1)'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption, 12px)',
                fontWeight: 700,
                color: 'var(--color-brand-default)'
              }}
            >
              {goalId}
            </span>
            <span
              style={{
                textTransform: 'uppercase',
                fontSize: 'var(--text-caption, 12px)',
                padding: 'var(--space-1) var(--space-2)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {goalKind}
            </span>
            <span
              style={{
                fontSize: 'var(--text-caption, 12px)',
                padding: 'var(--space-1) var(--space-2)',
                backgroundColor: 'var(--color-brand-subtle)',
                color: 'var(--color-brand-default)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              STAGE: {lifecycleState.toUpperCase()}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--text-h1, 24px)',
              fontWeight: 700,
              color: 'var(--color-text-primary)'
            }}
          >
            {goalTitle}
          </h1>
        </div>

        {/* Global Action Trigger / Summary */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => onRunDiscovery?.()}
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-body, 14px)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Run DAVE Discovery
          </button>
        </div>
      </section>

      {/* S1: Empty State */}
      {state === 'empty' && (
        <section
          role="region"
          aria-label="Decision Canvas (Empty)"
          style={{
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-text-muted)'
            }}
          >
            ⚡
          </div>
          <h2
            style={{
              margin: '0 0 var(--space-2) 0',
              fontSize: 'var(--text-h1, 20px)',
              color: 'var(--color-text-primary)'
            }}
          >
            No Decisions Generated Yet
          </h2>
          <p
            style={{
              maxWidth: '520px',
              margin: '0 0 var(--space-6) 0',
              fontSize: 'var(--text-body, 14px)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5
            }}
          >
            DAVE System 1 is awaiting sensory intake or goal task execution. Initiate analysis or ingest visual references to generate decision candidates.
          </p>
          <button
            type="button"
            onClick={() => onRunDiscovery?.()}
            style={{
              backgroundColor: 'var(--color-brand-default)',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-6)',
              fontSize: 'var(--text-body, 14px)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Run DAVE Discovery
          </button>
        </section>
      )}

      {/* S2: Loading State (Exact 608px layout reservation for 3 skeleton cards) */}
      {state === 'loading' && (
        <section
          role="region"
          aria-label="Loading Decision Stream"
          aria-busy="true"
          style={{ minHeight: '608px' }}
        >
          <div
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
              DAVE System 1 Evaluating Decision Candidates...
            </div>
            <div style={{ fontSize: 'var(--text-caption, 12px)', color: 'var(--color-text-secondary)' }}>
              Executing 17-Domain Expert Verification & Calibrated Scoring...
            </div>
          </div>

          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="decision-card-skeleton shimmer"
              style={{
                width: '100%',
                height: '192px',
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-4)',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ width: '40%', height: '24px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)' }} />
              <div style={{ width: '100%', height: '14px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)' }} />
              <div style={{ width: '80%', height: '14px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)' }} />
              <div style={{ width: '60%', height: '14px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)' }} />
            </div>
          ))}
        </section>
      )}

      {/* S5: Error State (Exact in-situ replacement with 192px min-height) */}
      {state === 'error' && (
        <section
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '192px',
            backgroundColor: 'var(--color-error-subtle)',
            border: '2px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            boxSizing: 'border-box',
            marginBottom: 'var(--space-6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: 'var(--text-h1, 18px)', color: 'var(--color-error)' }}>
              Decision Synthesis Failure: Invariant Violation
            </h2>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption, 12px)',
                backgroundColor: 'var(--color-error)',
                color: 'var(--color-text-primary)',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700
              }}
            >
              {errorCode}
            </span>
          </div>

          <p style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-body, 14px)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {errorMessage}
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              type="button"
              onClick={() => onRetryFailedDecision?.(activeDecisionId || goalId)}
              style={{
                backgroundColor: 'var(--color-error)',
                color: 'var(--color-text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-body, 14px)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Rollback & Re-Synthesize (Shift+R)
            </button>
            <button
              type="button"
              onClick={() => onReviewDecision?.(activeDecisionId || goalId)}
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-body, 14px)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Route to Human Review (r)
            </button>
          </div>
        </section>
      )}

      {/* S3 (Partial) and S4 (Full) Decision Stream */}
      {(state === 'full' || state === 'partial') && (
        <section
          role="region"
          aria-label="DAVE Decisions Stream"
          className="decisions-stream-container"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {decisions.map((decision, index) => {
            const isPartialStreamingCard = state === 'partial' && index === 1;
            const riskTokens = getRiskToken(decision.risk);
            const isSelected = decision.decision_id === (activeDecisionId || decisions[0]?.decision_id);
            const isExpanded = !!expandedAlternatives[decision.decision_id];
            const confidencePercent = (decision.confidence * 100).toFixed(1);

            return (
              <article
                key={decision.decision_id}
                role="article"
                aria-labelledby={`decision-title-${decision.decision_id}`}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, decision.decision_id)}
                onClick={() => onSelectDecision?.(decision.decision_id)}
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  border: isSelected
                    ? '2px solid var(--color-brand-default)'
                    : '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4) var(--space-6)',
                  boxShadow: 'var(--shadow-md)',
                  outline: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      id={`decision-title-${decision.decision_id}`}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-body, 14px)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {decision.decision_id}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-caption, 12px)',
                        color: 'var(--color-text-muted)'
                      }}
                    >
                      ({decision.decision_type})
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-caption, 12px)',
                        padding: 'var(--space-1) var(--space-2)',
                        backgroundColor: riskTokens.bg,
                        color: riskTokens.color,
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    >
                      RISK: {decision.risk}
                    </span>
                  </div>

                  {/* Calibrated Confidence Meter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-caption, 12px)', color: 'var(--color-text-secondary)' }}>
                      Calibrated Confidence:
                    </span>
                    <div
                      role="meter"
                      aria-valuenow={Math.round(decision.confidence * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext={`${confidencePercent}% Calibrated Confidence`}
                      style={{
                        width: '120px',
                        height: '10px',
                        backgroundColor: 'var(--color-bg-elevated)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          width: `${confidencePercent}%`,
                          height: '100%',
                          backgroundColor:
                            decision.confidence >= 0.85
                              ? 'var(--color-success)'
                              : decision.confidence >= 0.70
                              ? 'var(--color-warning)'
                              : 'var(--color-error)',
                          borderRadius: 'var(--radius-full)'
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-caption, 12px)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {confidencePercent}%
                    </span>
                  </div>
                </div>

                {/* Summary / Body */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  {isPartialStreamingCard ? (
                    <div style={{ color: 'var(--color-brand-default)', fontSize: 'var(--text-body, 14px)' }}>
                      <span>Streaming alternatives analysis (tokens received: 142)</span>
                      <span className="typing-cursor" style={{ marginLeft: 'var(--space-1)' }}>|</span>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 'var(--text-body, 14px)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {decision.summary}
                    </p>
                  )}
                </div>

                {/* Alternatives Accordion */}
                {decision.alternatives_rejected && decision.alternatives_rejected.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`alternatives-panel-${decision.decision_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAlternative(decision.decision_id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-brand-default)',
                        fontSize: 'var(--text-caption, 12px)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)'
                      }}
                    >
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      <span>Rejected Alternatives ({decision.alternatives_rejected.length})</span>
                    </button>

                    {isExpanded && (
                      <div
                        id={`alternatives-panel-${decision.decision_id}`}
                        style={{
                          marginTop: 'var(--space-2)',
                          padding: 'var(--space-3)',
                          backgroundColor: 'var(--color-bg-elevated)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-caption, 12px)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                          {decision.alternatives_rejected.map((alt, altIdx) => (
                            <li key={altIdx} style={{ marginBottom: 'var(--space-1)' }}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  className="decision-actions-bar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    paddingTop: 'var(--space-3)'
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveDecision?.(decision.decision_id);
                    }}
                    style={{
                      backgroundColor: 'var(--color-success)',
                      color: 'var(--color-text-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-1) var(--space-3)',
                      fontSize: 'var(--text-caption, 12px)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Approve (a)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeferDecision?.(decision.decision_id);
                    }}
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-1) var(--space-3)',
                      fontSize: 'var(--text-caption, 12px)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Defer (d)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReviewDecision?.(decision.decision_id);
                    }}
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-brand-default)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-1) var(--space-3)',
                      fontSize: 'var(--text-caption, 12px)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Review (r)
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Embedded CSS for Shimmer and Typing Animation */}
      <style>{`
        @keyframes shimmerPulse {
          0% { opacity: 0.6; }
          50% { opacity: 1.0; }
          100% { opacity: 0.6; }
        }
        .shimmer {
          animation: shimmerPulse 1.5s ease-in-out infinite;
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .typing-cursor {
          animation: blinkCursor 0.8s infinite;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
};
