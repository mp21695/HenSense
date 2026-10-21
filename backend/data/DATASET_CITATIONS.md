# Poultry Microclimate & Multimodal Epidemiology Benchmark Citations

This directory contains the empirical benchmark trace datasets used for **Stage 5 (IoT Environmental Telemetry)** and **Stage 6 (Multimodal + Temporal Risk Prediction)** in **HenSense**.

## 1. Datasets Included
1. `broiler_microclimate_35d.csv`: 35-day commercial broiler grow-out cycle trace recording daily ambient temperature ($^\circ\text{C}$), target brooding curve ($^\circ\text{C}$), relative humidity ($\text{RH }\%$), aerial ammonia ($\text{NH}_3\text{ ppm}$), Temperature-Humidity Index ($\text{THI}$), litter moisture ($\%$), Environmental Stress Index ($\text{ESI} \in [0,1]$), and daily YOLO fecal lesion detections across 4 classes (`Healthy`, `Coccidiosis`, `Newcastle Disease`, `Salmonella`).
2. `validation_multimodal_samples.csv`: 120-sample validation benchmark pairing raw YOLO candidate confidences ($P_{\text{YOLO}}$) with synchronized shed microclimate telemetry ($\text{Temp}, \text{RH}, \text{NH}_3, \text{ESI}$) and clinical ground-truth labels for **PSO / GA Metaheuristic Optimization**.

---

## 2. Published Literature & Parameter Benchmarks

1. **Broiler Thermal & Relative Humidity Curve (Day 1 to Day 35):**
   - *Aviagen Ross 308 / Cobb500 Broiler Management Handbook (2022)*. Standard brooding profile starting at $32.5^\circ\text{C}$ (Day 1) and stepping down linearly to $21.0^\circ\text{C}$ (Day 35), with optimal relative humidity maintained at $60\text{--}70\%$.
2. **Temperature-Humidity Index ($\text{THI}$) for Broilers:**
   - *Purswell, J. L., Dozier III, W. A., Olanrewaju, H. A., Davis, J. D., Xin, H., & Gates, R. S. (2012).* "Effect of temperature-humidity index on live performance in broiler chickens grown from 49 to 63 days of age." *ASABE International Symposium on Livestock Environment*, USDA-ARS:
     $$\text{THI} = 0.85 \cdot T_{\text{db}} + 0.15 \cdot T_{\text{wb}}$$
3. **Aerial Ammonia ($\text{NH}_3$) Respiratory & Newcastle Disease Predisposition Threshold:**
   - *Miles, D. M., Branton, S. L., & Lott, B. D. (2004).* "Atmospheric ammonia is detrimental to the performance of modern commercial broilers." *Poultry Science*, 83(10), 1650–1654.
   - Aerial $\text{NH}_3 > 20\text{--}25\text{ ppm}$ damages tracheal cilia and respiratory epithelium, elevating susceptibility to *Newcastle Disease Virus (NDV)* and secondary bacterial infections.
4. **Relative Humidity, Litter Moisture, and 48-Hour *Eimeria* (Coccidiosis) Sporulation Lag:**
   - *Williams, R. B. (2005).* "Intercurrent coccidiosis and necrotic enteritis of chickens: rational, integrated disease management by maintenance of gut integrity." *Avian Pathology*, 34(3), 159–180.
   - Unsporulated *Eimeria* oocysts shed in poultry feces require high litter moisture ($\text{RH} > 75\%$) and warm ambient temperatures ($25\text{--}30^\circ\text{C}$) for **24 to 48 hours** to achieve infective sporulation, producing a characteristic **48-hour epidemiological lag** between microclimate ventilation failure (Day 18 spike) and peak clinical fecal lesion detections (Day 20 surge).

---

## 3. Mathematical Formulation of Multimodal Bayesian-Logit Fusion

### Environmental Stress Index ($\text{ESI} \in [0, 1]$)
$$\text{ESI}(\text{Temp}, \text{RH}, \text{NH}_3) = 0.45 \cdot S_{\text{NH}_3}(\text{NH}_3) + 0.35 \cdot S_{\text{RH}}(\text{RH}) + 0.20 \cdot S_{\text{T}}(\text{Temp}, T_{\text{target}})$$
where:
- $S_{\text{NH}_3} = \text{clip}\!\left(\frac{\text{NH}_3 - 8.0}{22.0},\, 0,\, 1\right)$
- $S_{\text{RH}} = \text{clip}\!\left(\frac{\text{RH} - 58.0}{28.0},\, 0,\, 1\right)$
- $S_{\text{T}} = \text{clip}\!\left(\frac{|\text{Temp} - T_{\text{target}}| - 1.5}{7.0},\, 0,\, 1\right)$

### Posterior Risk Formulation (PSO / GA Optimized)
$$P(\text{Risk} \mid \text{Image}, \text{Env}) = \sigma\Big(w_1 \cdot \text{Logit}(P_{\text{YOLO}}) + w_2 \cdot (\text{ESI} - \tau_{\text{env}})\Big)$$
where $\sigma(z) = \frac{1}{1 + e^{-z}}$, $\text{Logit}(p) = \ln\!\left(\frac{p}{1 - p}\right)$, and $(w_1, w_2, T_{\text{conf}})$ are optimized via **Particle Swarm Optimization (PSO)** and **Genetic Algorithm (GA)** to maximize the validation $F_1$-score.
