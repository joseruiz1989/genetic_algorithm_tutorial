/**
 * nqueens.js - Module 2: The N-Queens Problem & Combinatorial Genetic Algorithm
 *
 * Implements:
 * 1. NQueensProblem: Board state, conflict detection (row, col, diagonals),
 *    threat line coordinates, fitness evaluation, and binary vector (0/1) encoding.
 * 2. NQueensGA: Permutation-based Genetic Algorithm (Order Crossover OX,
 *    Swap/Inversion mutation, Elitism, Diversity injection, Evaluation counter).
 * 3. NQueensUI: Interactive chessboard with manual movement, real-time conflict
 *    highlights (Red = conflicting, Green/Gold = safe), SVG threat rays,
 *    binary bitstream matrix/vector visualizer, fitness anatomy breakdown, and convergence charts.
 */

class NQueensProblem {
    constructor(n = 8) {
        this.n = n; // 4, 8, or 16
        this.board = Array(n).fill(-1);
        this.freeQueens = []; // Array of {row, col} for free placement mode
        this.mode = 'column'; // 'column' (1 per column) or 'free'
        this.initDefault();
    }

    setN(newN) {
        this.n = newN;
        this.board = Array(newN).fill(-1);
        this.freeQueens = [];
        this.initDefault();
    }

    initDefault() {
        if (this.mode === 'column') {
            // Generate random permutation so each column and row starts with 1 queen
            const perm = [];
            for (let i = 0; i < this.n; i++) perm.push(i);
            for (let i = perm.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [perm[i], perm[j]] = [perm[j], perm[i]];
            }
            this.board = perm;
        } else {
            this.freeQueens = [];
            for (let c = 0; c < this.n; c++) {
                this.freeQueens.push({ row: Math.floor(Math.random() * this.n), col: c });
            }
        }
    }

    clear() {
        this.board = Array(this.n).fill(-1);
        this.freeQueens = [];
    }

    // Set configuration from chromosome array [r0, r1, ..., rN-1]
    fromChromosome(chromosome) {
        this.n = chromosome.length;
        this.mode = 'column';
        this.board = [...chromosome];
        this.freeQueens = [];
    }

    // Get list of active queen positions [{row, col, id}]
    getQueens() {
        if (this.mode === 'column') {
            const list = [];
            for (let c = 0; c < this.n; c++) {
                if (this.board[c] !== -1 && this.board[c] !== null && this.board[c] < this.n) {
                    list.push({ row: this.board[c], col: c, id: `q_${c}` });
                }
            }
            return list;
        } else {
            return this.freeQueens.map((q, idx) => ({ ...q, id: `q_free_${idx}` }));
        }
    }

    // Toggle or move queen
    handleClickSquare(row, col) {
        if (this.mode === 'column') {
            if (this.board[col] === row) {
                // Clicking existing queen removes it
                this.board[col] = -1;
            } else {
                // Move queen of this column to clicked row
                this.board[col] = row;
            }
        } else {
            // Free placement mode: toggle square
            const idx = this.freeQueens.findIndex(q => q.row === row && q.col === col);
            if (idx >= 0) {
                this.freeQueens.splice(idx, 1);
            } else {
                if (this.freeQueens.length < this.n * 2) {
                    this.freeQueens.push({ row, col });
                }
            }
        }
    }

    // Max possible non-attacking pairs: N*(N-1)/2
    getMaxPairs() {
        return (this.n * (this.n - 1)) / 2;
    }

    /**
     * Compute conflicts and detailed analysis:
     * - conflictedQueenIds: Set of queen IDs that have >= 1 clash
     * - conflictPairs: Array of [{q1, q2, type: 'row'|'col'|'diag'}]
     * - counts by type
     */
    evaluate() {
        const queens = this.getQueens();
        const k = queens.length;
        const conflictedIds = new Set();
        const conflictPairs = [];
        let rowConflicts = 0;
        let colConflicts = 0;
        let diagConflicts = 0;

        for (let i = 0; i < k; i++) {
            const q1 = queens[i];
            for (let j = i + 1; j < k; j++) {
                const q2 = queens[j];
                let isConflict = false;
                let type = '';

                // Row conflict
                if (q1.row === q2.row) {
                    isConflict = true;
                    type = 'row';
                    rowConflicts++;
                }
                // Col conflict
                else if (q1.col === q2.col) {
                    isConflict = true;
                    type = 'col';
                    colConflicts++;
                }
                // Diagonal conflict: |r1 - r2| == |c1 - c2|
                else if (Math.abs(q1.row - q2.row) === Math.abs(q1.col - q2.col)) {
                    isConflict = true;
                    type = 'diag';
                    diagConflicts++;
                }

                if (isConflict) {
                    conflictedIds.add(q1.id);
                    conflictedIds.add(q2.id);
                    conflictPairs.push({ q1, q2, type });
                }
            }
        }

        const totalConflicts = conflictPairs.length;
        const maxPairs = (this.n * (this.n - 1)) / 2;
        const nonAttackingPairs = Math.max(0, maxPairs - totalConflicts);

        // Normalized Fitness: 0% to 100%
        let fitnessPercent = 0;
        if (k === this.n) {
            fitnessPercent = Math.max(0, (nonAttackingPairs / maxPairs) * 100);
        } else {
            // Penalize incomplete boards proportionally
            fitnessPercent = Math.max(0, (nonAttackingPairs / maxPairs) * (k / this.n) * 100);
        }

        const isSolved = (k === this.n && totalConflicts === 0);

        return {
            totalQueens: k,
            targetQueens: this.n,
            conflictedIds,
            conflictPairs,
            totalConflicts,
            rowConflicts,
            colConflicts,
            diagConflicts,
            safeQueensCount: k - conflictedIds.size,
            conflictedQueensCount: conflictedIds.size,
            nonAttackingPairs,
            fitnessPercent: parseFloat(fitnessPercent.toFixed(1)),
            maxPairs,
            isSolved
        };
    }

    /**
     * Generate 1D Binary Vector of size N*N (0 = empty, 1 = queen)
     * Ordered row by row (or col by col).
     */
    getBinaryVector1D() {
        const size = this.n * this.n;
        const vec = new Uint8Array(size);
        const queens = this.getQueens();
        queens.forEach(q => {
            const idx = q.row * this.n + q.col;
            if (idx >= 0 && idx < size) {
                vec[idx] = 1;
            }
        });
        return Array.from(vec);
    }

    /**
     * Generate 2D Binary Matrix of size N x N
     */
    getBinaryMatrix2D() {
        const matrix = [];
        for (let r = 0; r < this.n; r++) {
            const row = Array(this.n).fill(0);
            matrix.push(row);
        }
        const queens = this.getQueens();
        queens.forEach(q => {
            if (q.row >= 0 && q.row < this.n && q.col >= 0 && q.col < this.n) {
                matrix[q.row][q.col] = 1;
            }
        });
        return matrix;
    }

    /**
     * Get integer column vector [r0, r1, ..., rN-1]
     */
    getColumnVector() {
        return [...this.board];
    }
}

/**
 * Permutation-based Genetic Algorithm for N-Queens
 */
class NQueensGA {
    constructor(n = 8, config = {}) {
        this.n = n;
        this.popSize = config.popSize || 80;
        this.mutationRate = config.mutationRate !== undefined ? config.mutationRate : 0.15;
        this.crossoverRate = config.crossoverRate !== undefined ? config.crossoverRate : 0.85;
        this.elitismCount = config.elitismCount !== undefined ? config.elitismCount : 2;
        this.tournamentSize = config.tournamentSize || 3;
        this.maxGenerations = config.maxGenerations || 300;

        this.population = [];
        this.generation = 0;
        this.totalEvaluations = 0; // Total simulated samples counter
        this.bestIndividual = null;
        this.history = []; // { gen, bestFitness, bestConflicts, avgFitness }
        this.isRunning = false;
        this.isSolved = false;
        this.isInitialized = false;
        this.stagnantCount = 0;

        // Note: Population is generated when optimization starts to preserve 0-initial counter
    }

    setN(newN) {
        this.n = newN;
        this.reset();
    }

    updateConfig(config = {}) {
        if (config.popSize !== undefined) this.popSize = config.popSize;
        if (config.mutationRate !== undefined) this.mutationRate = config.mutationRate;
        if (config.crossoverRate !== undefined) this.crossoverRate = config.crossoverRate;
        if (config.elitismCount !== undefined) this.elitismCount = config.elitismCount;
        if (config.maxGenerations !== undefined) this.maxGenerations = config.maxGenerations;
    }

    // Generate random permutation of 0..N-1
    randomPermutation() {
        const arr = [];
        for (let i = 0; i < this.n; i++) arr.push(i);
        // Fisher-Yates shuffle
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Fast conflict calculation for a permutation chromosome
    // Since it's a permutation, row conflicts = 0 and col conflicts = 0!
    // Only diagonal clashes exist!
    calculateConflicts(chromosome) {
        let conflicts = 0;
        const n = chromosome.length;
        for (let i = 0; i < n; i++) {
            const r1 = chromosome[i];
            for (let j = i + 1; j < n; j++) {
                const r2 = chromosome[j];
                // Diagonal clash if |r1 - r2| == (j - i)
                if (Math.abs(r1 - r2) === (j - i)) {
                    conflicts++;
                }
            }
        }
        return conflicts;
    }

    evaluateIndividual(genes) {
        this.totalEvaluations++; // Track simulated sample evaluation
        const conflicts = this.calculateConflicts(genes);
        const maxPairs = (this.n * (this.n - 1)) / 2;
        const fitness = maxPairs - conflicts;
        const fitnessPercent = parseFloat(((fitness / maxPairs) * 100).toFixed(1));
        return {
            genes: [...genes],
            conflicts,
            fitness,
            fitnessPercent
        };
    }

    initPopulation() {
        this.population = [];
        this.generation = 1;
        this.totalEvaluations = 0;
        this.history = [];
        this.isSolved = false;
        this.bestIndividual = null;
        this.stagnantCount = 0;

        for (let i = 0; i < this.popSize; i++) {
            const genes = this.randomPermutation();
            this.population.push(this.evaluateIndividual(genes));
        }

        this.isInitialized = true;
        this.sortAndTrack();
    }

    reset() {
        this.population = [];
        this.generation = 0;
        this.totalEvaluations = 0;
        this.bestIndividual = null;
        this.history = [];
        this.isRunning = false;
        this.isSolved = false;
        this.isInitialized = false;
        this.stagnantCount = 0;
    }

    sortAndTrack() {
        // Sort descending by fitness (or ascending by conflicts)
        this.population.sort((a, b) => b.fitness - a.fitness);
        const currentBest = this.population[0];

        if (!this.bestIndividual || currentBest.fitness > this.bestIndividual.fitness) {
            this.bestIndividual = { ...currentBest, genes: [...currentBest.genes] };
            this.stagnantCount = 0;
        } else {
            this.stagnantCount++;
        }

        if (currentBest.conflicts === 0) {
            this.isSolved = true;
        }

        const avgFitness = this.population.reduce((sum, ind) => sum + ind.fitness, 0) / this.popSize;
        const avgConflicts = this.population.reduce((sum, ind) => sum + ind.conflicts, 0) / this.popSize;

        this.history.push({
            generation: this.generation,
            bestFitness: currentBest.fitness,
            bestFitnessPercent: parseFloat(currentBest.fitnessPercent.toFixed(1)),
            bestConflicts: currentBest.conflicts,
            avgFitness: parseFloat(avgFitness.toFixed(2)),
            avgConflicts: parseFloat(avgConflicts.toFixed(2)),
            totalEvaluations: this.totalEvaluations
        });
    }

    // Tournament Selection
    tournamentSelect() {
        let best = null;
        for (let i = 0; i < this.tournamentSize; i++) {
            const idx = Math.floor(Math.random() * this.population.length);
            const candidate = this.population[idx];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }

    /**
     * Order Crossover (OX) for Permutation Genomes
     * Preserves valid permutations without duplicate rows
     */
    orderCrossover(parent1, parent2) {
        if (Math.random() > this.crossoverRate) {
            return [...parent1.genes];
        }

        const n = this.n;
        const p1 = parent1.genes;
        const p2 = parent2.genes;
        const child = Array(n).fill(-1);

        // Pick 2 random points
        let pt1 = Math.floor(Math.random() * n);
        let pt2 = Math.floor(Math.random() * n);
        if (pt1 > pt2) [pt1, pt2] = [pt2, pt1];

        // Copy substring from parent 1
        const inChild = new Set();
        for (let i = pt1; i <= pt2; i++) {
            child[i] = p1[i];
            inChild.add(p1[i]);
        }

        // Fill remaining slots in circular order from parent 2
        let p2Idx = (pt2 + 1) % n;
        let cIdx = (pt2 + 1) % n;

        while (inChild.size < n) {
            const candidate = p2[p2Idx];
            if (!inChild.has(candidate)) {
                child[cIdx] = candidate;
                inChild.add(candidate);
                cIdx = (cIdx + 1) % n;
            }
            p2Idx = (p2Idx + 1) % n;
        }

        return child;
    }

    /**
     * Permutation Mutation:
     * - Swap mutation (swaps two rows)
     * - Inversion mutation (reverses a segment)
     */
    mutate(genes) {
        if (Math.random() > this.mutationRate) return genes;

        const mutated = [...genes];
        const n = this.n;

        if (Math.random() < 0.7) {
            // Swap mutation
            const idx1 = Math.floor(Math.random() * n);
            let idx2 = Math.floor(Math.random() * n);
            while (idx2 === idx1 && n > 1) {
                idx2 = Math.floor(Math.random() * n);
            }
            [mutated[idx1], mutated[idx2]] = [mutated[idx2], mutated[idx1]];
        } else {
            // Inversion mutation
            let i = Math.floor(Math.random() * n);
            let j = Math.floor(Math.random() * n);
            if (i > j) [i, j] = [j, i];
            while (i < j) {
                [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
                i++;
                j--;
            }
        }

        return mutated;
    }

    /**
     * Execute 1 Generation of the GA
     */
    step() {
        if (this.isSolved) return true;

        // 1. Initial generation (Gen 1): evaluate initial random population
        if (!this.isInitialized || this.population.length === 0) {
            this.initPopulation();
            return this.isSolved || this.generation >= this.maxGenerations;
        }

        const newPopulation = [];
        const elitism = Math.min(this.elitismCount, this.popSize);

        // 1. Elitism: preserve top individuals (evaluated in this generation's candidate sample count)
        for (let i = 0; i < elitism; i++) {
            newPopulation.push(this.evaluateIndividual(this.population[i].genes));
        }

        // 2. Diversity Injection if stagnant for 20+ generations
        const injectDiversity = this.stagnantCount >= 20;
        const diversityCount = injectDiversity ? Math.floor(this.popSize * 0.25) : 0;
        if (injectDiversity) {
            this.stagnantCount = 0;
        }

        // 3. Reproduce remaining population
        while (newPopulation.length < this.popSize - diversityCount) {
            const parent1 = this.tournamentSelect();
            const parent2 = this.tournamentSelect();
            let childGenes = this.orderCrossover(parent1, parent2);
            childGenes = this.mutate(childGenes);
            newPopulation.push(this.evaluateIndividual(childGenes));
        }

        // 4. Inject fresh random immigrants if diversity kick triggered
        for (let i = 0; i < diversityCount; i++) {
            const freshGenes = this.randomPermutation();
            newPopulation.push(this.evaluateIndividual(freshGenes));
        }

        this.population = newPopulation;
        this.generation++;
        this.sortAndTrack();

        return this.isSolved || this.generation >= this.maxGenerations;
    }
}

/**
 * NQueensUI Controller
 * Connects problem logic, DOM, chessboard canvas/SVG, binary vector, and GA.
 */
class NQueensUI {
    constructor() {
        this.problem = new NQueensProblem(8);
        this.ga = new NQueensGA(8);

        this.animationTimer = null;
        this.animationSpeed = 'fast';
        this.showThreatRays = true;
        this.showCoordinates = true;
        this.autoApplyToBoard = true;
        this.vectorFormat = '1d';
        this.manualEvaluations = 0;
        this.sessionGaEvaluations = 0;

        this.initDOMReferences();
        this.bindEvents();
        this.resetOptimizationAll();
    }

    initDOMReferences() {
        // Tab buttons for board size
        this.btnSize4 = document.getElementById('btnSize4');
        this.btnSize8 = document.getElementById('btnSize8');
        this.btnSize16 = document.getElementById('btnSize16');
        this.badgeBoardN = document.getElementById('badgeBoardN');

        // Mode and board controls
        this.modeColumn = document.getElementById('modeColumn');
        this.modeFree = document.getElementById('modeFree');
        this.btnClearBoard = document.getElementById('btnClearBoard');
        this.btnRandomizeBoard = document.getElementById('btnRandomizeBoard');
        this.btnResetAll = document.getElementById('btnResetAll');
        this.btnSampleSolution = document.getElementById('btnSampleSolution');

        // Chessboard and SVG overlay
        this.boardWrapper = document.getElementById('queensBoardWrapper');
        this.chessboard = document.getElementById('nqueensChessboard');
        this.svgThreatLines = document.getElementById('svgThreatLines');
        this.statusPill = document.getElementById('boardStatusPill');

        // Visual toggles
        this.toggleThreatRays = document.getElementById('toggleThreatRays');
        this.toggleCoords = document.getElementById('toggleCoords');

        // Binary Vector controls
        this.binaryVectorContainer = document.getElementById('binaryVectorContainer');
        this.btnVecFormat1D = document.getElementById('btnVecFormat1D');
        this.btnVecFormat2D = document.getElementById('btnVecFormat2D');
        this.btnVecFormatGenes = document.getElementById('btnVecFormatGenes');
        this.btnCopyVector = document.getElementById('btnCopyVector');
        this.valVectorBits = document.getElementById('valVectorBits');

        // GA Controls
        this.sliderPopSize = document.getElementById('sliderNqPopSize');
        this.valPopSize = document.getElementById('valNqPopSize');
        this.sliderMutation = document.getElementById('sliderNqMutation');
        this.valMutation = document.getElementById('valNqMutation');
        this.sliderCrossover = document.getElementById('sliderNqCrossover');
        this.valCrossover = document.getElementById('valNqCrossover');
        this.sliderMaxGen = document.getElementById('sliderNqMaxGen');
        this.valMaxGen = document.getElementById('valNqMaxGen');

        this.btnGaPlay = document.getElementById('btnNqGaPlay');
        this.btnGaStep = document.getElementById('btnNqGaStep');
        this.btnGaSolve = document.getElementById('btnNqGaSolve');
        this.btnGaReset = document.getElementById('btnNqGaReset');
        this.speedButtons = document.querySelectorAll('.nq-speed-btn');

        // Metrics elements - Always visible top card
        this.metricFitness = document.getElementById('nqMetricFitness');
        this.metricProgressCircle = document.getElementById('nqProgressCircle');
        this.metricStatus = document.getElementById('nqMetricStatus');
        this.nqScorePoints = document.getElementById('nqScorePoints');
        this.nqLinearFill = document.getElementById('nqLinearFill');
        this.nqBadgeSamples = document.getElementById('nqBadgeSamples');
        this.nqStatTotalEvaluations = document.getElementById('nqStatTotalEvaluations');
        this.nqStatSimDetails = document.getElementById('nqStatSimDetails');

        // Fitness Explainer Elements
        this.badgeMaxPairs = document.getElementById('badgeMaxPairs');
        this.valMaxScorePts = document.getElementById('valMaxScorePts');
        this.valDiagPenaltyPts = document.getElementById('valDiagPenaltyPts');
        this.valRowColPenaltyPts = document.getElementById('valRowColPenaltyPts');
        this.formulaLiveBreakdown = document.getElementById('formulaLiveBreakdown');
        this.valTotalScorePts = document.getElementById('valTotalScorePts');
        this.valGoodQueensText = document.getElementById('valGoodQueensText');
        this.valBadQueensText = document.getElementById('valBadQueensText');

        // Statistics elements
        this.statQueensPlaced = document.getElementById('nqStatQueensPlaced');
        this.statSafeQueens = document.getElementById('nqStatSafeQueens');
        this.statClashingQueens = document.getElementById('nqStatClashingQueens');
        this.statTotalConflicts = document.getElementById('nqStatTotalConflicts');
        this.statRowConflicts = document.getElementById('nqStatRowConflicts');
        this.statColConflicts = document.getElementById('nqStatColConflicts');
        this.statDiagConflicts = document.getElementById('nqStatDiagConflicts');

        // GA stats
        this.statGaGen = document.getElementById('nqStatGaGen');
        this.statGaEvals = document.getElementById('nqStatGaEvals');
        this.statGaBestConflicts = document.getElementById('nqStatGaBestConflicts');
        this.statGaBestFitness = document.getElementById('nqStatGaBestFitness');

        // Chart
        this.chartCanvas = document.getElementById('nqConvergenceChart');

        // Top 5 Population container
        this.popTableBody = document.getElementById('nqPopTableBody');
    }

    bindEvents() {
        // Board size buttons
        [
            { btn: this.btnSize4, n: 4 },
            { btn: this.btnSize8, n: 8 },
            { btn: this.btnSize16, n: 16 }
        ].forEach(({ btn, n }) => {
            if (btn) {
                btn.addEventListener('click', () => this.switchBoardSize(n));
            }
        });

        // Mode toggles
        if (this.modeColumn) {
            this.modeColumn.addEventListener('change', () => {
                this.problem.mode = 'column';
                this.problem.initDefault();
                this.refreshAll();
            });
        }
        if (this.modeFree) {
            this.modeFree.addEventListener('change', () => {
                this.problem.mode = 'free';
                this.problem.initDefault();
                this.refreshAll();
            });
        }

        // Board buttons
        if (this.btnClearBoard) {
            this.btnClearBoard.addEventListener('click', () => {
                this.stopGaAnimation();
                this.problem.clear();
                this.manualEvaluations = (this.manualEvaluations || 0) + 1;
                this.refreshAll();
            });
        }
        if (this.btnRandomizeBoard) {
            this.btnRandomizeBoard.addEventListener('click', () => {
                this.stopGaAnimation();
                this.problem.initDefault();
                this.manualEvaluations = (this.manualEvaluations || 0) + 1;
                this.refreshAll();
            });
        }
        if (this.btnResetAll) {
            this.btnResetAll.addEventListener('click', () => {
                this.resetOptimizationAll();
            });
        }
        if (this.btnSampleSolution) {
            this.btnSampleSolution.addEventListener('click', () => {
                this.stopGaAnimation();
                this.loadSampleSolution();
                this.manualEvaluations = (this.manualEvaluations || 0) + 1;
                this.refreshAll();
            });
        }

        // Toggles
        if (this.toggleThreatRays) {
            this.toggleThreatRays.addEventListener('change', (e) => {
                this.showThreatRays = e.target.checked;
                this.drawThreatLines();
            });
        }
        if (this.toggleCoords) {
            this.toggleCoords.addEventListener('change', (e) => {
                this.showCoordinates = e.target.checked;
                this.renderBoard();
            });
        }

        // Vector format buttons
        if (this.btnVecFormat1D) {
            this.btnVecFormat1D.addEventListener('click', () => {
                this.vectorFormat = '1d';
                this.updateVecFormatButtons();
                this.updateBinaryVector();
            });
        }
        if (this.btnVecFormat2D) {
            this.btnVecFormat2D.addEventListener('click', () => {
                this.vectorFormat = '2d';
                this.updateVecFormatButtons();
                this.updateBinaryVector();
            });
        }
        if (this.btnVecFormatGenes) {
            this.btnVecFormatGenes.addEventListener('click', () => {
                this.vectorFormat = 'genes';
                this.updateVecFormatButtons();
                this.updateBinaryVector();
            });
        }
        if (this.btnCopyVector) {
            this.btnCopyVector.addEventListener('click', () => this.copyVectorToClipboard());
        }

        // GA sliders
        if (this.sliderPopSize) {
            this.sliderPopSize.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                this.valPopSize.textContent = val;
                this.ga.updateConfig({ popSize: val });
            });
        }
        if (this.sliderMutation) {
            this.sliderMutation.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.valMutation.textContent = `${Math.round(val * 100)}%`;
                this.ga.updateConfig({ mutationRate: val });
            });
        }
        if (this.sliderCrossover) {
            this.sliderCrossover.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.valCrossover.textContent = `${Math.round(val * 100)}%`;
                this.ga.updateConfig({ crossoverRate: val });
            });
        }
        if (this.sliderMaxGen) {
            this.sliderMaxGen.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                this.valMaxGen.textContent = val;
                this.ga.updateConfig({ maxGenerations: val });
            });
        }

        // Speed buttons
        this.speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.animationSpeed = btn.dataset.speed;
            });
        });

        // GA Action buttons
        if (this.btnGaPlay) {
            this.btnGaPlay.addEventListener('click', () => this.toggleGaPlay());
        }
        if (this.btnGaStep) {
            this.btnGaStep.addEventListener('click', () => this.stepGa());
        }
        if (this.btnGaSolve) {
            this.btnGaSolve.addEventListener('click', () => this.solveGaFull());
        }
        if (this.btnGaReset) {
            this.btnGaReset.addEventListener('click', () => this.resetOptimizationAll());
        }

        // Window resize to redraw SVG threat lines properly
        window.addEventListener('resize', () => {
            this.drawThreatLines();
        });
    }

    /**
     * Completely resets all data, GA history, population, simulated samples, and board.
     * Prevents previous solved runs from polluting fresh optimization runs.
     */
    resetOptimizationAll() {
        this.stopGaAnimation();

        // 1. Purge all simulation and GA counters
        this.manualEvaluations = 0;
        this.sessionGaEvaluations = 0;
        this.ga.reset();

        // 2. Initialize fresh board for current N
        this.problem.initDefault();

        // 3. Clear visual glory/glow
        if (this.boardWrapper) {
            this.boardWrapper.classList.remove('victory-glow');
        }

        // 4. Rebuild board and refresh all components
        this.renderBoard();
        this.refreshAll();
        this.drawConvergenceChart();
    }

    switchBoardSize(newN) {
        this.stopGaAnimation();

        // Update button active state
        [this.btnSize4, this.btnSize8, this.btnSize16].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (newN === 4 && this.btnSize4) this.btnSize4.classList.add('active');
        if (newN === 8 && this.btnSize8) this.btnSize8.classList.add('active');
        if (newN === 16 && this.btnSize16) this.btnSize16.classList.add('active');

        if (this.badgeBoardN) {
            this.badgeBoardN.textContent = `${newN} × ${newN}`;
        }

        this.problem.setN(newN);
        this.ga.setN(newN);

        // Perform full purge and clean initialization for the new problem size
        this.resetOptimizationAll();
    }

    updateVecFormatButtons() {
        [this.btnVecFormat1D, this.btnVecFormat2D, this.btnVecFormatGenes].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (this.vectorFormat === '1d' && this.btnVecFormat1D) this.btnVecFormat1D.classList.add('active');
        if (this.vectorFormat === '2d' && this.btnVecFormat2D) this.btnVecFormat2D.classList.add('active');
        if (this.vectorFormat === 'genes' && this.btnVecFormatGenes) this.btnVecFormatGenes.classList.add('active');
    }

    refreshAll() {
        this.updateBoardSquares();
        this.updateMetrics();
        this.updateBinaryVector();
        this.drawThreatLines();
        this.updatePopTable();
    }

    /**
     * Build chessboard DOM structure
     */
    renderBoard() {
        if (!this.chessboard) return;
        const n = this.problem.n;
        this.chessboard.innerHTML = '';
        this.chessboard.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        this.chessboard.style.gridTemplateRows = `repeat(${n}, 1fr)`;

        // Adjust board square sizes dynamically
        if (n === 4) {
            this.chessboard.className = 'nqueens-board board-size-4';
        } else if (n === 8) {
            this.chessboard.className = 'nqueens-board board-size-8';
        } else {
            this.chessboard.className = 'nqueens-board board-size-16';
        }

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cell = document.createElement('div');
                cell.className = `nq-cell ${(r + c) % 2 === 0 ? 'cell-light' : 'cell-dark'}`;
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.id = `cell_${r}_${c}`;

                // Square coordinate label (e.g. A8, H1)
                if (this.showCoordinates) {
                    if (c === 0) {
                        const rankLabel = document.createElement('span');
                        rankLabel.className = 'coord-label rank-label';
                        rankLabel.textContent = n - r;
                        cell.appendChild(rankLabel);
                    }
                    if (r === n - 1) {
                        const fileLabel = document.createElement('span');
                        fileLabel.className = 'coord-label file-label';
                        fileLabel.textContent = String.fromCharCode(65 + c);
                        cell.appendChild(fileLabel);
                    }
                }

                // Click listener
                cell.addEventListener('click', () => {
                    this.stopGaAnimation();
                    this.problem.handleClickSquare(r, c);
                    this.manualEvaluations = (this.manualEvaluations || 0) + 1;
                    this.refreshAll();
                });

                this.chessboard.appendChild(cell);
            }
        }

        this.updateBoardSquares();
        this.drawThreatLines();
    }

    /**
     * Update queen pieces & conflict coloring on the board
     */
    updateBoardSquares() {
        const n = this.problem.n;
        const analysis = this.problem.evaluate();
        const queens = this.problem.getQueens();

        // Map to quickly find queen at row, col
        const queenMap = new Map();
        queens.forEach(q => queenMap.set(`${q.row},${q.col}`, q));

        // Count conflicts per queen
        const conflictCountMap = new Map();
        analysis.conflictPairs.forEach(pair => {
            conflictCountMap.set(pair.q1.id, (conflictCountMap.get(pair.q1.id) || 0) + 1);
            conflictCountMap.set(pair.q2.id, (conflictCountMap.get(pair.q2.id) || 0) + 1);
        });

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cell = document.getElementById(`cell_${r}_${c}`);
                if (!cell) continue;

                // Remove previous queen element or conflict classes
                const existingQueen = cell.querySelector('.queen-piece');
                if (existingQueen) existingQueen.remove();
                cell.classList.remove('has-queen', 'queen-safe', 'queen-clashing');

                const q = queenMap.get(`${r},${c}`);
                if (q) {
                    cell.classList.add('has-queen');
                    const isClashing = analysis.conflictedIds.has(q.id);
                    const conflictsForQ = conflictCountMap.get(q.id) || 0;

                    const queenEl = document.createElement('div');
                    queenEl.className = `queen-piece ${isClashing ? 'clash' : 'safe'}`;
                    queenEl.innerHTML = `
                        <span class="queen-symbol">♛</span>
                        ${isClashing ? `<span class="clash-badge" title="${conflictsForQ} threats">!${conflictsForQ}</span>` : ''}
                    `;
                    cell.appendChild(queenEl);

                    if (isClashing) {
                        cell.classList.add('queen-clashing');
                    } else {
                        cell.classList.add('queen-safe');
                    }
                }
            }
        }

        // Update status pill above board
        if (this.statusPill) {
            if (analysis.isSolved) {
                this.statusPill.className = 'nq-status-pill solved';
                this.statusPill.innerHTML = `🎉 VALID SOLUTION! (0 Conflicts)`;
            } else if (analysis.totalConflicts > 0) {
                this.statusPill.className = 'nq-status-pill clashing';
                this.statusPill.innerHTML = `⚠️ ${analysis.totalConflicts} Conflict${analysis.totalConflicts > 1 ? 's' : ''} (${analysis.conflictedQueensCount} threatened queens)`;
            } else {
                this.statusPill.className = 'nq-status-pill pending';
                this.statusPill.innerHTML = `Placed: ${analysis.totalQueens} / ${analysis.targetQueens}`;
            }
        }
    }

    /**
     * Draw glowing laser threat lines between conflicting queens
     */
    drawThreatLines() {
        if (!this.svgThreatLines || !this.chessboard) return;
        this.svgThreatLines.innerHTML = '';

        if (!this.showThreatRays) return;

        const analysis = this.problem.evaluate();
        if (analysis.conflictPairs.length === 0) return;

        const boardRect = this.chessboard.getBoundingClientRect();
        if (boardRect.width === 0 || boardRect.height === 0) return;

        this.svgThreatLines.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);

        const n = this.problem.n;
        const cellWidth = boardRect.width / n;
        const cellHeight = boardRect.height / n;

        analysis.conflictPairs.forEach(pair => {
            const x1 = (pair.q1.col + 0.5) * cellWidth;
            const y1 = (pair.q1.row + 0.5) * cellHeight;
            const x2 = (pair.q2.col + 0.5) * cellWidth;
            const y2 = (pair.q2.row + 0.5) * cellHeight;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('class', `threat-ray threat-${pair.type}`);
            this.svgThreatLines.appendChild(line);
        });
    }

    /**
     * Update real-time metrics, simulated samples counter, and detailed fitness explainer
     */
    updateMetrics() {
        const analysis = this.problem.evaluate();
        const gaOptSimulated = this.ga ? this.ga.totalEvaluations : 0;
        const gaTotalSimulated = (this.sessionGaEvaluations || 0) + gaOptSimulated;
        const manualSimulated = this.manualEvaluations || 0;
        const totalSimulated = gaTotalSimulated + manualSimulated;

        // 1. Top Always-Visible Fitness Card
        if (this.metricFitness) this.metricFitness.textContent = `${analysis.fitnessPercent}%`;
        if (this.nqScorePoints) this.nqScorePoints.textContent = `${analysis.nonAttackingPairs} / ${analysis.maxPairs}`;
        if (this.nqLinearFill) this.nqLinearFill.style.width = `${analysis.fitnessPercent}%`;
        if (this.nqBadgeSamples) {
            this.nqBadgeSamples.textContent = `🧪 ${totalSimulated.toLocaleString()} Sample${totalSimulated === 1 ? '' : 's'}`;
        }
        if (this.nqStatTotalEvaluations) this.nqStatTotalEvaluations.textContent = totalSimulated.toLocaleString();
        if (this.nqStatSimDetails) {
            this.nqStatSimDetails.textContent = `(GA: ${gaTotalSimulated.toLocaleString()} | Manual: ${manualSimulated.toLocaleString()})`;
        }

        if (this.metricProgressCircle) {
            // Circumference of r=42 is 2 * PI * 42 ≈ 263.89
            const circ = 263.89;
            this.metricProgressCircle.style.strokeDasharray = `${circ}`;
            const offset = circ - (analysis.fitnessPercent / 100) * circ;
            this.metricProgressCircle.style.strokeDashoffset = `${offset}`;
            if (analysis.isSolved) {
                this.metricProgressCircle.style.stroke = 'var(--accent-emerald)';
            } else if (analysis.totalConflicts > 0) {
                this.metricProgressCircle.style.stroke = 'var(--accent-crimson)';
            } else {
                this.metricProgressCircle.style.stroke = 'var(--primary-cyan)';
            }
        }

        if (this.metricStatus) {
            if (analysis.isSolved) {
                this.metricStatus.textContent = '🎉 Global Optimum (0 Conflicts)!';
                this.metricStatus.style.borderColor = 'var(--accent-emerald)';
                this.metricStatus.style.color = 'var(--accent-emerald)';
            } else if (analysis.totalConflicts > 0) {
                this.metricStatus.textContent = `⚠️ ${analysis.totalConflicts} conflicting pairs`;
                this.metricStatus.style.borderColor = 'var(--accent-crimson)';
                this.metricStatus.style.color = 'var(--accent-crimson)';
            } else {
                this.metricStatus.textContent = 'Incomplete Board';
                this.metricStatus.style.borderColor = 'var(--text-dim)';
                this.metricStatus.style.color = 'var(--text-muted)';
            }
        }

        // 2. Detailed Fitness Function Explainer Card
        if (this.badgeMaxPairs) this.badgeMaxPairs.textContent = `Max: ${analysis.maxPairs} pts`;
        if (this.valMaxScorePts) this.valMaxScorePts.textContent = `+${analysis.maxPairs} pts`;
        if (this.valDiagPenaltyPts) this.valDiagPenaltyPts.textContent = `-${analysis.diagConflicts} pts`;
        const rowColPenalty = analysis.rowConflicts + analysis.colConflicts;
        if (this.valRowColPenaltyPts) this.valRowColPenaltyPts.textContent = `-${rowColPenalty} pts`;
        if (this.formulaLiveBreakdown) {
            this.formulaLiveBreakdown.textContent = `${analysis.maxPairs} - ${analysis.totalConflicts} = ${analysis.nonAttackingPairs} pts (${analysis.fitnessPercent}%)`;
        }
        if (this.valTotalScorePts) this.valTotalScorePts.textContent = `${analysis.nonAttackingPairs} / ${analysis.maxPairs}`;
        if (this.valGoodQueensText) this.valGoodQueensText.textContent = `${analysis.safeQueensCount} / ${analysis.targetQueens} safe`;
        if (this.valBadQueensText) this.valBadQueensText.textContent = `${analysis.conflictedQueensCount} threatened`;

        // 3. Conflict breakdown table
        if (this.statQueensPlaced) this.statQueensPlaced.textContent = `${analysis.totalQueens} / ${analysis.targetQueens}`;
        if (this.statSafeQueens) this.statSafeQueens.textContent = analysis.safeQueensCount;
        if (this.statClashingQueens) this.statClashingQueens.textContent = analysis.conflictedQueensCount;
        if (this.statTotalConflicts) this.statTotalConflicts.textContent = analysis.totalConflicts;
        if (this.statRowConflicts) this.statRowConflicts.textContent = analysis.rowConflicts;
        if (this.statColConflicts) this.statColConflicts.textContent = analysis.colConflicts;
        if (this.statDiagConflicts) this.statDiagConflicts.textContent = analysis.diagConflicts;
    }

    /**
     * Render the 0/1 binary vector or matrix
     */
    updateBinaryVector() {
        if (!this.binaryVectorContainer) return;
        this.binaryVectorContainer.innerHTML = '';

        const n = this.problem.n;
        const analysis = this.problem.evaluate();
        const queens = this.problem.getQueens();

        if (this.valVectorBits) {
            this.valVectorBits.textContent = `${n * n} bits (${n}×${n})`;
        }

        if (this.vectorFormat === '1d') {
            // 1D Array of bits [0, 0, 1, 0, ...]
            const vec1d = this.problem.getBinaryVector1D();
            const wrapper = document.createElement('div');
            wrapper.className = 'bitstream-1d-grid';
            if (n === 16) wrapper.classList.add('dense');

            vec1d.forEach((bit, idx) => {
                const r = Math.floor(idx / n);
                const c = idx % n;
                const isQueen = bit === 1;

                const bitEl = document.createElement('span');
                bitEl.className = `bit-pill ${isQueen ? 'bit-one' : 'bit-zero'}`;
                bitEl.textContent = bit;
                bitEl.title = `Square (${r}, ${c}) [${String.fromCharCode(65 + c)}${n - r}] = ${bit}`;

                if (isQueen) {
                    const q = queens.find(item => item.row === r && item.col === c);
                    if (q && analysis.conflictedIds.has(q.id)) {
                        bitEl.classList.add('bit-conflict');
                    } else {
                        bitEl.classList.add('bit-safe');
                    }
                }

                // Interactive highlight on board hover
                bitEl.addEventListener('mouseenter', () => {
                    const cell = document.getElementById(`cell_${r}_${c}`);
                    if (cell) cell.classList.add('cell-hover-pulse');
                });
                bitEl.addEventListener('mouseleave', () => {
                    const cell = document.getElementById(`cell_${r}_${c}`);
                    if (cell) cell.classList.remove('cell-hover-pulse');
                });
                bitEl.addEventListener('click', () => {
                    this.stopGaAnimation();
                    this.problem.handleClickSquare(r, c);
                    this.manualEvaluations = (this.manualEvaluations || 0) + 1;
                    this.refreshAll();
                });

                wrapper.appendChild(bitEl);
            });

            this.binaryVectorContainer.appendChild(wrapper);

        } else if (this.vectorFormat === '2d') {
            // 2D Matrix display
            const matrix = this.problem.getBinaryMatrix2D();
            const pre = document.createElement('pre');
            pre.className = 'bit-matrix-pre';

            let matrixHtml = '[\n';
            for (let r = 0; r < n; r++) {
                matrixHtml += '  [';
                for (let c = 0; c < n; c++) {
                    const val = matrix[r][c];
                    if (val === 1) {
                        const q = queens.find(item => item.row === r && item.col === c);
                        const isConflict = q && analysis.conflictedIds.has(q.id);
                        matrixHtml += `<span class="mat-one ${isConflict ? 'clash' : 'safe'}">1</span>`;
                    } else {
                        matrixHtml += `<span class="mat-zero">0</span>`;
                    }
                    if (c < n - 1) matrixHtml += ', ';
                }
                matrixHtml += `]${r < n - 1 ? ',' : ''}\n`;
            }
            matrixHtml += ']';
            pre.innerHTML = matrixHtml;
            this.binaryVectorContainer.appendChild(pre);

        } else if (this.vectorFormat === 'genes') {
            // Column integer fenotype + binary encoding
            const cols = this.problem.getColumnVector();
            const bitsPerGene = Math.ceil(Math.log2(n));

            const container = document.createElement('div');
            container.className = 'gene-encoding-container';

            const summary = document.createElement('div');
            summary.className = 'gene-summary';
            summary.innerHTML = `<strong>Phenotype (Row per Column):</strong> <code>[${cols.join(', ')}]</code><br>` +
                                `<strong>Binary Encoding (${bitsPerGene} bits/gene):</strong>`;
            container.appendChild(summary);

            const geneList = document.createElement('div');
            geneList.className = 'gene-pills-row';

            cols.forEach((val, colIdx) => {
                const genePill = document.createElement('div');
                genePill.className = 'gene-pill';
                const binStr = (val >= 0 ? val.toString(2).padStart(bitsPerGene, '0') : '?'.repeat(bitsPerGene));
                genePill.innerHTML = `
                    <span class="gene-col">Col ${String.fromCharCode(65 + colIdx)}</span>
                    <span class="gene-val">Row ${val >= 0 ? val : '-'}</span>
                    <span class="gene-bin">${binStr}</span>
                `;
                geneList.appendChild(genePill);
            });

            container.appendChild(geneList);
            this.binaryVectorContainer.appendChild(container);
        }
    }

    copyVectorToClipboard() {
        const vec1d = this.problem.getBinaryVector1D();
        const jsonStr = JSON.stringify(vec1d);
        navigator.clipboard.writeText(jsonStr).then(() => {
            const originalText = this.btnCopyVector.innerHTML;
            this.btnCopyVector.innerHTML = '✅ Copied!';
            setTimeout(() => {
                this.btnCopyVector.innerHTML = originalText;
            }, 1800);
        }).catch(err => {
            console.error('Error copying vector:', err);
        });
    }

    loadSampleSolution() {
        const n = this.problem.n;
        let sample = [];
        if (n === 4) {
            sample = [1, 3, 0, 2];
        } else if (n === 8) {
            const samples8 = [
                [0, 4, 7, 5, 2, 6, 1, 3],
                [3, 6, 2, 7, 1, 4, 0, 5],
                [4, 1, 3, 6, 2, 7, 5, 0],
                [2, 5, 7, 0, 3, 6, 4, 1]
            ];
            sample = samples8[Math.floor(Math.random() * samples8.length)];
        } else if (n === 16) {
            sample = [0, 2, 4, 6, 8, 10, 12, 14, 3, 1, 7, 5, 11, 9, 15, 13];
        }

        this.problem.fromChromosome(sample);
        this.refreshAll();
    }

    /**
     * Update GA Population Top 5 Table
     */
    updatePopTable() {
        if (!this.popTableBody || !this.ga) return;
        this.popTableBody.innerHTML = '';

        if (!this.ga.isInitialized || this.ga.population.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-dim); padding: 12px; font-size: 0.72rem;">Run GA to generate and evaluate population</td>`;
            this.popTableBody.appendChild(tr);

            if (this.statGaGen) this.statGaGen.textContent = '0';
            if (this.statGaEvals) this.statGaEvals.textContent = '0';
            if (this.statGaBestConflicts) this.statGaBestConflicts.textContent = '-';
            if (this.statGaBestFitness) this.statGaBestFitness.textContent = '-';
            return;
        }

        const topIndividuals = this.ga.population.slice(0, 5);
        topIndividuals.forEach((ind, idx) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.title = 'Click to load this solution onto the board';
            tr.innerHTML = `
                <td>#${idx + 1}</td>
                <td><code style="font-size: 0.72rem;">[${ind.genes.slice(0, 8).join(',')}${ind.genes.length > 8 ? '...' : ''}]</code></td>
                <td style="color: ${ind.conflicts === 0 ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-weight: bold;">${ind.conflicts}</td>
                <td style="color: var(--accent-gold);">${ind.fitnessPercent}%</td>
            `;

            tr.addEventListener('click', () => {
                this.problem.fromChromosome(ind.genes);
                this.refreshAll();
            });

            this.popTableBody.appendChild(tr);
        });

        // Update GA Generation indicators
        if (this.statGaGen) this.statGaGen.textContent = this.ga.generation;
        if (this.statGaEvals) this.statGaEvals.textContent = this.ga.totalEvaluations.toLocaleString();
        if (this.statGaBestConflicts && this.ga.bestIndividual) {
            this.statGaBestConflicts.textContent = this.ga.bestIndividual.conflicts;
        }
        if (this.statGaBestFitness && this.ga.bestIndividual) {
            this.statGaBestFitness.textContent = `${this.ga.bestIndividual.fitnessPercent}%`;
        }
    }

    /**
     * GA Controls: Step
     */
    stepGa() {
        // If previous GA reached optimum or limit, re-initialize fresh population
        if (this.ga.isSolved || this.ga.generation >= this.ga.maxGenerations) {
            this.sessionGaEvaluations = (this.sessionGaEvaluations || 0) + this.ga.totalEvaluations;
            this.ga.reset();
        }

        const finished = this.ga.step();
        if (this.autoApplyToBoard && this.ga.bestIndividual) {
            this.problem.fromChromosome(this.ga.bestIndividual.genes);
        }
        this.refreshAll();
        this.drawConvergenceChart();
        if (finished && this.ga.isSolved) {
            this.onSolutionFound();
        }
    }

    /**
     * GA Controls: Play / Pause Loop
     */
    toggleGaPlay() {
        if (this.ga.isRunning) {
            this.stopGaAnimation();
        } else {
            this.startGaAnimation();
        }
    }

    startGaAnimation() {
        // If already solved or finished, restart from a fresh population
        if (this.ga.isSolved || this.ga.generation >= this.ga.maxGenerations) {
            this.sessionGaEvaluations = (this.sessionGaEvaluations || 0) + this.ga.totalEvaluations;
            this.ga.reset();
            this.refreshAll();
            this.drawConvergenceChart();
        }

        this.ga.isRunning = true;
        if (this.btnGaPlay) {
            this.btnGaPlay.innerHTML = '⏸ Pause';
            this.btnGaPlay.classList.add('btn-pause-active');
        }

        const runLoop = () => {
            if (!this.ga.isRunning) return;

            // In turbo speed, run 5 generations per tick
            const stepsPerTick = this.animationSpeed === 'turbo' ? 6 : 1;
            let finished = false;

            for (let s = 0; s < stepsPerTick; s++) {
                finished = this.ga.step();
                if (finished) break;
            }

            if (this.autoApplyToBoard && this.ga.bestIndividual) {
                this.problem.fromChromosome(this.ga.bestIndividual.genes);
            }
            this.refreshAll();
            this.drawConvergenceChart();

            if (finished) {
                this.stopGaAnimation();
                if (this.ga.isSolved) {
                    this.onSolutionFound();
                }
                return;
            }

            let delay = 15;
            if (this.animationSpeed === 'slow') delay = 250;
            else if (this.animationSpeed === 'medium') delay = 60;
            else if (this.animationSpeed === 'fast') delay = 15;
            else if (this.animationSpeed === 'turbo') delay = 0;

            this.animationTimer = setTimeout(runLoop, delay);
        };

        runLoop();
    }

    stopGaAnimation() {
        this.ga.isRunning = false;
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        if (this.btnGaPlay) {
            this.btnGaPlay.innerHTML = '▶ Start GA';
            this.btnGaPlay.classList.remove('btn-pause-active');
        }
    }

    /**
     * GA Controls: Fast Solve
     */
    solveGaFull() {
        this.stopGaAnimation();

        // If already solved, reset first to observe a legitimate fresh search
        if (this.ga.isSolved || this.ga.generation >= this.ga.maxGenerations) {
            this.sessionGaEvaluations = (this.sessionGaEvaluations || 0) + this.ga.totalEvaluations;
            this.ga.reset();
        }

        let iters = 0;
        const maxIters = this.ga.maxGenerations || 500;

        while (!this.ga.isSolved && iters < maxIters) {
            this.ga.step();
            iters++;
        }

        if (this.ga.bestIndividual) {
            this.problem.fromChromosome(this.ga.bestIndividual.genes);
        }
        this.refreshAll();
        this.drawConvergenceChart();

        if (this.ga.isSolved) {
            this.onSolutionFound();
        }
    }

    onSolutionFound() {
        if (this.boardWrapper) {
            this.boardWrapper.classList.add('victory-glow');
            setTimeout(() => {
                if (this.boardWrapper) this.boardWrapper.classList.remove('victory-glow');
            }, 3000);
        }
    }

    /**
     * Real-time Canvas Convergence Chart for N-Queens
     */
    drawConvergenceChart() {
        if (!this.chartCanvas) return;
        const ctx = this.chartCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = this.chartCanvas.getBoundingClientRect();

        const w = rect.width || 300;
        const h = rect.height || 120;

        if (this.chartCanvas.width !== w * dpr || this.chartCanvas.height !== h * dpr) {
            this.chartCanvas.width = w * dpr;
            this.chartCanvas.height = h * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const history = this.ga.history;
        if (!history || history.length === 0) {
            ctx.fillStyle = '#5c6882';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Awaiting GA evolution...', w / 2, h / 2);
            ctx.restore();
            return;
        }

        const padLeft = 32;
        const padRight = 14;
        const padTop = 12;
        const padBottom = 20;
        const plotW = w - padLeft - padRight;
        const plotH = h - padTop - padBottom;

        // Max possible conflicts for scaling
        const maxPairs = (this.problem.n * (this.problem.n - 1)) / 2;

        // Background grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const y = padTop + (plotH / 3) * i;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();

            // Y label: conflicts
            const confVal = Math.round(maxPairs * (i / 3));
            ctx.fillStyle = '#5c6882';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(confVal, padLeft - 6, y + 3);
        }

        const totalPoints = history.length;
        const stepX = totalPoints > 1 ? plotW / (totalPoints - 1) : 0;

        // Draw Conflicts Curve
        ctx.beginPath();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#ff0055';

        history.forEach((pt, i) => {
            const x = padLeft + i * stepX;
            const y = padTop + (pt.bestConflicts / maxPairs) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Target zero line in glowing emerald
        ctx.strokeStyle = 'rgba(0, 240, 144, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop + plotH);
        ctx.lineTo(w - padRight, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bottom label
        ctx.fillStyle = '#8e9bb5';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Gen 0', padLeft, h - 4);
        ctx.textAlign = 'right';
        ctx.fillText(`Gen ${history[totalPoints - 1].generation}`, w - padRight, h - 4);

        ctx.restore();
    }
}

// Global reference for external access
window.NQueensUI = NQueensUI;
