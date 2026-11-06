/**
 * toy_problems.js - Didactic Laboratory for Classic & Discrete Genetic Algorithm Problems
 *
 * Implements:
 * 1. Sum of 2 Numbers (Target X + Y = T)
 * 2. Zero-Sum of 10 Numbers (Sum of 10 integers in [-100, 100] = 0)
 * 3. Target Word / String Guesser ("GENETIC ALGORITHM")
 * 4. 0/1 Knapsack Discrete Optimization
 */

class ToyProblemsLab {
    constructor() {
        this.currentProblem = 'zerosum10'; // 'zerosum10', 'sum2', 'word_guesser', 'knapsack'
        this.targetSum = 0;
        this.targetString = "GENETIC ALGORITHM";

        // GA Hyperparameters
        this.popSize = 60;
        this.crossoverRate = 0.85;
        this.mutationRate = 0.15;
        this.elitismCount = 2;
        this.tournamentSize = 3;

        // Runtime State
        this.population = [];
        this.generation = 0;
        this.totalEvaluations = 0;
        this.bestIndividual = null;
        this.history = []; // { gen, bestFitness, avgFitness, error }
        this.isRunning = false;
        this.timer = null;
        this.simSpeed = 50; // ms per gen

        // Knapsack definition (10 items)
        this.knapsackItems = [
            { name: "Gold Bar", weight: 12, value: 30 },
            { name: "Laptop", weight: 5, value: 20 },
            { name: "Camera", weight: 3, value: 15 },
            { name: "Water Bottle", weight: 2, value: 8 },
            { name: "First Aid", weight: 1, value: 10 },
            { name: "Tent", weight: 8, value: 22 },
            { name: "Sleeping Bag", weight: 4, value: 14 },
            { name: "Flashlight", weight: 1, value: 6 },
            { name: "Satellite Phone", weight: 2, value: 18 },
            { name: "Food Ration", weight: 3, value: 12 }
        ];
        this.knapsackMaxWeight = 20;

        this.initDOM();
        this.reset();
    }

    initDOM() {
        // Selectors & inputs
        this.selectProblem = document.getElementById('selectToyProblem');
        this.inputTargetSum = document.getElementById('inputToyTargetSum');
        this.groupTargetSum = document.getElementById('groupToyTargetSum');
        this.sliderPop = document.getElementById('sliderToyPop');
        this.valPop = document.getElementById('valToyPop');
        this.sliderCross = document.getElementById('sliderToyCross');
        this.valCross = document.getElementById('valToyCross');
        this.sliderMut = document.getElementById('sliderToyMut');
        this.valMut = document.getElementById('valToyMut');
        this.sliderElitism = document.getElementById('sliderToyElitism');
        this.valElitism = document.getElementById('valToyElitism');

        // Buttons
        this.btnPlay = document.getElementById('btnToyPlay');
        this.btnStep = document.getElementById('btnToyStep');
        this.btnSolve = document.getElementById('btnToySolve');
        this.btnReset = document.getElementById('btnToyReset');

        // Displays
        this.displayBestGenes = document.getElementById('toyBestGenesContainer');
        this.statGen = document.getElementById('statToyGen');
        this.statEvals = document.getElementById('statToyEvals');
        this.statBestFit = document.getElementById('statToyBestFit');
        this.statBestDetail = document.getElementById('statToyBestDetail');
        this.badgeUniverse = document.getElementById('badgeToyUniverse');
        this.popTableBody = document.getElementById('toyPopTableBody');
        this.chartCanvas = document.getElementById('toyConvergenceChart');
        this.problemExplainer = document.getElementById('toyProblemExplainer');

        // Event listeners
        if (this.selectProblem) {
            this.selectProblem.addEventListener('change', (e) => {
                this.currentProblem = e.target.value;
                if (this.groupTargetSum) {
                    this.groupTargetSum.style.display = (this.currentProblem === 'zerosum10' || this.currentProblem === 'sum2') ? 'block' : 'none';
                }
                this.reset();
            });
        }

        if (this.inputTargetSum) {
            this.inputTargetSum.addEventListener('change', (e) => {
                this.targetSum = parseInt(e.target.value) || 0;
                this.reset();
            });
        }

        if (this.sliderPop) {
            this.sliderPop.addEventListener('input', (e) => {
                this.popSize = parseInt(e.target.value);
                if (this.valPop) this.valPop.textContent = this.popSize;
            });
        }

        if (this.sliderCross) {
            this.sliderCross.addEventListener('input', (e) => {
                this.crossoverRate = parseFloat(e.target.value);
                if (this.valCross) this.valCross.textContent = `${Math.round(this.crossoverRate * 100)}%`;
            });
        }

        if (this.sliderMut) {
            this.sliderMut.addEventListener('input', (e) => {
                this.mutationRate = parseFloat(e.target.value);
                if (this.valMut) this.valMut.textContent = `${Math.round(this.mutationRate * 100)}%`;
            });
        }

        if (this.sliderElitism) {
            this.sliderElitism.addEventListener('input', (e) => {
                this.elitismCount = parseInt(e.target.value);
                if (this.valElitism) this.valElitism.textContent = this.elitismCount;
            });
        }

        if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.toggleRun());
        if (this.btnStep) this.btnStep.addEventListener('click', () => this.step());
        if (this.btnSolve) this.btnSolve.addEventListener('click', () => this.solveFast());
        if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());

        // Speed selector buttons
        document.querySelectorAll('.toy-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toy-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const spd = btn.dataset.speed;
                this.simSpeed = spd === 'slow' ? 180 : (spd === 'medium' ? 60 : 10);
            });
        });
    }

    // ==========================================
    // CHROMOSOME INITIALIZATION & EVALUATION
    // ==========================================
    randomChromosome() {
        if (this.currentProblem === 'zerosum10') {
            const genes = [];
            for (let i = 0; i < 10; i++) {
                genes.push(Math.floor(-100 + Math.random() * 201));
            }
            return genes;
        } else if (this.currentProblem === 'sum2') {
            return [
                Math.floor(-100 + Math.random() * 201),
                Math.floor(-100 + Math.random() * 201)
            ];
        } else if (this.currentProblem === 'word_guesser') {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
            let str = "";
            for (let i = 0; i < this.targetString.length; i++) {
                str += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return str.split('');
        } else {
            // Knapsack: 10 binary bits (0 or 1)
            const bits = [];
            for (let i = 0; i < 10; i++) bits.push(Math.random() < 0.5 ? 1 : 0);
            return bits;
        }
    }

    evaluateChromosome(genes) {
        this.totalEvaluations++;

        if (this.currentProblem === 'zerosum10') {
            const sum = genes.reduce((a, b) => a + b, 0);
            const error = Math.abs(sum - this.targetSum);
            // Fitness: 100 when error = 0, decreases as error grows
            const fitness = 100 / (1 + error * 0.05);
            return {
                genes: [...genes],
                sum: sum,
                error: error,
                fitness: fitness,
                isSolved: error === 0,
                display: `Sum = ${sum} (Target: ${this.targetSum}, Err: ${error})`
            };
        } else if (this.currentProblem === 'sum2') {
            const sum = genes[0] + genes[1];
            const error = Math.abs(sum - this.targetSum);
            const fitness = 100 / (1 + error * 0.1);
            return {
                genes: [...genes],
                sum: sum,
                error: error,
                fitness: fitness,
                isSolved: error === 0,
                display: `${genes[0]} + ${genes[1]} = ${sum} (Target: ${this.targetSum}, Err: ${error})`
            };
        } else if (this.currentProblem === 'word_guesser') {
            const str = genes.join('');
            let matches = 0;
            for (let i = 0; i < this.targetString.length; i++) {
                if (genes[i] === this.targetString[i]) matches++;
            }
            const fitness = (matches / this.targetString.length) * 100;
            return {
                genes: [...genes],
                str: str,
                matches: matches,
                fitness: fitness,
                isSolved: matches === this.targetString.length,
                display: `"${str}" (${matches} / ${this.targetString.length} matches)`
            };
        } else {
            // Knapsack evaluation
            let totalWeight = 0;
            let totalValue = 0;
            genes.forEach((bit, i) => {
                if (bit === 1) {
                    totalWeight += this.knapsackItems[i].weight;
                    totalValue += this.knapsackItems[i].value;
                }
            });

            // Penalty if weight exceeds capacity
            let fitness = totalValue;
            if (totalWeight > this.knapsackMaxWeight) {
                const over = totalWeight - this.knapsackMaxWeight;
                fitness = Math.max(0, totalValue - over * 15);
            }

            return {
                genes: [...genes],
                weight: totalWeight,
                value: totalValue,
                fitness: fitness,
                isSolved: false,
                display: `Val: $${totalValue} | Wt: ${totalWeight} / ${this.knapsackMaxWeight}kg`
            };
        }
    }

    getSearchSpaceUniverseInfo() {
        if (this.currentProblem === 'zerosum10') {
            return {
                title: "Zero-Sum 10 Numbers (Search Universe: 201¹⁰ ≈ 1.09 × 10²³ states)",
                universeFormatted: "201¹⁰ ≈ 1.09 × 10²³ combinations",
                explainer: "Ten integer variables each bounded between -100 and +100. Brute force would take billions of years, but the GA navigates this vast hyperspace using selection pressure and recombination to find target zero-sum in seconds."
            };
        } else if (this.currentProblem === 'sum2') {
            return {
                title: "Sum of 2 Numbers (Search Universe: 201 × 201 = 40,401 combinations)",
                universeFormatted: "201 × 201 = 40,401 states",
                explainer: "Two integer variables in [-100, 100]. An accessible entry-level problem to visually verify that genetic operators rapidly steer the sum towards the exact desired target."
            };
        } else if (this.currentProblem === 'word_guesser') {
            const alphabet = 27; // 26 letters + space
            const len = this.targetString.length;
            const comb = Math.pow(alphabet, len);
            return {
                title: `Target String Guesser (Alphabet: 27, Length: ${len} → 27^${len} combinations)`,
                universeFormatted: `27^${len} ≈ ${comb.toExponential(2)} combinations`,
                explainer: "Each character is an independent discrete gene. Demonstrates Darwinian cumulative selection: once correct characters are found, crossover locks them in while mutations fix remaining errors."
            };
        } else {
            return {
                title: "0/1 Knapsack Problem (2¹⁰ = 1,024 configurations)",
                universeFormatted: "2¹⁰ = 1,024 states",
                explainer: "Classic combinatorial optimization. A binary decision vector (0 = leave, 1 = pack) maximizes utility while strictly penalizing over-weight solutions."
            };
        }
    }

    // ==========================================
    // GENETIC OPERATORS
    // ==========================================
    crossover(parent1, parent2) {
        if (Math.random() >= this.crossoverRate) {
            return [[...parent1.genes], [...parent2.genes]];
        }

        const len = parent1.genes.length;
        const cut = 1 + Math.floor(Math.random() * (len - 1));

        const c1 = [...parent1.genes.slice(0, cut), ...parent2.genes.slice(cut)];
        const c2 = [...parent2.genes.slice(0, cut), ...parent1.genes.slice(cut)];
        return [c1, c2];
    }

    mutate(genes) {
        const len = genes.length;
        const mutated = [...genes];

        if (this.currentProblem === 'zerosum10' || this.currentProblem === 'sum2') {
            for (let i = 0; i < len; i++) {
                if (Math.random() < this.mutationRate) {
                    const delta = Math.floor(-15 + Math.random() * 31);
                    mutated[i] = Math.max(-100, Math.min(100, mutated[i] + delta));
                }
            }
        } else if (this.currentProblem === 'word_guesser') {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
            for (let i = 0; i < len; i++) {
                if (Math.random() < this.mutationRate) {
                    mutated[i] = chars.charAt(Math.floor(Math.random() * chars.length));
                }
            }
        } else {
            // Knapsack: bit flip
            for (let i = 0; i < len; i++) {
                if (Math.random() < this.mutationRate) {
                    mutated[i] = mutated[i] === 1 ? 0 : 1;
                }
            }
        }
        return mutated;
    }

    tournamentSelect() {
        let best = null;
        for (let i = 0; i < this.tournamentSize; i++) {
            const candidate = this.population[Math.floor(Math.random() * this.population.length)];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }

    // ==========================================
    // EVOLUTIONARY LOOP
    // ==========================================
    step() {
        this.generation++;
        const nextPop = [];

        // 1. Elitism
        const eliteCount = Math.min(this.elitismCount, this.population.length);
        for (let e = 0; e < eliteCount; e++) {
            nextPop.push(this.population[e]);
        }

        // 2. Reproduction
        while (nextPop.length < this.popSize) {
            const p1 = this.tournamentSelect();
            const p2 = this.tournamentSelect();

            const [c1Genes, c2Genes] = this.crossover(p1, p2);

            const m1Genes = this.mutate(c1Genes);
            nextPop.push(this.evaluateChromosome(m1Genes));

            if (nextPop.length < this.popSize) {
                const m2Genes = this.mutate(c2Genes);
                nextPop.push(this.evaluateChromosome(m2Genes));
            }
        }

        this.population = nextPop;
        this.population.sort((a, b) => b.fitness - a.fitness);
        this.bestIndividual = this.population[0];

        const avgFit = this.population.reduce((sum, ind) => sum + ind.fitness, 0) / this.popSize;
        this.history.push({
            gen: this.generation,
            bestFitness: this.bestIndividual.fitness,
            avgFitness: avgFit
        });

        this.updateUI();
        this.drawChart();

        // Check if optimal target attained
        if (this.bestIndividual.isSolved && this.isRunning) {
            this.stopRun();
        }
    }

    toggleRun() {
        if (this.isRunning) {
            this.stopRun();
        } else {
            this.startRun();
        }
    }

    startRun() {
        this.isRunning = true;
        if (this.btnPlay) {
            this.btnPlay.textContent = '⏸ Pause GA';
            this.btnPlay.classList.add('active');
        }
        this.timer = setInterval(() => {
            this.step();
        }, this.simSpeed);
    }

    stopRun() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.btnPlay) {
            this.btnPlay.textContent = '▶ Start GA';
            this.btnPlay.classList.remove('active');
        }
    }

    solveFast() {
        this.stopRun();
        let maxGens = 300;
        while (maxGens-- > 0 && !this.bestIndividual?.isSolved) {
            this.step();
        }
    }

    reset() {
        this.stopRun();
        this.generation = 0;
        this.totalEvaluations = 0;
        this.population = [];
        this.history = [];
        this.bestIndividual = null;

        for (let i = 0; i < this.popSize; i++) {
            const genes = this.randomChromosome();
            this.population.push(this.evaluateChromosome(genes));
        }

        this.population.sort((a, b) => b.fitness - a.fitness);
        this.bestIndividual = this.population[0];

        const avgFit = this.population.reduce((sum, ind) => sum + ind.fitness, 0) / this.popSize;
        this.history.push({
            gen: 0,
            bestFitness: this.bestIndividual.fitness,
            avgFitness: avgFit
        });

        this.updateUI();
        this.drawChart();
    }

    // ==========================================
    // UI RENDERING
    // ==========================================
    updateUI() {
        const info = this.getSearchSpaceUniverseInfo();
        if (this.badgeUniverse) this.badgeUniverse.textContent = info.universeFormatted;
        if (this.problemExplainer) this.problemExplainer.textContent = info.explainer;

        if (this.statGen) this.statGen.textContent = this.generation;
        if (this.statEvals) this.statEvals.textContent = this.totalEvaluations.toLocaleString();

        if (this.bestIndividual) {
            if (this.statBestFit) this.statBestFit.textContent = `${this.bestIndividual.fitness.toFixed(2)}%`;
            if (this.statBestDetail) this.statBestDetail.textContent = this.bestIndividual.display;

            // Render Genes Visualizer (Large high contrast boxes for projector)
            if (this.displayBestGenes) {
                if (this.currentProblem === 'zerosum10' || this.currentProblem === 'sum2') {
                    const isOptimal = this.bestIndividual.error === 0;
                    this.displayBestGenes.innerHTML = `
                        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center;">
                            ${this.bestIndividual.genes.map((g, i) => `
                                <div style="display:flex; flex-direction:column; align-items:center;">
                                    <div style="background: ${isOptimal ? 'rgba(0, 240, 144, 0.2)' : 'rgba(15, 23, 42, 0.9)'}; 
                                                border: 2px solid ${isOptimal ? '#00f090' : '#38bdf8'}; 
                                                color: #ffffff; font-weight: bold; font-family: var(--font-mono); font-size: 1.15rem; 
                                                min-width: 48px; height: 42px; display:flex; align-items:center; justify-content:center; 
                                                border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                                        ${g}
                                    </div>
                                    <span style="font-size: 0.65rem; color: var(--text-dim); margin-top:2px;">#${i+1}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div style="text-align:center; margin-top:10px; font-size:1.05rem; font-weight:bold; color: ${isOptimal ? 'var(--accent-emerald)' : 'var(--primary-cyan)'};">
                            ${isOptimal ? '🎉 PERFECT MATCH: ' : ''}Total Sum = ${this.bestIndividual.sum} (Target = ${this.targetSum} | Distance = ${this.bestIndividual.error})
                        </div>
                    `;
                } else if (this.currentProblem === 'word_guesser') {
                    const isOptimal = this.bestIndividual.matches === this.targetString.length;
                    this.displayBestGenes.innerHTML = `
                        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">
                            ${this.bestIndividual.genes.map((char, i) => {
                                const isMatch = char === this.targetString[i];
                                return `
                                    <div style="background: ${isMatch ? 'rgba(0, 240, 144, 0.25)' : 'rgba(255, 0, 85, 0.15)'}; 
                                                border: 2px solid ${isMatch ? '#00f090' : '#ff0055'}; 
                                                color: #ffffff; font-weight:bold; font-family: var(--font-mono); font-size: 1.25rem; 
                                                width: 32px; height: 38px; display:flex; align-items:center; justify-content:center; 
                                                border-radius: 4px;">
                                        ${char === ' ' ? '␣' : char}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div style="text-align:center; margin-top:10px; font-size:1.05rem; font-weight:bold; color: ${isOptimal ? 'var(--accent-emerald)' : 'var(--primary-cyan)'};">
                            ${isOptimal ? '🏆 STRING FULLY DECODED!' : `Matches: ${this.bestIndividual.matches} / ${this.targetString.length} (${this.bestIndividual.fitness.toFixed(1)}%)`}
                        </div>
                    `;
                } else {
                    // Knapsack view
                    this.displayBestGenes.innerHTML = `
                        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px;">
                            ${this.bestIndividual.genes.map((bit, i) => {
                                const item = this.knapsackItems[i];
                                const isPacked = bit === 1;
                                return `
                                    <div style="background: ${isPacked ? 'rgba(0, 229, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)'}; 
                                                border: 1px solid ${isPacked ? '#00e5ff' : 'rgba(255,255,255,0.1)'}; 
                                                padding: 6px; border-radius: 6px; text-align:center; font-size:0.75rem;">
                                        <div style="font-weight:bold; color:${isPacked ? '#00e5ff' : 'var(--text-dim)'};">${item.name}</div>
                                        <div style="font-size:0.7rem; color:var(--text-muted);">${item.weight}kg | $${item.value}</div>
                                        <div style="font-weight:bold; font-size:0.78rem; color:${isPacked ? '#00f090' : '#ff5577'}; margin-top:2px;">
                                            ${isPacked ? '✅ IN BAG' : '❌ EXCLUDED'}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div style="text-align:center; margin-top:10px; font-size:1.05rem; font-weight:bold; color:var(--primary-cyan);">
                            Total Weight: ${this.bestIndividual.weight} / ${this.knapsackMaxWeight}kg | Value: $${this.bestIndividual.value} | Fitness: ${this.bestIndividual.fitness.toFixed(1)}
                        </div>
                    `;
                }
            }
        }

        // Render population table
        if (this.popTableBody) {
            const recent = this.population.slice(0, 10);
            this.popTableBody.innerHTML = recent.map((ind, i) => `
                <tr style="${i === 0 ? 'background: rgba(255, 208, 0, 0.12); font-weight:bold;' : ''}">
                    <td>#${i + 1}${i === 0 ? ' ★' : ''}</td>
                    <td style="font-family: var(--font-mono); font-size:0.74rem;">${ind.display}</td>
                    <td style="color:var(--accent-gold); font-weight:bold;">${ind.fitness.toFixed(2)}</td>
                </tr>
            `).join('');
        }
    }

    drawChart() {
        if (!this.chartCanvas) return;
        const ctx = this.chartCanvas.getContext('2d');
        const w = this.chartCanvas.clientWidth || 320;
        const h = this.chartCanvas.clientHeight || 110;

        this.chartCanvas.width = w * (window.devicePixelRatio || 1);
        this.chartCanvas.height = h * (window.devicePixelRatio || 1);
        ctx.resetTransform?.();
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);

        if (this.history.length < 2) return;

        const maxFit = 100;
        const count = this.history.length;

        // Target ceiling line
        ctx.strokeStyle = "rgba(0, 240, 144, 0.4)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(w, 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Best fitness line
        ctx.strokeStyle = "#ffd000";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = (i / (count - 1)) * (w - 20) + 10;
            const norm = Math.max(0, Math.min(1, this.history[i].bestFitness / maxFit));
            const y = h - 12 - norm * (h - 24);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Average fitness line
        ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = (i / (count - 1)) * (w - 20) + 10;
            const norm = Math.max(0, Math.min(1, this.history[i].avgFitness / maxFit));
            const y = h - 12 - norm * (h - 24);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// Global and universal exports
if (typeof window !== "undefined") {
    window.ToyProblemsLab = ToyProblemsLab;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { ToyProblemsLab };
}
