/**
 * benchmarks.js - Colección de funciones de prueba para optimización y Algoritmos Genéticos
 * Diseñado pedagógicamente para ilustrar paisajes de aptitud (fitness landscapes),
 * óptimos locales vs. globales, y la dificultad del muestreo a ciegas.
 */

const BENCHMARKS = {
    schaffer_f6: {
        id: "schaffer_f6",
        name: "Función F6 de Schaffer",
        category: "Multimodal / Altamente Engañosa",
        description: "Famosa en la literatura de Algoritmos Genéticos (David Schaffer, 1989). Posee infinitas crestas circulares concéntricas y miles de óptimos locales que engañan a los métodos basados en gradiente y búsqueda aleatoria.",
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
            // raw está en el rango aprox [0.0, 1.0], alcanzando exactamente 1.0 en r = 0
            return 0.5 - (num / den);
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "La aguja en el pajar: El pico óptimo global mide menos de 1.57/ω unidades de radio en un espacio de 200x200 (área total 40,000). Al aumentar la frecuencia ω, las crestas se vuelven densas y caóticas, reduciendo drásticamente la cuenca del pico global."
    },

    rastrigin: {
        id: "rastrigin",
        name: "Función de Rastrigin",
        category: "Multimodal / Cuadrícula de Trampas",
        description: "Basada en una función parabólica modulada por ondas cosenoidales periódicas. Crea una retícula regular de crestas y valles donde los algoritmos caen fácilmente en trampas locales.",
        latexFormula: "f(x, y) = A - \\left[ (x-x_0)^2 - 10\\cos(2\\pi(x-x_0)) + 10 + (y-y_0)^2 - 10\\cos(2\\pi(y-y_0)) + 10 \\right]",
        defaultDomain: { minX: -5.12, maxX: 5.12, minY: -5.12, maxY: 5.12 },
        isMaximization: true,
        recommendedRandomRange: { min: -3.5, max: 3.5 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const dx = x - x0;
            const dy = y - y0;
            const termX = dx * dx - 10 * Math.cos(2 * Math.PI * dx) + 10;
            const termY = dy * dy - 10 * Math.cos(2 * Math.PI * dy) + 10;
            const cost = termX + termY; // 0 en (x0, y0), maximo alrededor de 80.7
            // Normalizamos entre 0 y 1 para que el óptimo en (x0, y0) sea 1.0
            const maxCost = 80.7;
            const norm = Math.max(0, 1 - (cost / maxCost));
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Excelente para demostrar cómo la mutación en AG puede saltar barreras locales de potencial hacia cuencas más prometedoras."
    },

    ackley: {
        id: "ackley",
        name: "Función de Ackley",
        category: "Casi Plana con Embudo Profundo",
        description: "Superficie muy plana en la periferia exterior con ligeras ondulaciones, pero con un embudo pronunciado y empinado hacia el centro. Sin gradiente externo, la búsqueda a ciegas se desorienta.",
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
            const cost = term1 + term2 + 20 + Math.E; // 0 en (x0, y0), aprox 22 en bordes
            const maxCost = 22.0;
            const norm = Math.max(0, 1 - (cost / maxCost));
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Ilustra el problema del gradiente nulo o casi plano en la periferia. Un algoritmo sin memoria o sin cruce genético no sabrá hacia dónde avanzar."
    },

    rosenbrock: {
        id: "rosenbrock",
        name: "Valle de Rosenbrock (Banana)",
        category: "Valle Estrecho y Curvado",
        description: "El óptimo se encuentra en el interior de un valle parabólico largo, estrecho y curvado. Encontrar el valle es fácil, pero converger hacia el ápice es un desafío clásico de optimización.",
        latexFormula: "f(x, y) = A - \\frac{1}{2500}\\left[ (1 - (x-x_0))^2 + 100((y-y_0) - (x-x_0)^2)^2 \\right]",
        defaultDomain: { minX: -3, maxX: 3, minY: -2, maxY: 4 },
        isMaximization: true,
        recommendedRandomRange: { min: -1.5, max: 1.5 },
        evaluateRaw: function (x, y, x0 = 0, y0 = 0) {
            const u = (x - x0) + 1; // mapeado para que optimo esté en x=x0, y=y0
            const v = (y - y0) + 1;
            const t1 = 1 - u;
            const t2 = v - (u * u);
            const cost = (t1 * t1) + 100 * (t2 * t2);
            // Escala logarítmica suavizada para visualización pedagógica
            const norm = 1 / (1 + 0.005 * cost);
            return norm;
        },
        theoreticalMin: 0.0,
        theoreticalMax: 1.0,
        pedagogicalNotes: "Muestra la dificultad cuando las variables están fuertemente correlacionadas (epistasis). Cruces independientes de coordenadas fallan si no consideran covarianzas."
    },

    himmelblau: {
        id: "himmelblau",
        name: "Función de Himmelblau",
        category: "Multimodal (4 Máximos Idénticos)",
        description: "Función con múltiples picos globales idénticos. Permite ilustrar el concepto de Nichos (Niching) y Especiación en Algoritmos Genéticos para preservar diversidad.",
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
        pedagogicalNotes: "Perfecta para debatir: ¿Qué pasa cuando hay múltiples soluciones óptimas en un problema de ingeniería? ¿Cómo un AG multimodal puede mantener subpoblaciones en cada pico?"
    }
};

/**
 * Clase que encapsula una instancia de problema con parámetros configurados
 * (centro fijo o aleatorio, máximo fijo o aleatorio desconocido)
 */
class OptimizationProblem {
    constructor(benchmarkId = "schaffer_f6", options = {}) {
        this.benchmark = BENCHMARKS[benchmarkId] || BENCHMARKS.schaffer_f6;

        // Configuración de Centro (x0, y0)
        this.centerMode = options.centerMode || "fixed"; // 'fixed' | 'random'
        if (this.centerMode === "random") {
            const rng = this.benchmark.recommendedRandomRange;
            this.x0 = options.fixedX0 !== undefined ? options.fixedX0 : (rng.min + Math.random() * (rng.max - rng.min));
            this.y0 = options.fixedY0 !== undefined ? options.fixedY0 : (rng.min + Math.random() * (rng.max - rng.min));
            // Redondear a 2 decimales para claridad pedagógica
            this.x0 = Math.round(this.x0 * 100) / 100;
            this.y0 = Math.round(this.y0 * 100) / 100;
        } else {
            this.x0 = options.fixedX0 !== undefined ? options.fixedX0 : 0.0;
            this.y0 = options.fixedY0 !== undefined ? options.fixedY0 : 0.0;
        }

        // Configuración del Máximo Global Real (A)
        this.maxMode = options.maxMode || "fixed"; // 'fixed' (1.0) | 'random' (ej: 100..500)
        if (this.maxMode === "random") {
            // Valor aleatorio no intuitivo para simular problemas de caja negra
            const minA = options.randomMinA || 100;
            const maxA = options.randomMaxA || 500;
            this.globalMaxFitness = Math.round((minA + Math.random() * (maxA - minA)) * 10) / 10;
        } else {
            this.globalMaxFitness = options.fixedMaxFitness !== undefined ? options.fixedMaxFitness : 1.0;
        }

        // Configuración de Frecuencia de oscilaciones (particularmente para F6)
        this.frequency = options.frequency !== undefined ? options.frequency : 1.0;

        // Límites del dominio
        this.domain = {
            minX: options.minX !== undefined ? options.minX : this.benchmark.defaultDomain.minX,
            maxX: options.maxX !== undefined ? options.maxX : this.benchmark.defaultDomain.maxX,
            minY: options.minY !== undefined ? options.minY : this.benchmark.defaultDomain.minY,
            maxY: options.maxY !== undefined ? options.maxY : this.benchmark.defaultDomain.maxY
        };

        // Identificador de la sesión / semilla
        this.seedId = "EXP-" + Math.floor(100000 + Math.random() * 900000);
        this.createdAt = new Date().toISOString();
    }

    /**
     * Permite calibrar la frecuencia de oscilación dinámicamente
     */
    setFrequency(freq) {
        this.frequency = Math.max(0.1, Math.min(10.0, freq));
    }

    /**
     * Evalúa una solución candidata (individuo) en coordenadas (x, y)
     * Retorna { fitness, rawNormalized, percentOfGlobal, distanceToOptimum, inDomain }
     */
    evaluate(x, y) {
        // Validación de dominio
        const inDomain = (
            x >= this.domain.minX && x <= this.domain.maxX &&
            y >= this.domain.minY && y <= this.domain.maxY
        );

        // Clamping suave si está fuera o penalización (para AG)
        const clampedX = Math.max(this.domain.minX, Math.min(this.domain.maxX, x));
        const clampedY = Math.max(this.domain.minY, Math.min(this.domain.maxY, y));

        // Aptitud normalizada entre [0, 1]
        const rawNorm = this.benchmark.evaluateRaw(clampedX, clampedY, this.x0, this.y0, this.frequency);

        // Escalar por el valor máximo configurado
        const fitness = rawNorm * this.globalMaxFitness;

        // Porcentaje respecto al máximo teórico global (0% a 100%)
        const percentOfGlobal = Math.min(100, Math.max(0, (fitness / this.globalMaxFitness) * 100));

        // Distancia euclidiana al óptimo verdadero (x0, y0)
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
     * Genera una solución aleatoria uniforme dentro del espacio de búsqueda
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

// Exportación compatible tanto con módulos ES6 como con scripts en el navegador
if (typeof module !== "undefined" && module.exports) {
    module.exports = { BENCHMARKS, OptimizationProblem };
}
