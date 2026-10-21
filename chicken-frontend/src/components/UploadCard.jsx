// src/components/UploadCard.jsx
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  fetchTelemetryCurrent,
  sendImage,
  updateTelemetryCondition
} from '../utils/api';

// Optional Auth context (safe fallback)
let useAuthSafe = null;
try {
  // eslint-disable-next-line
  useAuthSafe = require('../contexts/AuthContext').useAuth;
} catch (e) {
  useAuthSafe = null;
}

export default function UploadCard({ onResult, addHistory }) {
  const storedConf = Number(localStorage.getItem('cf_default_conf') ?? 0.25);
  const SAVE_IMAGES = localStorage.getItem('cf_save_images') !== 'false';

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conf, setConf] = useState(storedConf);
  const [condition, setCondition] = useState('B'); // 'A' (Controlled) or 'B' (Wet Litter / High NH3)
  const [simMode, setSimMode] = useState('borderline'); // 'borderline' (0.42) or 'high_conf' (0.77)
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [error, setError] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  // Poll /telemetry/current so terminal replay_telemetry.py and Dashboard stay 100% synced
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetchTelemetryCurrent();
        if (mounted && res?.active) {
          setLiveTelemetry(res.active);
          if (res.active.condition_id === 'A' || res.active.condition_id === 'B') {
            setCondition(res.active.condition_id);
          }
        }
      } catch {
        // Ignore
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // auth (optional)
  let auth = { user: null };
  try {
    if (useAuthSafe) auth = useAuthSafe() || { user: null };
  } catch (e) {
    try {
      const u = localStorage.getItem('cf_user');
      auth.user = u ? JSON.parse(u) : null;
    } catch {
      auth.user = null;
    }
  }
  const username =
    auth?.user?.username || localStorage.getItem('cf_user_name') || 'guest';

  // cleanup preview URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const f = acceptedFiles[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const executePrediction = async (
    targetFile = file,
    targetCond = condition,
    targetMode = simMode
  ) => {
    if (!targetFile) {
      setError('Please choose an image first.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      // Sync condition to backend telemetry state
      try {
        await updateTelemetryCondition({ condition_id: targetCond });
      } catch {
        // Ignore if offline
      }

      const data = await sendImage(targetFile, {
        conf,
        condition: targetCond,
        simMode: targetMode,
        onUploadProgress: (e) => {
          if (!e.lengthComputable) return;
          const p = Math.round((e.loaded * 100) / e.total);
          setProgress(p);
        }
      });

      setLatestResult(data);
      onResult?.(data);

      const entry = {
        id: Date.now(),
        fileName: targetFile.name,
        timestamp: new Date().toISOString(),
        condition: targetCond,
        response: SAVE_IMAGES
          ? data
          : {
              predictions: data.predictions || [],
              contextual_assessment: data.contextual_assessment
            }
      };

      if (typeof addHistory === 'function') addHistory(entry);

      setLoading(false);
      setProgress(100);
    } catch (e) {
      setLoading(false);
      const msg = e?.response?.data?.error || e?.message || 'Prediction failed';
      setError(msg);
    }
  };

  const handleConditionChange = async (newCond) => {
    setCondition(newCond);
    try {
      const res = await updateTelemetryCondition({ condition_id: newCond });
      if (res?.active) setLiveTelemetry(res.active);
    } catch {
      // Ignore
    }
    if (file) {
      await executePrediction(file, newCond, simMode);
    }
  };

  const handleModeChange = async (newMode) => {
    setSimMode(newMode);
    if (file) {
      await executePrediction(file, condition, newMode);
    }
  };

  const handleDownloadAnnotated = () => {
    const base64 =
      latestResult?.annotated_image_base64 ||
      latestResult?.annotated_image ||
      latestResult?.annotated;

    if (!base64) {
      setError('No annotated image available to download.');
      return;
    }

    try {
      const a = document.createElement('a');
      a.href = `data:image/png;base64,${base64}`;
      a.download = `annotated_${file?.name || 'result'}.png`;
      a.click();
    } catch {
      setError('Download failed.');
    }
  };

  return (
    <div className="upload-glass space-y-3 p-4">
      {/* DROPZONE */}
      <div
        {...getRootProps()}
        className="upload-dropzone cursor-pointer text-center p-3 rounded-xl border-2 border-dashed border-slate-400/60 hover:border-blue-500 bg-white/30"
      >
        <input {...getInputProps()} capture="environment" />

        {isDragActive ? (
          <p className="text-primary-700 font-medium text-sm">Drop the image here...</p>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-slate-800 font-semibold text-sm">
              Drag & drop or click to select fecal specimen image
            </p>
            <p className="text-[11px] text-slate-600">
              Evaluates YOLO candidate detections + trace-driven microclimate prior
            </p>

            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="max-h-32 mt-1.5 rounded shadow-md"
              />
            ) : null}
          </div>
        )}
      </div>

      {/* TRACE-DRIVEN TELEMETRY REPLAY SELECTOR */}
      <div className="p-3.5 rounded-xl bg-white/75 border border-slate-200/80 shadow-sm space-y-2.5 text-black">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Trace-Driven Environmental Context (Synced with Dashboard & Terminal)
            </div>
            <div className="text-xs text-slate-500">
              Active: <strong>{liveTelemetry?.name || `Condition ${condition}`}</strong>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-medium">Visual Profile:</span>
            <button
              type="button"
              onClick={() => handleModeChange('borderline')}
              className={`px-2.5 py-1 rounded-md font-semibold border ${
                simMode === 'borderline'
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              Borderline (0.42)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('high_conf')}
              className={`px-2.5 py-1 rounded-md font-semibold border ${
                simMode === 'high_conf'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              Clear (0.77)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleConditionChange('A')}
            className={`text-left p-2.5 rounded-lg border transition ${
              condition === 'A'
                ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30'
                : 'bg-white/80 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-900">
                Condition A: Controlled Microclimate
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold">
                ESI: 0.12 → P: 0.274
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-mono">
              Day 12 Trace • 28.6°C • RH: 62.4% • NH₃: 9.5 ppm
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleConditionChange('B')}
            className={`text-left p-2.5 rounded-lg border transition ${
              condition === 'B'
                ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/30'
                : 'bg-white/80 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-rose-900">
                Condition B: Ventilation Failure / Wet Litter
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-semibold">
                ESI: 0.84 → P: 0.781
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-mono">
              Day 18 Trace • 31.4°C • RH: 82.0% • NH₃: 26.0 ppm
            </div>
          </button>
        </div>
      </div>

      {/* CONF SLIDER + BUTTON */}
      <div className="flex gap-3 items-center">
        <label className="text-sm font-medium">Confidence</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={conf}
          onChange={(e) => setConf(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-12 text-right font-semibold">{conf.toFixed(2)}</span>

        <button
          className="btn-gradient px-4 py-2 rounded-lg shadow-md"
          onClick={() => executePrediction(file, condition, simMode)}
          disabled={loading}
        >
          {loading ? `Running ${progress}%` : 'Predict'}
        </button>
      </div>

      {/* PROGRESS BAR */}
      {loading && (
        <div className="mt-2">
          <div className="w-full bg-slate-200 h-2 rounded overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
            />
          </div>
        </div>
      )}

      {/* DOWNLOAD + USER */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownloadAnnotated}
          className="px-3 py-1 rounded-md border hover:bg-white/20 text-sm"
        >
          Download annotated
        </button>

        <div className="text-xs text-slate-600 ml-auto">
          Signed in as: <strong>{username}</strong>
        </div>
      </div>

      {/* ERRORS */}
      {error && <div className="mt-2 text-sm text-red-600 font-medium">{error}</div>}
    </div>
  );
}
