# 🧬 Genetic Algorithms Tutorial (Graduate / Doctoral Level)

Welcome to this open educational and research resource for **Genetic Algorithms (GAs)** and **Evolutionary Computation**, designed for graduate students and researchers with programming backgrounds (Python) who want to master metaheuristics and black-box optimization.

---

## 🎯 Module 1: Fitness Landscape Exploration and the Failure of Blind Search

In black-box optimization, we do not possess analytical access to the objective function or its derivatives. The optimizer can only propose candidate solution vectors $\mathbf{x}$ and observe scalar evaluations $f(\mathbf{x})$.

This interactive module provides hands-on exploration of core optimization challenges:
1. **The curse of blind search in non-convex, highly multimodal spaces:** Why uniform random sampling (Monte Carlo) and local gradient methods fail when confronted with rugged landscapes.
2. **Fog of War Exploration:** The terrain starts completely obscured. As solutions are evaluated (by clicking on the canvas or typing coordinates), the fitness topography is progressively reconstructed using spatial interpolation (*Inverse Distance Weighting* - IDW).
3. **Hidden / Randomized Optima:** The global optimum center $(x_0, y_0)$ and maximum fitness $f^*$ can be fixed or randomized. This simulates authentic research scenarios where the ground truth is unknown, while real-time metrics track proximity to the global optimum.
4. **Scalable Search Space Domains:** Expand the search space from standard size up to 10x (100x search area) or custom bounds. This vividly demonstrates how blind search hit rates drop to near zero in larger spaces, whereas Genetic Algorithms successfully locate and exploit promising basins of attraction.
5. **Brute Force vs. Evolutionary Intelligence:** Inject random solution batches and directly contrast their performance against a real-coded Genetic Algorithm (tournament selection, arithmetic crossover, Gaussian mutation, and elitism).

---

## 👑 Module 2: The N-Queens Problem (4, 8, 16 Queens) & Combinatorial Optimization

Combinatorial optimization poses unique challenges where solutions cannot be represented as continuous real vectors. The **N-Queens problem** requires placing $N$ queens on an $N \times N$ chessboard such that no two queens attack each other (sharing neither row, column, nor diagonal).

Key features in this interactive module:
1. **Multiple Board Dimensions:**
   - **4 Queens ($4 \times 4$):** Introductory, simplified problem with 2 valid solutions.
   - **8 Queens ($8 \times 8$):** The classic benchmark in artificial intelligence (92 distinct solutions, 12 fundamental).
   - **16 Queens ($16 \times 16$):** Large-scale combinatorial challenge with search space size of $16^{16} \approx 1.84 \times 10^{19}$ configurations.
2. **Interactive Manual Placement & Real-Time Conflict Detection:**
   - Click any square on the board to place, move, or remove queens.
   - **Visual Threat Indicators:** Queens in conflict glow in **CRIMSON RED** with threat count badges and pulsating warning borders; safe, peaceful queens glow in **EMERALD GREEN / GOLD**.
   - **Threat Laser Rays:** An SVG overlay dynamically renders red laser lines between attacking queens to visualize threats across rows, columns, and diagonals.
3. **Binary Solution Vector (0s and 1s):**
   - **1D Bitstream ($N^2$ bits):** Serialized binary array where `1` indicates a queen and `0` indicates empty cells. Hovering over any bit highlights the square on the board!
   - **2D Bit Matrix:** Direct $N \times N$ matrix representation with bracket formatting.
   - **Genotype / Phenotype Vector:** Integer row positions with binary bit strings ($\lceil\log_2 N\rceil$ bits per gene).
   - Instant one-click clipboard copy for data analysis.
4. **Permutation Genetic Algorithm (GA):**
   - Order Crossover (OX) operator ensuring valid permutations without row duplicates.
   - Swap and Inversion mutations with adaptive diversity kicks when populations stagnate.
   - Live animation controls (Play/Pause, Step, Solve, Speed: Slow to Turbo).
   - Real-time convergence curve tracking best conflicts and fitness percentage.

---

## 🚀 How to Launch the Interactive Interface

### Option 1: Open directly in your browser (No installation required)
Double click [`index.html`](file:///c:/Users/ruij3340/Documents/codes/genetic_algorithm_tutorial/index.html) or open it with any modern web browser (Chrome, Edge, Firefox, Safari). It runs fully client-side.

### Option 2: Local Python HTTP Server
Run from the root directory:
```bash
python -m http.server 8000
```
Then navigate to: [http://localhost:8000](http://localhost:8000)

### Option 3: GitHub Pages
Since `index.html` is located at the root of the repository, you can enable **GitHub Pages** from the repository settings (`Settings -> Pages -> Deploy from branch -> main / root`).

---

## 📂 Repository Structure

```text
genetic_algorithm_tutorial/
├── index.html                      # Main interactive web simulator (Modules 1 & 2)
├── css/
│   └── style.css                   # Cyber-scientific dark theme with glassmorphism
├── js/
│   ├── benchmarks.js               # Mathematical benchmark definitions (Schaffer F6, Rastrigin, Ackley, etc.)
│   ├── landscape_renderer.js       # 2D Canvas engine: Fog of War, IDW reconstruction, and God Mode
│   ├── surface_3d.js               # 3D interactive WebGL viewer (Three.js) with 360° orbit controls
│   ├── ga_engine.js                # Pedagogical real-coded Genetic Algorithm engine (continuous)
│   ├── nqueens.js                  # Module 2: N-Queens problem, binary vector, and permutation GA engine
│   └── app.js                      # Main application controller, tab navigation, and CSV export
├── python/
│   ├── __init__.py
│   ├── benchmarks.py               # Python library mirroring benchmark functions
│   └── demo_blind_search_vs_ga.py  # Empirical comparison script (Monte Carlo vs Grid Search vs GA)
├── notebooks/
│   └── 01_exploracion_paisaje_f6.ipynb # Jupyter Notebook with doctoral theory, visualizations, and exercises
└── README.md                       # Documentation and pedagogical guide
```

---

## 📐 Included Optimization Benchmarks

### 1. Schaffer's F6 Function with Tunable Frequency (J. David Schaffer, 1989)
The featured benchmark of this module. It exhibits infinite concentric sinusoidal ridges and a microscopic global peak:

$$f(x, y) = A \cdot \left[ 0.5 - \frac{\sin^2\left(\omega \cdot \sqrt{(x-x_0)^2 + (y-y_0)^2}\right) - 0.5}{\left[1 + 0.001\cdot\left((x-x_0)^2 + (y-y_0)^2\right)\right]^2} \right]$$

- **Standard Domain:** $[-100, 100] \times [-100, 100]$ (Area = $40,000$).
- **Expanded Domains:** $2\times$ ($[-200, 200]$, Area = $160,000$), $5\times$ ($[-500, 500]$, Area = $1,000,000$), or $10\times$ ($[-1000, 1000]$, Area = $4,000,000$).
- **Wave Frequency ($\omega$):** Adjustable from $0.2\times$ (broad waves) to $5.0\times$ (dense deceptive ridges).
- **Global Optimum:** Located strictly at $(x_0, y_0)$ with $f(x_0, y_0) = A$.
- **Peak Basin Scale:** Peak radius scales as $r_{peak} \approx \frac{\pi}{2\omega}$. At $\omega = 1.0$, $r \approx 1.57$ (occupying $< 0.019\%$ of the standard domain, and $< 0.00077\%$ of a 5x domain).
- **Zoom & Pan:** Use the mouse wheel or the `🔍+`, `🔍−`, and `⟲ 1:1` buttons to inspect micro-ridges, and drag with the cursor to navigate the landscape.

### 2. Other Benchmarks:
- **Rastrigin Function:** Highly multimodal regular grid with dozens of periodic local minima traps.
- **Ackley Function:** Nearly flat outer periphery with a steep and narrow central funnel.
- **Rosenbrock Valley (Banana Function):** Narrow curved parabolic valley with strong variable epistasis (coordinate correlation).
- **Himmelblau Function:** Multimodal landscape with 4 identical global optima, ideal for exploring niching and speciation.

---

## 🧪 Python Experiments

Reproduce and analyze the empirical comparisons in Python:

```bash
# Standard domain comparison
python python/demo_blind_search_vs_ga.py

# Expanded search space comparison (5x scale - 25x search area)
python python/demo_blind_search_vs_ga.py --domain-scale 5.0 --budget 300

# Extreme search space (10x scale - 100x search area)
python python/demo_blind_search_vs_ga.py --domain-scale 10.0 --budget 300

# Custom GA hyperparameters (Population = 40, Generations = 15, Elitism = 3)
python python/demo_blind_search_vs_ga.py --pop-size 40 --generations 15 --elitism 3
```

Sample output:
```text
========================================================================
PEDAGOGICAL EXPERIMENT: BLIND SEARCH VS. GENETIC ALGORITHM
Problem: Schaffer F6 Function (Hidden Random Center, Max = 100.0)
========================================================================

[TEACHER'S HIDDEN CONFIGURATION]
- Ground truth center (x0, y0): (20.91, -71.25)
- Theoretical global maximum: 100.00
- Search domain bounds: [-100.0, 100.0] x [-100.0, 100.0]
- Domain scale: 1.0x (Total search area: 40,000 sq units)
- Computational budget: 300 function evaluations

------------------------------------------------------------------------
Method                   | Best Fitness   | % of Optimum  | Distance to Opt
------------------------------------------------------------------------
Random Search (Monte Carlo)| 77.6948        | 77.69%        | 12.92          
Grid Search              | 88.5644        | 88.56%        | 9.21           
Genetic Algorithm (GA)   | 99.0269        | 99.03%        | 3.13           
------------------------------------------------------------------------

[OK] Convergence graph successfully saved to: comparativa_convergencia.png
```

To work with Jupyter Notebooks:
```bash
jupyter notebook notebooks/01_exploracion_paisaje_f6.ipynb
```

---

## 🗺️ Curriculum Roadmap

Future modules in this series:
- **Module 2:** Representation Schemes (Binary Chromosomes vs. Real-Valued Vectors).
- **Module 3:** Selection Strategies (Roulette Wheel, Tournament, Rank Selection) and Selective Pressure.
- **Module 4:** Crossover Operators and the Building Block Hypothesis.
- **Module 5:** Mutation Operators, Adaptive Parameter Control, and Premature Convergence Mitigation.
- **Module 6:** Multi-Objective Optimization (Pareto Fronts and NSGA-II).

---

## 📄 License
This project is licensed under the MIT License. Free for academic, educational, and research use.