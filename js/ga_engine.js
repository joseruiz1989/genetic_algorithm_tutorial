/**
 * ga_engine.js - Motor pedagógico de Algoritmo Genético de valores reales
 * Implementa de forma transparente y didáctica:
 * - Selección por Torneo
 * - Cruzamiento Aritmético / BLX-alpha
 * - Mutación Gaussiana adaptativa
 * - Elitismo
 */

class MiniGeneticAlgorithm {
    constructor(problem, config = {}) {
        this.problem = problem;
        this.popSize = config.popSize || 25;
        this.crossoverRate = config.crossoverRate || 0.85;
        this.mutationRate = config.mutationRate || 0.25;
        this.mutationSigma = config.mutationSigma || 3.0; // Desviación estándar para mutación
        this.tournamentSize = config.tournamentSize || 3;
        this.elitismCount = config.elitismCount || 2;

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

        // Incorporar semillas si existen
        for (let i = 0; i < Math.min(seedIndividuals.length, this.popSize); i++) {
            const ind = seedIndividuals[i];
            const evalResult = this.problem.evaluate(ind.x, ind.y);
            this.population.push(evalResult);
        }

        // Completar con individuos aleatorios
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
     * Selección por torneo
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
     * Cruzamiento Aritmético Intermedio
     */
    crossover(parent1, parent2) {
        if (Math.random() < this.crossoverRate) {
            const alpha = 0.5; // o Math.random() * 1.2 - 0.1 para BLX-alpha
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
     * Mutación Gaussiana
     */
    mutate(child) {
        const d = this.problem.domain;
        const spanX = (d.maxX - d.minX);
        const spanY = (d.maxY - d.minY);
        const sigmaX = spanX * 0.05; // 5% del rango
        const sigmaY = spanY * 0.05;

        // Distribución Box-Muller para ruido Gaussiano
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

        // Clamping a los límites
        mx = Math.max(d.minX, Math.min(d.maxX, mx));
        my = Math.max(d.minY, Math.min(d.maxY, my));

        return { x: mx, y: my };
    }

    /**
     * Ejecuta una generación completa del ciclo evolutivo
     * Retorna la nueva población evaluada
     */
    stepGeneration() {
        this.generation++;
        const nextPopulation = [];

        // 1. Elitismo: Conservar los mejores individuos sin alteración
        for (let i = 0; i < this.elitismCount && i < this.population.length; i++) {
            nextPopulation.push(this.population[i]);
        }

        // 2. Reproducción: Selección, Cruzamiento y Mutación
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
     * Ejecuta múltiples generaciones
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
