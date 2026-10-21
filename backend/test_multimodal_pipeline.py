"""
backend/test_multimodal_pipeline.py

End-to-end verification script for:
1. /telemetry/trace35d (35-day broiler microclimate benchmark & 48-hour lag correlation)
2. /optimizer/run (PSO & GA optimization on 120 multimodal validation samples)
3. /predict (Contextual Inference Card comparing Condition A vs Condition B on borderline visual detections)
"""

import io
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import main

client = TestClient(main.app)


def create_sample_fecal_image() -> bytes:
    img = Image.new("RGB", (320, 320), color=(210, 205, 195))
    draw = ImageDraw.Draw(img)
    draw.ellipse([90, 80, 230, 220], fill=(125, 65, 55))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def run_tests():
    # 1. Verify /telemetry/trace35d
    r_trace = client.get("/telemetry/trace35d")
    assert r_trace.status_code == 200, f"trace35d failed: {r_trace.text}"
    trace = r_trace.json()
    assert len(trace["days"]) == 35
    print(
        f"[OK] /telemetry/trace35d -> 35 days loaded | "
        f"48h Lag Pearson r = {trace['lag_analysis']['pearson_lag_48h']}"
    )

    # 2. Verify /optimizer/run (PSO & GA)
    for algo in ("PSO", "GA"):
        r_opt = client.post(
            "/optimizer/run",
            data={
                "algorithm": algo,
                "particles": "15",
                "iterations": "20",
                "mode": "multimodal",
            },
        )
        assert r_opt.status_code == 200, f"optimizer {algo} failed: {r_opt.text}"
        opt = r_opt.json()
        params = opt["optimized_parameters"]
        print(
            f"[OK] /optimizer/run ({algo}) -> Best F1 = {opt['metrics']['best_f1_pct']}% | "
            f"Conf={params['conf_threshold']}, Wt={params['weight_factor']}, "
            f"w1={params['w1_visual']}, w2={params['w2_env']}"
        )

    # 3. Verify /predict under Condition A vs Condition B on the same borderline image
    img_bytes = create_sample_fecal_image()
    for cond in ("A", "B"):
        r_pred = client.post(
            "/predict",
            data={"conf": "0.25", "condition": cond, "sim_mode": "borderline"},
            files={"file": ("borderline_specimen.jpg", img_bytes, "image/jpeg")},
        )
        assert r_pred.status_code == 200, f"predict {cond} failed: {r_pred.text}"
        pred = r_pred.json()
        ctx = pred["contextual_assessment"]
        print(
            f"[OK] /predict (Condition {cond}) -> "
            f"Visual={ctx['visual_baseline']['yolo_confidence']:.2f}, "
            f"ESI={ctx['environmental_context']['esi_score']:.2f}, "
            f"Posterior={ctx['multimodal_fusion']['posterior_probability']:.3f} | "
            f"{ctx['multimodal_fusion']['context_aware_decision']}"
        )


if __name__ == "__main__":
    run_tests()
