/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UI TAXONOMY & STANDARD LABELING SPECIFICATION (STAGE 1 CURRICULUM)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M3 / G-UX-009)
 * Purpose: Complete, production-ready specification of the 32 canonical UI classes
 *          across 6 functional categories, 7 interaction states, ARIA role mappings,
 *          WCAG 2.2 AAA touch target standards, and element-level validation logic.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const UI_TAXONOMY_SCHEMA_VERSION = 1;
export const UI_TAXONOMY_VERSION = '1.0.0';

export const INTERACTION_STATES = Object.freeze([
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'error',
  'loading'
]);

export const CATEGORIES = Object.freeze({
  container: {
    name: 'container',
    description: 'Structural framing and grouping elements that establish layout hierarchy and containment.',
    element_count: 8,
    classes: [
      'ScreenRoot',
      'ModalDialog',
      'CardContainer',
      'DrawerPanel',
      'SidebarNavigation',
      'HeaderBar',
      'FooterBar',
      'AccordionSection'
    ]
  },
  control: {
    name: 'control',
    description: 'Direct interactive triggers, action buttons, and form selection controls.',
    element_count: 7,
    classes: [
      'PrimaryButton',
      'SecondaryButton',
      'IconButton',
      'CheckboxControl',
      'RadioGroupControl',
      'SwitchToggle',
      'SliderControl'
    ]
  },
  input: {
    name: 'input',
    description: 'Data entry surfaces, text inputs, dropdown selectors, pickers, and upload zones.',
    element_count: 6,
    classes: [
      'TextInputField',
      'TextAreaField',
      'SelectDropdown',
      'DatePickerField',
      'SearchBarInput',
      'FileUploadZone'
    ]
  },
  display: {
    name: 'display',
    description: 'Read-only visual content, typography, badges, avatars, and graphical icons.',
    element_count: 5,
    classes: [
      'HeadingTypography',
      'BodyTypography',
      'BadgePill',
      'AvatarImage',
      'IconGlyph'
    ]
  },
  data_feedback: {
    name: 'data_feedback',
    description: 'Structured tabular data displays, metric aggregates, and asynchronous feedback banners.',
    element_count: 3,
    classes: [
      'TableViewGrid',
      'MetricStatCard',
      'AlertBannerToast'
    ]
  },
  navigation: {
    name: 'navigation',
    description: 'Wayfinding trails, hierarchical page links, tab strips, and pagination controls.',
    element_count: 3,
    classes: [
      'BreadcrumbTrail',
      'TabBarStrip',
      'PaginationControl'
    ]
  }
});

export const WCAG_TOUCH_TARGETS = Object.freeze({
  minimum_aaa_px: 44, // WCAG 2.2 AAA Target Size (Minimum) (SC 2.5.8 & 2.5.5)
  minimum_aa_px: 24   // WCAG 2.2 AA Target Size (Minimum) (SC 2.5.8)
});

export const CANONICAL_ELEMENTS = Object.freeze({
  // ── 1. Containers (8) ────────────────────────────────────────────────────────
  ScreenRoot: {
    class_name: 'ScreenRoot',
    category: 'container',
    description: 'Top-level viewport container encompassing the entire document surface.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['main', 'region', 'document', 'application'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: [],
    typical_children: ['HeaderBar', 'FooterBar', 'SidebarNavigation', 'CardContainer', 'ModalDialog', 'DrawerPanel']
  },
  ModalDialog: {
    class_name: 'ModalDialog',
    category: 'container',
    description: 'High-z-index interrupting overlay container trapping focus and requiring user action.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'loading'],
    allowed_aria_roles: ['dialog', 'alertdialog'],
    wcag_touch_target_px: { min_width: 200, min_height: 150 },
    typical_parents: ['ScreenRoot'],
    typical_children: ['HeadingTypography', 'BodyTypography', 'PrimaryButton', 'SecondaryButton', 'IconButton']
  },
  CardContainer: {
    class_name: 'CardContainer',
    category: 'container',
    description: 'Bounded surface grouping related visual information, actions, and media.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default', 'hover', 'focus'],
    allowed_aria_roles: ['region', 'article', 'group'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot', 'ModalDialog', 'DrawerPanel'],
    typical_children: ['HeadingTypography', 'BodyTypography', 'MetricStatCard', 'PrimaryButton', 'AvatarImage']
  },
  DrawerPanel: {
    class_name: 'DrawerPanel',
    category: 'container',
    description: 'Slide-in lateral overlay panel providing contextual actions, filtering, or secondary views.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'loading'],
    allowed_aria_roles: ['complementary', 'region', 'dialog'],
    wcag_touch_target_px: { min_width: 240, min_height: 200 },
    typical_parents: ['ScreenRoot'],
    typical_children: ['HeadingTypography', 'TextInputField', 'PrimaryButton', 'IconButton']
  },
  SidebarNavigation: {
    class_name: 'SidebarNavigation',
    category: 'container',
    description: 'Persistent vertical navigation column establishing primary application wayfinding.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['navigation', 'aside'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot'],
    typical_children: ['IconGlyph', 'BodyTypography', 'BadgePill', 'SecondaryButton']
  },
  HeaderBar: {
    class_name: 'HeaderBar',
    category: 'container',
    description: 'Top persistent masthead bar hosting logo, global navigation, and user identity triggers.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['banner', 'header'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot'],
    typical_children: ['HeadingTypography', 'SearchBarInput', 'IconButton', 'AvatarImage', 'BreadcrumbTrail']
  },
  FooterBar: {
    class_name: 'FooterBar',
    category: 'container',
    description: 'Bottom masthead surface containing legal links, copyright notices, and secondary navigation.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['contentinfo', 'footer'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot'],
    typical_children: ['BodyTypography', 'BreadcrumbTrail']
  },
  AccordionSection: {
    class_name: 'AccordionSection',
    category: 'container',
    description: 'Collapsible disclosure container revealing or hiding stacked content regions.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['region', 'group'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['ScreenRoot', 'CardContainer', 'DrawerPanel'],
    typical_children: ['HeadingTypography', 'BodyTypography', 'IconGlyph']
  },

  // ── 2. Controls (7) ──────────────────────────────────────────────────────────
  PrimaryButton: {
    class_name: 'PrimaryButton',
    category: 'control',
    description: 'Prominent, high-emphasis action button triggering the primary workflow mutation.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'loading'],
    allowed_aria_roles: ['button'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel', 'HeaderBar'],
    typical_children: ['IconGlyph', 'BodyTypography']
  },
  SecondaryButton: {
    class_name: 'SecondaryButton',
    category: 'control',
    description: 'Medium-emphasis alternative button for non-destructive, secondary or cancel actions.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'loading'],
    allowed_aria_roles: ['button'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel'],
    typical_children: ['IconGlyph', 'BodyTypography']
  },
  IconButton: {
    class_name: 'IconButton',
    category: 'control',
    description: 'Compact icon-only clickable trigger requiring explicit aria-label for accessibility.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['button'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['HeaderBar', 'CardContainer', 'ModalDialog', 'TableViewGrid'],
    typical_children: ['IconGlyph']
  },
  CheckboxControl: {
    class_name: 'CheckboxControl',
    category: 'control',
    description: 'Dual or tri-state boolean selector allowing multiple choices within a set.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'error'],
    allowed_aria_roles: ['checkbox'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'DrawerPanel', 'TableViewGrid'],
    typical_children: ['BodyTypography']
  },
  RadioGroupControl: {
    class_name: 'RadioGroupControl',
    category: 'control',
    description: 'Mutually exclusive single-choice selector within a grouped list of options.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'error'],
    allowed_aria_roles: ['radiogroup', 'radio'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel'],
    typical_children: ['BodyTypography']
  },
  SwitchToggle: {
    class_name: 'SwitchToggle',
    category: 'control',
    description: 'Instant binary state toggle representing an immediate on/off configuration change.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['switch'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'DrawerPanel', 'HeaderBar'],
    typical_children: []
  },
  SliderControl: {
    class_name: 'SliderControl',
    category: 'control',
    description: 'Continuous or stepped range selector for adjusting quantitative values.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['slider'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['CardContainer', 'DrawerPanel'],
    typical_children: []
  },

  // ── 3. Inputs (6) ────────────────────────────────────────────────────────────
  TextInputField: {
    class_name: 'TextInputField',
    category: 'input',
    description: 'Single-line text entry field with associated label, placeholder, and validation states.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'disabled', 'error'],
    allowed_aria_roles: ['textbox'],
    wcag_touch_target_px: { min_width: 120, min_height: 44 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel'],
    typical_children: ['IconGlyph']
  },
  TextAreaField: {
    class_name: 'TextAreaField',
    category: 'input',
    description: 'Multi-line expanded text entry field supporting scrolling and length constraints.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'disabled', 'error'],
    allowed_aria_roles: ['textbox'],
    wcag_touch_target_px: { min_width: 160, min_height: 64 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel'],
    typical_children: []
  },
  SelectDropdown: {
    class_name: 'SelectDropdown',
    category: 'input',
    description: 'Expandable option selection box displaying currently selected value and flyout list.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'error'],
    allowed_aria_roles: ['combobox', 'listbox'],
    wcag_touch_target_px: { min_width: 120, min_height: 44 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel', 'HeaderBar'],
    typical_children: ['IconGlyph', 'BodyTypography']
  },
  DatePickerField: {
    class_name: 'DatePickerField',
    category: 'input',
    description: 'Temporal date/time selection surface with popover calendar grid traversal.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'disabled', 'error'],
    allowed_aria_roles: ['combobox', 'dialog'],
    wcag_touch_target_px: { min_width: 140, min_height: 44 },
    typical_parents: ['CardContainer', 'DrawerPanel'],
    typical_children: ['IconGlyph']
  },
  SearchBarInput: {
    class_name: 'SearchBarInput',
    category: 'input',
    description: 'High-visibility query text field with instant clear and search execution triggers.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'disabled'],
    allowed_aria_roles: ['searchbox'],
    wcag_touch_target_px: { min_width: 180, min_height: 44 },
    typical_parents: ['HeaderBar', 'ScreenRoot', 'SidebarNavigation'],
    typical_children: ['IconGlyph', 'IconButton']
  },
  FileUploadZone: {
    class_name: 'FileUploadZone',
    category: 'input',
    description: 'Drag-and-drop file target zone with browse button and progress indicator.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled', 'error', 'loading'],
    allowed_aria_roles: ['region', 'button'],
    wcag_touch_target_px: { min_width: 200, min_height: 80 },
    typical_parents: ['CardContainer', 'ModalDialog', 'DrawerPanel'],
    typical_children: ['IconGlyph', 'BodyTypography', 'PrimaryButton']
  },

  // ── 4. Display (5) ───────────────────────────────────────────────────────────
  HeadingTypography: {
    class_name: 'HeadingTypography',
    category: 'display',
    description: 'Semantic hierarchical title element establishing content structure and section boundaries.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['heading'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot', 'CardContainer', 'ModalDialog', 'HeaderBar', 'DrawerPanel'],
    typical_children: []
  },
  BodyTypography: {
    class_name: 'BodyTypography',
    category: 'display',
    description: 'Standard reading text, descriptions, captions, and paragraph prose.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['paragraph', 'generic'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['ScreenRoot', 'CardContainer', 'ModalDialog', 'FooterBar', 'DrawerPanel'],
    typical_children: []
  },
  BadgePill: {
    class_name: 'BadgePill',
    category: 'display',
    description: 'Compact visual token indicating status, numerical count, or categorical tag.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default', 'hover'],
    allowed_aria_roles: ['status', 'generic'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['CardContainer', 'HeaderBar', 'SidebarNavigation', 'TableViewGrid'],
    typical_children: ['IconGlyph']
  },
  AvatarImage: {
    class_name: 'AvatarImage',
    category: 'display',
    description: 'Circular or rounded user representation displaying portrait image or initial glyphs.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default', 'hover', 'focus'],
    allowed_aria_roles: ['img'],
    wcag_touch_target_px: { min_width: 24, min_height: 24 },
    typical_parents: ['HeaderBar', 'CardContainer', 'SidebarNavigation', 'TableViewGrid'],
    typical_children: []
  },
  IconGlyph: {
    class_name: 'IconGlyph',
    category: 'display',
    description: 'Vector symbol communicating meaning, visual metaphor, or action affordance.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default'],
    allowed_aria_roles: ['img', 'presentation', 'none'],
    wcag_touch_target_px: { min_width: 0, min_height: 0 },
    typical_parents: ['PrimaryButton', 'SecondaryButton', 'IconButton', 'HeaderBar', 'CardContainer', 'BadgePill'],
    typical_children: []
  },

  // ── 5. Data & Feedback (3) ───────────────────────────────────────────────────
  TableViewGrid: {
    class_name: 'TableViewGrid',
    category: 'data_feedback',
    description: 'Tabular dense data grid with column headers, sorting, row selection, and cells.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'loading', 'error'],
    allowed_aria_roles: ['table', 'grid'],
    wcag_touch_target_px: { min_width: 300, min_height: 120 },
    typical_parents: ['ScreenRoot', 'CardContainer'],
    typical_children: ['CheckboxControl', 'IconButton', 'BadgePill', 'AvatarImage', 'BodyTypography']
  },
  MetricStatCard: {
    class_name: 'MetricStatCard',
    category: 'data_feedback',
    description: 'High-density telemetry KPI card featuring headline metric, trend delta, and sparkline.',
    is_interactive: false,
    keyboard_focusable: false,
    allowed_states: ['default', 'hover', 'loading'],
    allowed_aria_roles: ['region', 'group'],
    wcag_touch_target_px: { min_width: 140, min_height: 80 },
    typical_parents: ['ScreenRoot', 'CardContainer'],
    typical_children: ['HeadingTypography', 'BodyTypography', 'BadgePill', 'IconGlyph']
  },
  AlertBannerToast: {
    class_name: 'AlertBannerToast',
    category: 'data_feedback',
    description: 'Asynchronous system alert or floating toast announcing success, warning, or error message.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover'],
    allowed_aria_roles: ['alert', 'status'],
    wcag_touch_target_px: { min_width: 240, min_height: 44 },
    typical_parents: ['ScreenRoot', 'CardContainer'],
    typical_children: ['IconGlyph', 'BodyTypography', 'IconButton']
  },

  // ── 6. Navigation (3) ────────────────────────────────────────────────────────
  BreadcrumbTrail: {
    class_name: 'BreadcrumbTrail',
    category: 'navigation',
    description: 'Hierarchical linear path of ancestor links showing current location within IA tree.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus'],
    allowed_aria_roles: ['navigation'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['HeaderBar', 'ScreenRoot', 'CardContainer'],
    typical_children: ['BodyTypography', 'IconGlyph']
  },
  TabBarStrip: {
    class_name: 'TabBarStrip',
    category: 'navigation',
    description: 'Horizontal or segmented row of tab controls switching active views in-place.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['tablist', 'tab'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['ScreenRoot', 'CardContainer', 'HeaderBar'],
    typical_children: ['IconGlyph', 'BodyTypography', 'BadgePill']
  },
  PaginationControl: {
    class_name: 'PaginationControl',
    category: 'navigation',
    description: 'Page selector offering previous/next, numeric jump buttons, and page size dropdown.',
    is_interactive: true,
    keyboard_focusable: true,
    allowed_states: ['default', 'hover', 'focus', 'active', 'disabled'],
    allowed_aria_roles: ['navigation'],
    wcag_touch_target_px: { min_width: 44, min_height: 44 },
    typical_parents: ['ScreenRoot', 'CardContainer', 'TableViewGrid'],
    typical_children: ['IconButton', 'SecondaryButton', 'BodyTypography']
  }
});

/**
 * Validates an element against the UI Taxonomy specification.
 */
export function validateElementLabel(element) {
  if (!element || typeof element !== 'object') {
    return { valid: false, errors: ['Element must be a non-null object'] };
  }

  const errors = [];
  const className = element.component_type || element.class_name;
  if (!className) {
    errors.push('Element is missing component_type / class_name');
    return { valid: false, errors };
  }

  const def = CANONICAL_ELEMENTS[className];
  if (!def) {
    errors.push(`Unknown component class '${className}'. Must be one of the 32 canonical classes.`);
    return { valid: false, errors };
  }

  // Validate category
  if (element.category && element.category !== def.category) {
    errors.push(`Category mismatch for '${className}': expected '${def.category}', got '${element.category}'`);
  }

  // Validate interaction state
  if (element.interaction_state) {
    if (!INTERACTION_STATES.includes(element.interaction_state)) {
      errors.push(`Invalid interaction_state '${element.interaction_state}'. Allowed: ${INTERACTION_STATES.join(', ')}`);
    } else if (!def.allowed_states.includes(element.interaction_state)) {
      errors.push(`State '${element.interaction_state}' not supported for class '${className}'. Allowed: ${def.allowed_states.join(', ')}`);
    }
  }

  // Validate ARIA roles
  if (element.aria && element.aria.role) {
    if (!def.allowed_aria_roles.includes(element.aria.role)) {
      errors.push(`ARIA role '${element.aria.role}' not permitted for class '${className}'. Allowed: ${def.allowed_aria_roles.join(', ')}`);
    }
  }

  // Validate touch target if interactive and explicit bbox provided
  if (def.is_interactive && Array.isArray(element.bbox) && element.bbox.length === 4) {
    const [, , w, h] = element.bbox;
    if (w < def.wcag_touch_target_px.min_width || h < def.wcag_touch_target_px.min_height) {
      // Touch target warning/error based on WCAG
      errors.push(
        `Touch target size [${w}x${h}px] is below minimum standard [${def.wcag_touch_target_px.min_width}x${def.wcag_touch_target_px.min_height}px] for interactive '${className}'`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    definition: def
  };
}

/**
 * Returns definition for a specific class.
 */
export function getTaxonomyDefinition(className) {
  return CANONICAL_ELEMENTS[className] || null;
}

/**
 * Lists all 32 taxonomy class names.
 */
export function listTaxonomyClasses() {
  return Object.keys(CANONICAL_ELEMENTS);
}

/**
 * Lists all 6 functional categories.
 */
export function listTaxonomyCategories() {
  return Object.keys(CATEGORIES);
}

/**
 * Returns array of class names in a given category.
 */
export function getClassesByCategory(category) {
  if (!CATEGORIES[category]) {
    throw new Error(`Unknown category: ${category}`);
  }
  return [...CATEGORIES[category].classes];
}

/**
 * Check if a class is interactive.
 */
export function isInteractive(className) {
  const def = CANONICAL_ELEMENTS[className];
  if (!def) return false;
  return def.is_interactive;
}

/**
 * Returns complete JSON object of taxonomy specification.
 */
export function getTaxonomySpecificationJson() {
  const allRoles = new Set();
  for (const def of Object.values(CANONICAL_ELEMENTS)) {
    for (const r of def.allowed_aria_roles) {
      allRoles.add(r);
    }
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schema_version: UI_TAXONOMY_SCHEMA_VERSION,
    taxonomy_version: UI_TAXONOMY_VERSION,
    categories: { ...CATEGORIES },
    elements: { ...CANONICAL_ELEMENTS },
    interaction_states: [...INTERACTION_STATES],
    aria_roles: Array.from(allRoles).sort(),
    wcag_touch_targets: { ...WCAG_TOUCH_TARGETS }
  };
}
