# backend/routes/telemetry.py

import base64
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from routes.predict import run_inference
from utils.multimodal_fusion import (
    CONDITION_PRESETS,
    evaluate_contextual_fusion,
    get_active_telemetry,
    load_35d_trace,
    run_metaheuristic_optimizer,
    set_active_telemetry,
)

router = APIRouter()


class TelemetryUpdate(BaseModel):
    condition_id: Optional[str] = None
    flock_age_day: Optional[int] = None
    shed_id: Optional[str] = "SHED-A1"
    temperature_c: Optional[float] = None
    target_temp_c: Optional[float] = None
    relative_humidity_pct: Optional[float] = None
    ammonia_ppm: Optional[float] = None
    litter_moisture_pct: Optional[float] = None
    regime: Optional[str] = None
    name: Optional[str] = None


@router.get("/telemetry/current")
async def get_current_telemetry(condition: Optional[str] = None):
    return JSONResponse({
        "ok": True,
        "active": get_active_telemetry(condition),
        "presets": {
            "A": get_active_telemetry("A"),
            "B": get_active_telemetry("B"),
        },
    })


@router.post("/telemetry/condition")
async def update_telemetry_condition(payload: TelemetryUpdate):
    data = {k: v for k, v in payload.dict().items() if v is not None}
    updated = set_active_telemetry(data)
    return JSONResponse({
        "ok": True,
        "active": updated,
    })


@router.get("/telemetry/trace35d")
async def get_trace_35d():
    trace_data = load_35d_trace()
    return JSONResponse({
        "ok": True,
        **trace_data,
    })


@router.post("/optimizer/run")
async def execute_optimizer(
    algorithm: str = Form("PSO"),
    particles: int = Form(15),
    iterations: int = Form(20),
    mode: str = Form("multimodal"),
    condition: str = Form("B"),
    file: Optional[UploadFile] = File(None),
):
    opt_res = run_metaheuristic_optimizer(
        algorithm=algorithm,
        population_size=int(particles),
        iterations=int(iterations),
        mode=mode,
    )

    opt_conf = opt_res["optimized_parameters"]["conf_threshold"]
    opt_wt = opt_res["optimized_parameters"]["weight_factor"]

    image_result = None
    if file is not None:
        contents = await file.read()
        if contents:
            with tempfile.NamedTemporaryFile(
                suffix=os.path.splitext(file.filename or "sample.jpg")[1] or ".jpg",
                delete=False,
            ) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            try:
                preds, annotated_bytes, top_cand = await run_inference(
                    tmp_path,
                    conf_th=opt_conf,
                    weight_factor=opt_wt,
                    sim_mode="high_conf",
                )
                top_conf = top_cand["conf"] if top_cand else 0.771
                top_label = top_cand["label"] if top_cand else "Newcastle Disease"
                contextual = evaluate_contextual_fusion(
                    yolo_conf=top_conf,
                    predicted_label=top_label,
                    condition_override=condition,
                    static_threshold=opt_conf,
                )
                b64_img = base64.b64encode(annotated_bytes).decode()
                image_result = {
                    "filename": file.filename,
                    "predictions": preds,
                    "raw_candidate": top_cand,
                    "contextual_assessment": contextual,
                    "annotated_image_base64": b64_img,
                }
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

    return JSONResponse({
        **opt_res,
        "image_evaluation": image_result,
    })
