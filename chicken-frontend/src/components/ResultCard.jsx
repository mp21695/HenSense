// src/components/ResultCard.jsx

function ConfidenceBar({ conf }) {
  const pct = Math.round((conf || 0) * 100);
  return (
    <div className="w-full h-2 rounded-lg overflow-hidden bg-slate-200 border">
      <div
        style={{ width: `${pct}%` }}
        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
      />
    </div>
  );
}

export default function ResultCard({ data }) {
  if (!data) {
    return (
      <div className="card p-10 rounded-xl text-center text-slate-500 flex flex-col items-center justify-center min-h-[380px]">
        <div className="text-base font-semibold text-slate-700">
          No prediction yet — upload an image on the left and click Predict
        </div>
        <div className="text-xs text-slate-500 mt-1">
          The annotated specimen image and the 3-stage Contextual Inference Card will appear here side-by-side.
        </div>
      </div>
    );
  }

  const predictions = Array.isArray(data.predictions) ? data.predictions : [];
  const annotated = data.annotated_image_base64;
  const ctx = data.contextual_assessment;
  const vb = ctx?.visual_baseline;
  const env = ctx?.environmental_context;
  const mm = ctx?.multimodal_fusion;

  const severityStyles = {
    critical: 'bg-rose-50 border-rose-500 text-rose-950',
    moderate: 'bg-amber-50 border-amber-500 text-amber-950',
    low: 'bg-emerald-50 border-emerald-500 text-emerald-950'
  };

  const badgeStyles = {
    critical: 'bg-rose-600 text-white',
    moderate: 'bg-amber-600 text-white',
    low: 'bg-emerald-600 text-white'
  };

  return (
    <div className="card p-4 rounded-xl space-y-3.5 text-black">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-extrabold text-slate-900">
            Contextual Diagnostic Assessment
          </h3>
          {env?.name && (
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
              {env.name}
            </span>
          )}
        </div>
        {mm?.formula && (
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-800 text-cyan-300">
            {mm.formula}
          </span>
        )}
      </div>

      {/* HORIZONTAL SPLIT: LEFT = ANNOTATED IMAGE + BBOX, RIGHT = 3 DIAGNOSTIC PANELS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (5 COLS): ANNOTATED IMAGE + DETECTIONS */}
        <div className="xl:col-span-5 space-y-3">
          {annotated && (
            <div className="annot-wrap bg-slate-900/5 p-1.5 rounded-xl border border-slate-200">
              <img
                src={`data:image/png;base64,${annotated}`}
                alt="Annotated"
                className="w-full max-h-64 object-contain rounded-lg"
              />
            </div>
          )}

          {/* DETECTIONS BOX */}
          <div className="p-3 rounded-xl bg-white/95 border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Bounding Box Detections ({predictions.length})
            </div>
            {predictions.length === 0 ? (
              <div className="text-slate-600 text-xs">
                No detections above static slider threshold (see Contextual Fusion on the right).
              </div>
            ) : (
              predictions.map((p, i) => (
                <div
                  key={i}
                  className="mb-2 last:mb-0 p-2.5 rounded-lg border bg-slate-50/70"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-black">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        bbox: [{p.box.join(', ')}]
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-700">
                        Visual: {(p.conf * 100).toFixed(1)}%
                      </div>
                      {p.posterior_risk !== undefined && (
                        <div className="text-xs font-mono font-bold text-blue-700">
                          Posterior: {(p.posterior_risk * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    <ConfidenceBar conf={p.posterior_risk ?? p.conf} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 COLS): COMPACT 3-STAGE CONTEXTUAL INFERENCE CARD */}
        {ctx && (
          <div className="xl:col-span-7 space-y-2.5">
            {/* 1. VISUAL BASELINE + 2. ENVIRONMENTAL CONTEXT IN COMPACT CARDS */}
            <div className="p-3 rounded-xl bg-white/95 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  1. Visual Baseline — P(Disease | Image)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border">
                  Static Cutoff: {vb?.static_threshold?.toFixed(2)}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">YOLO Score: </span>
                  <strong className="font-mono text-sm">
                    {vb?.yolo_confidence?.toFixed(2)}
                  </strong>{' '}
                  <span className="text-[11px] text-amber-700 font-medium">
                    ({vb?.status_text})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Isolated Output: </span>
                  <strong className="text-slate-900">
                    {vb?.baseline_decision}
                  </strong>
                </div>
              </div>
            </div>

            {/* 2. ENVIRONMENTAL CONTEXT */}
            <div className="p-3 rounded-xl bg-white/95 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  2. Shed IoT Telemetry (Day {env?.flock_age_day} Trace)
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                    env?.esi_score >= 0.6
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  ESI (Stress Index): {env?.esi_score?.toFixed(2)} / 1.00
                </span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Temperature</div>
                  <div className="text-xs font-bold font-mono mt-0.5">
                    {env?.temperature_c}°C{' '}
                    <span className="text-[10px] font-normal text-slate-500">
                      (Tgt {env?.target_temp_c}°C)
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 truncate">
                    {env?.status_flags?.temperature}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Humidity (RH)</div>
                  <div className="text-xs font-bold font-mono mt-0.5">
                    {env?.relative_humidity_pct}%
                  </div>
                  <div
                    className={`text-[10px] font-semibold truncate ${
                      env?.relative_humidity_pct >= 75
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {env?.status_flags?.humidity}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Ammonia (NH₃)</div>
                  <div className="text-xs font-bold font-mono mt-0.5">
                    {env?.ammonia_ppm} ppm
                  </div>
                  <div
                    className={`text-[10px] font-semibold truncate ${
                      env?.ammonia_ppm >= 20 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {env?.status_flags?.ammonia}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MULTIMODAL ADJUSTED SCORE */}
            <div
              className={`p-3.5 rounded-xl border-l-4 border shadow-sm ${
                severityStyles[mm?.context_severity] || severityStyles.low
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide">
                  3. Multimodal Adjusted Posterior — P(Risk | Image, Env)
                </span>
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold ${
                    badgeStyles[mm?.context_severity] || badgeStyles.low
                  }`}
                >
                  Posterior Risk: {(mm?.posterior_probability * 100).toFixed(1)}% (
                  {mm?.posterior_probability?.toFixed(3)})
                </span>
              </div>

              <div className="mt-1.5 text-[11px] font-mono bg-white/85 px-2.5 py-1.5 rounded border border-slate-200/80 text-slate-800">
                w₁={mm?.w1_visual}, w₂={mm?.w2_env} • Logit(P_YOLO)=
                {mm?.logit_p_yolo} • EnvShift=
                {mm?.env_prior_shift >= 0
                  ? `+${mm?.env_prior_shift}`
                  : mm?.env_prior_shift}{' '}
                ⇒ σ({mm?.combined_logit}) ={' '}
                <strong>{mm?.posterior_probability}</strong>
              </div>

              <div className="mt-2 space-y-0.5 text-xs">
                <div>
                  <span className="text-slate-600">Baseline Decision: </span>
                  <span className="line-through text-slate-500">
                    {mm?.baseline_decision}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Context-Aware Decision: </span>
                  <strong className="font-bold underline decoration-2">
                    {mm?.context_aware_decision}
                  </strong>
                </div>
              </div>

              <div className="mt-1.5 text-[11px] opacity-90 leading-snug">
                <strong>Justification:</strong> {mm?.epidemiological_rationale}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
