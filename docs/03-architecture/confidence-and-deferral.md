# Confidence and deferral architecture

Soda OS treats confidence as an execution signal rather than presentation metadata. Agent decisions carry confidence, evidence, and uncertainty; the workflow router maps those signals to `proceed`, `verify`, `defer`, or `human_review`.

Calibration is measured using Expected Calibration Error (ECE), Brier score, and high-confidence error rate. These metrics must be calculated from labeled outcomes. A confidence score without an outcome is not calibration evidence.

The implementation is shared by the framework test surface and downstream projects through `template/scripts/lib/confidence-calibration.mjs`. The upgrade boundary remains unchanged: framework files may be refreshed, while product data and project-specific goals remain protected.
