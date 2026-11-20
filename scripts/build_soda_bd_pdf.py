from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import HexColor
import os

OUT = "output/pdf/soda-os-business-development-context.pdf"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

navy = HexColor("#102A43")
blue = HexColor("#1976D2")
teal = HexColor("#0F766E")
ink = HexColor("#243B53")
muted = HexColor("#627D98")
light = HexColor("#F0F4F8")
accent = HexColor("#D9EAF7")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=30, leading=35, textColor=navy, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=14, leading=20, textColor=muted, spaceAfter=20))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=navy, spaceBefore=8, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=teal, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=ink, spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=muted, spaceAfter=4))
styles.add(ParagraphStyle(name="Quote", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=12, leading=17, textColor=navy, leftIndent=12, borderColor=blue, borderWidth=2, borderPadding=8, spaceBefore=6, spaceAfter=10))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.2, leading=11, textColor=ink))
styles.add(ParagraphStyle(name="CellHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.4, leading=11, textColor=colors.white))

def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def table(data, widths, header=True):
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.35, HexColor("#D9E2EC")),
        ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]
    if header:
        cmds += [("BACKGROUND", (0,0), (-1,0), navy), ("TEXTCOLOR", (0,0), (-1,0), colors.white)]
        start = 1
    else:
        start = 0
    for row in range(start, len(data)):
        if (row-start) % 2 == 0:
            cmds.append(("BACKGROUND", (0,row), (-1,row), light))
    t.setStyle(TableStyle(cmds))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(HexColor("#D9E2EC")); canvas.line(18*mm, 14*mm, 192*mm, 14*mm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(muted)
    canvas.drawString(18*mm, 9*mm, "Soda OS | Business Development Context")
    canvas.drawRightString(192*mm, 9*mm, f"{doc.page}")
    canvas.restoreState()

story = []
story += [Spacer(1, 32*mm), P("SODA OS", "CoverTitle"), P("Business Development Context", "CoverSub"),
          P("A repository-grounded strategic brief on how Soda OS can turn AI-assisted software delivery into a governed, measurable, and commercially scalable capability.", "Bodyx"), Spacer(1, 8*mm),
          table([[P("CORE POSITIONING", "CellHead")], [P("Governance and delivery operating system for AI-assisted software teams.", "Cell")]], [174*mm]),
          Spacer(1, 18*mm), P("Prepared from the Soda OS repository and its documented workflows, architecture, governance rules, and evidence model.", "Smallx"), PageBreak()]

story += [P("Executive summary", "H1x"), P("Soda OS is not primarily a code-generation product. It is an operating model and governance framework that controls how AI participates in software delivery. Its commercial promise is to help companies scale AI use without losing scope control, security, accountability, or quality.", "Bodyx"),
          P("Convert AI from an unpredictable individual contributor into a traceable, reviewable delivery capability.", "Quote"),
          P("The strongest initial business model is framework-plus-services: implementation, AI delivery governance, vertical compliance packs, and managed engineering. A centralized SaaS control plane is a plausible later expansion, but the current repository most clearly supports a framework and consulting-led offering.", "Bodyx"),
          P("What Soda OS governs", "H2x"), table([[P("Layer", "CellHead"), P("Business capability", "CellHead")],
          [P("Context", "Cell"), P("Give agents only the information required for the current task.", "Cell")], [P("Skill", "Cell"), P("Encode repeatable expert procedures for APIs, testing, security, deployment, and more.", "Cell")], [P("Goal", "Cell"), P("Turn business intent into a bounded, measurable delivery unit.", "Cell")], [P("Governance", "Cell"), P("Limit authority, scope, tools, branches, secrets, and production actions.", "Cell")], [P("Approval", "Cell"), P("Require evidence-backed transitions from draft through review and release.", "Cell")], [P("Audit", "Cell"), P("Preserve decisions, verification results, evidence, and post-release learning.", "Cell")]], [32*mm, 142*mm]), PageBreak()]

story += [P("The business problem", "H1x"), P("Most organizations can make an AI agent generate code. The difficult commercial problem is making that capability safe and repeatable across real teams, repositories, customers, and regulated environments.", "Bodyx"),
          table([[P("Problem", "CellHead"), P("Soda OS response", "CellHead"), P("Commercial value", "CellHead")],
          [P("Unclear scope", "Cell"), P("Goal cards with explicit in/out boundaries and acceptance criteria.", "Cell"), P("Less scope creep and more defensible milestones.", "Cell")],
          [P("Unreliable output", "Cell"), P("Required tests, review gates, evidence, and fail-closed behavior.", "Cell"), P("Lower rework and escaped-defect risk.", "Cell")],
          [P("Weak accountability", "Cell"), P("Traceability from conversation to decision, execution, and observation.", "Cell"), P("Clearer ownership for executives, customers, and auditors.", "Cell")],
          [P("Security exposure", "Cell"), P("Least-privilege context, tools, secrets, and production authority.", "Cell"), P("Safer enterprise AI adoption.", "Cell")],
          [P("No organizational learning", "Cell"), P("Post-ship observation and learning loop.", "Cell"), P("Each project improves future delivery.", "Cell")]], [36*mm, 78*mm, 60*mm]),
          P("The delivery cycle", "H2x"), P("DEFINE → PLAN → EXECUTE → REVIEW → SHIP, followed by observation and learning. Humans define scope and approve consequential transitions; agents perform bounded discovery, implementation, testing, documentation, and delivery preparation.", "Bodyx"),
          P("This is a control-and-confidence proposition, not merely a productivity proposition.", "Quote"), PageBreak()]

story += [P("Why the goal is the commercial unit", "H1x"), P("Soda OS treats a goal such as G-PAY-001 as the fundamental unit of controlled delivery. A goal contains a business outcome, scope, touch map, acceptance contract, dependencies, test plan, and evidence expectations.", "Bodyx"),
          table([[P("Goal property", "CellHead"), P("Business development implication", "CellHead")],
          [P("One goal = one outcome", "Cell"), P("Supports milestone-based statements of work and customer acceptance.", "Cell")], [P("Explicit touch map", "Cell"), P("Makes scope and change requests easier to price.", "Cell")], [P("Acceptance criteria", "Cell"), P("Creates objective delivery and billing evidence.", "Cell")], [P("One reviewable slice", "Cell"), P("Improves forecastability and reduces large, ambiguous engagements.", "Cell")], [P("Goal lifecycle", "Cell"), P("Provides a shared language for sales, delivery, engineering, and executives.", "Cell")]], [48*mm, 126*mm]),
          P("A goal can therefore become the bridge between business development and engineering: the commercial promise is translated into a bounded artifact that the delivery system can execute and verify.", "Bodyx"),
          P("Evidence-driven autonomy", "H2x"), P("The architecture routes work according to risk, evidence, and confidence. The agent may proceed, verify, defer, or require human review. High-risk work remains subject to human review even when the agent is confident.", "Bodyx"),
          table([[P("Condition", "CellHead"), P("Route", "CellHead")], [P("Low risk + verified evidence + high confidence", "Cell"), P("Proceed", "Cell")], [P("Low risk but weak confidence", "Cell"), P("Verify", "Cell")], [P("High risk", "Cell"), P("Human review or defer", "Cell")], [P("No evidence", "Cell"), P("Do not autonomously proceed", "Cell")]], [120*mm, 54*mm]), PageBreak()]

story += [P("Ideal customers and buyers", "H1x"), P("Soda OS is most compelling where the cost of an uncontrolled AI decision is materially higher than the cost of governance.", "Bodyx"),
          table([[P("Segment", "CellHead"), P("Pain", "CellHead"), P("Likely buyer", "CellHead")], [P("Enterprise software", "Cell"), P("Scale AI across teams without losing architectural and security control.", "Cell"), P("CTO, VP Engineering, Platform Engineering", "Cell")], [P("Consultancies and agencies", "Cell"), P("Deliver AI-enabled projects consistently and prove what was done.", "Cell"), P("Managing Director, Delivery Lead", "Cell")], [P("Regulated startups", "Cell"), P("Move quickly while preserving evidence and approval boundaries.", "Cell"), P("CTO, CISO, Head of Compliance", "Cell")], [P("Platform / DevOps teams", "Cell"), P("Govern infrastructure, migration, deployment, and reliability changes.", "Cell"), P("Platform VP, SRE Lead, CIO", "Cell")]], [40*mm, 82*mm, 52*mm]),
          P("Buyer-specific value proposition", "H2x"), P("CTO: scale AI-assisted engineering without weakening quality. CISO: restrict agent authority and preserve evidence. Engineering leader: standardize bounded delivery. Compliance leader: trace requirements through verification and release. Consultancy: sell repeatable, auditable AI-enabled delivery.", "Bodyx"),
          P("Best early design partners", "H2x"), P("Start with 3–5 design partners in fintech, software agencies, internal platform teams, or AI-forward startups. Use one governed delivery workflow and measure before/after outcomes.", "Bodyx"), PageBreak()]

story += [P("Potential offerings and revenue model", "H1x"), table([[P("Offering", "CellHead"), P("What it includes", "CellHead"), P("Role in growth", "CellHead")], [P("Community framework", "Cell"), P("CLI, templates, goal workflow, standard skills, governance rules.", "Cell"), P("Adoption and technical credibility.", "Cell")], [P("Enterprise governance", "Cell"), P("Central policy, audit search, SSO, cross-repository visibility, approval controls, analytics.", "Cell"), P("Recurring platform revenue.", "Cell")], [P("Implementation services", "Cell"), P("AI readiness, repository bootstrap, skill customization, team training.", "Cell"), P("Near-term revenue and customer learning.", "Cell")], [P("Vertical packs", "Cell"), P("Fintech, healthcare, government, security, ML delivery controls.", "Cell"), P("Higher-value differentiation and expansion.", "Cell")], [P("Managed AI engineering", "Cell"), P("Customer outcomes delivered through Soda OS governance.", "Cell"), P("Outcome-based commercial model.", "Cell")]], [37*mm, 91*mm, 46*mm]),
          P("Recommended go-to-market sequence", "H2x"), P("1. Services-led validation. 2. Productize onboarding, templates, evidence reports, and ROI measurement. 3. Add a centralized enterprise control plane. 4. Expand into regulated vertical packs.", "Bodyx"),
          P("Do not lead with ‘AI writes code faster.’ Lead with ‘your organization can safely use more AI across more teams.’", "Quote"), PageBreak()]

story += [P("ROI and measurement", "H1x"), P("Soda OS should be sold using operational evidence rather than generic AI transformation claims.", "Bodyx"), table([[P("Metric", "CellHead"), P("Why it matters", "CellHead")], [P("Time from approved goal to PR", "Cell"), P("Measures delivery acceleration.", "Cell")], [P("Rework hours and escaped defects", "Cell"), P("Measures quality and cost reduction.", "Cell")], [P("Review cycle time", "Cell"), P("Measures organizational friction.", "Cell")], [P("Evidence completeness", "Cell"), P("Measures governance adoption.", "Cell")], [P("Unauthorized or blocked actions", "Cell"), P("Measures control effectiveness.", "Cell")], [P("Cost per completed goal", "Cell"), P("Connects AI usage to business economics.", "Cell")], [P("Post-release incident rate", "Cell"), P("Measures operational risk.", "Cell")]], [66*mm, 108*mm]),
          P("ROI model", "H2x"), P("Net benefit = engineering hours saved + reduced rework + reduced incident cost + lower audit effort - licensing - implementation - training and process-change costs.", "Bodyx"),
          P("The strongest financial argument is not that an agent produces more code. It is that the company can safely expand AI adoption while reducing failure, rework, and management overhead.", "Bodyx"), PageBreak()]

story += [P("Strategic risks and required product discipline", "H1x"), table([[P("Risk", "CellHead"), P("Implication", "CellHead"), P("Response", "CellHead")], [P("Framework maturity", "Cell"), P("Current repository is stronger as an operating model than as a complete SaaS product.", "Cell"), P("Market as framework plus services first; build platform surfaces deliberately.", "Cell")], [P("Complexity", "Cell"), P("Too many concepts can slow adoption.", "Cell"), P("Package around four outcomes: scope, safety, evidence, learning.", "Cell")], [P("Process burden", "Cell"), P("Excessive documentation can trigger bypass behavior.", "Cell"), P("Use risk-proportional controls and automate evidence capture.", "Cell")], [P("Category confusion", "Cell"), P("Buyers may confuse it with Copilot, LLMOps, DevOps, or project management.", "Cell"), P("Position clearly as AI delivery governance and operating layer.", "Cell")]], [37*mm, 75*mm, 62*mm]),
          P("Bottom line", "H2x"), P("Soda OS has a credible business opportunity at the intersection of AI adoption, engineering governance, and enterprise risk control. Its strongest differentiator is not model intelligence; it is the disciplined system around model behavior: bounded context, explicit goals, risk-aware autonomy, evidence, review, audit, and learning.", "Bodyx"),
          P("Recommended positioning", "H2x"), P("Soda OS is a governance and delivery operating system for AI-assisted software teams. It turns business intent into bounded engineering goals, controls agent autonomy by risk and evidence, verifies implementation, preserves an audit trail, and feeds production outcomes back into organizational learning.", "Quote"),
          P("Repository basis", "H2x"), P("This brief is grounded in the Soda OS README, goal workflow, team workflow, knowledge loop, governance specifications, observability and resource-budgeting architecture, and proof-and-evidence framework.", "Smallx")]

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=16*mm, bottomMargin=20*mm, title="Soda OS Business Development Context", author="Soda OS")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
