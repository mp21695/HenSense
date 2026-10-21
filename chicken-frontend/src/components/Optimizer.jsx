// src/components/Optimizer.jsx
import { useEffect, useState } from 'react';
import { runOptimizerApi } from '../utils/api';

export default function Optimizer() {
  const [algorithm, setAlgorithm] = useState('PSO');
  const [mode, setMode] = useState('multimodal');
  const [particles, setParticles] = useState(15);
  const [iterations, setIterations] = useState(20);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Run initial optimizer pass on mount so the user sees convergence & metrics immediately
    handleRunOptimizer();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleRunOptimizer = async (overrideAlgo, overrideMode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runOptimizerApi({
        algorithm: overrideAlgo || algorithm,
        particles,
        iterations,
        mode: overrideMode || mode,
        condition: 'B',
        file
      });
      setResult(data);
    } catch (e) {
      setError(e?.message || 'Optimizer execution failed');
    } finally {
      setLoading(false);
    }
  };

  const optParams = result?.optimized_parameters;
  const imgEval = result?.image_evaluation;
  const convergence = result?.convergence_history || [];
  const table = result?.comparison_table || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-black">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">
          Metaheuristic Optimizer
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Optimize YOLO confidence thresholds, class decision weights, and
          Bayesian-Logit multimodal fusion parameters (<code className="font-mono">w₁, w₂</code>) using
          Particle Swarm Optimization (PSO) and Genetic Algorithm (GA)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ALGORITHM SETTINGS & TEST IMAGE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card p-6 rounded-2xl bg-white/90 shadow-lg border border-slate-200 space-y-5">
            <h3 className="text-lg font-bold border-b pb-2 text-slate-900">
              Algorithm Settings
            </h3>

            {/* Algorithm selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Metaheuristic Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAlgorithm('PSO');
                    handleRunOptimizer('PSO', mode);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition ${
                    algorithm === 'PSO'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Particle Swarm (PSO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAlgorithm('GA');
                    handleRunOptimizer('GA', mode);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition ${
                    algorithm === 'GA'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Genetic Algorithm (GA)
                </button>
              </div>
            </div>

            {/* Optimization Objective Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Optimization Formulation (Review Stage)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('multimodal');
                    handleRunOptimizer(algorithm, 'multimodal');
                  }}
                  className={`py-2 px-2.5 rounded-lg font-semibold text-xs border ${
                    mode === 'multimodal'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Stage D: Multimodal (w₁, w₂)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('vision_only');
                    handleRunOptimizer(algorithm, 'vision_only');
                  }}
                  className={`py-2 px-2.5 rounded-lg font-semibold text-xs border ${
                    mode === 'vision_only'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Stage B: Vision-Only (Conf, Wt)
                </button>
              </div>
            </div>

            {/* Swarm Particles / Population */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>
                  {algorithm === 'PSO' ? 'Swarm Particles' : 'GA Population Size'}
                </span>
                <span className="font-mono">{particles}</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={particles}
                onChange={(e) => setParticles(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Iterations */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Iterations</span>
                <span className="font-mono">{iterations}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => handleRunOptimizer()}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-white border-2 border-slate-300 hover:bg-slate-50 shadow-sm transition"
            >
              {loading
                ? `Running ${algorithm} Optimizer...`
                : `Run ${algorithm} Optimizer`}
            </button>

            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>

          {/* TEST IMAGE CARD */}
          <div className="card p-6 rounded-2xl bg-white/90 shadow-lg border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              Test Image for Optimizer
            </h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
            />
            {preview && (
              <img
                src={preview}
                alt="Test Specimen"
                className="w-full max-h-48 object-cover rounded-lg border shadow-sm mt-2"
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: OPTIMIZED PARAMETERS, CONVERGENCE & ANNOTATED OUTPUT */}
        <div className="lg:col-span-7 space-y-6">
          {/* OPTIMIZED PARAMETERS SUMMARY */}
          {optParams && (
            <div className="card p-5 rounded-2xl bg-white/95 shadow-lg border border-slate-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Optimized Decision Parameters ({result?.algorithm})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluated on {result?.validation_samples_count} multimodal
                    validation samples (Fitness Objective = F1-Score)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Best Validation F1: {result?.metrics?.best_f1_pct}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Optimal Threshold
                  </div>
                  <div className="text-lg font-extrabold font-mono text-blue-700 mt-0.5">
                    {optParams.conf_threshold}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Class Weight Factor
                  </div>
                  <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5">
                    {optParams.weight_factor}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Visual Weight (w₁)
                  </div>
                  <div className="text-lg font-extrabold font-mono text-indigo-700 mt-0.5">
                    {optParams.w1_visual}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Env Prior Weight (w₂)
                  </div>
                  <div className="text-lg font-extrabold font-mono text-rose-700 mt-0.5">
                    {optParams.w2_env}
                  </div>
                </div>
              </div>

              {/* Convergence Graph */}
              <ConvergenceChart
                data={convergence}
                algorithm={result?.algorithm}
              />
            </div>
          )}

          {/* COMPARATIVE BENCHMARK TABLE */}
          {table.length > 0 && (
            <div className="card p-5 rounded-2xl bg-white/95 shadow-lg border border-slate-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                Comparative Metaheuristic Optimization Results
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-100 text-slate-700">
                      <th className="p-2.5 font-bold">Method</th>
                      <th className="p-2.5 font-bold">Best F1</th>
                      <th className="p-2.5 font-bold">Conf</th>
                      <th className="p-2.5 font-bold">Wt</th>
                      <th className="p-2.5 font-bold">Fusion (w₁, w₂)</th>
                      <th className="p-2.5 font-bold">Ambiguous Case Recovery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b last:border-0 ${
                          i === 2
                            ? 'bg-emerald-50/70 font-semibold text-slate-900'
                            : 'text-slate-700'
                        }`}
                      >
                        <td className="p-2.5">{row.method}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-700">
                          {row.f1_pct}%
                        </td>
                        <td className="p-2.5 font-mono">{row.conf_th}</td>
                        <td className="p-2.5 font-mono">{row.weight_factor}</td>
                        <td className="p-2.5 font-mono">
                          ({row.w1_visual}, {row.w2_env})
                        </td>
                        <td className="p-2.5">{row.ambiguous_edge_case_recovery}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANNOTATED IMAGE OUTPUT (MATCHING SLIDE 12) */}
          {imgEval && (
            <div className="card p-5 rounded-2xl bg-white/95 shadow-lg border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Annotated Image Output (Optimized)
                  </h3>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  Threshold: {optParams?.conf_threshold}
                </span>
              </div>

              {imgEval.annotated_image_base64 && (
                <img
                  src={`data:image/png;base64,${imgEval.annotated_image_base64}`}
                  alt="Optimized Output"
                  className="w-full max-h-80 object-contain rounded-xl border"
                />
              )}

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  OPTIMIZED DETECTIONS ({imgEval.predictions?.length || 0})
                </div>
                {(imgEval.predictions || []).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {p.label}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        bbox: {p.box.join(', ')}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                      {(p.conf * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConvergenceChart({ data = [], algorithm = 'PSO' }) {
  if (!data.length) return null;

  const w = 560;
  const h = 150;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const allVals = data.flatMap((d) => [d.best_f1, d.mean_f1]);
  const minY = Math.max(60, Math.floor(Math.min(...allVals) - 3));
  const maxY = Math.min(100, Math.ceil(Math.max(...allVals) + 1));
  const spanY = Math.max(1, maxY - minY);

  const toX = (i) =>
    padL + (i / Math.max(1, data.length - 1)) * innerW;
  const toY = (v) => padT + innerH - ((v - minY) / spanY) * innerH;

  const bestPoints = data.map((d, i) => `${toX(i)},${toY(d.best_f1)}`).join(' ');
  const meanPoints = data.map((d, i) => `${toX(i)},${toY(d.mean_f1)}`).join(' ');

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
        <span className="font-semibold">
          {algorithm} Fitness Convergence Curve (Objective: F1-Score %)
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-600"></span> Best F1
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-amber-500"></span> Swarm Mean
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36 bg-slate-50 rounded-lg border border-slate-200">
        {/* Y grid lines */}
        {[minY, (minY + maxY) / 2, maxY].map((val, idx) => {
          const y = toY(val);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={y + 3}
                fontSize="9"
                fill="#64748b"
                textAnchor="end"
              >
                {val.toFixed(0)}%
              </text>
            </g>
          );
        })}

        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.75"
          strokeDasharray="4 2"
          points={meanPoints}
        />
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          points={bestPoints}
        />

        {data.map((d, i) =>
          i % Math.max(1, Math.floor(data.length / 5)) === 0 ||
          i === data.length - 1 ? (
            <text
              key={d.iteration}
              x={toX(i)}
              y={h - 8}
              fontSize="9"
              fill="#64748b"
              textAnchor="middle"
            >
              It {d.iteration}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
