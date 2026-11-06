/**
 * ga_engine.js - Pedagogical Real-Coded Genetic Algorithm Engine
 * Implements standard evolutionary operators transparently:
 * - Configurable Population Size (N)
 * - Configurable Generations (G)
 * - Configurable Elitism Count (E)
 * - Tournament Selection (k=3)
 * - Arithmetic / Intermediate Blended Crossover
 * - Adaptive Gaussian Mutation with domain boundary clamping
 */

class MiniGeneticAlgorithm {
    constructor(problem, config = {}) {
        this.problem = problem;
        this.popSize = config.popSize || 30;
        this.crossoverRate = config.crossoverRate !== undefined ? config.crossoverRate : 0.85;
        this.mutationRate = config.mutationRate !== undefined ? config.mutationRate : 0.20;
        this.mutationSigma = config.mutationSigma !== undefined ? config.mutationSigma : 0.05; // 5% of domain
        this.tournamentSize = config.tournamentSize || 3;
        this.elitismCount = config.elitismCount !== undefined ? config.elitismCount : 2;
        this.selectionMethod = config.selectionMethod || "tournament"; // 'tournament' | 'roulette' | 'rank'
        this.crossoverType = config.crossoverType || "blend"; // 'blend' | 'single_point' | 'uniform' | 'sbx'

        this.population = [];
        this.generation = 0;
        this.history = [];
        this.bestIndividual = null;

        // Step-by-step buffer for didactic visualizer
        this.stepState = {
            phase: 'ready', // 'ready', 'selected', 'crossover', 'mutated', 'evaluated'
            selectedParents: [],
            offspringUnmutated: [],
            offspringMutated: [],
            offspringEvaluated: [],
            nextGenPool: []
        };

        this.initPopulation();
    }

    setProblem(problem) {
        this.problem = problem;
        this.reset();
    }

    updateConfig(config = {}) {
        if (config.popSize !== undefined) this.popSize = config.popSize;
        if (config.crossoverRate !== undefined) this.crossoverRate = config.crossoverRate;
        if (config.mutationRate !== undefined) this.mutationRate = config.mutationRate;
        if (config.mutationSigma !== undefined) this.mutationSigma = config.mutationSigma;
        if (config.tournamentSize !== undefined) this.tournamentSize = config.tournamentSize;
        if (config.elitismCount !== undefined) this.elitismCount = Math.min(this.popSize, config.elitismCount);
        if (config.selectionMethod !== undefined) this.selectionMethod = config.selectionMethod;
        if (config.crossoverType !== undefined) this.crossoverType = config.crossoverType;
    }

    reset() {
        this.population = [];
        this.generation = 0;
        this.history = [];
        this.bestIndividual = null;
        this.stepState = {
            phase: 'ready',
            selectedParents: [],
            offspringUnmutated: [],
            offspringMutated: [],
            offspringEvaluated: [],
            nextGenPool: []
        };
        this.initPopulation();
    }

    initPopulation(seedIndividuals = []) {
        this.population = [];
        const d = this.problem.domain;

        // Seed with existing explored individuals if provided
        for (let i = 0; i < Math.min(seedIndividuals.length, this.popSize); i++) {
            const ind = seedIndividuals[i];
            const evalResult = this.problem.evaluate(ind.x, ind.y, "ga");
            this.population.push(evalResult);
        }

        // Fill remaining slots with uniform random samples
        while (this.population.length < this.popSize) {
            const rx = d.minX + Math.random() * (d.maxX - d.minX);
            const ry = d.minY + Math.random() * (d.maxY - d.minY);
            const evalResult = this.problem.evaluate(rx, ry, "ga");
            this.population.push(evalResult);
        }

        this.updateStats();
    }

    updateStats() {
        this.population.sort((a, b) => b.fitness - a.fitness);
        const currentBest = this.population[0];

        if (!this.bestIndividual || currentBest.fitness > this.bestIndividual.fitness) {
            this.bestIndividual = { ...currentBest };
        }

        const avgFitness = this.population.reduce((sum, ind) => sum + ind.fitness, 0) / this.popSize;

        // Store snapshot including all individual points for evolution scatter plot
        const indPoints = this.population.map(ind => ({
            x: ind.x,
            y: ind.y,
            fitness: ind.fitness,
            percentOfGlobal: ind.percentOfGlobal,
            id: ind.id
        }));

        this.history.push({
            generation: this.generation,
            bestFitness: currentBest.fitness,
            avgFitness: avgFitness,
            bestPercent: currentBest.percentOfGlobal,
            bestDistance: currentBest.distanceToOptimum,
            bestCoords: { x: currentBest.x, y: currentBest.y },
            populationSnapshot: indPoints
        });
    }

    /**
     * Compute Roulette Wheel Selection probabilities
     * Handles positive/negative fitness shifting appropriately
     */
    getRouletteWheelData() {
        if (!this.population || this.population.length === 0) return [];
        const minFit = Math.min(...this.population.map(p => p.fitness));
        const offset = minFit < 0 ? Math.abs(minFit) + 0.001 : 0.001;

        const shifted = this.population.map(p => Math.max(0.0001, p.fitness + offset));
        const sumShifted = shifted.reduce((a, b) => a + b, 0);

        let cumulativeAngle = 0;
        return this.population.map((ind, idx) => {
            const prob = shifted[idx] / sumShifted;
            const sliceAngle = prob * 2 * Math.PI;
            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + sliceAngle;
            cumulativeAngle = endAngle;

            return {
                index: idx,
                individual: ind,
                fitness: ind.fitness,
                probability: prob,
                probPercent: (prob * 100).toFixed(2),
                startAngle: startAngle,
                endAngle: endAngle
            };
        });
    }

    /**
     * Roulette Wheel Selection (Fitness Proportionate)
     */
    rouletteSelect() {
        const wheel = this.getRouletteWheelData();
        const rand = Math.random();
        let cumulative = 0;
        for (const slice of wheel) {
            cumulative += slice.probability;
            if (rand <= cumulative) {
                return slice.individual;
            }
        }
        return this.population[0];
    }

    /**
     * Rank-based Selection
     */
    rankSelect() {
        const n = this.population.length;
        const totalRank = (n * (n + 1)) / 2;
        const rand = Math.random() * totalRank;

        let cum = 0;
        // Population is sorted descending, so index 0 has highest rank n
        for (let i = 0; i < n; i++) {
            const rank = n - i;
            cum += rank;
            if (rand <= cum) {
                return this.population[i];
            }
        }
        return this.population[0];
    }

    /**
     * Tournament Selection
     */
    tournamentSelect() {
        let best = null;
        for (let i = 0; i < this.tournamentSize; i++) {
            const randIdx = Math.floor(Math.random() * this.population.length);
            const candidate = this.population[randIdx];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }

    /**
     * General selection dispatcher
     */
    selectParent() {
        if (this.selectionMethod === "roulette") {
            return this.rouletteSelect();
        } else if (this.selectionMethod === "rank") {
            return this.rankSelect();
        } else {
            return this.tournamentSelect();
        }
    }

    /**
     * Configurable Crossover Operators
     */
    crossover(parent1, parent2) {
        const didCrossover = Math.random() < this.crossoverRate;
        if (!didCrossover) {
            return {
                children: [
                    { x: parent1.x, y: parent1.y },
                    { x: parent2.x, y: parent2.y }
                ],
                crossoverApplied: false,
                alpha: 0
            };
        }

        let c1x, c1y, c2x, c2y;
        let alphaVal = 0.5;

        if (this.crossoverType === "sbx") {
            // Simulated Binary Crossover (SBX)
            const eta = 2; // distribution index
            const u = Math.random();
            const beta = u <= 0.5 ? Math.pow(2 * u, 1 / (eta + 1)) : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
            c1x = 0.5 * ((1 + beta) * parent1.x + (1 - beta) * parent2.x);
            c1y = 0.5 * ((1 + beta) * parent1.y + (1 - beta) * parent2.y);
            c2x = 0.5 * ((1 - beta) * parent1.x + (1 + beta) * parent2.x);
            c2y = 0.5 * ((1 - beta) * parent1.y + (1 + beta) * parent2.y);
            alphaVal = beta;
        } else if (this.crossoverType === "single_point") {
            // Single point: swap Y coordinate between parents
            c1x = parent1.x;
            c1y = parent2.y;
            c2x = parent2.x;
            c2y = parent1.y;
        } else if (this.crossoverType === "uniform") {
            // Uniform: independent coin flip per coordinate
            c1x = Math.random() < 0.5 ? parent1.x : parent2.x;
            c1y = Math.random() < 0.5 ? parent1.y : parent2.y;
            c2x = Math.random() < 0.5 ? parent2.x : parent1.x;
            c2y = Math.random() < 0.5 ? parent2.y : parent1.y;
        } else {
            // Default Arithmetic Blend (alpha = 0.5 or random blend)
            const alpha = 0.3 + Math.random() * 0.4;
            alphaVal = alpha;
            c1x = alpha * parent1.x + (1 - alpha) * parent2.x;
            c1y = alpha * parent1.y + (1 - alpha) * parent2.y;
            c2x = (1 - alpha) * parent1.x + alpha * parent2.x;
            c2y = (1 - alpha) * parent1.y + alpha * parent2.y;
        }

        return {
            children: [
                { x: c1x, y: c1y },
                { x: c2x, y: c2y }
            ],
            crossoverApplied: true,
            alpha: alphaVal
        };
    }

    /**
     * Adaptive Gaussian Mutation scaled to domain dimensions
     */
    mutate(child) {
        const d = this.problem.domain;
        const spanX = (d.maxX - d.minX);
        const spanY = (d.maxY - d.minY);
        const sigmaX = spanX * this.mutationSigma;
        const sigmaY = spanY * this.mutationSigma;

        // Box-Muller transform for Gaussian noise
        const gaussianNoise = (stdDev) => {
            const u = 1 - Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return z * stdDev;
        };

        let mx = child.x;
        let my = child.y;
        let mutatedX = false;
        let mutatedY = false;

        if (Math.random() < this.mutationRate) {
            mx += gaussianNoise(sigmaX);
            mutatedX = true;
        }
        if (Math.random() < this.mutationRate) {
            my += gaussianNoise(sigmaY);
            mutatedY = true;
        }

        // Snap to problem quantization if set
        mx = this.problem.quantize ? this.problem.quantize(mx, d.minX, d.maxX) : Math.max(d.minX, Math.min(d.maxX, mx));
        my = this.problem.quantize ? this.problem.quantize(my, d.minY, d.maxY) : Math.max(d.minY, Math.min(d.maxY, my));

        return {
            x: mx,
            y: my,
            mutated: mutatedX || mutatedY,
            mutatedX,
            mutatedY
        };
    }

    /**
     * Didactic step-by-step: performs single reproduction pair
     * Returns full diagnostic payload for pedagogical inspection
     */
    stepDidacticPair() {
        const p1 = this.selectParent();
        const p2 = this.selectParent();

        const xoverResult = this.crossover(p1, p2);
        const m1 = this.mutate(xoverResult.children[0]);
        const m2 = this.mutate(xoverResult.children[1]);

        const eval1 = this.problem.evaluate(m1.x, m1.y, "ga");
        const eval2 = this.problem.evaluate(m2.x, m2.y, "ga");

        return {
            parent1: p1,
            parent2: p2,
            selectionMethod: this.selectionMethod,
            crossoverApplied: xoverResult.crossoverApplied,
            crossoverType: this.crossoverType,
            rawChildren: xoverResult.children,
            mutatedChild1: m1,
            mutatedChild2: m2,
            eval1: eval1,
            eval2: eval2
        };
    }

    /**
     * Steps one generation of the evolutionary cycle
     * Preserves Elitism, applies selection, crossover, and mutation
     * Returns newly evaluated population
     */
    stepGeneration() {
        this.generation++;
        const nextPopulation = [];

        // 1. Elitism: preserve top performers intact (if elitismCount > 0)
        const eliteCount = Math.min(this.elitismCount, this.population.length);
        for (let i = 0; i < eliteCount; i++) {
            nextPopulation.push(this.population[i]);
        }

        // 2. Reproduction: Selection, Crossover, and Mutation
        while (nextPopulation.length < this.popSize) {
            const p1 = this.selectParent();
            const p2 = this.selectParent();

            const xoverResult = this.crossover(p1, p2);

            const m1 = this.mutate(xoverResult.children[0]);
            const eval1 = this.problem.evaluate(m1.x, m1.y, "ga");
            nextPopulation.push(eval1);

            if (nextPopulation.length < this.popSize) {
                const m2 = this.mutate(xoverResult.children[1]);
                const eval2 = this.problem.evaluate(m2.x, m2.y, "ga");
                nextPopulation.push(eval2);
            }
        }

        this.population = nextPopulation;
        this.updateStats();

        return this.population;
    }

    /**
     * Executes multiple generations in batch
     */
    runGenerations(numGens = 10) {
        const allNewEvaluations = [];
        for (let g = 0; g < numGens; g++) {
            const newPop = this.stepGeneration();
            allNewEvaluations.push(...newPop);
        }
        return allNewEvaluations;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MiniGeneticAlgorithm };
}
