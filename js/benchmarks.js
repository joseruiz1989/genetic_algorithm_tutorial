/**
 * benchmarks.js - Collection of benchmark test functions for optimization and Genetic Algorithms
 * Pedagogically designed to illustrate fitness landscapes,
 * local vs. global optima, and the extreme difficulty of blind sampling.
 */

const BENCHMARKS = {
    schaffer_f6: {
        id: "schaffer_f6",
        name: "Schaffer F6 Function",
        category: "Multimodal / Highly Deceptive",
        description: "Famous benchmark in Genetic Algorithm literature (David Schaffer, 1989). Features infinite concentric circular ridges and thousands of deceptive local optima that trap gradient-based and blind search methods.",
        latexFormula: "f(x, y) = 0.5 - \\frac{\\sin^2\\left(\\sqrt{(x-x_0)^2 + (y-y_0)^2}\\right) - 0.5}{\\left[1 + 0.001\\cdot((x-x_0)^2 + (y-y_0)^2)\\right]^2}",
        defaultDomain: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
        isMaximization: true,
        recommendedRandomRange: { min: -75, max: 75 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0, frequency = 1.0) {
            const dx = x - x0;
            const dy = y - y0;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            const sinR = Math.sin(frequency * r);
            const num = (sinR * sinR) - 0.5;
            const den = Math.pow(1 + 0.001 * r2, 2);
            // raw is in the approximate range [0.0, 1.0], reaching exactly 1.0 at r = 0
            return 0.5 - (num / den);
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Needle in a haystack: The global optimum peak spans less than 1.57/ω radius units in a standard 200x200 space (area 40,000). Increasing frequency ω creates dense, chaotic ridges and drastically shrinks the basin of attraction of the global peak."
    },

    rastrigin: {
        id: "rastrigin",
        name: "Rastrigin Function",
        category: "Multimodal / Regular Trap Grid",
        description: "Based on a parabolic surface modulated by periodic cosine waves. Generates a regular lattice of ridges and valleys where algorithms easily get stuck in local traps.",
        latexFormula: "f(x, y) = A - \\left[ (x-x_0)^2 - 10\\cos(2\\pi(x-x_0)) + 10 + (y-y_0)^2 - 10\\cos(2\\pi(y-y_0)) + 10 \\right]",
        defaultDomain: { minX: -5.12, maxX: 5.12, minY: -5.12, maxY: 5.12 },
        isMaximization: true,
        recommendedRandomRange: { min: -3.5, max: 3.5 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const dx = x - x0;
            const dy = y - y0;
            const termX = dx * dx - 10 * Math.cos(2 * Math.PI * dx) + 10;
            const termY = dy * dy - 10 * Math.cos(2 * Math.PI * dy) + 10;
            const cost = termX + termY; // 0 at (x0, y0), max around 80.7
            // Normalized between 0 and 1 so optimum at (x0, y0) is 1.0
            const maxCost = 80.7;
            const norm = Math.max(0, 1 - (cost / maxCost));
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Excellent for demonstrating how mutation in Genetic Algorithms can escape local potential barriers into more promising basins of attraction."
    },

    ackley: {
        id: "ackley",
        name: "Ackley Function",
        category: "Nearly Flat Outer Plateau with Deep Funnel",
        description: "Nearly flat surface across the outer periphery with subtle modulations, leading to a steep, narrow central funnel. Without peripheral gradient cues, blind search easily gets lost.",
        latexFormula: "f(x, y) = A - \\left[ -20 e^{-0.2\\sqrt{0.5((x-x_0)^2+(y-y_0)^2)}} - e^{0.5(\\cos(2\\pi(x-x_0))+\\cos(2\\pi(y-y_0)))} + 20 + e \\right]",
        defaultDomain: { minX: -30, maxX: 30, minY: -30, maxY: 30 },
        isMaximization: true,
        recommendedRandomRange: { min: -20, max: 20 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const dx = x - x0;
            const dy = y - y0;
            const r2 = 0.5 * (dx * dx + dy * dy);
            const r = Math.sqrt(r2);
            const term1 = -20 * Math.exp(-0.2 * r);
            const term2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * dx) + Math.cos(2 * Math.PI * dy)));
            const cost = term1 + term2 + 20 + Math.E; // 0 at (x0, y0), ~22 at boundaries
            const maxCost = 22.0;
            const norm = Math.max(0, 1 - (cost / maxCost));
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Illustrates the flat gradient challenge at the perimeter. An algorithm without population diversity or genetic crossover has no guidance on which direction to explore."
    },

    rosenbrock: {
        id: "rosenbrock",
        name: "Rosenbrock Valley (Banana Function)",
        category: "Narrow Curved Valley",
        description: "The global optimum is located inside a long, narrow, curved parabolic valley. Finding the valley floor is trivial, but navigating to the apex is a classic benchmark challenge.",
        latexFormula: "f(x, y) = A - \\frac{1}{2500}\\left[ (1 - (x-x_0))^2 + 100((y-y_0) - (x-x_0)^2)^2 \\right]",
        defaultDomain: { minX: -3, maxX: 3, minY: -2, maxY: 4 },
        isMaximization: true,
        recommendedRandomRange: { min: -1.5, max: 1.5 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const u = (x - x0) + 1; // mapped so optimum is at x=x0, y=y0
            const v = (y - y0) + 1;
            const t1 = 1 - u;
            const t2 = v - (u * u);
            const cost = (t1 * t1) + 100 * (t2 * t2);
            // Log-smoothed curve for pedagogical visualization
            const norm = 1 / (1 + 0.005 * cost);
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Demonstrates difficulty when variables are strongly correlated (epistasis). Independent coordinate crossovers fail unless covariance or intermediate blending is utilized."
    },

    himmelblau: {
        id: "himmelblau",
        name: "Himmelblau Function",
        category: "Multimodal (4 Identical Optima)",
        description: "Function with multiple identical global peaks. Useful for demonstrating Niching and Speciation mechanisms in Genetic Algorithms to preserve multimodal diversity.",
        latexFormula: "f(x, y) = A - \\frac{1}{1000}\\left[(x^2 + y - 11)^2 + (x + y^2 - 7)^2\\right]",
        defaultDomain: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
        isMaximization: true,
        recommendedRandomRange: { min: -1, max: 1 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const dx = x - x0;
            const dy = y - y0;
            const t1 = (dx * dx + dy - 11);
            const t2 = (dx + dy * dy - 7);
            const cost = (t1 * t1) + (t2 * t2);
            const norm = 1 / (1 + 0.008 * cost);
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Perfect for research discussions: What happens when an engineering problem has multiple equally valid optimal solutions? How does a multimodal GA maintain subpopulations at each peak?"
    }
};

/**
 * Class encapsulating an optimization problem instance with configured parameters
 * (fixed or hidden center, fixed or hidden theoretical maximum, and domain scale)
 */
class OptimizationProblem {
    constructor(benchmarkId = "schaffer_f6", options = {}) {
        this.benchmark = BENCHMARKS[benchmarkId] || BENCHMARKS.schaffer_f6;

        // Domain scale factor (1x, 2x, 5x, 10x, etc.) to show how blind search collapses in large spaces
        this.domainScale = options.domainScale !== undefined ? parseFloat(options.domainScale) : 1.0;

        // Domain boundaries computation
        const baseDomain = this.benchmark.defaultDomain;
        if (options.customDomain) {
            this.domain = {
                minX: options.customDomain.minX !== undefined ? options.customDomain.minX : baseDomain.minX * this.domainScale,
                maxX: options.customDomain.maxX !== undefined ? options.customDomain.maxX : baseDomain.maxX * this.domainScale,
                minY: options.customDomain.minY !== undefined ? options.customDomain.minY : baseDomain.minY * this.domainScale,
                maxY: options.customDomain.maxY !== undefined ? options.customDomain.maxY : baseDomain.maxY * this.domainScale
            };
        } else {
            this.domain = {
                minX: options.minX !== undefined ? options.minX : baseDomain.minX * this.domainScale,
                maxX: options.maxX !== undefined ? options.maxX : baseDomain.maxX * this.domainScale,
                minY: options.minY !== undefined ? options.minY : baseDomain.minY * this.domainScale,
                maxY: options.maxY !== undefined ? options.maxY : baseDomain.maxY * this.domainScale
            };
        }

        // Center Configuration (x0, y0)
        this.centerMode = options.centerMode || "fixed"; // 'fixed' | 'random'
        if (this.centerMode === "random") {
            const rng = this.benchmark.recommendedRandomRange;
            const scale = this.domainScale;
            const minBound = rng.min * scale;
            const maxBound = rng.max * scale;
            this.x0 = options.fixedX0 !== undefined ? options.fixedX0 : (minBound + Math.random() * (maxBound - minBound));
            this.y0 = options.fixedY0 !== undefined ? options.fixedY0 : (minBound + Math.random() * (maxBound - minBound));
            // Round to 2 decimals for pedagogical clarity
            this.x0 = Math.round(this.x0 * 100) / 100;
            this.y0 = Math.round(this.y0 * 100) / 100;
        } else {
            this.x0 = options.fixedX0 !== undefined ? options.fixedX0 : 0.0;
            this.y0 = options.fixedY0 !== undefined ? options.fixedY0 : 0.0;
        }

        // Global Maximum Configuration (A)
        this.maxMode = options.maxMode || "fixed"; // 'fixed' (1.0) | 'random' (e.g. 100..500)
        if (this.maxMode === "random") {
            // Non-intuitive random value to simulate real black-box optimization problems
            const minA = options.randomMinA || 100;
            const maxA = options.randomMaxA || 500;
            this.globalMaxFitness = Math.round((minA + Math.random() * (maxA - minA)) * 10) / 10;
        } else {
            this.globalMaxFitness = options.fixedMaxFitness !== undefined ? options.fixedMaxFitness : 1.0;
        }

        // Wave frequency configuration (particularly relevant for Schaffer F6)
        this.frequency = options.frequency !== undefined ? options.frequency : 1.0;

        // Session seed ID
        this.seedId = "EXP-" + Math.floor(100000 + Math.random() * 900000);
        this.createdAt = new Date().toISOString();
    }

    /**
     * Dynamically update wave frequency
     */
    setFrequency(freq) {
        this.frequency = Math.max(0.1, Math.min(10.0, freq));
    }

    /**
     * Evaluate a candidate solution (individual) at coordinates (x, y)
     * Returns { fitness, rawNormalized, percentOfGlobal, distanceToOptimum, inDomain }
     */
    evaluate(x, y) {
        // Domain validation
        const inDomain = (
            x >= this.domain.minX && x <= this.domain.maxX &&
            y >= this.domain.minY && y <= this.domain.maxY
        );

        // Clamping to domain boundaries
        const clampedX = Math.max(this.domain.minX, Math.min(this.domain.maxX, x));
        const clampedY = Math.max(this.domain.minY, Math.min(this.domain.maxY, y));

        // Normalized fitness between [0, 1]
        const rawNorm = this.benchmark.evaluateRaw(clampedX, clampedY, this.x0, this.y0, this.frequency);

        // Scale by configured maximum fitness
        const fitness = rawNorm * this.globalMaxFitness;

        // Percentage relative to theoretical global optimum (0% to 100%)
        const percentOfGlobal = Math.min(100, Math.max(0, (fitness / this.globalMaxFitness) * 100));

        // Euclidean distance to true optimum (x0, y0)
        const dx = clampedX - this.x0;
        const dy = clampedY - this.y0;
        const distanceToOptimum = Math.sqrt(dx * dx + dy * dy);

        return {
            x: clampedX,
            y: clampedY,
            fitness: fitness,
            rawNormalized: rawNorm,
            percentOfGlobal: percentOfGlobal,
            distanceToOptimum: distanceToOptimum,
            inDomain: inDomain
        };
    }

    /**
     * Generates a uniform random candidate solution within the search space
     */
    generateRandomIndividual() {
        const x = this.domain.minX + Math.random() * (this.domain.maxX - this.domain.minX);
        const y = this.domain.minY + Math.random() * (this.domain.maxY - this.domain.minY);
        return {
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        };
    }
}

// Universal export compatible with ES6 modules, CommonJS, and browser globals
if (typeof module !== "undefined" && module.exports) {
    module.exports = { BENCHMARKS, OptimizationProblem };
}
