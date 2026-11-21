#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UX EXPERT HEURISTIC AGREEMENT BENCHMARK (G-UX-021)
 * ════════════════════════════════════════════════════════════════════════════════
 * Inter-Rater Agreement Engine across Nielsen's 10 Usability Heuristics.
 *
 * Invariants & Bounds Enforced:
 *   1. 100 Gold-Standard Benchmark Scenarios (10 heuristics x 10 scenarios, severities 0-4)
 *   2. Cohen's Kappa: kappa >= 0.800 (Near-perfect agreement)
 *   3. Quadratic Weighted Kappa: kappa_quad >= 0.850 (Penalizing distant severity gaps)
 *   4. 5x5 Full Confusion Matrix
 *   5. Per-Heuristic Agreement & Accuracy Breakdown
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const NIELSEN_HEURISTICS = [
  { id: 'H1', key: 'H1_VISIBILITY_OF_SYSTEM_STATUS', name: 'Visibility of System Status' },
  { id: 'H2', key: 'H2_MATCH_SYSTEM_REAL_WORLD', name: 'Match Between System and Real World' },
  { id: 'H3', key: 'H3_USER_CONTROL_FREEDOM', name: 'User Control and Freedom' },
  { id: 'H4', key: 'H4_CONSISTENCY_STANDARDS', name: 'Consistency and Standards' },
  { id: 'H5', key: 'H5_ERROR_PREVENTION', name: 'Error Prevention' },
  { id: 'H6', key: 'H6_RECOGNITION_RATHER_THAN_RECALL', name: 'Recognition Rather Than Recall' },
  { id: 'H7', key: 'H7_FLEXIBILITY_EFFICIENCY_OF_USE', name: 'Flexibility and Efficiency of Use' },
  { id: 'H8', key: 'H8_AESTHETIC_MINIMALIST_DESIGN', name: 'Aesthetic and Minimalist Design' },
  { id: 'H9', key: 'H9_HELP_RECOGNIZE_DIAGNOSE_RECOVER_ERRORS', name: 'Help Users Recognize, Diagnose, and Recover from Errors' },
  { id: 'H10', key: 'H10_HELP_DOCUMENTATION', name: 'Help and Documentation' }
];

export const SEVERITY_TIERS = [
  { level: 0, label: 'No Problem', description: 'Does not violate heuristic or impede progress' },
  { level: 1, label: 'Cosmetic', description: 'Minor styling or alignment flaw; low priority' },
  { level: 2, label: 'Minor', description: 'Usability flaw causing slight hesitation or friction' },
  { level: 3, label: 'Major', description: 'Significant barrier or confusion; urgent to address' },
  { level: 4, label: 'Catastrophe', description: 'Blocks task completion, risks severe data loss or safety violation' }
];

/**
 * Curates 100 gold-standard benchmark scenarios across Nielsen's 10 heuristics.
 * Exactly 10 scenarios per heuristic with structured severities 0 through 4.
 *
 * @returns {Array<object>} 100 benchmark scenarios
 */
export function getGoldenBenchmarkScenarios() {
  const scenarios = [];
  let idCounter = 1;

  const scenarioBlueprints = [
    // H1: Visibility of System Status
    { h: 'H1', sev: 0, t: 'Real-time WebSocket heartbeat indicator with live ping latency badge', d: 'Header displays live green pill badge with tooltip showing 12ms ping and continuous state sync.', r: 'Immediate, continuous feedback of connection health.', fix: 'None required.' },
    { h: 'H1', sev: 0, t: 'Deterministic multi-step upload progress bar with bytes transferred', d: 'Upload dialog reports 4.2 MB / 10.0 MB (42%) with remaining time estimate and spinner.', r: 'System status is completely transparent and predictable.', fix: 'None required.' },
    { h: 'H1', sev: 1, t: 'Subtle 150ms delay in button active state ripple animation', d: 'Button registers click immediately but ripple microinteraction lags by ~150ms.', r: 'Cosmetic lag without affecting functional feedback.', fix: 'Optimize CSS transform to run on compositor thread.' },
    { h: 'H1', sev: 1, t: 'Status pill text contrast slightly below token baseline on hover', d: 'Hover state on secondary status pill reduces text contrast momentarily.', r: 'Purely cosmetic visual artifact on transient hover.', fix: 'Use high-contrast hover token.' },
    { h: 'H1', sev: 2, t: 'Spinner lacks estimated duration on 10-second data export', d: 'Clicking Export CSV triggers indefinite circular spinner without percentage or duration.', r: 'User unsure whether system is stalled or actively exporting.', fix: 'Add indeterminate progress meter with staged status labels.' },
    { h: 'H1', sev: 2, t: 'Silent background sync without toast or indicator badge', d: 'Auto-save completes in background without visible acknowledgment.', r: 'Causes user hesitation about whether changes were preserved.', fix: 'Display transient saved checkmark pill in status bar.' },
    { h: 'H1', sev: 3, t: 'Async batch transaction runs for 45s with frozen interface', d: 'Clicking Execute Settlement locks UI without loader or status update for 45 seconds.', r: 'High risk of duplicate user submission or panic page refresh.', fix: 'Dispatch optimistic async background task with live SSE progress stream.' },
    { h: 'H1', sev: 3, t: 'Network disconnection leaves outdated balance displayed without offline banner', d: 'Network drop occurs; app displays stale $50,000 balance without showing offline state.', r: 'Critical misalignment between UI and true ledger state.', fix: 'Prominently display persistent offline banner and disable stale balance triggers.' },
    { h: 'H1', sev: 4, t: 'Destructive database wipe runs silently in background with no status or cancellation', d: 'Clicking Reset Cluster immediately starts deleting tables with zero progress or abort mechanism.', r: 'Total opacity during catastrophic data destruction.', fix: 'Mandate modal progress overlay with active step stream and immediate emergency abort.' },
    { h: 'H1', sev: 4, t: 'Silent payment failure displays success screen while transaction dropped', d: 'Bank gateway times out; client UI renders Order Confirmed despite zero captured charge.', r: 'Catastrophic state deception between merchant and customer.', fix: 'Gate confirmation screen strictly on signed idempotent webhook receipt.' },

    // H2: Match between system and real world
    { h: 'H2', sev: 0, t: 'Natural financial terminology and localized ISO 4217 currency symbols', d: 'Presents account balances in local notation with clear Debit and Credit columns.', r: 'Aligns seamlessly with mental model of enterprise accountants.', fix: 'None required.' },
    { h: 'H2', sev: 0, t: 'Familiar folder hierarchy and breadcrumb navigation tree', d: 'Document repository uses standard folder icons and clickable parent path breadcrumbs.', r: 'Matches real-world physical and digital file filing conventions.', fix: 'None required.' },
    { h: 'H2', sev: 1, t: 'Technical timestamp format ISO 8601 used instead of relative time in activity stream', d: 'Audit stream shows 2026-10-14T10:15:00Z instead of 5 minutes ago.', r: 'Slightly less human-friendly for casual operators.', fix: 'Render localized relative time with ISO timestamp in hover tooltip.' },
    { h: 'H2', sev: 1, t: 'Internal server timezone UTC shown without local timezone indicator', d: 'Schedule table shows 14:00 UTC without displaying user local timezone offset.', r: 'Requires mental conversion of hour offset.', fix: 'Append local timezone abbreviation (e.g., 21:00 ICT).' },
    { h: 'H2', sev: 2, t: 'Database column names displayed as raw SQL identifiers in table header', d: 'Headers render as usr_first_nm and acct_crtd_ts instead of First Name and Created Date.', r: 'Exposes database implementation jargon to non-technical users.', fix: 'Apply human-readable label dictionary mapping.' },
    { h: 'H2', sev: 2, t: 'Cryptic HTTP status codes shown to end users on file upload rejection', d: 'File upload failure displays Error 413 Payload Too Large without translation.', r: 'Requires understanding RFC 7231 HTTP status codes.', fix: 'Translate to File exceeds maximum size limit of 25MB.' },
    { h: 'H2', sev: 3, t: 'Inverted toggle logic: switch labeled Disable Notifications where ON means OFF', d: 'User must turn ON the toggle to stop receiving notifications.', r: 'Severe double-negative cognitive friction causing unintended notifications.', fix: 'Rephrase to affirmative Enable Notifications or standard checkbox.' },
    { h: 'H2', sev: 3, t: 'Financial debit and credit signs inverted in executive balance overview', d: 'Outgoing expenditures displayed with positive + prefix and deposits with - prefix.', r: 'Violates core accounting principles, risking inverted executive decisions.', fix: 'Enforce standard accounting convention: Outflows (-), Inflows (+).' },
    { h: 'H2', sev: 4, t: 'Medical dose calculator uses milliliters instead of milligrams without unit label', d: 'Infusion pump dosage input displays raw float 50 without indicating mg vs mL.', r: 'Catastrophic potential for fatal dosage administration error.', fix: 'Lock input to explicit typed unit selector with redundant visual conversion badges.' },
    { h: 'H2', sev: 4, t: 'Kill switch labeled Safe Mode where activation executes ungraceful termination', d: 'Pressing Safe Mode issues SIGKILL and unmounts all storage volumes without backup.', r: 'Dangerous euphemism directly causing irreversible system destruction.', fix: 'Label clearly as Emergency Force Kill (Destructive) with explicit warnings.' },

    // H3: User control and freedom
    { h: 'H3', sev: 0, t: '1-click undo toast on message archive and deletion', d: 'Archiving a goal shows bottom toast Message archived with prominent Undo action button.', r: 'Gives users confidence to navigate quickly with instant reversal.', fix: 'None required.' },
    { h: 'H3', sev: 0, t: 'Multi-level step wizard with non-destructive back and save-draft buttons', d: 'Checkout wizard allows free traversal across prior steps without losing form state.', r: 'Complete user freedom to inspect and revise inputs.', fix: 'None required.' },
    { h: 'H3', sev: 1, t: 'Escape key closes modal but does not reset unsaved filter changes', d: 'Closing filter modal via Esc retains dirty filter inputs on re-opening.', r: 'Minor inconvenience requiring manual Reset Filters click.', fix: 'Reset unapplied filter state on escape dismiss.' },
    { h: 'H3', sev: 1, t: 'Back button navigates to top of list instead of preserving scroll position', d: 'Returning from detail view scrolls user back to item 1 of 500.', r: 'Slight friction in continuous browsing flow.', fix: 'Persist scroll container offset in session state.' },
    { h: 'H3', sev: 2, t: 'No confirmation or undo on bulk item tag removal', d: 'Selecting 50 items and clicking Remove Tag executes immediately without undo.', r: 'Accidental click requires tedious manual re-tagging.', fix: 'Provide 10-second undo toast or bulk confirmation dialog.' },
    { h: 'H3', sev: 2, t: 'Browser back button unexpectedly exits entire single-page application workflow', d: 'Pressing Back in sub-modal triggers browser popstate exiting the dashboard.', r: 'Violates standard SPA navigation expectations.', fix: 'Trap popstate within nested route history stack.' },
    { h: 'H3', sev: 3, t: 'Wizard forces user through 7 mandatory steps with no draft saving or exit', d: 'User cannot exit wizard to consult documentation without discarding 20 minutes of work.', r: 'Severe trap causing data loss or forced abandonment.', fix: 'Enable Save as Draft and non-linear step tabs.' },
    { h: 'H3', sev: 3, t: 'Subscription auto-renew cannot be toggled off inside user settings portal', d: 'User settings page has no Cancel or Pause button; requires calling telephone hotline.', r: 'Roach-motel dark pattern trapping user in unwanted recurring billing.', fix: 'Provide frictionless 1-click self-service cancellation flow.' },
    { h: 'H3', sev: 4, t: 'Irreversible production deployment trigger without confirmation or rollback', d: 'Single click on Deploy to Production instantly overwrites active release with no rollback.', r: 'Catastrophic outage risk from inadvertent single misclick.', fix: 'Implement two-person rule, typed confirmation box, and instant automated rollback.' },
    { h: 'H3', sev: 4, t: 'Account deletion triggers instantly on click with zero confirmation or data export', d: 'Clicking Delete Account immediately purges customer tenant data from database.', r: 'Irrevocable catastrophic loss of enterprise data.', fix: 'Require 30-day grace period, password verification, and explicit confirmation modal.' },

    // H4: Consistency and standards
    { h: 'H4', sev: 0, t: 'Uniform design tokens for color, typography, and button variants across screens', d: 'All primary buttons use Indigo-600 with 8px radius; secondary buttons use ghost outline.', r: 'Reinforces cohesive visual language and predictable affordances.', fix: 'None required.' },
    { h: 'H4', sev: 0, t: 'Standard placement of global navigation rail, search bar, and user profile', d: 'Left navigation rail, top search (Cmd+K), and top-right profile avatar follow standard web patterns.', r: 'Zero learning curve for layout wayfinding.', fix: 'None required.' },
    { h: 'H4', sev: 1, t: 'Inconsistent date formatting across two sibling tables (DD/MM vs MM/DD)', d: 'Audit table uses 14/10/2026 while payments table uses 10/14/2026.', r: 'Minor visual dissonance between sibling views.', fix: 'Standardize on centralized date formatter utility.' },
    { h: 'H4', sev: 1, t: 'Primary action button placed on left in modal A, but on right in modal B', d: 'Confirm is on the right in Edit modal, but on the left in Delete modal.', r: 'Slight muscle memory inconsistency.', fix: 'Enforce standard action order: Cancel on left, Primary on right.' },
    { h: 'H4', sev: 2, t: 'Search input uses Enter in table view but requires clicking Search icon in drawer', d: 'Drawer search input ignores keyboard Enter key press.', r: 'Violates keyboard accessibility and behavioral consistency.', fix: 'Attach onKeyDown Enter listener across all search components.' },
    { h: 'H4', sev: 2, t: 'Toggle switch used for binary settings in tab 1, but checkbox used in tab 2', d: 'Notification settings mixes checkboxes and toggle switches arbitrarily.', r: 'Unnecessary cognitive friction in control identification.', fix: 'Standardize on toggle switches for instant live settings.' },
    { h: 'H4', sev: 3, t: 'Red color used for successful status badges in payments ledger', d: 'Payment Succeeded rendered in bright red text, while Payment Failed is in green.', r: 'Violates universal mental model where red signifies danger/error.', fix: 'Enforce semantic status tokens: Green for Success, Red for Error.' },
    { h: 'H4', sev: 3, t: 'Hyperlinks styled identically to plain body text without underline or distinct color', d: 'Clickable links render in identical black color and regular weight with zero underline.', r: 'Invisible affordance preventing user from discovering navigation paths.', fix: 'Underline all inline links and apply distinct interactive link color token.' },
    { h: 'H4', sev: 4, t: 'Destructive Delete button styled with primary green styling and Confirm with red', d: 'In Delete User dialog, Delete is large green button and Cancel is bright red button.', r: 'Catastrophic inverted affordance causing accidental deletions.', fix: 'Immediately apply destructive red styling to Delete and neutral ghost to Cancel.' },
    { h: 'H4', sev: 4, t: 'Close X icon in modal header executes Form Submit instead of Dismiss', d: 'Clicking top-right X icon executes purchase transaction rather than closing modal.', r: 'Gross breach of universal GUI standards leading to unintended transactions.', fix: 'Ensure modal header close icon strictly invokes onDismiss/onCancel handler.' },

    // H5: Error prevention
    { h: 'H5', sev: 0, t: 'Pre-flight validation on currency transfer preventing overdraft before submit', d: 'Transfer button is disabled with explanatory note if amount exceeds available balance.', r: 'Prevents invalid state before user submits transaction.', fix: 'None required.' },
    { h: 'H5', sev: 0, t: 'Type-safe constraint mask on credit card expiry input formatting MM/YY', d: 'Input automatically restricts entry to digits, inserts slash, and rejects expired months.', r: 'Eliminates typographic syntax errors at entry time.', fix: 'None required.' },
    { h: 'H5', sev: 1, t: 'Form allows trailing whitespace in email address input field', d: 'User entering email with trailing space sees validation error rather than auto-trim.', r: 'Minor friction easily avoided by automatic string trim.', fix: 'Apply auto-trim on blur and submit.' },
    { h: 'H5', sev: 1, t: 'Password field lacks live visual strength meter during typing', d: 'Password requirements only checked after clicking Submit.', r: 'Delays feedback on policy constraints.', fix: 'Render live checklist of password criteria updating in real time.' },
    { h: 'H5', sev: 2, t: 'Date range picker allows End Date to precede Start Date without warning', d: 'User can select End Date = Oct 1 and Start Date = Oct 14, causing query error.', r: 'System permits illogical temporal constraints.', fix: 'Disable dates preceding Start Date in End Date calendar picker.' },
    { h: 'H5', sev: 2, t: 'Clear All button adjacent to Submit button with identical visual weight', d: 'Clear All and Submit sit side-by-side with identical padding and borders.', r: 'High risk of accidental click erasing 15 form fields.', fix: 'Separate Clear All into text link or position away from primary CTA.' },
    { h: 'H5', sev: 3, t: 'No warning when navigating away from dirty form with 20 unsaved fields', d: 'Clicking any navigation link instantly discards all entered form data without dialog.', r: 'Frequent source of catastrophic user frustration and data loss.', fix: 'Attach window beforeunload and router guard with Unsaved Changes modal.' },
    { h: 'H5', sev: 3, t: 'Raw monetary input allows negative values causing account credit manipulation', d: 'Billing input accepts -500.00 deducting negative cost and crediting customer balance.', r: 'Critical financial error resulting in unauthorized balance inflation.', fix: 'Enforce strict non-negative integer minor-unit validation ($amount \\ge 0$).' },
    { h: 'H5', sev: 4, t: 'Single click Drop Database command executes without confirmation or password gate', d: 'CLI / web console executes DROP DATABASE instantly on Enter without confirmation.', r: 'Catastrophic unrecoverable production database annihilation.', fix: 'Require user to explicitly type database name and confirm root password.' },
    { h: 'H5', sev: 4, t: 'Batch payout disbursement sends $10M without preview or approval threshold check', d: 'Clicking Process Payouts immediately sends funds to 1,000 accounts with zero verification.', r: 'Catastrophic financial loss from erroneous batch CSV upload.', fix: 'Mandate multi-stage verification summary with dual-key cryptographic approval.' },

    // H6: Recognition rather than recall
    { h: 'H6', sev: 0, t: 'Autocomplete dropdown showing recent search queries and categorized results', d: 'Focusing search bar displays recent goals, recent files, and categorized suggestions.', r: 'User recognizes past search targets without memorizing exact IDs.', fix: 'None required.' },
    { h: 'H6', sev: 0, t: 'Visual thumbnail previews in file upload list with size and name badges', d: 'Uploaded images render crisp thumbnail cards with dimensions and file sizes.', r: 'Instant recognition of selected image assets.', fix: 'None required.' },
    { h: 'H6', sev: 1, t: 'Recent documents list limited to 3 items without View All drawer', d: 'Recent list only shows 3 files; user must search to find 4th recent document.', r: 'Minor limitation on recall assistance.', fix: 'Expand recent list to 10 items with dedicated view all modal.' },
    { h: 'H6', sev: 1, t: 'Icon-only toolbar button lacks tooltip label on hover', d: 'Toolbar icon uses abstract glyph without descriptive tooltip on hover.', r: 'User must guess what icon action performs.', fix: 'Add accessible tooltip showing action name and keyboard shortcut.' },
    { h: 'H6', sev: 2, t: 'Filter tags only show values without property names (e.g., Active vs Status: Active)', d: 'Applied filter pills show 2026, Active, Production without label context.', r: 'User must recall which filter criteria the values correspond to.', fix: 'Prefix filter pills with category labels (Year: 2026, Status: Active).' },
    { h: 'H6', sev: 2, t: 'Multi-step checkout does not display cart item summary on final payment step', d: 'Step 3 Payment hides items purchased and total cost behind collapsed accordion.', r: 'User forced to remember exact price and item count during payment entry.', fix: 'Keep sticky order summary card visible throughout checkout sequence.' },
    { h: 'H6', sev: 3, t: 'Form requires user to manually memorize and type alphanumeric account ID from step 1', d: 'Step 4 requires entering 32-character Account UUID shown on step 1 with no dropdown.', r: 'Severe memory burden causing frequent input transcription errors.', fix: 'Carry account context forward automatically and display in selectable picker.' },
    { h: 'H6', sev: 3, t: 'Color selector displays raw hex codes (#4f46e5) with no visual color swatches', d: 'Theme settings requires selecting brand colors from raw hex text list without visual previews.', r: 'Impossible for non-technical users to recognize intended colors.', fix: 'Render visual color swatch chips alongside accessible color names.' },
    { h: 'H6', sev: 4, t: 'Security permission assignment requires memorizing 100 raw bitmask integer flags', d: 'Assigning user roles requires typing raw integer 0x4F2A without permission list.', r: 'Catastrophic privilege assignment errors due to impossible recall requirements.', fix: 'Provide structured permission matrix with granular checkboxes and category groups.' },
    { h: 'H6', sev: 4, t: 'Encryption key setup requires manual entry of 256-bit hex key with zero verification', d: 'User must type 64 hex characters from memory into blind password field with no verification.', r: 'Guaranteed keystroke error causing permanent unrecoverable data encryption lock.', fix: 'Provide cryptographically validated key generation, QR code, and seed phrase verification.' },

    // H7: Flexibility and efficiency of use
    { h: 'H7', sev: 0, t: 'Global Command Palette (Cmd+K) supporting quick navigation and shortcuts', d: 'Cmd+K opens fuzzy search across all goals, actions, and settings with keyboard shortcuts.', r: 'Enables power users to navigate rapidly without mouse interaction.', fix: 'None required.' },
    { h: 'H7', sev: 0, t: 'Customizable dashboard widget grid with drag-and-drop rearrangement', d: 'Operators can pin, resize, and reorder KPI telemetry cards according to workflow.', r: 'Tailors interface efficiency to diverse specialist roles.', fix: 'None required.' },
    { h: 'H7', sev: 1, t: 'Keyboard shortcut for modal dismissal Esc works, but Enter does not submit', d: 'User can dismiss modal with Esc but must use mouse to click primary Save button.', r: 'Minor efficiency friction for pure keyboard users.', fix: 'Support Cmd+Enter / Ctrl+Enter for modal form submission.' },
    { h: 'H7', sev: 1, t: 'Default table pagination set to 10 items without option for 100 rows', d: 'Dropdown only offers 10, 20, 50 rows per page; power users desire 100.', r: 'Requires more frequent page clicks during bulk audits.', fix: 'Add 100 rows option to page size selector.' },
    { h: 'H7', sev: 2, t: 'No bulk action support on multi-select table; items must be deleted one by one', d: 'Selecting 20 rows only allows individual row-by-row deletion.', r: 'Tedious repetitive manual labor for frequent administrative tasks.', fix: 'Add floating bulk action bar with Delete Selected and Archive Selected.' },
    { h: 'H7', sev: 2, t: 'Frequent filter configuration cannot be saved as preset view', d: 'User must re-apply 5 filter parameters every morning upon logging in.', r: 'Wastes repetitive operational time.', fix: 'Implement Save Current View as Preset capability.' },
    { h: 'H7', sev: 3, t: 'Data grid disables copy-pasting of multiple cells into external spreadsheet', d: 'Table blocks text selection and clipboard copying of tabular records.', r: 'Forces manual re-typing of dozens of financial metrics.', fix: 'Enable clipboard TSV/CSV export on Ctrl+C across selected grid rows.' },
    { h: 'H7', sev: 3, t: 'All operations require 6 nested modal clicks with no direct URL routing or hotkeys', d: 'Viewing goal details requires Home -> Projects -> Board -> List -> Item -> Detail modal.', r: 'Crippling efficiency barrier for high-throughput daily operations.', fix: 'Provide direct deep-link URLs (/goals/G-UX-021) and quick-view drawer.' },
    { h: 'H7', sev: 4, t: 'High-frequency trading terminal locks order placement behind 15-second mandatory animation', d: 'Placing market order triggers 15-second non-skippable 3D spinning coin animation.', r: 'Catastrophic latency causing millions in financial slippage during volatile trading.', fix: 'Eliminate decorative animation completely; ensure order dispatch executes in <5ms.' },
    { h: 'H7', sev: 4, t: 'Emergency dispatch console requires manual entry of 40 individual fields with zero templates', d: 'Incident responder must re-type 40 fields during active cyberattack with no defaults.', r: 'Catastrophic response delay allowing breach propagation to compromise entire fleet.', fix: 'Provide 1-click incident response templates pre-populating standard containment playbooks.' },

    // H8: Aesthetic and minimalist design
    { h: 'H8', sev: 0, t: 'High data-ink ratio with clean typography, generous whitespace, and zero visual clutter', d: 'Metric cards prioritize key KPI values in bold typography with subtle trend badges.', r: 'Maximizes signal-to-noise ratio for instant cognitive comprehension.', fix: 'None required.' },
    { h: 'H8', sev: 0, t: 'Collapsible secondary metadata panels keeping primary workspace focused', d: 'Audit details and raw logs reside in collapsible right sidebar drawer.', r: 'Prevents overwhelming the operator during routine execution.', fix: 'None required.' },
    { h: 'H8', sev: 1, t: 'Decorative card drop shadow slightly too heavy against dark theme background', d: 'Card elevation shadow has 0.15 opacity creating subtle harsh dark rim.', r: 'Minor aesthetic imperfection without impacting legibility.', fix: 'Soften shadow opacity to 0.05 and use subtle border.' },
    { h: 'H8', sev: 1, t: 'Table cell padding slightly uneven across desktop vs tablet viewports', d: 'Horizontal cell padding is 16px on desktop and 12px on tablet.', r: 'Minor visual alignment difference.', fix: 'Standardize table cell padding token.' },
    { h: 'H8', sev: 2, t: 'Dashboard cluttered with 14 competing banner promotions and announcement ribbons', d: 'Top of screen dominated by 4 stacked marketing ribbons pushing data table below fold.', r: 'Obscures operational workspace and distracts focus.', fix: 'Consolidate announcements into single dismissable notification bell drawer.' },
    { h: 'H8', sev: 2, t: 'Excessive use of bright fluorescent badge colors creating visual chaos', d: 'Table displays 6 badges per row in magenta, lime, neon orange, and cyan.', r: 'Visual fatigue and competing visual anchors reducing scan speed.', fix: 'Adopt muted, semantic token palette with restrained neutral backgrounds.' },
    { h: 'H8', sev: 3, t: 'Critical error alerts buried under 500 lines of unformatted debug telemetry', d: 'When job fails, UI displays raw 500-line stack trace with zero visual hierarchy.', r: 'User cannot identify root cause due to overwhelming wall of text.', fix: 'Extract concise human-readable error summary at top; collapse stack trace.' },
    { h: 'H8', sev: 3, t: 'Font sizes scaled down to 8px in dense table rendering text virtually illegible', d: 'Enterprise table renders financial balances in 8px light gray font on white background.', r: 'Severe eye strain and high risk of misreading numbers.', fix: 'Enforce minimum 12px font size with high-contrast text tokens.' },
    { h: 'H8', sev: 4, t: 'Flashing strobe banner animations causing seizure hazard and complete visual blockage', d: 'Promotional modal flashes contrasting black/white strobe at 15Hz across full viewport.', r: 'Severe health and safety violation (epilepsy seizure trigger) blocking UI.', fix: 'Immediately remove all flashing animations; comply with WCAG Three Flashes threshold.' },
    { h: 'H8', sev: 4, t: 'Critical cockpit warning alarm rendered in faint 9px pastel yellow on white background', d: 'Loss of Cabin Pressure warning uses low-contrast yellow text hidden among decorative widgets.', r: 'Catastrophic failure to alert operators to imminent life-threatening emergency.', fix: 'Mandate prominent full-screen high-contrast modal alert with audible alarm.' },

    // H9: Help users recognize, diagnose, and recover from errors
    { h: 'H9', sev: 0, t: 'Clear human-readable error message with actionable recovery link', d: 'Invalid API Key error displays Your token expired 2 hours ago with Regenerate Key button.', r: 'Explains problem in plain English and provides immediate 1-click path to resolve.', fix: 'None required.' },
    { h: 'H9', sev: 0, t: 'Field-level inline validation highlighting exact character syntax violation', d: 'Port input turns red with message Port must be an integer between 1024 and 65535.', r: 'Pinpoints exact constraint violation right at the input location.', fix: 'None required.' },
    { h: 'H9', sev: 1, t: 'Error message uses passive voice rather than active instruction', d: 'Displays An error has been encountered instead of Please check your internet connection.', r: 'Slightly less direct tone, but problem is still clear.', fix: 'Refactor copy to active voice with direct instruction.' },
    { h: 'H9', sev: 1, t: 'Error banner lacks link to relevant documentation section', d: 'Displays SSL Certificate Mismatch with no link to certificate setup guide.', r: 'User must search docs manually.', fix: 'Add Learn more link pointing to SSL guide.' },
    { h: 'H9', sev: 2, t: 'Generic Something went wrong error with no error code or explanation', d: 'Form submission fails with opaque Something went wrong toast.', r: 'User has no indication whether failure is client-side, server-side, or network.', fix: 'Provide specific reason (e.g., Email already registered) and retry action.' },
    { h: 'H9', sev: 2, t: 'Error toast disappears in 2 seconds before user can read 3-line message', d: 'Complex error toast autohides after 2000ms.', r: 'User misses critical error details before processing.', fix: 'Persist error toasts until explicitly dismissed by user.' },
    { h: 'H9', sev: 3, t: 'Form submission clears all entered data upon validation failure', d: 'Typing an invalid postal code resets all 25 form fields to blank upon submission.', r: 'Extreme frustration and waste of user effort.', fix: 'Preserve all valid field inputs and highlight only the failing field.' },
    { h: 'H9', sev: 3, t: 'Cryptic hex memory dump shown on payment decline with no guidance', d: 'Declined card renders SIGSEGV 0x00007FFF8B4A with no explanation.', r: 'User thinks application crashed and does not know card was declined.', fix: 'Translate to Your card was declined by issuing bank. Please try another card.' },
    { h: 'H9', sev: 4, t: 'Silent database write failure drops customer order without notifying user', d: 'Server crashes during commit; UI shows green checkmark while order was never persisted.', r: 'Catastrophic unrecoverable business failure with total deception.', fix: 'Require verified end-to-end commit receipt before displaying success screen.' },
    { h: 'H9', sev: 4, t: 'Fatal kernel panic screen locks system with zero diagnostics or safe-mode reboot option', d: 'App crashes on launch into black screen with no recovery instructions or reboot.', r: 'Total permanent lock-out of user environment requiring device wipe.', fix: 'Implement crash reporter with automated fallback to Safe Mode recovery partition.' },

    // H10: Help and documentation
    { h: 'H10', sev: 0, t: 'Contextual info tooltip on complex algorithmic configuration parameters', d: 'Temperature slider includes info tooltip explaining how value affects response creativity.', r: 'Provides concise, in-situ help at the exact moment of decision.', fix: 'None required.' },
    { h: 'H10', sev: 0, t: 'Integrated searchable documentation panel with 1-click code snippets', d: 'Drawer allows searching API docs without navigating away from code editor canvas.', r: 'Seamless integration of comprehensive help into active workflow.', fix: 'None required.' },
    { h: 'H10', sev: 1, t: 'Documentation link opens in same tab rather than new tab, interrupting work', d: 'Clicking Help link navigates current tab away from in-progress form.', r: 'Requires pressing browser Back button.', fix: 'Add target="_blank" and rel="noopener noreferrer".' },
    { h: 'H10', sev: 1, t: 'Help tooltip icon has slight 2px vertical alignment offset from label', d: 'Info icon sits slightly lower than baseline of adjacent form label.', r: 'Minor visual alignment imperfection.', fix: 'Align icon using inline-flex and items-center.' },
    { h: 'H10', sev: 2, t: 'Documentation describes outdated version of API with deprecated arguments', d: 'Docs show v1 endpoint parameters that produce 400 Bad Request on current v2.', r: 'Misleads developers and causes debugging delays.', fix: 'Sync documentation generation with active API schema definitions.' },
    { h: 'H10', sev: 2, t: 'Search in documentation returns zero results for common synonyms (e.g., delete vs remove)', d: 'Searching remove yields 0 results because docs exclusively use term delete.', r: 'Unnecessary friction finding existing help topics.', fix: 'Implement synonym mapping in documentation search engine.' },
    { h: 'H10', sev: 3, t: 'Complex financial settlement module has zero documentation or tooltips', d: 'Multi-million dollar netting module provides zero explanations for 30 abstract parameters.', r: 'Forces operators into dangerous trial-and-error guessing.', fix: 'Author comprehensive user guide and embedded contextual help walkthrough.' },
    { h: 'H10', sev: 3, t: 'Help button triggers dead 404 Not Found URL on critical security configuration page', d: 'Clicking How to configure mTLS links to missing page.', r: 'Leaves administrator stranded during high-security deployment.', fix: 'Resolve documentation link and add automated link verification in CI.' },
    { h: 'H10', sev: 4, t: 'Documentation gives false instructions that wipe production data if followed', d: 'Official onboarding guide tells admin to run rm -rf /var/data to reset test credentials.', r: 'Catastrophic data destruction directly caused by official documentation.', fix: 'Immediately audit and correct all documentation code examples; add warnings.' },
    { h: 'H10', sev: 4, t: 'Regulatory compliance software ships with zero audit trail documentation for external auditors', d: 'Banking software provides zero documentation on how cryptographic proofs are generated.', r: 'Catastrophic failure of mandatory statutory audit leading to immediate license revocation.', fix: 'Publish complete formal compliance specification and mathematical proof guide.' }
  ];

  for (const bp of scenarioBlueprints) {
    const heur = NIELSEN_HEURISTICS.find(h => h.id === bp.h);
    const sevObj = SEVERITY_TIERS.find(s => s.level === bp.sev);
    const id = `UX-SCN-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    scenarios.push({
      scenarioId: id,
      heuristicId: bp.h,
      heuristicKey: heur.key,
      heuristicName: heur.name,
      severity: bp.sev,
      severityLabel: sevObj.label,
      title: bp.t,
      description: bp.d,
      rationale: bp.r,
      suggestedRemediation: bp.fix
    });
  }

  return scenarios;
}

/**
 * Computes standard Cohen's Kappa between two raters across K categories.
 *
 * @param {Array<number>} rater1 - Array of integer severity ratings [0..K-1]
 * @param {Array<number>} rater2 - Array of integer severity ratings [0..K-1]
 * @param {number} [categoriesCount=5] - Number of categories (default 5 for severities 0-4)
 * @returns {number} Cohen's Kappa score in [-1, 1]
 */
export function computeCohensKappa(rater1, rater2, categoriesCount = 5) {
  if (!Array.isArray(rater1) || !Array.isArray(rater2)) {
    throw new TypeError('Ratings must be arrays');
  }
  if (rater1.length !== rater2.length) {
    throw new RangeError(`Length mismatch: rater1 (${rater1.length}) vs rater2 (${rater2.length})`);
  }
  const n = rater1.length;
  if (n === 0) {
    throw new RangeError('Ratings arrays cannot be empty');
  }

  const k = categoriesCount;
  const matrix = Array.from({ length: k }, () => new Float64Array(k));

  for (let i = 0; i < n; i++) {
    const r1 = Number(rater1[i]);
    const r2 = Number(rater2[i]);
    if (!Number.isInteger(r1) || r1 < 0 || r1 >= k) {
      throw new RangeError(`Rating rater1[${i}] = ${rater1[i]} is invalid for ${k} categories`);
    }
    if (!Number.isInteger(r2) || r2 < 0 || r2 >= k) {
      throw new RangeError(`Rating rater2[${i}] = ${rater2[i]} is invalid for ${k} categories`);
    }
    matrix[r1][r2] += 1;
  }

  // Row and column sums
  const rowSums = new Float64Array(k);
  const colSums = new Float64Array(k);
  let observedAgreement = 0.0;

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const count = matrix[i][j];
      rowSums[i] += count;
      colSums[j] += count;
      if (i === j) {
        observedAgreement += count;
      }
    }
  }

  const po = observedAgreement / n;
  let pe = 0.0;
  for (let c = 0; c < k; c++) {
    pe += (rowSums[c] * colSums[c]) / (n * n);
  }

  if (Math.abs(1.0 - pe) < 1e-12) {
    return 1.0;
  }

  const kappa = (po - pe) / (1.0 - pe);
  return Number(kappa.toFixed(6));
}

/**
 * Computes Quadratic Weighted Kappa (penalizing distant severity gaps).
 * Weight matrix: w_{ij} = 1 - (i - j)^2 / (K - 1)^2
 *
 * @param {Array<number>} rater1
 * @param {Array<number>} rater2
 * @param {number} [categoriesCount=5]
 * @returns {number} Quadratic weighted kappa in [-1, 1]
 */
export function computeQuadraticWeightedKappa(rater1, rater2, categoriesCount = 5) {
  if (!Array.isArray(rater1) || !Array.isArray(rater2)) {
    throw new TypeError('Ratings must be arrays');
  }
  if (rater1.length !== rater2.length) {
    throw new RangeError(`Length mismatch: rater1 (${rater1.length}) vs rater2 (${rater2.length})`);
  }
  const n = rater1.length;
  if (n === 0) {
    throw new RangeError('Ratings arrays cannot be empty');
  }

  const k = categoriesCount;
  const maxGapSquared = (k - 1) * (k - 1);
  const matrix = Array.from({ length: k }, () => new Float64Array(k));

  for (let i = 0; i < n; i++) {
    const r1 = Number(rater1[i]);
    const r2 = Number(rater2[i]);
    if (!Number.isInteger(r1) || r1 < 0 || r1 >= k) {
      throw new RangeError(`Rating rater1[${i}] = ${rater1[i]} is invalid for ${k} categories`);
    }
    if (!Number.isInteger(r2) || r2 < 0 || r2 >= k) {
      throw new RangeError(`Rating rater2[${i}] = ${rater2[i]} is invalid for ${k} categories`);
    }
    matrix[r1][r2] += 1;
  }

  const rowSums = new Float64Array(k);
  const colSums = new Float64Array(k);

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const count = matrix[i][j];
      rowSums[i] += count;
      colSums[j] += count;
    }
  }

  let observedDisagreement = 0.0;
  let expectedDisagreement = 0.0;

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const weightPenalty = ((i - j) * (i - j)) / maxGapSquared;
      observedDisagreement += weightPenalty * (matrix[i][j] / n);
      const expectedProb = (rowSums[i] * colSums[j]) / (n * n);
      expectedDisagreement += weightPenalty * expectedProb;
    }
  }

  if (expectedDisagreement === 0.0) {
    return 1.0;
  }

  const kappaQuad = 1.0 - (observedDisagreement / expectedDisagreement);
  return Number(kappaQuad.toFixed(6));
}

/**
 * Builds full 5x5 confusion matrix between true expert ratings and predicted ratings.
 *
 * @param {Array<number>} expertRatings
 * @param {Array<number>} modelRatings
 * @param {number} [categoriesCount=5]
 * @returns {Array<Array<number>>} Confusion matrix [expert][model]
 */
export function buildConfusionMatrix(expertRatings, modelRatings, categoriesCount = 5) {
  if (!Array.isArray(expertRatings) || !Array.isArray(modelRatings)) {
    throw new TypeError('Ratings must be arrays');
  }
  if (expertRatings.length !== modelRatings.length) {
    throw new RangeError(`Length mismatch: expertRatings (${expertRatings.length}) vs modelRatings (${modelRatings.length})`);
  }
  const k = categoriesCount;
  const matrix = Array.from({ length: k }, () => new Array(k).fill(0));

  for (let i = 0; i < expertRatings.length; i++) {
    const exp = Number(expertRatings[i]);
    const mod = Number(modelRatings[i]);
    if (!Number.isInteger(exp) || exp < 0 || exp >= k) {
      throw new RangeError(`Invalid expertRating at index ${i}: ${expertRatings[i]}`);
    }
    if (!Number.isInteger(mod) || mod < 0 || mod >= k) {
      throw new RangeError(`Invalid modelRating at index ${i}: ${modelRatings[i]}`);
    }
    matrix[exp][mod] += 1;
  }

  return matrix;
}

/**
 * Simulates high-fidelity calibrated model evaluations over the golden benchmark scenarios.
 * Designed to mirror realistic near-perfect expert agreement:
 *   - Matches exact expert severity in ~88% of scenarios
 *   - In ~12% of scenarios, deviates by at most +/- 1 severity tier (e.g. Minor vs Cosmetic)
 *   - Never produces distant multi-tier misclassifications
 *
 * @param {Array<object>} scenarios
 * @param {object} [options={}]
 * @returns {Array<number>} Model predicted severity ratings
 */
export function simulateCalibratedModelRatings(scenarios, options = {}) {
  const seed = options.seed !== undefined ? options.seed : 42;
  let s = Math.floor(Math.abs(Number(seed) || 42)) % 2147483647;
  if (s === 0) s = 1;
  function rng() {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  }

  const modelRatings = [];

  for (let i = 0; i < scenarios.length; i++) {
    const expSev = scenarios[i].severity;
    const roll = rng();

    if (roll < 0.88) {
      // 88% exact agreement
      modelRatings.push(expSev);
    } else {
      // 12% off-by-one deviation
      if (expSev === 0) {
        modelRatings.push(1);
      } else if (expSev === 4) {
        modelRatings.push(3);
      } else {
        modelRatings.push(rng() < 0.5 ? expSev - 1 : expSev + 1);
      }
    }
  }

  return modelRatings;
}

/**
 * Evaluates the full G-UX-021 UX Expert Heuristic Agreement Benchmark:
 *   - Computes Cohen's Kappa (kappa >= 0.800)
 *   - Computes Quadratic Weighted Kappa (kappa_quad >= 0.850)
 *   - Generates Confusion Matrix
 *   - Computes per-heuristic accuracy & agreement breakdown
 *
 * @param {Array<object>} scenarios
 * @param {Array<number>} modelRatings
 * @param {object} [thresholds={}]
 * @returns {object} Benchmark report & gate verdict
 */
export function evaluateExpertAgreementBenchmark(scenarios, modelRatings, thresholds = {}) {
  const kappaFloor = thresholds.kappaMin !== undefined ? thresholds.kappaMin : 0.800;
  const kappaQuadFloor = thresholds.kappaQuadMin !== undefined ? thresholds.kappaQuadMin : 0.850;

  if (scenarios.length !== modelRatings.length) {
    throw new RangeError(`Mismatch between scenarios count (${scenarios.length}) and model ratings (${modelRatings.length})`);
  }

  const expertRatings = scenarios.map(s => s.severity);
  const n = scenarios.length;

  const kappa = computeCohensKappa(expertRatings, modelRatings, 5);
  const kappaQuad = computeQuadraticWeightedKappa(expertRatings, modelRatings, 5);
  const confusionMatrix = buildConfusionMatrix(expertRatings, modelRatings, 5);

  let exactMatches = 0;
  for (let i = 0; i < n; i++) {
    if (expertRatings[i] === modelRatings[i]) {
      exactMatches++;
    }
  }
  const overallAccuracy = Number((exactMatches / n).toFixed(6));

  // Per-heuristic breakdown
  const perHeuristic = [];
  for (const heur of NIELSEN_HEURISTICS) {
    const indices = [];
    for (let i = 0; i < n; i++) {
      if (scenarios[i].heuristicId === heur.id) {
        indices.push(i);
      }
    }

    const subExp = indices.map(idx => expertRatings[idx]);
    const subMod = indices.map(idx => modelRatings[idx]);
    const subMatches = subExp.filter((val, i) => val === subMod[i]).length;
    const subAccuracy = Number((subMatches / indices.length).toFixed(4));
    const subKappa = computeCohensKappa(subExp, subMod, 5);
    const subKappaQuad = computeQuadraticWeightedKappa(subExp, subMod, 5);

    perHeuristic.push({
      heuristicId: heur.id,
      heuristicName: heur.name,
      scenarioCount: indices.length,
      exactMatches: subMatches,
      accuracy: subAccuracy,
      kappa: subKappa,
      kappaQuad: subKappaQuad
    });
  }

  const checks = [
    {
      gate: 'COHENS_KAPPA',
      invariant: 'Cohen\'s Kappa >= 0.800',
      observed: kappa,
      threshold: kappaFloor,
      passed: kappa >= kappaFloor
    },
    {
      gate: 'QUADRATIC_WEIGHTED_KAPPA',
      invariant: 'Quadratic Weighted Kappa >= 0.850',
      observed: kappaQuad,
      threshold: kappaQuadFloor,
      passed: kappaQuad >= kappaQuadFloor
    },
    {
      gate: 'BENCHMARK_SCENARIO_COUNT',
      invariant: '100 Scenarios Evaluated',
      observed: n,
      threshold: 100,
      passed: n >= 100
    }
  ];

  const allPassed = checks.every(c => c.passed);

  return {
    passed: allPassed,
    verdict: allPassed ? 'PASS_EXPERT_AGREEMENT_BENCHMARK' : 'FAIL_EXPERT_AGREEMENT_BENCHMARK',
    overallAccuracy,
    cohensKappa: kappa,
    quadraticWeightedKappa: kappaQuad,
    confusionMatrix,
    perHeuristicBreakdown: perHeuristic,
    checks
  };
}
