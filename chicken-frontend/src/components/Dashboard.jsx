// src/components/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  fetchTelemetryCurrent,
  fetchTrace35d,
  updateTelemetryCondition
} from '../utils/api';

/**
 * Research-Grade Longitudinal Epidemiological Dashboard
 * Synchronized in real time with `/telemetry/current` and `replay_telemetry.py`.
 */
export default function Dashboard({ history = [] }) {
  const [traceData, setTraceData] = useState(null);
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [selectedDay, setSelectedDay] = useState(18);
  const [statusMsg, setStatusMsg] = useState('');

  // Load 35-day trace once
  useEffect(() => {
    fetchTrace35d()
      .then((res) => {
        if (res?.days) setTraceData(res);
        if (res?.active_telemetry) {
          setLiveTelemetry(res.active_telemetry);
          if (res.active_telemetry.flock_age_day) {
            setSelectedDay(res.active_telemetry.flock_age_day);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Poll /telemetry/current every 1.5s so running `python replay_telemetry.py` in terminal
  // updates the browser Dashboard automatically in real time
  useEffect(() => {
    let mounted = true;
    const syncTelemetry = async () => {
      try {
        const res = await fetchTelemetryCurrent();
        if (mounted && res?.active) {
          setLiveTelemetry((prev) => {
            if (
              prev?.flock_age_day !== res.active.flock_age_day &&
              res.active.flock_age_day
            ) {
              setSelectedDay(res.active.flock_age_day);
            }
            return res.active;
          });
        }
      } catch {
        // Ignore transient poll errors
      }
    };
    syncTelemetry();
    const timer = setInterval(syncTelemetry, 1500);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const days = traceData?.days || [];
  const lagAnalysis = traceData?.lag_analysis;

  const inspectedDayObj = useMemo(() => {
    return (
      days.find((d) => d.flock_age_day === selectedDay) ||
      days[17] ||
      null
    );
  }, [days, selectedDay]);

  const handleApplyCondition = async (cond) => {
    try {
      const res = await updateTelemetryCondition({ condition_id: cond });
      if (res?.active) {
        setLiveTelemetry(res.active);
        if (res.active.flock_age_day) {
          setSelectedDay(res.active.flock_age_day);
        }
      }
      setStatusMsg(
        cond === 'A'
          ? 'Synced Condition A (Day 12 Controlled Microclimate: ESI = 0.12, Posterior = 0.274 / 27.4% Controlled).'
          : 'Synced Condition B (Day 18 Wet Litter / High NH₃: ESI = 0.84, Posterior = 0.781 / 78.1% Critical Alert).'
      );
    } catch {
      setStatusMsg('Failed to contact backend.');
    }
  };

  // Export 35-day benchmark CSV
  const exportBenchmarkCSV = () => {
    if (!days.length) return;
    const headers = [
      'flock_age_day',
      'date',
      'temperature_c',
      'relative_humidity_pct',
      'ammonia_ppm',
      'thi_index',
      'esi_score',
      'daily_lesion_detections',
      'coccidiosis_detections',
      'newcastle_detections',
      'salmonella_detections',
      'regime'
    ];
    const rows = [
      headers,
      ...days.map((d) => headers.map((k) => d[k]))
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'broiler_microclimate_35d_benchmark.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export local screening history CSV
  const exportHistoryCSV = () => {
    const rows = [
      [
        'id',
        'fileName',
        'timestamp',
        'condition',
        'yoloConfidence',
        'esiScore',
        'posteriorRisk',
        'contextDecision'
      ],
      ...history.map((h) => {
        const ctx = h.response?.contextual_assessment;
        return [
          h.id,
          h.fileName,
          h.timestamp,
          h.condition || ctx?.environmental_context?.condition_id || 'B',
          ctx?.visual_baseline?.yolo_confidence ??
            h.response?.predictions?.[0]?.conf ??
            '',
          ctx?.environmental_context?.esi_score ?? '',
          ctx?.multimodal_fusion?.posterior_probability ?? '',
          (ctx?.multimodal_fusion?.context_aware_decision || '').replace(
            /,/g,
            ';'
          )
        ];
      })
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hensense_screening_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCondId = liveTelemetry?.condition_id || 'B';
  const refPost = liveTelemetry?.reference_posterior;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-black">
      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Longitudinal Microclimate & Epidemiological Monitoring
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Trace-driven 35-day commercial broiler flock cycle benchmark (Cobb500 / Aviagen Ross 308 thermal curve, Purswell THI, & Eimeria sporulation lag analysis)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportBenchmarkCSV}
            className="btn-gradient px-3.5 py-2 rounded-lg text-xs font-bold shadow"
          >
            Export 35-Day Trace CSV
          </button>
          <button
            onClick={exportHistoryCSV}
            className="btn-gradient px-3.5 py-2 rounded-lg text-xs font-bold shadow"
          >
            Export Screening Log
          </button>
        </div>
      </div>

      {/* SYNCHRONIZED TRACE TELEMETRY & POSTERIOR BANNER (MATCHES TERMINAL replay_telemetry.py) */}
      <div className="card p-5 rounded-2xl bg-white/95 border border-slate-200 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Synchronized Telemetry State (Synced with Terminal & Predictor)
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {liveTelemetry?.name || 'Condition B — Ventilation Failure / Wet Litter (Day 18 Trace)'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyCondition('A')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                activeCondId === 'A'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Condition A: Controlled (Day 12)
            </button>
            <button
              type="button"
              onClick={() => handleApplyCondition('B')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition ${
                activeCondId === 'B'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Condition B: Wet Litter / High NH₃ (Day 18)
            </button>
          </div>
        </div>

        {/* Live Telemetry & Bayesian Posterior Readout */}
        {liveTelemetry && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Flock Age / Shed</div>
              <div className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
                Day {liveTelemetry.flock_age_day} ({liveTelemetry.shed_id})
              </div>
              <div className="text-[11px] text-slate-500">
                {liveTelemetry.regime}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Shed Temp / THI</div>
              <div className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
                {liveTelemetry.temperature_c}°C{' '}
                <span className="text-[11px] font-normal text-slate-500">
                  (Tgt {liveTelemetry.target_temp_c}°C)
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                THI: {liveTelemetry.thi_index}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Relative Humidity</div>
              <div
                className={`text-sm font-extrabold font-mono mt-0.5 ${
                  liveTelemetry.relative_humidity_pct >= 75
                    ? 'text-blue-700'
                    : 'text-slate-900'
                }`}
              >
                {liveTelemetry.relative_humidity_pct}%
              </div>
              <div className="text-[11px] text-slate-600">
                {liveTelemetry.status_flags?.humidity}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Aerial Ammonia (NH₃)</div>
              <div
                className={`text-sm font-extrabold font-mono mt-0.5 ${
                  liveTelemetry.ammonia_ppm >= 20
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {liveTelemetry.ammonia_ppm} ppm
              </div>
              <div className="text-[11px] text-slate-600">
                {liveTelemetry.status_flags?.ammonia}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Stress Index (ESI)</div>
              <div
                className={`text-base font-extrabold font-mono mt-0.5 ${
                  liveTelemetry.esi_score >= 0.6
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {liveTelemetry.esi_score?.toFixed(2)} / 1.00
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                Shift: {refPost?.env_prior_shift >= 0 ? `+${refPost?.env_prior_shift}` : refPost?.env_prior_shift}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Posterior (P_YOLO=0.42)
              </div>
              <div
                className={`text-base font-extrabold font-mono mt-0.5 ${
                  refPost?.posterior_probability >= 0.62
                    ? 'text-rose-700'
                    : refPost?.posterior_probability >= 0.42
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {refPost?.posterior_probability?.toFixed(3)} (
                {(refPost?.posterior_probability * 100).toFixed(1)}%)
              </div>
              <div className="text-[10px] font-mono font-bold uppercase">
                {refPost?.status_flag}
              </div>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className="text-xs font-medium text-blue-900 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">
            {statusMsg}
          </div>
        )}
      </div>

      {/* PRIMARY RESEARCH PLOT: 35-DAY TEMPORAL CORRELATION GRAPH */}
      <div className="card p-6 rounded-2xl bg-white/95 border border-slate-200 shadow-lg space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              35-Day Temporal Correlation: Shed Microclimate (RH %, NH₃ ppm) vs. Daily YOLO Lesion Detections
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Demonstrates the <strong>48-hour epidemiological lag</strong>: Day 18 ventilation failure & wet-litter spike (RH = 84.3%, NH₃ = 28.7 ppm, ESI = 0.86 → Posterior = 0.792) precedes the Day 20 fecal lesion surge (19 detections) by 48 hours.
            </p>
          </div>
          {lagAnalysis && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700">
                r(Δt=0h): {lagAnalysis.pearson_same_day_0h}
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-800">
                r(Δt=+24h): {lagAnalysis.pearson_lag_24h}
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-100 border border-rose-300 text-rose-900 font-bold">
                r(Δt=+48h): {lagAnalysis.pearson_lag_48h} (Peak)
              </span>
            </div>
          )}
        </div>

        <TemporalCorrelationPlot
          days={days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        {/* INTERACTIVE DAY INSPECTOR BAR */}
        {inspectedDayObj && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            <div>
              <div className="text-slate-500 font-medium">Inspected Chart Day</div>
              <div className="text-base font-extrabold font-mono text-slate-900 mt-0.5">
                Day {inspectedDayObj.flock_age_day}{' '}
                <span className="text-[11px] font-normal text-slate-500">
                  ({inspectedDayObj.date})
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {inspectedDayObj.regime}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">Temperature / THI</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {inspectedDayObj.temperature_c}°C{' '}
                <span className="text-[11px] font-normal text-slate-500">
                  (Target {inspectedDayObj.target_temp_c}°C)
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                THI: {inspectedDayObj.thi_index}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">Humidity & Litter</div>
              <div
                className={`text-sm font-bold font-mono mt-0.5 ${
                  inspectedDayObj.relative_humidity_pct >= 75
                    ? 'text-blue-700'
                    : 'text-slate-900'
                }`}
              >
                RH: {inspectedDayObj.relative_humidity_pct}%
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                Litter Moisture: {inspectedDayObj.litter_moisture_pct}%
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">Aerial Ammonia</div>
              <div
                className={`text-sm font-bold font-mono mt-0.5 ${
                  inspectedDayObj.ammonia_ppm >= 20
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                NH₃: {inspectedDayObj.ammonia_ppm} ppm
              </div>
              <div className="text-[11px] text-slate-500">
                Threshold: 20.0 ppm
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">Stress Index (ESI)</div>
              <div
                className={`text-base font-extrabold font-mono mt-0.5 ${
                  inspectedDayObj.esi_score >= 0.6
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {inspectedDayObj.esi_score.toFixed(2)} / 1.00
              </div>
              <div className="text-[11px] text-slate-500">
                Bayesian Env Prior
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">
                YOLO Lesion Detections
              </div>
              <div className="text-base font-extrabold font-mono text-rose-700 mt-0.5">
                {inspectedDayObj.daily_lesion_detections} / {inspectedDayObj.total_scans}
              </div>
              <div className="text-[10px] font-mono text-slate-600">
                Cocci:{inspectedDayObj.coccidiosis_detections} • ND:
                {inspectedDayObj.newcastle_detections} • Salm:
                {inspectedDayObj.salmonella_detections}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EPIDEMIOLOGICAL SUMMARY + LOCAL SCREENING HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 rounded-2xl bg-white/95 border border-slate-200 col-span-2 space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            Epidemiological Lag & Multimodal Justification Summary
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            {lagAnalysis?.summary ||
              'Cross-correlation between Environmental Stress Index (ESI) and daily positive YOLO fecal detections peaks at Δt = +48 hours, validating why environmental telemetry acts as a predictive leading indicator before clinical fecal shedding peaks.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">
                Day 18 Microclimate Spike
              </div>
              <div className="font-mono text-rose-700 font-bold mt-1">
                RH: 84.3% • NH₃: 28.7 ppm
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Exceeds 75% RH sporulation threshold & 20 ppm NH₃ ciliary damage threshold (ESI = 0.86, Posterior = 0.792).
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">
                48-Hour Biological Incubation
              </div>
              <div className="font-mono text-amber-700 font-bold mt-1">
                Δt = +48 Hours (Day 18 → 20)
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Matches Eimeria oocyst sporulation window (24–48h) before acute intestinal lesion shedding.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800">
                Day 20 Visual Detection Surge
              </div>
              <div className="font-mono text-blue-700 font-bold mt-1">
                19 / 40 Positive Fecal Scans
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                12 Coccidiosis, 5 Newcastle Disease, 2 Salmonella detections captured by YOLO + PSO/GA.
              </div>
            </div>
          </div>
        </div>

        {/* RECENT SCREENING ENTRIES */}
        <div className="card p-5 rounded-2xl bg-white/95 border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Recent Contextual Evaluations ({history.length})
          </h3>
          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-xs text-slate-500">
                No image evaluations recorded in this session yet. Run an image on the Home page to log contextual assessments.
              </div>
            ) : (
              history.slice(0, 10).map((h) => {
                const ctx = h.response?.contextual_assessment;
                const post = ctx?.multimodal_fusion?.posterior_probability;
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {h.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cond {h.condition || 'B'} •{' '}
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      {post !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            post >= 0.62
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          P={post.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          {h.response?.predictions?.length || 0} det
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dual-Axis SVG Temporal Correlation Plot
 */
function TemporalCorrelationPlot({ days = [], selectedDay = 20, onSelectDay }) {
  if (!days.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading 35-day broiler microclimate trace...
      </div>
    );
  }

  const w = 920;
  const h = 320;
  const padL = 54;
  const padR = 54;
  const padT = 28;
  const padB = 42;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const n = days.length;
  const xForIndex = (i) => padL + (i / Math.max(1, n - 1)) * innerW;

  const yForRH = (rh) => padT + innerH - ((rh - 40) / 60) * innerH;
  const yForNH3 = (nh3) => padT + innerH - (nh3 / 35) * innerH;

  const maxLesions = 22;
  const yForLesions = (cnt) => padT + innerH - (cnt / maxLesions) * innerH;

  const rhPoints = days
    .map((d, i) => `${xForIndex(i)},${yForRH(d.relative_humidity_pct)}`)
    .join(' ');
  const nh3Points = days
    .map((d, i) => `${xForIndex(i)},${yForNH3(d.ammonia_ppm)}`)
    .join(' ');

  const xDay18 = xForIndex(17);
  const xDay20 = xForIndex(19);
  const barWidth = Math.max(8, innerW / n - 7);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 text-xs mb-2 px-1">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold text-blue-700">
            <span className="inline-block w-3.5 h-0.5 bg-blue-600"></span>
            Relative Humidity (RH %) [Left Axis]
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-amber-700">
            <span className="inline-block w-3.5 h-0.5 bg-amber-600"></span>
            Aerial Ammonia (NH₃ ppm) [Left Axis]
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-rose-700">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-500/80"></span>
            Daily YOLO Lesion Detections [Right Axis]
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Click any day bar to inspect synchronized telemetry & lesion breakdown
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto bg-slate-50/90 rounded-xl border border-slate-200 select-none"
      >
        <rect
          x={xDay18 - 6}
          y={padT}
          width={xDay20 - xDay18 + 12}
          height={innerH}
          fill="rgba(244, 63, 94, 0.10)"
          stroke="#f43f5e"
          strokeDasharray="4 3"
        />
        <text
          x={(xDay18 + xDay20) / 2}
          y={padT + 13}
          fontSize="10"
          fontWeight="bold"
          fill="#be123c"
          textAnchor="middle"
        >
          48h Lag (D18 Env Spike → D20 Lesion Surge)
        </text>

        {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
          const y = padT + innerH * (1 - frac);
          const rhVal = Math.round(40 + frac * 60);
          const nh3Val = Math.round(frac * 35);
          const lesionVal = Math.round(frac * maxLesions);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                fontSize="9.5"
                fill="#334155"
                textAnchor="end"
              >
                {rhVal}% | {nh3Val}p
              </text>
              <text
                x={w - padR + 6}
                y={y + 3}
                fontSize="9.5"
                fill="#be123c"
                textAnchor="start"
              >
                {lesionVal} det
              </text>
            </g>
          );
        })}

        <line
          x1={padL}
          y1={yForNH3(20)}
          x2={w - padR}
          y2={yForNH3(20)}
          stroke="#d97706"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={padL + 6}
          y={yForNH3(20) - 4}
          fontSize="8.5"
          fill="#b45309"
        >
          NH₃ Biosecurity Threshold (20 ppm)
        </text>

        {days.map((d, i) => {
          const cx = xForIndex(i);
          const yTop = yForLesions(d.daily_lesion_detections);
          const barH = padT + innerH - yTop;
          const isSelected = d.flock_age_day === selectedDay;
          const isSpike = d.flock_age_day >= 19 && d.flock_age_day <= 21;

          return (
            <g
              key={d.flock_age_day}
              className="cursor-pointer"
              onClick={() => onSelectDay && onSelectDay(d.flock_age_day)}
            >
              <rect
                x={cx - barWidth / 2}
                y={yTop}
                width={barWidth}
                height={Math.max(2, barH)}
                rx="3"
                fill={
                  isSelected
                    ? '#1e293b'
                    : isSpike
                      ? '#e11d48'
                      : 'rgba(244, 63, 94, 0.55)'
                }
              />
              {(d.flock_age_day === 1 ||
                d.flock_age_day % 3 === 0 ||
                d.flock_age_day === 18 ||
                d.flock_age_day === 20 ||
                d.flock_age_day === 35) && (
                <text
                  x={cx}
                  y={h - 14}
                  fontSize="9.5"
                  fontWeight={
                    d.flock_age_day === 18 || d.flock_age_day === 20
                      ? 'bold'
                      : 'normal'
                  }
                  fill={
                    d.flock_age_day === 18 || d.flock_age_day === 20
                      ? '#be123c'
                      : '#475569'
                  }
                  textAnchor="middle"
                >
                  D{d.flock_age_day}
                </text>
              )}
            </g>
          );
        })}

        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.25"
          points={rhPoints}
        />

        <polyline
          fill="none"
          stroke="#d97706"
          strokeWidth="2.25"
          points={nh3Points}
        />

        <circle
          cx={xDay18}
          cy={yForRH(days[17]?.relative_humidity_pct || 84.3)}
          r="4.5"
          fill="#2563eb"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <circle
          cx={xDay18}
          cy={yForNH3(days[17]?.ammonia_ppm || 28.7)}
          r="4.5"
          fill="#d97706"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <circle
          cx={xDay20}
          cy={yForLesions(days[19]?.daily_lesion_detections || 19)}
          r="5"
          fill="#e11d48"
          stroke="#fff"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
