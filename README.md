# HenSense: Metaheuristic-Optimized Poultry Health Screening

> **YOLO-Based Fecal Detection with PSO/GA Decision Optimization and End-to-End Multimodal Environmental Telemetry Monitoring**  
> *Department of Information Technology · SSN College of Engineering*

---

## 🌐 Live Web Demo
You can open and test the full application directly in your browser without installing anything:  
🔗 **[https://mp21695.github.io/HenSense/](https://mp21695.github.io/HenSense/)**

*(Fully interactive: supports image uploading, Condition A vs Condition B biosecurity evaluation, 35-day epidemiological microclimate trend analysis, and real-time PSO/GA optimizer execution.)*

---

## 🚀 Running Locally (for Teammates & Reviews)

### Quick Start (1 Command)
Clone the repository and start the server:

```bash
git clone https://github.com/mp21695/HenSense.git
cd HenSense/backend
python main.py
```

The application will be live at: **`http://127.0.0.1:8000`**

### Running the Live Trace Replay Simulator
To stream or toggle microclimate states during a live review presentation:
```bash
cd backend

# Option A: Push Condition A (Controlled Microclimate — Day 12 Trace, ESI = 0.12)
python replay_telemetry.py --condition A

# Option B: Push Condition B (Ventilation Failure / Wet Litter — Day 18 Trace, ESI = 0.84)
python replay_telemetry.py --condition B

# Option C: Replay multi-day window (Day 15 to Day 22) showing the 48-hour lag
python replay_telemetry.py --stream --start-day 15 --end-day 22 --delay 1.2
```

---

## 📂 Project Structure

```
HenSense/
├── backend/
│   ├── data/
│   │   ├── broiler_microclimate_35d.csv      # 35-day empirical flock microclimate trace
│   │   ├── validation_multimodal_samples.csv # 120-sample validation set for PSO/GA
│   │   ├── sample_specimens/                 # Ready-to-upload chicken fecal images
│   │   └── DATASET_CITATIONS.md              # Published poultry science literature citations
│   ├── routes/
│   │   ├── predict.py                        # YOLO inference & contextual fusion endpoint
│   │   └── telemetry.py                      # IoT microclimate & PSO/GA optimizer API
│   ├── utils/
│   │   └── multimodal_fusion.py              # ESI calculation & PSO/GA optimization engine
│   ├── replay_telemetry.py                   # Terminal trace replay script
│   └── main.py                               # FastAPI app & static asset server
├── chicken-frontend/                         # React + Vite + Tailwind Glassmorphism UI
│   └── src/
│       ├── components/
│       │   ├── UploadCard.jsx                # Condition A / B selector & specimen uploader
│       │   ├── ResultCard.jsx                # Contextual Inference Card (3-Stage Fusion)
│       │   ├── Dashboard.jsx                 # 35-day temporal correlation graph & 48h lag
│       │   └── Optimizer.jsx                 # Slide 12 PSO & GA convergence engine
│       └── utils/
│           └── client_simulation.js          # Standalone client engine for GitHub Pages
└── test_images/                              # Test images for instant review demo
```

---

## 🔬 Mathematical Formulation

### 1. Environmental Stress Index (ESI)
$$\text{ESI}(\text{Temp}, \text{RH}, \text{NH}_3) = 0.45 \cdot S_{\text{NH}_3} + 0.35 \cdot S_{\text{RH}} + 0.20 \cdot S_{\text{T}}$$

### 2. Bayesian-Logit Multimodal Risk Posterior
$$P(\text{Risk} \mid \text{Image}, \text{Env}) = \sigma\Big(w_1 \cdot \text{Logit}(P_{\text{YOLO}}) + w_2 \cdot (\text{ESI} - \tau_{\text{env}})\Big)$$

Parameters $(w_1, w_2, T_{\text{conf}})$ are optimized via **Particle Swarm Optimization (PSO)** and **Genetic Algorithm (GA)** to maximize validation $F_1$-score (`98.68%`).
