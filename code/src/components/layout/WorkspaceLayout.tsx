import React, { useState, useEffect } from 'react';

/**
 * Props interface for WorkspaceLayout component
 */
export interface WorkspaceLayoutProps {
  /** Optional slot for the top CommandRail banner */
  commandRail?: React.ReactNode;
  /** Primary work area rendering DecisionCanvas */
  decisionCanvas?: React.ReactNode;
  /** Right docked panel for Evidence and Grounding Ledger */
  evidencePanel?: React.ReactNode;
  /** Optional modal dialogue for Human-in-the-Loop review */
  reviewModal?: React.ReactNode;
  /** Optional sticky footer for global status and metadata */
  footer?: React.ReactNode;
  /** Controlled state for evidence panel collapse */
  isEvidenceCollapsed?: boolean;
  /** Callback fired when user toggles evidence panel collapse */
  onToggleEvidence?: () => void;
  /** Active breakpoint override for testing or manual forcing */
  activeBreakpoint?: 'desktop' | 'tablet' | 'mobile';
  /** Additional CSS class name */
  className?: string;
  /** Children fallback if slots are not explicitly passed */
  children?: React.ReactNode;
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ SODA OS WORKSPACE LAYOUT COMPONENT
 * ════════════════════════════════════════════════════════════════════════════════
 * Goal Reference: G-WEB-004 (docs/07-backlog/goals/G-WEB-004.md)
 * DAVE Decision: DAVE-FE-0001
 * Visual Reference: REF-0001 (1440x900 Desktop Grid @ 1.0 DPR)
 * Invariants: Zero Mocks, Zero Stubs, Zero CLS, Zero Raw Hex Colors
 * ════════════════════════════════════════════════════════════════════════════════
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  commandRail,
  decisionCanvas,
  evidencePanel,
  reviewModal,
  footer,
  isEvidenceCollapsed = false,
  onToggleEvidence,
  activeBreakpoint,
  className = '',
  children
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>(
    activeBreakpoint || 'desktop'
  );

  useEffect(() => {
    if (activeBreakpoint) {
      setCurrentBreakpoint(activeBreakpoint);
      return;
    }

    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setCurrentBreakpoint('mobile');
      } else if (w < 1280) {
        setCurrentBreakpoint('tablet');
      } else {
        setCurrentBreakpoint('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeBreakpoint]);

  return (
    <div
      className={`workspace-root ${currentBreakpoint} ${className}`.trim()}
      data-theme="dark"
      data-breakpoint={currentBreakpoint}
      data-evidence-collapsed={isEvidenceCollapsed ? 'true' : 'false'}
    >
      {/* 1. Zone 1: CommandRail Landmark */}
      <header role="banner" className="workspace-header" aria-label="Global Command Rail">
        {commandRail || (
          <div className="workspace-header-placeholder" aria-hidden="true" />
        )}
      </header>

      {/* 2. Primary 2-Column CSS Grid Container */}
      <div className="workspace-container">
        {/* Zone 2: DecisionCanvas Landmark */}
        <main
          role="main"
          id="workspace-main"
          className="workspace-main"
          tabIndex={-1}
          aria-label="Decision Canvas"
        >
          {decisionCanvas || children}
        </main>

        {/* Zone 3: EvidencePanel Landmark */}
        {evidencePanel && (
          <aside
            role="complementary"
            id="workspace-evidence"
            className="workspace-evidence"
            aria-label="Evidence and Grounding Ledger"
            aria-expanded={!isEvidenceCollapsed}
          >
            <div className="workspace-evidence-inner">
              {evidencePanel}
            </div>
          </aside>
        )}
      </div>

      {/* 3. Sticky Footer Landmark */}
      {footer && (
        <footer role="contentinfo" className="workspace-footer" aria-label="Global Workspace Status Footer">
          {footer}
        </footer>
      )}

      {/* 4. Portal Overlay: ReviewModal Dialog */}
      {reviewModal && (
        <div className="workspace-modal-portal" role="presentation">
          {reviewModal}
        </div>
      )}

      {/* Scoped Layout Styles bound strictly to Soda OS design tokens */}
      <style>{`
        .workspace-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background-color: var(--color-bg-base);
          color: var(--color-text-primary);
          font-family: var(--font-sans);
          overflow-x: hidden;
        }

        .workspace-header {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          height: var(--layout-header-height, 64px);
          min-height: var(--layout-header-height, 64px);
          background-color: var(--color-bg-base);
          border-bottom: 1px solid var(--color-border-subtle);
          z-index: 40;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .workspace-header-placeholder {
          height: var(--layout-header-height, 64px);
          width: 100%;
        }

        .workspace-footer {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--layout-footer-height, 40px);
          min-height: var(--layout-footer-height, 40px);
          background-color: var(--color-bg-base);
          border-top: 1px solid var(--color-border-subtle);
          z-index: 30;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .workspace-container {
          display: grid;
          grid-template-columns: minmax(720px, 1fr) var(--layout-drawer-width, 360px);
          min-height: calc(100vh - var(--layout-header-height, 64px));
          width: 100%;
          max-width: var(--layout-max-width, 1440px);
          margin-left: auto;
          margin-right: auto;
          transition: grid-template-columns var(--duration-normal, 250ms) var(--ease-standard);
        }

        .workspace-root[data-evidence-collapsed="true"] .workspace-container {
          grid-template-columns: 1fr 0px;
        }

        .workspace-main {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-width: 0;
          padding: var(--space-6, 1.5rem);
          overflow-y: auto;
          background-color: var(--color-bg-base);
        }

        .workspace-evidence {
          position: relative;
          width: var(--layout-drawer-width, 360px);
          min-height: calc(100vh - var(--layout-header-height, 64px));
          border-left: 1px solid var(--color-border-subtle);
          background-color: var(--color-bg-surface);
          overflow-y: auto;
          transition: width var(--duration-normal, 250ms) var(--ease-standard),
                      transform var(--duration-normal, 250ms) var(--ease-standard);
        }

        .workspace-root[data-evidence-collapsed="true"] .workspace-evidence {
          width: 0;
          border-left: none;
          overflow: hidden;
        }

        .workspace-evidence-inner {
          width: var(--layout-drawer-width, 360px);
          height: 100%;
        }

        .workspace-modal-portal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-bg-overlay);
          backdrop-filter: blur(4px);
        }

        /* Responsive Breakpoints: Tablet (768px - 1279px) */
        @media (max-width: 1279px) {
          .workspace-container {
            grid-template-columns: 1fr;
          }

          .workspace-evidence {
            position: fixed;
            top: var(--layout-header-height, 64px);
            right: 0;
            bottom: 0;
            width: var(--layout-drawer-width, 360px);
            z-index: 45;
            box-shadow: var(--shadow-xl);
            transform: translateX(0);
          }

          .workspace-root[data-evidence-collapsed="true"] .workspace-evidence {
            transform: translateX(100%);
            width: var(--layout-drawer-width, 360px);
          }
        }

        /* Responsive Breakpoints: Mobile (< 768px) */
        @media (max-width: 767px) {
          .workspace-header {
            height: 56px;
            min-height: 56px;
          }

          .workspace-container {
            grid-template-columns: 1fr;
            min-height: calc(100vh - 56px);
          }

          .workspace-main {
            padding: var(--space-4, 1.0rem);
          }

          .workspace-evidence {
            position: fixed;
            top: 56px;
            right: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            border-left: none;
            z-index: 45;
            transform: translateY(0);
          }

          .workspace-evidence-inner {
            width: 100%;
          }

          .workspace-root[data-evidence-collapsed="true"] .workspace-evidence {
            transform: translateY(100%);
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkspaceLayout;
