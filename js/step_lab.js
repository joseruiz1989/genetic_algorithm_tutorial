/**
 * step_lab.js - Interactive Step-by-Step Genetic Algorithm Pedagogical Laboratory
 *
 * Implements an explicit, transparent evolutionary cycle:
 * 1. Generation 0 initialization & evaluation
 * 2. Fitness ranking & proportion calculation
 * 3. Animated Roulette Wheel selection (Fitness Proportionate)
 * 4. Chromosome recombination (Crossover) with gene visualizer
 * 5. Mutation step with random probability check and manual override
 * 6. Offspring evaluation and replacement into Generation t+1
 * 7. Generation progression and history tracking
 */

class StepLab {
    constructor() {
        this.problemType = 'f6'; // 'f6', 'nqueens', 'zerosum10', 'sum2'
        this.popSize = 8;        // Small, crisp population for classroom projection
        this.crossoverRate = 0.85;
        this.mutationRate = 0.25;
        this.elitismCount = 1;
        this.generation = 0;
        this.autoPlayInterval = null;
        this.autoPlaySpeed = 1000; // ms

        // Evolutionary State Machine
        // Stages: 'INIT' -> 'EVALUATED' -> 'SELECT_P1' -> 'SELECT_P2' -> 'CROSSOVER' -> 'MUTATION' -> 'REPLACE' -> 'GEN_DONE'
        this.stage = 'INIT';

        this.population = [];     // Array of individual objects
        this.nextGenPool = [];   // Array of children for next generation
        this.history = [];       // { gen, bestFitness, avgFitness }

        // Current active pair reproduction state
        this.parent1 = null;
        this.parent2 = null;
        this.parent1Index = -1;
        this.parent2Index = -1;
        this.offspring1 = null;
        this.offspring2 = null;
        this.crossoverOccurred = false;
        this.mutation1Occurred = false;
        this.mutation2Occurred = false;
        this.mutatedGene1 = -1;
        this.mutatedGene2 = -1;

        // Roulette Animation & Interaction State
        this.rouletteRotation = 0;
        this.isSpinning = false;
        this.hoveredSliceIndex = -1;
        this.currentBestFitness = 0;
        this.currentAvgFitness = 0;
        this.currentTotalFitness = 0;
        this.currentSelectionPressure = 1;

        this.initDOM();
        this.resetLab();
    }

    initDOM() {
        // Find or bind elements
        this.canvasRoulette = document.getElementById('stepRouletteCanvas');
        this.containerPop = document.getElementById('stepPopTableBody');
        this.containerPair = document.getElementById('stepPairInspection');
        this.containerNextGen = document.getElementById('stepNextGenCards');
        this.badgeStage = document.getElementById('stepBadgeStage');
        this.badgeGen = document.getElementById('stepBadgeGen');
        this.explainerText = document.getElementById('stepExplainerText');

        // New pedagogical diagnostics & badges
        this.badgePopCount = document.getElementById('stepBadgePopCount');
        this.rouletteStatus = document.getElementById('stepRouletteStatus');
        this.statBestFit = document.getElementById('stepStatBestFit');
        this.statAvgFit = document.getElementById('stepStatAvgFit');
        this.statTotalFit = document.getElementById('stepStatTotalFit');
        this.statPressure = document.getElementById('stepStatPressure');
        this.badgePoolCount = document.getElementById('stepBadgePoolCount');
        this.poolProgressBar = document.getElementById('stepPoolProgressBar');
        this.tableHistory = document.getElementById('stepHistoryTableBody');

        // Buttons
        this.btnNextStep = document.getElementById('btnStepNext');
        this.btnSpin = document.getElementById('btnStepSpin');
        this.btnFinishPair = document.getElementById('btnStepFinishPair');
        this.btnFinishGen = document.getElementById('btnStepFinishGen');
        this.btnReset = document.getElementById('btnStepReset');
        this.btnAuto = document.getElementById('btnStepAutoPlay');
        this.btnForceMutate = document.getElementById('btnStepForceMutate');

        // Controls
        this.selectProblem = document.getElementById('selectStepProblem');
        this.sliderPop = document.getElementById('sliderStepPop');
        this.valPop = document.getElementById('valStepPop');
        this.sliderCross = document.getElementById('sliderStepCross');
        this.valCross = document.getElementById('valStepCross');
        this.sliderMut = document.getElementById('sliderStepMut');
        this.valMut = document.getElementById('valStepMut');

        // Event listeners
        if (this.selectProblem) {
            this.selectProblem.addEventListener('change', (e) => {
                this.problemType = e.target.value;
                this.resetLab();
            });
        }

        if (this.sliderPop) {
            this.sliderPop.addEventListener('input', (e) => {
                this.popSize = parseInt(e.target.value);
                if (this.valPop) this.valPop.textContent = this.popSize;
                this.resetLab();
            });
        }

        // Population presets (N=8, 16, 24, 40)
        document.querySelectorAll('.step-pop-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const pop = parseInt(btn.dataset.pop);
                this.popSize = pop;
                if (this.sliderPop) this.sliderPop.value = pop;
                if (this.valPop) this.valPop.textContent = pop;
                this.resetLab();
            });
        });

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

        if (this.btnNextStep) this.btnNextStep.addEventListener('click', () => this.advanceStep());
        if (this.btnSpin) this.btnSpin.addEventListener('click', () => this.triggerRouletteSpin());
        if (this.btnFinishPair) this.btnFinishPair.addEventListener('click', () => this.finishCurrentPair());
        if (this.btnFinishGen) this.btnFinishGen.addEventListener('click', () => this.finishEntireGeneration());
        if (this.btnReset) this.btnReset.addEventListener('click', () => this.resetLab());
        if (this.btnAuto) this.btnAuto.addEventListener('click', () => this.toggleAutoPlay());
        if (this.btnForceMutate) this.btnForceMutate.addEventListener('click', () => this.forceMutation());

        // Roulette Canvas Hover & Click Interaction
        if (this.canvasRoulette) {
            this.canvasRoulette.addEventListener('mousemove', (e) => {
                if (this.isSpinning || !this.population || this.population.length === 0) return;
                const rect = this.canvasRoulette.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                const radius = (rect.width / 2) - 15;

                if (dist <= radius && dist >= 20) {
                    let angle = Math.atan2(y - cy, x - cx) - (this.rouletteRotation % (Math.PI * 2));
                    while (angle < 0) angle += Math.PI * 2;
                    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

                    const matchIdx = this.population.findIndex(ind => angle >= ind.sliceStart && angle < ind.sliceEnd);
                    if (matchIdx !== -1 && matchIdx !== this.hoveredSliceIndex) {
                        this.hoveredSliceIndex = matchIdx;
                        this.drawRouletteWheel(matchIdx);
                        this.highlightTableRow(matchIdx);
                    }
                } else if (this.hoveredSliceIndex !== -1) {
                    this.hoveredSliceIndex = -1;
                    this.drawRouletteWheel(-1);
                    this.highlightTableRow(-1);
                }
            });

            this.canvasRoulette.addEventListener('mouseleave', () => {
                if (this.hoveredSliceIndex !== -1) {
                    this.hoveredSliceIndex = -1;
                    this.drawRouletteWheel(-1);
                    this.highlightTableRow(-1);
                }
            });

            this.canvasRoulette.addEventListener('click', () => {
                if (!this.isSpinning && (this.stage === 'SELECT_P1' || this.stage === 'SELECT_P2')) {
                    this.advanceStep();
                }
            });
        }

        // Speed buttons
        document.querySelectorAll('.step-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.step-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const spd = btn.dataset.speed;
                this.autoPlaySpeed = spd === 'slow' ? 1400 : (spd === 'medium' ? 800 : 350);
                if (this.autoPlayInterval) {
                    this.stopAutoPlay();
                    this.startAutoPlay();
                }
            });
        });
    }

    highlightTableRow(index) {
        if (!this.containerPop) return;
        const rows = this.containerPop.querySelectorAll('tr');
        rows.forEach((row, i) => {
            if (i === index) {
                row.classList.add('slice-highlight');
                if (typeof row.scrollIntoView === 'function') {
                    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else {
                row.classList.remove('slice-highlight');
            }
        });
    }

    // Colors palette for individuals (high contrast on projector + golden angle HSL distribution for large populations)
    getIndividualColor(index) {
        const primaryPalette = [
            '#00e5ff', '#ff0077', '#ffd000', '#00f090',
            '#9d4edd', '#ff6b35', '#00b4d8', '#f72585',
            '#4cc9f0', '#7209b7', '#38b000', '#f77f00',
            '#e63946', '#a8dadc', '#457b9d', '#e07a5f',
            '#06d6a0', '#118ab2', '#f3722c', '#90be6d'
        ];
        if (index < primaryPalette.length) {
            return primaryPalette[index];
        }
        // Golden ratio hue distribution guarantees distinct, non-repeating colors for any N <= 100
        const hue = Math.round((index * 137.508) % 360);
        return `hsl(${hue}, 86%, 56%)`;
    }

    // ==========================================
    // PROBLEM ENCODING & FITNESS LOGIC
    // ==========================================
    createRandomIndividual(id) {
        if (this.problemType === 'f6') {
            // Schaffer F6: Chromosome [x, y] in [-100, 100]
            const x = Math.round((-100 + Math.random() * 200) * 10) / 10;
            const y = Math.round((-100 + Math.random() * 200) * 10) / 10;
            return {
                id: id,
                genes: [x, y],
                geneLabels: ['X', 'Y'],
                fitness: 0,
                probability: 0,
                color: this.getIndividualColor(id - 1)
            };
        } else if (this.problemType === 'nqueens') {
            // 8 Queens: Chromosome permutation of 0..7
            const genes = [0, 1, 2, 3, 4, 5, 6, 7];
            for (let i = genes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [genes[i], genes[j]] = [genes[j], genes[i]];
            }
            return {
                id: id,
                genes: genes,
                geneLabels: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
                fitness: 0,
                probability: 0,
                color: this.getIndividualColor(id - 1)
            };
        } else if (this.problemType === 'zerosum10') {
            // Zero-Sum of 10 numbers: 10 integers in [-100, 100], target sum = 0
            const genes = [];
            for (let i = 0; i < 10; i++) {
                genes.push(Math.floor(-100 + Math.random() * 201));
            }
            return {
                id: id,
                genes: genes,
                geneLabels: ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'],
                fitness: 0,
                probability: 0,
                color: this.getIndividualColor(id - 1)
            };
        } else {
            // Sum of 2 numbers: [x, y] in [-100, 100] summing to target (e.g. 0)
            const x = Math.floor(-100 + Math.random() * 201);
            const y = Math.floor(-100 + Math.random() * 201);
            return {
                id: id,
                genes: [x, y],
                geneLabels: ['X', 'Y'],
                fitness: 0,
                probability: 0,
                color: this.getIndividualColor(id - 1)
            };
        }
    }

    evaluateIndividual(ind) {
        if (this.problemType === 'f6') {
            const x = ind.genes[0];
            const y = ind.genes[1];
            const r2 = x * x + y * y;
            const r = Math.sqrt(r2);
            const sinR = Math.sin(r);
            const num = (sinR * sinR) - 0.5;
            const den = Math.pow(1 + 0.001 * r2, 2);
            const fit = 0.5 - (num / den);
            ind.fitness = Math.max(0.0001, fit);
            ind.displayPhenotype = `(${x.toFixed(1)}, ${y.toFixed(1)}) → f(x,y)=${ind.fitness.toFixed(4)}`;
        } else if (this.problemType === 'nqueens') {
            // Count diagonal collisions in permutation
            let conflicts = 0;
            const n = ind.genes.length;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (Math.abs(ind.genes[i] - ind.genes[j]) === (j - i)) {
                        conflicts++;
                    }
                }
            }
            const maxPairs = (n * (n - 1)) / 2; // 28
            ind.fitness = maxPairs - conflicts;
            ind.displayPhenotype = `[${ind.genes.join(',')}] | ${conflicts} conflicts → ${ind.fitness}/${maxPairs} pts`;
        } else if (this.problemType === 'zerosum10') {
            const sum = ind.genes.reduce((a, b) => a + b, 0);
            const error = Math.abs(sum);
            // Fitness approaches 100 as error approaches 0
            ind.fitness = Math.round((100 / (1 + error * 0.05)) * 10) / 10;
            ind.displayPhenotype = `Sum = ${sum} (err: ${error}) → Fit: ${ind.fitness}`;
        } else {
            // Sum of 2 numbers target 0
            const sum = ind.genes[0] + ind.genes[1];
            const error = Math.abs(sum);
            ind.fitness = Math.round((100 / (1 + error * 0.1)) * 10) / 10;
            ind.displayPhenotype = `${ind.genes[0]} + ${ind.genes[1]} = ${sum} (err: ${error}) → Fit: ${ind.fitness}`;
        }
    }

    // ==========================================
    // EVOLUTIONARY OPERATIONS
    // ==========================================
    resetLab() {
        this.stopAutoPlay();
        this.generation = 0;
        this.stage = 'INIT';
        this.population = [];
        this.nextGenPool = [];
        this.history = [];
        this.parent1 = null;
        this.parent2 = null;
        this.parent1Index = -1;
        this.parent2Index = -1;
        this.offspring1 = null;
        this.offspring2 = null;

        for (let i = 1; i <= this.popSize; i++) {
            const ind = this.createRandomIndividual(i);
            this.evaluateIndividual(ind);
            this.population.push(ind);
        }

        this.sortAndComputeProbabilities();
        this.updateUI();
        this.drawRouletteWheel();
    }

    sortAndComputeProbabilities() {
        // Sort descending by fitness
        this.population.sort((a, b) => b.fitness - a.fitness);

        // Re-assign distinct visual colors based on rank
        this.population.forEach((ind, i) => {
            ind.rank = i + 1;
            ind.color = this.getIndividualColor(i);
        });

        // Compute roulette probabilities
        const minFit = Math.min(...this.population.map(p => p.fitness));
        const offset = minFit <= 0 ? Math.abs(minFit) + 0.01 : 0.001;
        const shifted = this.population.map(p => Math.max(0.001, p.fitness + offset));
        const totalShifted = shifted.reduce((a, b) => a + b, 0);

        let cumulative = 0;
        this.population.forEach((ind, i) => {
            ind.probability = shifted[i] / totalShifted;
            ind.probPercent = (ind.probability * 100).toFixed(1);
            ind.sliceStart = cumulative;
            ind.sliceEnd = cumulative + ind.probability * 2 * Math.PI;

            const startVal = (cumulative / (2 * Math.PI)).toFixed(3);
            const endVal = (ind.sliceEnd / (2 * Math.PI)).toFixed(3);
            ind.intervalStr = `[${startVal}, ${endVal})`;

            cumulative = ind.sliceEnd;
        });

        const best = this.population[0] || { fitness: 0 };
        const avg = this.population.reduce((sum, p) => sum + p.fitness, 0) / (this.popSize || 1);
        const totalRaw = this.population.reduce((sum, p) => sum + p.fitness, 0);

        this.currentBestFitness = best.fitness;
        this.currentAvgFitness = avg;
        this.currentTotalFitness = totalRaw;
        this.currentSelectionPressure = avg > 0 ? (best.fitness / avg) : 1;

        // Track generation history (upsert current generation)
        const existingGen = this.history.find(h => h.gen === this.generation);
        if (existingGen) {
            existingGen.bestFitness = best.fitness;
            existingGen.avgFitness = avg;
        } else {
            this.history.push({
                gen: this.generation,
                bestFitness: best.fitness,
                avgFitness: avg
            });
        }
    }

    advanceStep() {
        switch (this.stage) {
            case 'INIT':
            case 'EVALUATED':
                // Move to Parent 1 selection
                this.stage = 'SELECT_P1';
                this.parent1 = null;
                this.parent2 = null;
                this.offspring1 = null;
                this.offspring2 = null;
                this.updateUI();
                break;

            case 'SELECT_P1':
                // Select parent 1 via roulette
                this.triggerRouletteSpin(() => {
                    this.parent1 = this.selectedRouletteIndividual;
                    this.parent1Index = this.population.indexOf(this.parent1);
                    this.stage = 'SELECT_P2';
                    this.updateUI();
                });
                break;

            case 'SELECT_P2':
                // Select parent 2 via roulette
                this.triggerRouletteSpin(() => {
                    this.parent2 = this.selectedRouletteIndividual;
                    this.parent2Index = this.population.indexOf(this.parent2);
                    this.stage = 'CROSSOVER';
                    this.performCrossover();
                    this.updateUI();
                });
                break;

            case 'CROSSOVER':
                // Apply mutation to offspring
                this.stage = 'MUTATION';
                this.performMutation();
                this.updateUI();
                break;

            case 'MUTATION':
                // Evaluate offspring and insert into next generation pool
                this.stage = 'REPLACE';
                this.evaluateAndInsertOffspring();
                this.updateUI();
                break;

            case 'REPLACE':
                // Check if generation is full
                if (this.nextGenPool.length >= this.popSize) {
                    this.stage = 'GEN_DONE';
                } else {
                    // Ready for next pair
                    this.stage = 'SELECT_P1';
                    this.parent1 = null;
                    this.parent2 = null;
                    this.offspring1 = null;
                    this.offspring2 = null;
                }
                this.updateUI();
                break;

            case 'GEN_DONE':
                // Advance generation
                this.completeGenerationTransition();
                break;
        }
    }

    performCrossover() {
        if (!this.parent1 || !this.parent2) return;
        this.crossoverOccurred = Math.random() < this.crossoverRate;

        const genes1 = [...this.parent1.genes];
        const genes2 = [...this.parent2.genes];
        const numGenes = genes1.length;

        let childGenes1 = [];
        let childGenes2 = [];

        if (!this.crossoverOccurred) {
            childGenes1 = [...genes1];
            childGenes2 = [...genes2];
        } else if (this.problemType === 'nqueens') {
            // Order Crossover (OX) for Permutation
            const cut1 = Math.floor(Math.random() * (numGenes - 2));
            const cut2 = cut1 + 1 + Math.floor(Math.random() * (numGenes - cut1 - 1));

            const ox = (p1, p2) => {
                const child = Array(numGenes).fill(-1);
                // Copy segment from p1
                for (let i = cut1; i <= cut2; i++) child[i] = p1[i];
                // Fill remaining from p2 in circular order
                let p2Idx = 0;
                for (let i = 0; i < numGenes; i++) {
                    if (child[i] === -1) {
                        while (child.includes(p2[p2Idx])) p2Idx++;
                        child[i] = p2[p2Idx++];
                    }
                }
                return child;
            };

            childGenes1 = ox(genes1, genes2);
            childGenes2 = ox(genes2, genes1);
        } else if (this.problemType === 'zerosum10') {
            // Single point crossover for 10 integers
            const cut = 3 + Math.floor(Math.random() * 4); // Cut between gene 3 and 7
            childGenes1 = [...genes1.slice(0, cut), ...genes2.slice(cut)];
            childGenes2 = [...genes2.slice(0, cut), ...genes1.slice(cut)];
            this.crossoverCut = cut;
        } else {
            // Arithmetic Blending for continuous/2-number
            const alpha = 0.5;
            childGenes1 = [
                Math.round((alpha * genes1[0] + (1 - alpha) * genes2[0]) * 10) / 10,
                Math.round((alpha * genes1[1] + (1 - alpha) * genes2[1]) * 10) / 10
            ];
            childGenes2 = [
                Math.round(((1 - alpha) * genes1[0] + alpha * genes2[0]) * 10) / 10,
                Math.round(((1 - alpha) * genes1[1] + alpha * genes2[1]) * 10) / 10
            ];
        }

        this.offspring1 = {
            id: `Child #${this.nextGenPool.length + 1}`,
            genes: childGenes1,
            geneLabels: [...this.parent1.geneLabels],
            parent1Id: this.parent1.id,
            parent2Id: this.parent2.id,
            mutated: false
        };

        this.offspring2 = {
            id: `Child #${this.nextGenPool.length + 2}`,
            genes: childGenes2,
            geneLabels: [...this.parent2.geneLabels],
            parent1Id: this.parent1.id,
            parent2Id: this.parent2.id,
            mutated: false
        };
    }

    performMutation() {
        if (!this.offspring1 || !this.offspring2) return;
        this.mutation1Occurred = Math.random() < this.mutationRate;
        this.mutation2Occurred = Math.random() < this.mutationRate;

        const mutateChild = (child, didMutate) => {
            if (!didMutate) return { mutated: false, geneIdx: -1 };
            const numGenes = child.genes.length;
            const geneIdx = Math.floor(Math.random() * numGenes);

            if (this.problemType === 'nqueens') {
                // Swap mutation for permutation
                const geneIdx2 = (geneIdx + 1 + Math.floor(Math.random() * (numGenes - 1))) % numGenes;
                [child.genes[geneIdx], child.genes[geneIdx2]] = [child.genes[geneIdx2], child.genes[geneIdx]];
            } else if (this.problemType === 'zerosum10' || this.problemType === 'sum2') {
                // Integer Gaussian delta
                const delta = Math.floor(-15 + Math.random() * 31);
                child.genes[geneIdx] = Math.max(-100, Math.min(100, child.genes[geneIdx] + delta));
            } else {
                // F6 coordinate delta
                const delta = Math.round((-10 + Math.random() * 20) * 10) / 10;
                child.genes[geneIdx] = Math.max(-100, Math.min(100, child.genes[geneIdx] + delta));
            }

            child.mutated = true;
            child.mutatedGeneIdx = geneIdx;
            return { mutated: true, geneIdx };
        };

        const res1 = mutateChild(this.offspring1, this.mutation1Occurred);
        const res2 = mutateChild(this.offspring2, this.mutation2Occurred);
        this.mutatedGene1 = res1.geneIdx;
        this.mutatedGene2 = res2.geneIdx;
    }

    forceMutation() {
        if (!this.offspring1) {
            alert("Advance to Crossover or Mutation stage first to mutate offspring!");
            return;
        }
        this.mutation1Occurred = true;
        const numGenes = this.offspring1.genes.length;
        const geneIdx = Math.floor(Math.random() * numGenes);
        if (this.problemType === 'nqueens') {
            const geneIdx2 = (geneIdx + 1) % numGenes;
            [this.offspring1.genes[geneIdx], this.offspring1.genes[geneIdx2]] = [this.offspring1.genes[geneIdx2], this.offspring1.genes[geneIdx]];
        } else {
            this.offspring1.genes[geneIdx] = Math.round((this.offspring1.genes[geneIdx] + (-20 + Math.random() * 40)) * 10) / 10;
        }
        this.offspring1.mutated = true;
        this.offspring1.mutatedGeneIdx = geneIdx;
        this.mutatedGene1 = geneIdx;
        this.updateUI();
    }

    evaluateAndInsertOffspring() {
        if (!this.offspring1) return;

        this.evaluateIndividual(this.offspring1);
        this.offspring1.color = '#38bdf8';
        this.nextGenPool.push({ ...this.offspring1 });

        if (this.offspring2 && this.nextGenPool.length < this.popSize) {
            this.evaluateIndividual(this.offspring2);
            this.offspring2.color = '#f43f5e';
            this.nextGenPool.push({ ...this.offspring2 });
        }
    }

    finishCurrentPair() {
        if (this.stage === 'INIT' || this.stage === 'GEN_DONE') {
            this.advanceStep();
            return;
        }
        // Run remaining sub-steps for current pair directly
        if (!this.parent1) {
            this.parent1 = this.population[Math.floor(Math.random() * this.population.length)];
            this.parent1Index = this.population.indexOf(this.parent1);
        }
        if (!this.parent2) {
            this.parent2 = this.population[Math.floor(Math.random() * this.population.length)];
            this.parent2Index = this.population.indexOf(this.parent2);
        }
        if (!this.offspring1) {
            this.performCrossover();
        }
        this.performMutation();
        this.evaluateAndInsertOffspring();

        if (this.nextGenPool.length >= this.popSize) {
            this.stage = 'GEN_DONE';
        } else {
            this.stage = 'SELECT_P1';
            this.parent1 = null;
            this.parent2 = null;
            this.offspring1 = null;
            this.offspring2 = null;
        }
        this.updateUI();
    }

    finishEntireGeneration() {
        // Carry over top Elites if configured
        if (this.nextGenPool.length === 0 && this.elitismCount > 0) {
            for (let e = 0; e < Math.min(this.elitismCount, this.population.length); e++) {
                const elite = { ...this.population[e], id: `Elite #${e + 1}`, isElite: true };
                this.nextGenPool.push(elite);
            }
        }

        // Fill remaining slots
        while (this.nextGenPool.length < this.popSize) {
            this.finishCurrentPair();
        }

        this.stage = 'GEN_DONE';
        this.updateUI();
        this.completeGenerationTransition();
    }

    completeGenerationTransition() {
        this.generation++;
        // Replace population with new generation pool
        this.population = this.nextGenPool.map((ind, i) => ({
            ...ind,
            id: i + 1,
            color: this.getIndividualColor(i)
        }));

        this.nextGenPool = [];
        this.stage = 'EVALUATED';
        this.parent1 = null;
        this.parent2 = null;
        this.offspring1 = null;
        this.offspring2 = null;

        this.sortAndComputeProbabilities();
        this.updateUI();
        this.drawRouletteWheel();
    }

    // ==========================================
    // ROULETTE WHEEL RENDERING & ANIMATION
    // ==========================================
    drawRouletteWheel(highlightIndex = -1) {
        if (!this.canvasRoulette) return;
        const ctx = this.canvasRoulette.getContext('2d');
        const w = this.canvasRoulette.width;
        const h = this.canvasRoulette.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) - 22;

        ctx.clearRect(0, 0, w, h);

        const activeHighlight = highlightIndex !== -1 ? highlightIndex : this.hoveredSliceIndex;

        // Draw Outer Rim Background
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = '#090f1d';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw Slices
        this.population.forEach((ind, i) => {
            const startAngle = ind.sliceStart + this.rouletteRotation;
            const endAngle = ind.sliceEnd + this.rouletteRotation;
            const isHighlighted = i === activeHighlight;
            const isP1 = this.parent1 && this.parent1.id === ind.id;
            const isP2 = this.parent2 && this.parent2.id === ind.id;

            const sliceRadius = (isHighlighted || isP1 || isP2) ? radius + 6 : radius;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, sliceRadius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = ind.color;
            ctx.fill();

            if (isHighlighted || isP1 || isP2) {
                ctx.strokeStyle = isP1 ? '#00e5ff' : (isP2 ? '#ff0077' : '#ffd000');
                ctx.lineWidth = 3.5;
            } else {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2.5;
            }
            ctx.stroke();

            // Label inside slice if slice is large enough or highlighted
            const sliceSize = ind.sliceEnd - ind.sliceStart;
            if (sliceSize > 0.22 || isHighlighted) {
                const midAngle = (startAngle + endAngle) / 2;
                const textR = radius * (isHighlighted ? 0.68 : 0.63);
                const tx = cx + Math.cos(midAngle) * textR;
                const ty = cy + Math.sin(midAngle) * textR;

                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(midAngle + Math.PI / 2);

                // Small badge background for crisp readability on projector
                ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
                ctx.fillRect(-22, -14, 44, 26);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-22, -14, 44, 26);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`I#${ind.id}`, 0, -4);

                ctx.fillStyle = '#ffd000';
                ctx.font = 'bold 9px "JetBrains Mono", monospace';
                ctx.fillText(`${ind.probPercent}%`, 0, 7);
                ctx.restore();
            }
        });

        // Center hub
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#ffd000';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GA', cx, cy - 1);

        // Fixed Top Indicator Needle (pointing straight down at top edge)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 13, 8);
        ctx.lineTo(cx + 13, 8);
        ctx.lineTo(cx, 32);
        ctx.closePath();
        ctx.fillStyle = '#ffd000';
        ctx.shadowColor = '#ffd000';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    triggerRouletteSpin(onComplete) {
        if (this.isSpinning) return;
        this.isSpinning = true;

        if (this.rouletteStatus) {
            this.rouletteStatus.textContent = '🎲 Spinning...';
            this.rouletteStatus.style.color = '#38bdf8';
        }

        // Choose winner based on probability
        const rand = Math.random();
        let cumulative = 0;
        let winnerIndex = 0;
        for (let i = 0; i < this.population.length; i++) {
            cumulative += this.population[i].probability;
            if (rand <= cumulative) {
                winnerIndex = i;
                break;
            }
        }

        const winner = this.population[winnerIndex];
        this.selectedRouletteIndividual = winner;

        // Target angle so winner's midpoint aligns with top needle (-PI/2)
        const winnerMid = (winner.sliceStart + winner.sliceEnd) / 2;
        const targetRot = (3 * Math.PI / 2 - winnerMid) + Math.PI * 2 * (4 + Math.floor(Math.random() * 2));
        const startRot = this.rouletteRotation;
        const deltaRot = targetRot - (startRot % (Math.PI * 2));

        const duration = 1200; // ms
        const startTime = performance.now();

        const animateSpin = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            this.rouletteRotation = startRot + deltaRot * ease;
            this.drawRouletteWheel();

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                this.isSpinning = false;
                this.rouletteRotation = this.rouletteRotation % (Math.PI * 2);
                if (this.rouletteStatus) {
                    this.rouletteStatus.textContent = `Selected: #${winner.id}`;
                    this.rouletteStatus.style.color = winner.color;
                }
                this.hoveredSliceIndex = winnerIndex;
                this.drawRouletteWheel(winnerIndex);
                this.highlightTableRow(winnerIndex);
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animateSpin);
    }

    // ==========================================
    // UI RENDERING & STAGE UPDATES
    // ==========================================
    updateUI() {
        if (this.badgeGen) this.badgeGen.textContent = `Gen ${this.generation}`;
        if (this.badgePopCount) this.badgePopCount.textContent = `${this.population.length} Individuals`;

        if (this.badgeStage) {
            const stageLabels = {
                'INIT': '1. Population Init',
                'EVALUATED': '2. Fitness Ranked',
                'SELECT_P1': '3. Spin Roulette (Parent 1)',
                'SELECT_P2': '4. Spin Roulette (Parent 2)',
                'CROSSOVER': '5. Crossover Recombination',
                'MUTATION': '6. Mutation Probability Check',
                'REPLACE': '7. Offspring Insertion',
                'GEN_DONE': '8. Generation Transition Ready'
            };
            this.badgeStage.textContent = stageLabels[this.stage] || this.stage;
        }

        // Diagnostics
        if (this.statBestFit) this.statBestFit.textContent = this.currentBestFitness !== undefined ? this.currentBestFitness.toFixed(3) : '-';
        if (this.statAvgFit) this.statAvgFit.textContent = this.currentAvgFitness !== undefined ? this.currentAvgFitness.toFixed(3) : '-';
        if (this.statTotalFit) this.statTotalFit.textContent = this.currentTotalFitness !== undefined ? this.currentTotalFitness.toFixed(1) : '-';
        if (this.statPressure) this.statPressure.textContent = this.currentSelectionPressure !== undefined ? `${this.currentSelectionPressure.toFixed(2)}x` : '-';

        // Explainer text updates
        if (this.explainerText) {
            switch (this.stage) {
                case 'INIT':
                case 'EVALUATED':
                    this.explainerText.innerHTML = `<strong>Generation ${this.generation}:</strong> Population evaluated and ranked. Individuals with higher fitness receive wider slices on the Roulette Wheel, giving them a mathematical advantage for selection.`;
                    break;
                case 'SELECT_P1':
                    this.explainerText.innerHTML = `<strong>Selection Stage (Parent 1):</strong> Click <em>"Spin Roulette"</em> or <em>"Next Step"</em> to select the first parent based on fitness proportionate probability ($p_i = f_i / \\sum f$).`;
                    break;
                case 'SELECT_P2':
                    this.explainerText.innerHTML = `<strong>Selection Stage (Parent 2):</strong> Parent 1 chosen: <span style="color:${this.parent1.color}; font-weight:bold;">#${this.parent1.id}</span>. Now spin the wheel to select Parent 2.`;
                    break;
                case 'CROSSOVER':
                    this.explainerText.innerHTML = `<strong>Recombination (Crossover):</strong> Parents <span style="color:${this.parent1.color}">#${this.parent1.id}</span> and <span style="color:${this.parent2.color}">#${this.parent2.id}</span> combined with rate $P_c = ${Math.round(this.crossoverRate * 100)}\\%$. Result: ${this.crossoverOccurred ? 'Crossover Applied!' : 'No crossover (cloned)'}.`;
                    break;
                case 'MUTATION':
                    this.explainerText.innerHTML = `<strong>Mutation Stage:</strong> Mutation rate $P_m = ${Math.round(this.mutationRate * 100)}\\%$. Check if random noise or swap is applied. You can click <em>"Force Mutate"</em> to demonstrate mutation dynamically!`;
                    break;
                case 'REPLACE':
                    this.explainerText.innerHTML = `<strong>Offspring Evaluated:</strong> Offspring evaluated and added to Generation ${this.generation + 1} pool (${this.nextGenPool.length} / ${this.popSize} filled).`;
                    break;
                case 'GEN_DONE':
                    this.explainerText.innerHTML = `<strong>Generation ${this.generation + 1} Ready!</strong> Pool completely filled. Click <em>"Next Step"</em> to transfer individuals and begin the next evolutionary cycle.`;
                    break;
            }
        }

        // Render Population Table (Side-by-side with Roulette Wheel)
        if (this.containerPop) {
            this.containerPop.innerHTML = this.population.map((ind, i) => {
                const isP1 = this.parent1 && this.parent1.id === ind.id;
                const isP2 = this.parent2 && this.parent2.id === ind.id;
                const isHovered = this.hoveredSliceIndex === i;

                let rowClass = "";
                if (isP1) rowClass = "parent1-active";
                else if (isP2) rowClass = "parent2-active";
                else if (isHovered) rowClass = "slice-highlight";

                return `
                    <tr data-index="${i}" class="${rowClass}">
                        <td style="text-align: center;">
                            <span class="step-slice-swatch" style="background:${ind.color};" title="Slice ${i+1}"></span>
                        </td>
                        <td>
                            <strong style="color:${ind.color}; font-size:0.85rem;">#${ind.id}</strong>
                            ${ind.isElite ? ' <span style="color:var(--accent-gold); font-size:0.7rem;" title="Elite Individual">★</span>' : ''}
                        </td>
                        <td style="font-family: var(--font-mono); font-size:0.76rem; color:var(--text-main);">${ind.displayPhenotype || ind.genes.join(', ')}</td>
                        <td style="text-align: right; font-weight:700; color:var(--accent-gold); font-family:var(--font-mono); font-size:0.85rem;">${ind.fitness.toFixed(3)}</td>
                        <td style="text-align: right; font-weight:700; color:var(--primary-cyan); font-family:var(--font-mono); font-size:0.85rem;">${ind.probPercent}%</td>
                        <td style="text-align: right; font-family:var(--font-mono); font-size:0.72rem; color:var(--text-muted);">${ind.intervalStr || `[0.000, 1.000)`}</td>
                    </tr>
                `;
            }).join("");

            // Attach interactive hover events to table rows
            const rows = this.containerPop.querySelectorAll('tr');
            rows.forEach(row => {
                const idx = parseInt(row.dataset.index);
                row.addEventListener('mouseenter', () => {
                    if (this.isSpinning) return;
                    this.hoveredSliceIndex = idx;
                    this.drawRouletteWheel(idx);
                });
                row.addEventListener('mouseleave', () => {
                    if (this.isSpinning) return;
                    this.hoveredSliceIndex = -1;
                    this.drawRouletteWheel(-1);
                });
                row.addEventListener('click', () => {
                    if (!this.isSpinning && (this.stage === 'SELECT_P1' || this.stage === 'SELECT_P2')) {
                        this.hoveredSliceIndex = idx;
                        this.drawRouletteWheel(idx);
                    }
                });
            });
        }

        // Render Active Pair Inspection Card
        if (this.containerPair) {
            if (!this.parent1) {
                this.containerPair.innerHTML = `
                    <div style="text-align:center; padding: 20px; color: var(--text-dim); font-size: 0.85rem;">
                        Waiting to select parents... Click <strong>"▶ Next Step"</strong> to spin the Roulette Wheel!
                    </div>
                `;
            } else {
                const renderGenes = (genes, highlightIdx = -1, color = 'var(--text-main)') => {
                    return `
                        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                            ${genes.map((g, idx) => `
                                <div style="background: ${idx === highlightIdx ? '#ff0077' : 'rgba(15, 23, 42, 0.8)'}; 
                                            border: 1px solid ${idx === highlightIdx ? '#ff0077' : 'rgba(255,255,255,0.15)'}; 
                                            padding: 3px 6px; border-radius: 4px; font-family: var(--font-mono); font-size:0.72rem; color: ${color};">
                                    ${typeof g === 'number' && !Number.isInteger(g) ? g.toFixed(1) : g}
                                </div>
                            `).join('')}
                        </div>
                    `;
                };

                let offspringHtml = "";
                if (this.offspring1) {
                    offspringHtml = `
                        <div style="margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
                            <div style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-emerald); font-weight:bold;">
                                🧬 Offspring Generated (Crossover: ${this.crossoverOccurred ? 'YES' : 'NO'} | Mutated: ${this.offspring1.mutated ? 'YES' : 'NO'})
                            </div>
                            <div style="margin-top:6px;">
                                <span style="font-size:0.74rem; color:var(--text-muted);">${this.offspring1.id} Genes:</span>
                                ${renderGenes(this.offspring1.genes, this.mutatedGene1, '#38bdf8')}
                            </div>
                            ${this.offspring2 ? `
                                <div style="margin-top:6px;">
                                    <span style="font-size:0.74rem; color:var(--text-muted);">${this.offspring2.id} Genes:</span>
                                    ${renderGenes(this.offspring2.genes, this.mutatedGene2, '#f43f5e')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }

                this.containerPair.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div style="background:rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.3); padding:8px; border-radius:6px;">
                            <strong style="color:#00e5ff; font-size:0.8rem;">Parent 1: #${this.parent1.id}</strong>
                            <div style="font-size:0.72rem; color:var(--text-dim);">Fitness: ${this.parent1.fitness.toFixed(3)} (Prob: ${this.parent1.probPercent}%)</div>
                            ${renderGenes(this.parent1.genes)}
                        </div>
                        <div style="background:rgba(255, 0, 119, 0.08); border: 1px solid rgba(255, 0, 119, 0.3); padding:8px; border-radius:6px;">
                            <strong style="color:#ff0077; font-size:0.8rem;">Parent 2: ${this.parent2 ? `#${this.parent2.id}` : '(Selecting...)'}</strong>
                            <div style="font-size:0.72rem; color:var(--text-dim);">${this.parent2 ? `Fitness: ${this.parent2.fitness.toFixed(3)} (Prob: ${this.parent2.probPercent}%)` : 'Spin to pick'}</div>
                            ${this.parent2 ? renderGenes(this.parent2.genes) : '<div style="font-size:0.75rem; color:var(--text-dim); margin-top:8px;">Awaiting wheel spin...</div>'}
                        </div>
                    </div>
                    ${offspringHtml}
                `;
            }
        }

        // Render Next Gen Pool in Right Column
        if (this.badgePoolCount) {
            this.badgePoolCount.textContent = `${this.nextGenPool.length} / ${this.popSize} Slots`;
        }
        if (this.poolProgressBar) {
            const pct = Math.min(100, Math.round((this.nextGenPool.length / (this.popSize || 1)) * 100));
            this.poolProgressBar.style.width = `${pct}%`;
        }

        if (this.containerNextGen) {
            if (this.nextGenPool.length === 0) {
                this.containerNextGen.innerHTML = `
                    <div style="color:var(--text-dim); font-size:0.74rem; padding:12px; text-align:center;">
                        Next generation pool empty (0 / ${this.popSize} slots filled). Advance steps to generate offspring.
                    </div>
                `;
            } else {
                this.containerNextGen.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${this.nextGenPool.map((ind, i) => `
                            <div style="background:var(--bg-surface-elevated); border:1px solid ${ind.isElite ? 'var(--accent-gold)' : 'rgba(56, 189, 248, 0.35)'}; padding:5px 8px; border-radius:4px; font-size:0.73rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="color:${ind.isElite ? 'var(--accent-gold)' : 'var(--primary-cyan)'};">
                                        ${ind.isElite ? '★ Elite Preserved' : `Offspring #${i+1}`}
                                    </strong>
                                    <span style="font-size:0.67rem; color:${ind.mutated ? '#ff55aa' : 'var(--text-dim)'}; font-weight:600;">
                                        ${ind.mutated ? '⚡ Mutated' : 'Normal'}
                                    </span>
                                </div>
                                <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-dim); margin-top:2px;">
                                    ${ind.displayPhenotype ? ind.displayPhenotype.split('→')[0] : ind.genes.slice(0, 3).join(',')+'...'}
                                </div>
                                <div style="font-size:0.68rem; color:var(--accent-gold); margin-top:1px; font-weight:600;">
                                    Fitness: ${ind.fitness ? ind.fitness.toFixed(3) : '-'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        // Render Generational History Table
        if (this.tableHistory) {
            if (!this.history || this.history.length === 0) {
                this.tableHistory.innerHTML = `
                    <tr><td colspan="3" style="text-align:center; color:var(--text-dim); padding:8px;">Gen 0 in progress...</td></tr>
                `;
            } else {
                this.tableHistory.innerHTML = this.history.slice(-8).map(h => `
                    <tr>
                        <td style="font-weight:600; color:var(--primary-cyan);">Gen ${h.gen}</td>
                        <td style="text-align:right; font-family:var(--font-mono); color:var(--accent-gold); font-weight:bold;">${h.bestFitness.toFixed(2)}</td>
                        <td style="text-align:right; font-family:var(--font-mono); color:var(--text-muted);">${h.avgFitness.toFixed(2)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    // ==========================================
    // AUTO-PLAY CONTROLLER
    // ==========================================
    toggleAutoPlay() {
        if (this.autoPlayInterval) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        if (this.btnAuto) {
            this.btnAuto.textContent = '⏸ Pause Auto';
            this.btnAuto.classList.add('active');
        }
        this.autoPlayInterval = setInterval(() => {
            this.advanceStep();
        }, this.autoPlaySpeed);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        if (this.btnAuto) {
            this.btnAuto.textContent = '▶ Auto Step';
            this.btnAuto.classList.remove('active');
        }
    }
}

// Global and universal exports
if (typeof window !== "undefined") {
    window.StepLab = StepLab;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { StepLab };
}
