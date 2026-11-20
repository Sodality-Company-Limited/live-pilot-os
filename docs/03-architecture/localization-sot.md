# LivePilot OS — Enterprise Localization SOT

> **Status:** Production-readiness target; localization is a correctness and safety boundary.
> **Authority:** This document owns locale behavior, translation contracts, formatting, and localization release gates.
> **Architecture:** [overview.md](overview.md)
> **Technical baseline:** [technical-specifications-sot.md](technical-specifications-sot.md)
> **Quality contract:** [software-quality-sot.md](software-quality-sot.md)
> **Skill:** [.agents/skills/soda-accessibility-i18n-localization/SKILL.md](../../.agents/skills/soda-accessibility-i18n-localization/SKILL.md)

Localization must preserve meaning, safety, policy decisions, money, time, and
accessibility across locales. A translation fallback may change wording, but it may
not change authorization, inventory, margin, approval, or operational state.

## 1. Supported locale baseline

| Locale | Direction | Calendar/number baseline | Status |
|---|---|---|---|
| `en-US` | LTR | Gregorian, Latin digits | Required baseline |
| `th-TH` | LTR | Buddhist Era display where user-facing; ISO/Gregorian wire time | Required baseline |
| `ja-JP` | LTR | Gregorian, locale number/date formatting | Required baseline |
| `ar-SA` | RTL | Gregorian/Hijri display policy must be explicit | Production target |
| `he-IL` | RTL | Gregorian display policy must be explicit | Production target |

Unsupported or malformed locale tags resolve to the tenant’s configured default,
then `en-US`; the resolved locale is returned in response metadata and telemetry.

## 2. Locale resolution and trust

Resolution order is: authenticated user preference → tenant policy → supported
`Accept-Language` preference → application default. Browser-provided locale is a
preference only, never an authorization or tenant boundary. The server resolves and
records `requested_locale`, `resolved_locale`, `fallback_reason`, and `catalog_version`.

Use BCP 47 tags and canonicalize aliases. Persist user/tenant preferences as data;
do not infer locale from IP address. Locale changes are safe to retry and must not
mutate business state.

## 3. Translation contract

- All user-facing strings, labels, errors, notifications, accessibility names, and
  empty/loading/failure states use typed message keys; hardcoded UI copy is forbidden.
- Keys are stable semantic identifiers, not English sentences: `inventory.reserve.success`.
- Messages use ICU MessageFormat for plural, select, gender, and rich text variables.
- Variables are typed, escaped, named, and validated; translators never receive raw
  secrets, tokens, PII, prompts, or unredacted supplier data.
- Product owns terminology and context. Human review is required for new or changed
  safety, financial, legal, moderation, and irreversible-action messages.
- Missing keys fail visibly in non-production and use a safe approved fallback in
  production; missing translation telemetry is emitted and release gates fail.

## 4. Formatting and domain safety

| Domain | Rule |
|---|---|
| Money | Integer minor units + ISO 4217 currency; format with locale-aware APIs only |
| Percentages | Store basis points/decimal policy value; format locale-aware with explicit precision |
| Dates | Store UTC instants; render timezone and calendar explicitly |
| Thai dates | Buddhist Era is presentation only; wire/persistence remains ISO/Gregorian |
| Time zones | IANA zone IDs; never use device offset as a business timezone |
| Numbers | Locale-aware grouping/decimal separators; never parse localized display text as truth |
| Units | Use typed unit/currency messages; never concatenate symbols manually |
| IDs/codes | Keep machine identifiers unchanged; provide localized labels separately |

## 5. RTL and accessible UI

- Set `dir` from the resolved locale at the document root and expose it to assistive technology.
- Use CSS logical properties (`margin-inline`, `inset-inline`, `border-inline`) rather
  than physical left/right rules for layout.
- Mirror directional icons only when direction has semantic meaning; do not mirror
  brand marks, charts, numbers, code, or product imagery.
- Test long strings, expansion, truncation, mixed scripts, bidirectional text,
  Arabic shaping, Thai line breaking, focus order, live regions, and keyboard use.
- Localized status changes must retain `aria-live` semantics and accessible names.
- Meet the repository accessibility target: WCAG 2.2 AAA for supported surfaces,
  including 7:1 normal-text contrast and 44×44px touch targets.

## 6. Catalog lifecycle and ownership

Catalogs are versioned artifacts with source locale, review status, translator/reviewer,
context notes, and release version. The pipeline is:

```text
key proposal → source copy review → translation → linguistic review
  → automated schema/placeholder checks → UI locale tests → release catalog
```

Removing or renaming a key requires a deprecation window and consumer search. Catalog
changes are backward compatible within a release; incompatible message variable changes
require a new key or major catalog version.

## 7. Security and operational requirements

- Never expose translation-service credentials to clients or embed secrets in catalogs.
- Treat translated content as untrusted output: escape HTML, prohibit executable markup,
  and allow only an approved rich-text subset.
- Redact locale payloads in logs; retain key, locale, catalog version, and error class,
  not sensitive interpolated values.
- Track catalog load failures, fallback rate, missing-key rate, stale catalog age,
  formatting errors, and locale-specific UI error rate.
- Cache catalogs by immutable version and locale. Rollback restores the previous
  catalog atomically without changing domain data.

## 8. Required verification

- Catalog schema and ICU placeholder parity for every supported locale.
- No hardcoded user-facing strings in changed UI surfaces.
- Locale negotiation tests for malformed, unsupported, tenant, user, and header values.
- Currency/date/number golden tests for `en-US`, `th-TH`, `ja-JP`, and RTL locales.
- Visual and interaction tests for LTR/RTL, long strings, mixed scripts, and keyboard/screen reader behavior.
- Security tests for escaped variables, restricted rich text, secret redaction, and untrusted translation content.
- Production-like fallback, catalog outage, stale version, rollback, and cache invalidation tests.

## 9. Release gates

| Gate | Pass condition | Failure result |
|---|---|---|
| Coverage | All changed user-facing keys exist in every required catalog | Block release |
| Semantics | Placeholder types, plural rules, and safety wording pass review | Block release |
| Formatting | Money, dates, numbers, units, and timezone golden tests pass | Block release |
| Direction | LTR/RTL layout and icon behavior pass visual/interaction tests | Block release |
| Accessibility | WCAG, keyboard, focus, and live-region checks pass | Block release |
| Security | Escaping, redaction, catalog integrity, and secret checks pass | Block release |
| Operations | Versioned catalog rollout, fallback telemetry, cache, and rollback pass | Block production |

Localization is not production-ready when any supported locale is silently missing,
when a fallback hides a safety-critical message, or when localized display values are
used as business truth.
