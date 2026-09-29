/**
 * app.js - Controlador principal de la aplicación
 * Gestiona el estado, eventos de la interfaz, actualización de métricas,
 * sincronización entre vistas 2D/3D y exportación de datos.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Elementos del DOM
    const canvas2D = document.getElementById("canvas2D");
    const container3D = document.getElementById("container3D");
    const convergenceChartCanvas = document.getElementById("convergenceChart");

    const selectBenchmark = document.getElementById("selectBenchmark");
    const centerFixed = document.getElementById("centerFixed");
    const centerRandom = document.getElementById("centerRandom");
    const maxFixed = document.getElementById("maxFixed");
    const maxRandom = document.getElementById("maxRandom");
    const btnResetProblem = document.getElementById("btnResetProblem");

    const inputCoordX = document.getElementById("inputCoordX");
    const inputCoordY = document.getElementById("inputCoordY");
    const btnEvalManual = document.getElementById("btnEvalManual");

    const btnRandom1 = document.getElementById("btnRandom1");
    const btnRandom5 = document.getElementById("btnRandom5");
    const btnRandom25 = document.getElementById("btnRandom25");
    const btnRandom100 = document.getElementById("btnRandom100");
    const btnEvolveGA = document.getElementById("btnEvolveGA");

    const tabView2D = document.getElementById("tabView2D");
    const tabView3D = document.getElementById("tabView3D");
    const toggleInterpolation = document.getElementById("toggleInterpolation");
    const toggleGodMode = document.getElementById("toggleGodMode");
    const btnClearPoints = document.getElementById("btnClearPoints");

    const hudCoords = document.getElementById("hudCoords");
    const hudDomain = document.getElementById("hudDomain");
    const sessionBadge = document.getElementById("sessionBadge");

    const metricPercent = document.getElementById("metricPercent");
    const metricStatusBadge = document.getElementById("metricStatusBadge");
    const radialProgressBar = document.getElementById("radialProgressBar");
    const statEvaluations = document.getElementById("statEvaluations");
    const statBestFitness = document.getElementById("statBestFitness");
    const statBestCoords = document.getElementById("statBestCoords");
    const statBestDistance = document.getElementById("statBestDistance");
    const rowTrueOptimum = document.getElementById("rowTrueOptimum");
    const statTrueFitness = document.getElementById("statTrueFitness");
    const chartMaxEval = document.getElementById("chartMaxEval");

    const historyTableBody = document.getElementById("historyTableBody");
    const btnExportCSV = document.getElementById("btnExportCSV");

    const theoryModal = document.getElementById("theoryModal");
    const btnOpenTheoryModal = document.getElementById("btnOpenTheoryModal");
    const btnCloseTheoryModal = document.getElementById("btnCloseTheoryModal");
    const btnModalUnderstood = document.getElementById("btnModalUnderstood");

    // Elementos de calibración de Frecuencia
    const sliderFrequency = document.getElementById("sliderFrequency");
    const valFrequency = document.getElementById("valFrequency");
    const groupFrequency = document.getElementById("groupFrequency");
    const freqButtons = document.querySelectorAll(".freq-btn");

    // Elementos de Zoom y Pan
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");
    const btnZoomReset = document.getElementById("btnZoomReset");
    const badgeZoomLevel = document.getElementById("badgeZoomLevel");
    const hudZoom = document.getElementById("hudZoom");

    // 2. Estado de la Aplicación
    let currentProblem = null;
    let renderer2D = null;
    let viewer3D = null;
    let gaEngine = null;

    let evaluationHistory = [];
    let bestEvaluation = null;
    let convergenceHistory = []; // { evalNum, bestFitness }

    // 3. Inicialización del problema
    function createNewProblem() {
        const benchmarkId = selectBenchmark.value;
        const centerMode = centerRandom.checked ? "random" : "fixed";
        const maxMode = maxRandom.checked ? "random" : "fixed";
        const freqVal = sliderFrequency ? parseFloat(sliderFrequency.value) : 1.0;

        currentProblem = new OptimizationProblem(benchmarkId, {
            centerMode: centerMode,
            maxMode: maxMode,
            frequency: freqVal
        });

        // Visibilidad del calibrador de frecuencia (solo relevante para Schaffer F6)
        if (groupFrequency) {
            groupFrequency.style.display = (benchmarkId === "schaffer_f6") ? "block" : "none";
        }

        sessionBadge.textContent = `ID: ${currentProblem.seedId}`;
        hudDomain.textContent = `Dominio: [${currentProblem.domain.minX}, ${currentProblem.domain.maxX}]`;

        // Colocar placeholders representativos en los inputs manuales
        const midX = ((currentProblem.domain.minX + currentProblem.domain.maxX) / 2).toFixed(1);
        const midY = ((currentProblem.domain.minY + currentProblem.domain.maxY) / 2).toFixed(1);
        inputCoordX.placeholder = midX;
        inputCoordY.placeholder = midY;
        inputCoordX.min = currentProblem.domain.minX;
        inputCoordX.max = currentProblem.domain.maxX;
        inputCoordY.min = currentProblem.domain.minY;
        inputCoordY.max = currentProblem.domain.maxY;

        // Resetear historial
        evaluationHistory = [];
        bestEvaluation = null;
        convergenceHistory = [];

        // Inicializar o actualizar motores
        if (!renderer2D) {
            renderer2D = new LandscapeRenderer(canvas2D, currentProblem, {
                showGodMode: toggleGodMode.checked,
                showInterpolation: toggleInterpolation.checked
            });

            renderer2D.onCanvasClick((x, y) => {
                evaluateAndRegister(x, y);
            });

            renderer2D.onViewChange((info) => {
                if (badgeZoomLevel) badgeZoomLevel.textContent = `${info.zoomLevel.toFixed(1)}x`;
                if (hudZoom) hudZoom.textContent = `Zoom: ${info.zoomLevel.toFixed(1)}x`;
            });
        } else {
            renderer2D.setProblem(currentProblem);
            renderer2D.showGodMode = toggleGodMode.checked;
            renderer2D.showInterpolation = toggleInterpolation.checked;
        }

        if (badgeZoomLevel) badgeZoomLevel.textContent = `${renderer2D.getZoomLevel().toFixed(1)}x`;
        if (hudZoom) hudZoom.textContent = `Zoom: ${renderer2D.getZoomLevel().toFixed(1)}x`;

        if (!viewer3D) {
            viewer3D = new Surface3DViewer(container3D, currentProblem);
        } else {
            viewer3D.setProblem(currentProblem);
        }

        if (!gaEngine) {
            gaEngine = new MiniGeneticAlgorithm(currentProblem);
        } else {
            gaEngine.setProblem(currentProblem);
        }

        updateUI();
        drawConvergenceChart();
    }

    // 4. Evaluación y Registro de un individuo
    function evaluateAndRegister(x, y) {
        const result = currentProblem.evaluate(x, y);
        result.id = evaluationHistory.length + 1;
        result.timestamp = new Date().toLocaleTimeString();

        evaluationHistory.push(result);

        // Actualizar mejor individuo global
        if (!bestEvaluation || result.fitness > bestEvaluation.fitness) {
            bestEvaluation = result;
        }

        // Registrar en historial de convergencia
        convergenceHistory.push({
            evalNum: evaluationHistory.length,
            bestFitness: bestEvaluation.fitness,
            currentFitness: result.fitness
        });

        // Enviar a los renderizadores
        renderer2D.addEvaluation(result);
        if (viewer3D) {
            viewer3D.addEvaluation(result);
        }

        updateUI();
        drawConvergenceChart();
    }

    function evaluateBatch(individuals) {
        const results = [];
        for (const ind of individuals) {
            const res = currentProblem.evaluate(ind.x, ind.y);
            res.id = evaluationHistory.length + 1;
            res.timestamp = new Date().toLocaleTimeString();
            evaluationHistory.push(res);

            if (!bestEvaluation || res.fitness > bestEvaluation.fitness) {
                bestEvaluation = res;
            }

            convergenceHistory.push({
                evalNum: evaluationHistory.length,
                bestFitness: bestEvaluation.fitness,
                currentFitness: res.fitness
            });

            results.push(res);
        }

        renderer2D.addEvaluations(results);
        if (viewer3D) {
            viewer3D.addEvaluations(results);
        }

        updateUI();
        drawConvergenceChart();
    }

    // 5. Actualización de Interfaz y Métricas
    function updateUI() {
        const total = evaluationHistory.length;
        statEvaluations.textContent = total;

        if (bestEvaluation) {
            const pct = bestEvaluation.percentOfGlobal;
            metricPercent.textContent = `${pct.toFixed(1)}%`;
            statBestFitness.textContent = bestEvaluation.fitness.toFixed(4);
            statBestCoords.textContent = `(${bestEvaluation.x.toFixed(2)}, ${bestEvaluation.y.toFixed(2)})`;

            // SVG Radial Progress (circunferencia = 2 * PI * 45 ≈ 283)
            const circumference = 283;
            const offset = circumference - (pct / 100) * circumference;
            radialProgressBar.style.strokeDashoffset = offset;

            // Color del arco según aptitud
            if (pct < 40) {
                radialProgressBar.style.stroke = "#00e5ff";
                metricStatusBadge.textContent = "Búsqueda inicial a ciegas";
                metricStatusBadge.style.color = "#00e5ff";
                metricStatusBadge.style.borderColor = "rgba(0, 229, 255, 0.3)";
            } else if (pct < 75) {
                radialProgressBar.style.stroke = "#00f090";
                metricStatusBadge.textContent = "Atrapado en cresta / óptimo local";
                metricStatusBadge.style.color = "#00f090";
                metricStatusBadge.style.borderColor = "rgba(0, 240, 144, 0.3)";
            } else if (pct < 98) {
                radialProgressBar.style.stroke = "#ffd000";
                metricStatusBadge.textContent = "¡Cuenca del óptimo global detectada!";
                metricStatusBadge.style.color = "#ffd000";
                metricStatusBadge.style.borderColor = "rgba(255, 208, 0, 0.4)";
            } else {
                radialProgressBar.style.stroke = "#ff0077";
                metricStatusBadge.textContent = "🏆 ¡Óptimo global resuelto (98%+)!";
                metricStatusBadge.style.color = "#ff0077";
                metricStatusBadge.style.borderColor = "rgba(255, 0, 119, 0.5)";
            }

            // Distancia al óptimo
            if (toggleGodMode.checked || pct > 98) {
                statBestDistance.textContent = `${bestEvaluation.distanceToOptimum.toFixed(2)} u`;
            } else {
                statBestDistance.textContent = "Oculta (Modo ciego)";
            }
        } else {
            metricPercent.textContent = "0.0%";
            radialProgressBar.style.strokeDashoffset = 283;
            radialProgressBar.style.stroke = "var(--accent-gold)";
            metricStatusBadge.textContent = "Esperando primera solución...";
            statBestFitness.textContent = "-";
            statBestCoords.textContent = "-";
            statBestDistance.textContent = "-";
        }

        // Mostrar u ocultar verdad fundamental
        if (toggleGodMode.checked) {
            rowTrueOptimum.style.display = "flex";
            statTrueFitness.textContent = `${currentProblem.globalMaxFitness.toFixed(2)} en (${currentProblem.x0}, ${currentProblem.y0})`;
        } else {
            rowTrueOptimum.style.display = "none";
        }

        // Actualizar tabla de historial (últimos 15 puntos ordenados de más reciente a más antiguo)
        renderHistoryTable();
    }

    function renderHistoryTable() {
        if (evaluationHistory.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 12px;">Sin datos aún</td></tr>`;
            return;
        }

        const recent = evaluationHistory.slice(-15).reverse();
        historyTableBody.innerHTML = recent.map(ind => {
            const isBest = bestEvaluation && ind.id === bestEvaluation.id;
            const rowStyle = isBest ? "background: rgba(255, 208, 0, 0.12); font-weight: bold;" : "";
            const star = isBest ? " ★" : "";
            return `
                <tr style="${rowStyle}">
                    <td>#${ind.id}${star}</td>
                    <td>${ind.x.toFixed(2)}</td>
                    <td>${ind.y.toFixed(2)}</td>
                    <td>${ind.fitness.toFixed(3)}</td>
                    <td style="color: ${ind.percentOfGlobal > 85 ? 'var(--accent-gold)' : 'var(--text-main)'};">
                        ${ind.percentOfGlobal.toFixed(1)}%
                    </td>
                </tr>
            `;
        }).join("");
    }

    // 6. Gráfico de Convergencia en Canvas
    function drawConvergenceChart() {
        const ctx = convergenceChartCanvas.getContext("2d");
        const w = convergenceChartCanvas.clientWidth || 300;
        const h = convergenceChartCanvas.clientHeight || 90;

        convergenceChartCanvas.width = w * (window.devicePixelRatio || 1);
        convergenceChartCanvas.height = h * (window.devicePixelRatio || 1);
        ctx.resetTransform?.();
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        if (convergenceHistory.length < 2) {
            ctx.fillStyle = "rgba(142, 155, 181, 0.4)";
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillText("Inserta puntos para ver convergencia...", 10, h / 2);
            chartMaxEval.textContent = `#${evaluationHistory.length}`;
            return;
        }

        const count = convergenceHistory.length;
        chartMaxEval.textContent = `#${count}`;

        const maxFit = currentProblem.globalMaxFitness;
        const minFit = 0;

        // Dibujar línea de óptimo teórico
        const optY = 10;
        ctx.strokeStyle = "rgba(255, 0, 85, 0.3)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, optY);
        ctx.lineTo(w, optY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trazar curva de mejor fitness encontrado acumulado
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const item = convergenceHistory[i];
            const px = (i / (count - 1)) * (w - 20) + 10;
            const norm = Math.max(0, Math.min(1, item.bestFitness / maxFit));
            const py = h - 12 - norm * (h - 24);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }

        ctx.strokeStyle = "#ffd000";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(255, 208, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 7. Eventos de la Interfaz
    // Cambio de benchmark o parámetros
    selectBenchmark.addEventListener("change", createNewProblem);
    centerFixed.addEventListener("change", createNewProblem);
    centerRandom.addEventListener("change", createNewProblem);
    maxFixed.addEventListener("change", createNewProblem);
    maxRandom.addEventListener("change", createNewProblem);
    btnResetProblem.addEventListener("click", createNewProblem);

    // Entrada Manual
    btnEvalManual.addEventListener("click", () => {
        const x = parseFloat(inputCoordX.value);
        const y = parseFloat(inputCoordY.value);
        if (isNaN(x) || isNaN(y)) {
            alert("Por favor introduce valores numéricos válidos para X e Y.");
            return;
        }
        evaluateAndRegister(x, y);
    });

    [inputCoordX, inputCoordY].forEach(inp => {
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btnEvalManual.click();
        });
    });

    // Muestreo Aleatorio
    function addRandomSamples(n) {
        const batch = [];
        for (let i = 0; i < n; i++) {
            batch.push(currentProblem.generateRandomIndividual());
        }
        evaluateBatch(batch);
    }

    btnRandom1.addEventListener("click", () => addRandomSamples(1));
    btnRandom5.addEventListener("click", () => addRandomSamples(5));
    btnRandom25.addEventListener("click", () => addRandomSamples(25));
    btnRandom100.addEventListener("click", () => addRandomSamples(100));

    // Evolución con Algoritmo Genético
    btnEvolveGA.addEventListener("click", () => {
        // Sembrar con individuos previos si existen
        if (evaluationHistory.length > 0) {
            gaEngine.initPopulation(evaluationHistory.slice(-25));
        } else {
            gaEngine.reset();
        }

        // Ejecutar 10 generaciones
        const evolvedPoints = gaEngine.runGenerations(10);
        evaluateBatch(evolvedPoints);
    });

    // Pestañas 2D / 3D
    tabView2D.addEventListener("click", () => {
        tabView2D.classList.add("active");
        tabView3D.classList.remove("active");
        canvas2D.style.display = "block";
        container3D.style.display = "none";
    });

    tabView3D.addEventListener("click", () => {
        tabView3D.classList.add("active");
        tabView2D.classList.remove("active");
        canvas2D.style.display = "none";
        container3D.style.display = "block";
        if (viewer3D) {
            viewer3D.onResize();
        }
    });

    // Toggles de visualización
    toggleInterpolation.addEventListener("change", () => {
        renderer2D.showInterpolation = toggleInterpolation.checked;
    });

    toggleGodMode.addEventListener("change", () => {
        renderer2D.showGodMode = toggleGodMode.checked;
        updateUI();
    });

    btnClearPoints.addEventListener("click", () => {
        evaluationHistory = [];
        bestEvaluation = null;
        convergenceHistory = [];
        renderer2D.clearEvaluations();
        if (viewer3D) viewer3D.clearPoints();
        updateUI();
        drawConvergenceChart();
    });

    // Exportación a CSV
    btnExportCSV.addEventListener("click", () => {
        if (evaluationHistory.length === 0) {
            alert("No hay evaluaciones registradas para exportar.");
            return;
        }

        const headers = ["id", "timestamp", "x", "y", "fitness", "percent_of_global", "distance_to_optimum"];
        const rows = evaluationHistory.map(item => [
            item.id,
            `"${item.timestamp}"`,
            item.x.toFixed(4),
            item.y.toFixed(4),
            item.fitness.toFixed(6),
            item.percentOfGlobal.toFixed(2),
            item.distanceToOptimum.toFixed(4)
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + 
            [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `optimizacion_${currentProblem.benchmark.id}_${currentProblem.seedId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Modal Pedagógico
    btnOpenTheoryModal.addEventListener("click", () => {
        theoryModal.classList.add("active");
    });
    btnCloseTheoryModal.addEventListener("click", () => {
        theoryModal.classList.remove("active");
    });
    btnModalUnderstood.addEventListener("click", () => {
        theoryModal.classList.remove("active");
    });
    theoryModal.addEventListener("click", (e) => {
        if (e.target === theoryModal) theoryModal.classList.remove("active");
    });

    // ==========================================
    // CONTROLADORES DE CALIBRACIÓN DE FRECUENCIA
    // ==========================================
    function updateFrequency(freq) {
        freq = Math.max(0.2, Math.min(5.0, parseFloat(freq)));
        if (sliderFrequency) sliderFrequency.value = freq;
        if (valFrequency) valFrequency.textContent = `${freq.toFixed(1)}x`;
        freqButtons.forEach(btn => {
            if (Math.abs(parseFloat(btn.dataset.freq) - freq) < 0.05) {
                btn.classList.add("active");
                btn.style.background = "var(--bg-surface-elevated)";
                btn.style.borderColor = "var(--primary-cyan)";
            } else {
                btn.classList.remove("active");
                btn.style.background = "";
                btn.style.borderColor = "";
            }
        });

        if (currentProblem) {
            currentProblem.setFrequency(freq);
            if (renderer2D) {
                renderer2D.groundTruthCanvas = null; // invalidar buffer para redibujar
            }
            if (viewer3D && viewer3D.isInitialized) {
                viewer3D.buildSurface(); // regenerar malla 3D con nueva frecuencia
            }
        }
    }

    if (sliderFrequency) {
        sliderFrequency.addEventListener("input", (e) => {
            updateFrequency(parseFloat(e.target.value));
        });
    }

    freqButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            updateFrequency(parseFloat(btn.dataset.freq));
        });
    });

    // ==========================================
    // CONTROLADORES DE ZOOM Y PAN
    // ==========================================
    if (btnZoomIn) {
        btnZoomIn.addEventListener("click", () => {
            if (renderer2D) renderer2D.zoom(0.75);
        });
    }
    if (btnZoomOut) {
        btnZoomOut.addEventListener("click", () => {
            if (renderer2D) renderer2D.zoom(1.33);
        });
    }
    if (btnZoomReset) {
        btnZoomReset.addEventListener("click", () => {
            if (renderer2D) renderer2D.resetZoom();
        });
    }

    // Iniciar con la primera instancia del problema
    createNewProblem();
});
