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
        this.crossoverRate = config.crossoverRate || 0.85;
        this.mutationRate = config.mutationRate || 0.25;
        this.tournamentSize = config.tournamentSize || 3;
        this.elitismCount = config.elitismCount !== undefined ? config.elitismCount : 2;

        this.population = [];
        this.generation = 0;
        this.history = [];
        this.bestIndividual = null;

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
        if (config.tournamentSize !== undefined) this.tournamentSize = config.tournamentSize;
        if (config.elitismCount !== undefined) this.elitismCount = Math.min(this.popSize, config.elitismCount);
    }

    reset() {
        this.population = [];
        this.generation = 0;
        this.history = [];
        this.bestIndividual = null;
        this.initPopulation();
    }

    initPopulation(seedIndividuals = []) {
        this.population = [];
        const d = this.problem.domain;

        // Seed with existing explored individuals if provided
        for (let i = 0; i < Math.min(seedIndividuals.length, this.popSize); i++) {
            const ind = seedIndividuals[i];
            const evalResult = this.problem.evaluate(ind.x, ind.y);
            this.population.push(evalResult);
        }

        // Fill remaining slots with uniform random samples
        while (this.population.length < this.popSize) {
            const rx = d.minX + Math.random() * (d.maxX - d.minX);
            const ry = d.minY + Math.random() * (d.maxY - d.minY);
            const evalResult = this.problem.evaluate(rx, ry);
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

        this.history.push({
            generation: this.generation,
            bestFitness: currentBest.fitness,
            avgFitness: avgFitness,
            bestPercent: currentBest.percentOfGlobal,
            bestDistance: currentBest.distanceToOptimum
        });
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
     * Arithmetic Intermediate Crossover
     */
    crossover(parent1, parent2) {
        if (Math.random() < this.crossoverRate) {
            const alpha = 0.5;
            const c1x = alpha * parent1.x + (1 - alpha) * parent2.x;
            const c1y = alpha * parent1.y + (1 - alpha) * parent2.y;
            const c2x = (1 - alpha) * parent1.x + alpha * parent2.x;
            const c2y = (1 - alpha) * parent1.y + alpha * parent2.y;
            return [
                { x: c1x, y: c1y },
                { x: c2x, y: c2y }
            ];
        }
        return [
            { x: parent1.x, y: parent1.y },
            { x: parent2.x, y: parent2.y }
        ];
    }

    /**
     * Adaptive Gaussian Mutation scaled to domain dimensions
     */
    mutate(child) {
        const d = this.problem.domain;
        const spanX = (d.maxX - d.minX);
        const spanY = (d.maxY - d.minY);
        const sigmaX = spanX * 0.05; // 5% of coordinate span
        const sigmaY = spanY * 0.05;

        // Box-Muller transform for Gaussian noise
        const gaussianNoise = (stdDev) => {
            const u = 1 - Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return z * stdDev;
        };

        let mx = child.x;
        let my = child.y;

        if (Math.random() < this.mutationRate) {
            mx += gaussianNoise(sigmaX);
        }
        if (Math.random() < this.mutationRate) {
            my += gaussianNoise(sigmaY);
        }

        // Boundary clamping
        mx = Math.max(d.minX, Math.min(d.maxX, mx));
        my = Math.max(d.minY, Math.min(d.maxY, my));

        return { x: mx, y: my };
    }

    /**
     * Steps one generation of the evolutionary cycle
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
            const p1 = this.tournamentSelect();
            const p2 = this.tournamentSelect();

            const [c1, c2] = this.crossover(p1, p2);

            const m1 = this.mutate(c1);
            const eval1 = this.problem.evaluate(m1.x, m1.y);
            nextPopulation.push(eval1);

            if (nextPopulation.length < this.popSize) {
                const m2 = this.mutate(c2);
                const eval2 = this.problem.evaluate(m2.x, m2.y);
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
