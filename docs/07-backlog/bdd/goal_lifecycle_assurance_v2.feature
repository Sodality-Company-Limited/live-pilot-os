Feature: Soda OS Goal Lifecycle Assurance System & Template v2
  As a Soda OS Governance Kernel and Release Engineer
  I want to transition from static document conformance to comprehensive goal lifecycle assurance
  So that every claim in a goal card is proven to be executable, measurable, traceable, reproducible, safe, reversible, and connected to learning.

  Background:
    Given the Soda OS repository root is initialized with Template v2 support
    And the canonical profile schema directory exists at "docs/03-architecture/profiles/"

  Scenario: Extract and validate machine-readable goal_contract header
    Given a goal card with a YAML frontmatter "goal_contract" block
    When the goal assurance harness parses the goal card
    Then it MUST successfully extract "id", "version: 2", "kind", "profiles", "atomicity", "risk", "reversibility", and "lifecycle"
    And it MUST reject any goal where "version" is not 2 or "profiles" does not contain "core"

  Scenario: Profile schema validation for specialized domain goals
    Given a goal card declaring profiles "core" and "ml_research"
    When the profile conformance harness validates the goal against "docs/03-architecture/profiles/ml_research.yaml"
    Then the goal MUST declare model identity, dataset identity, label oracle, training contract, and calibration metric thresholds
    And the goal MUST fail validation if any mandatory profile section is missing or empty

  Scenario: Goal atomicity and outcome graph validation
    Given a goal card declaring an outcome graph in "atomicity"
    When the atomicity harness evaluates the outcome count
    Then the goal MUST have exactly 1 primary outcome
    And if compound verbs indicating multiple deliverables are detected without split candidates, the harness MUST flag the goal for decomposition

  Scenario: Dependency DAG cycle detection and topological validation
    Given a set of goal cards with declared dependencies in "dependencies"
    When the dependency DAG harness builds the directed dependency graph
    Then it MUST detect and reject any circular dependency cycles
    And it MUST verify that all referenced dependency goal IDs exist in the backlog
    And it MUST prevent a goal from advancing to "ready" if an upstream dependency is still "draft" or "in_progress"

  Scenario: Scope drift detection across Intent, In/Out, Work Steps, and Touch Map
    Given a goal card with declared "In", "Out", "Work steps", and "Touch map"
    When the scope drift harness performs cross-sectional entity analysis
    Then every file in "Work steps" MUST be present in "Touch map"
    And any modification to paths explicitly listed in "Out" MUST immediately fail verification

  Scenario: Failure policy and rollback verification
    Given an implementation goal declaring a "failure_policy" and "rollback" contract
    When the rollback harness inspects the failure contracts
    Then it MUST verify explicit policies for dependency unavailability, invalid inputs, verification failures, and timeouts
    And it MUST verify that the rollback command is syntactically valid and scoped strictly to the touch map

  Scenario: Multi-dimensional lifecycle gate verification
    Given a goal card declaring a multi-dimensional "lifecycle" status block
    When the goal completion receipt harness evaluates the transition to "verified"
    Then it MUST verify the presence of a valid cryptographic proof receipt in "artifacts/proofs/<GOAL-ID>_proof_receipt.json"
    And it MUST verify that the receipt matches the current Git HEAD and source file SHA-256 digests
    And it MUST reject transition to "shipped" without human reviewer sign-off
