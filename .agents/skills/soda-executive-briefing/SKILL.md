---
name: soda-executive-briefing
version: "1.0.0"
description: >-
  Translates deep engineering implementations, bug fixes, and architectural changes into concise,
  high-impact executive communication tailored for leadership (VPs, Directors, PMs, Founders).
  Shapes updates for JIRA, Slack, async standups, and email without technical jargon.
  Triggers: executive briefing, management update, leadership summary, non-technical, exec summary, slack update, standup note.
  Collaboration phase: REVIEW -> SHIP.
---

# Soda OS Executive Briefing & Leadership Communication

Translates engineering truth into high-signal communication for engineering leadership and cross-functional stakeholders.

---

## 🏛️ The Translation Matrix

```mermaid
graph LR
    ENG["Deep Engineering Context<br>(Rust stack traces, SQL locks, minor units)"] --> BRIEF["Executive Briefing Engine"]
    BRIEF --> JIRA["JIRA / Issue Tracker<br>(Structured, status, impact, owner)"]
    BRIEF --> SLACK["Slack / Messaging<br>(Bullet points, impact, next step)"]
    BRIEF --> STANDUP["Async Standup<br>(One-liner progress & unblockers)"]
    BRIEF --> EMAIL["Executive Email<br>(Bottom Line Up Front - BLUF)"]
```

### 1. Information Filtering Rules
- **KEEP:** Product/feature names, impact on user experience, SLA availability, financial/GMV implications, JIRA keys, PR links, and assigned owners.
- **STRIP:** Internal function names, memory addresses, variable names, regex expressions, and internal plumbing details.
- **TRANSLATE:** Describe mechanisms via clear cause-and-effect (e.g. *"Users experienced 502 errors due to session token expiration race"* rather than *"tokio mutex deadlock in GotrueTokenStore::refresh"*).

---

## 📋 Channel Formatting Specifications

### Channel A: JIRA Status Comment
```markdown
**Status:** [Fixed / In Review / Blocked]
**Customer Impact:** [Who was affected and how]
**Root Cause:** [1-2 sentences in plain English]
**Resolution:** [How the fix permanently resolves it]
**Next Steps:** [Code review, staging deployment, rollout schedule]
```

### Channel B: Slack Announcement
```markdown
*Update on [Feature / Issue Name]* (JIRA-xxx)
• *What happened:* [Plain English summary of symptom and scope]
• *Resolution:* [Fix deployed / in review; key impact]
• *Owner & Next Step:* [@Owner; rollout timeline]
```

### Channel C: Async Standup Update
```markdown
• *Completed:* [High-level deliverable + PR link]
• *In Progress:* [Current milestone]
• *Blockers:* [None / explicit dependencies]
```
