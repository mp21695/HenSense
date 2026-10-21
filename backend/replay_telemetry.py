"""
backend/replay_telemetry.py

Trace-Driven Digital Twin Replay Simulator for HenSense (Stage 5 & Stage 6).
Streams empirical poultry house microclimate rows from `data/broiler_microclimate_35d.csv`
to the FastAPI backend (`/telemetry/condition`) and prints the live Environmental Stress
Index (ESI) and Bayesian-Logit Multimodal Posterior shift.

Usage Examples (for Live Research Review Demo):
  1. Set Condition A (Controlled Microclimate - Day 12):
     python replay_telemetry.py --condition A

  2. Set Condition B (Ventilation Failure / Wet Litter - Day 18):
     python replay_telemetry.py --condition B

  3. Stream the Day 15 -> Day 22 Outbreak & 48-Hour Lag Window:
     python replay_telemetry.py --stream --start-day 15 --end-day 22 --delay 1.5
"""

import argparse
import json
import os
import time
import urllib.request
from utils.multimodal_fusion import (
    CONDITION_PRESETS,
    evaluate_contextual_fusion,
    load_35d_trace,
    set_active_telemetry,
)

API_BASE = os.environ.get("HENSENSE_API_URL", "http://127.0.0.1:8000")


def post_telemetry(payload: dict) -> dict:
    url = f"{API_BASE}/telemetry/condition"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "offline_note": f"Backend not reachable ({e}); computed locally."}


def print_diagnostic_card(condition_key: str, yolo_sample_conf: float = 0.42):
    eval_res = evaluate_contextual_fusion(
        yolo_conf=yolo_sample_conf,
        predicted_label="Coccidiosis",
        condition_override=condition_key,
        static_threshold=0.50,
    )
    env = eval_res["environmental_context"]
    mm = eval_res["multimodal_fusion"]
    vb = eval_res["visual_baseline"]

    title = env["name"].replace("—", "-")
    print("=" * 78)
    print(f" HENSENSE TRACE-DRIVEN TELEMETRY REPLAY | {title}")
    print("=" * 78)
    print(f" Source Citation : {env.get('citation', 'Broiler 35-Day Benchmark Trace')}")
    print(
        f" Shed Telemetry  : Temp = {env['temperature_c']} C (Target {env['target_temp_c']} C) | "
        f"RH = {env['relative_humidity_pct']}% | NH3 = {env['ammonia_ppm']} ppm"
    )
    print(
        f" Stress Indices  : THI = {env['thi_index']} | "
        f"Environmental Stress Index (ESI) = {env['esi_score']:.2f} / 1.00"
    )
    print("-" * 78)
    print(
        f" Visual Baseline : YOLO Confidence = {vb['yolo_confidence']:.2f} "
        f"({vb['status_text']})"
    )
    print(f" Isolated Output : {vb['baseline_decision']}")
    print("-" * 78)
    print(
        " Fusion Formula  : P(Risk | Image, Env) = sigmoid(w1 * Logit(P_YOLO) + w2 * (ESI - tau))"
    )
    print(
        f" Parameters      : w1={mm['w1_visual']}, w2={mm['w2_env']}, "
        f"Logit(P_YOLO)={mm['logit_p_yolo']}, EnvShift={mm['env_prior_shift']:+.3f}"
    )
    print(
        f" Posterior Risk  : P(Risk | Image, Env) = {mm['posterior_probability']:.3f} "
        f"({mm['posterior_probability']*100:.1f}%)"
    )
    print(
        f" Context Decision: >>> {mm['context_aware_decision'].replace('—', '-')} <<<"
    )
    print("=" * 78)


def main():
    parser = argparse.ArgumentParser(
        description="HenSense Trace-Driven Microclimate Telemetry Replay Simulator"
    )
    parser.add_argument(
        "--condition",
        choices=["A", "B", "a", "b"],
        help="Push Condition A (Controlled) or Condition B (Ventilation Failure / Wet Litter)",
    )
    parser.add_argument(
        "--stream",
        action="store_true",
        help="Replay a multi-day window from broiler_microclimate_35d.csv",
    )
    parser.add_argument("--start-day", type=int, default=15, help="Start flock day")
    parser.add_argument("--end-day", type=int, default=22, help="End flock day")
    parser.add_argument("--delay", type=float, default=1.2, help="Seconds between days")
    parser.add_argument(
        "--yolo-conf",
        type=float,
        default=0.42,
        help="Borderline YOLO visual confidence to evaluate (default: 0.42)",
    )
    args = parser.parse_args()

    if args.condition:
        cond = args.condition.upper()
        preset = dict(CONDITION_PRESETS[cond])
        set_active_telemetry(preset)
        resp = post_telemetry(preset)
        print_diagnostic_card(cond, yolo_sample_conf=args.yolo_conf)
        if resp.get("ok"):
            print(f"[SYNCED] Active telemetry updated on FastAPI server ({API_BASE}).")
        else:
            print(f"[LOCAL] {resp.get('offline_note')}")
        return

    # Stream mode: replay the multi-day window and re-evaluate sigmoid per row
    trace = load_35d_trace()["days"]
    window = [
        d for d in trace if args.start_day <= d["flock_age_day"] <= args.end_day
    ]

    print("=" * 90)
    print(
        f" REPLAYING 35-DAY BROILER FLOCK TRACE (Day {args.start_day} to Day {args.end_day})"
    )
    print(" Demonstrating Day 18 Microclimate Spike -> Day 20 Lesion Surge (48h Lag)")
    print("=" * 90)
    print(
        f"{'Day':<5} | {'Temp(C)':<8} | {'RH(%)':<7} | {'NH3(ppm)':<9} | "
        f"{'ESI':<6} | {'YOLO Lesions':<13} | {'Posterior (P_vis=0.42)'}"
    )
    print("-" * 90)

    for row in window:
        payload = {
            "condition_id": "STREAM",
            "name": f"Trace Replay - Day {row['flock_age_day']} ({row['regime']})",
            "flock_age_day": row["flock_age_day"],
            "shed_id": row["shed_id"],
            "temperature_c": row["temperature_c"],
            "target_temp_c": row["target_temp_c"],
            "relative_humidity_pct": row["relative_humidity_pct"],
            "ammonia_ppm": row["ammonia_ppm"],
            "litter_moisture_pct": row["litter_moisture_pct"],
            "regime": row["regime"],
        }
        # 1. Update local state so evaluate_contextual_fusion uses THIS row's telemetry
        set_active_telemetry(payload)
        # 2. Sync to running FastAPI server so browser UI updates live
        post_telemetry(payload)

        # 3. Re-run Bayesian-Logit sigmoid formula for this day's ESI
        eval_res = evaluate_contextual_fusion(
            yolo_conf=args.yolo_conf,
            predicted_label="Coccidiosis",
            condition_override=None,
        )
        esi_now = eval_res["environmental_context"]["esi_score"]
        post_p = eval_res["multimodal_fusion"]["posterior_probability"]
        if post_p >= 0.62:
            flag = "CRITICAL ALERT"
        elif post_p >= 0.42:
            flag = "WARNING (ELEVATED)"
        else:
            flag = "CONTROLLED (MONITOR)"

        print(
            f"D-{row['flock_age_day']:02d}  | "
            f"{row['temperature_c']:<8.1f} | "
            f"{row['relative_humidity_pct']:<7.1f} | "
            f"{row['ammonia_ppm']:<9.1f} | "
            f"{esi_now:<6.2f} | "
            f"{row['daily_lesion_detections']:<2d} / 40 scans | "
            f"{post_p:.3f} ({post_p*100:4.1f}%) -> {flag}"
        )
        time.sleep(args.delay)

    print("=" * 90)


if __name__ == "__main__":
    main()
