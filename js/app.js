/**
 * app.js - Main Application Controller
 * Manages application state, UI event listeners, metric tracking,
 * 2D/3D viewport synchronization, and CSV data export.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. DOM Element Selectors
    const canvas2D = document.getElementById("canvas2D");
    const container3D = document.getElementById("container3D");
    const convergenceChartCanvas = document.getElementById("convergenceChart");

    const selectBenchmark = document.getElementById("selectBenchmark");
    const selectDomainScale = document.getElementById("selectDomainScale");
    const badgeDomainInfo = document.getElementById("badgeDomainInfo");
    const customDomainRow = document.getElementById("customDomainRow");
    const customMinCoord = document.getElementById("customMinCoord");
    const customMaxCoord = document.getElementById("customMaxCoord");

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
    const btnStepGA = document.getElementById("btnStepGA");
    const btnResetGA = document.getElementById("btnResetGA");
    const sliderGaPopSize = document.getElementById("sliderGaPopSize");
    const valGaPopSize = document.getElementById("valGaPopSize");
    const sliderGaGenerations = document.getElementById("sliderGaGenerations");
    const valGaGenerations = document.getElementById("valGaGenerations");
    const sliderGaElitism = document.getElementById("sliderGaElitism");
    const valGaElitism = document.getElementById("valGaElitism");
    const badgeGaBudget = document.getElementById("badgeGaBudget");

    // Toolbar direct GA action controls
    const btnToolbarEvolveGA = document.getElementById("btnToolbarEvolveGA");
    const btnToolbarStepGA = document.getElementById("btnToolbarStepGA");
    const btnToolbarResetGA = document.getElementById("btnToolbarResetGA");
    const badgeToolbarGaGen = document.getElementById("badgeToolbarGaGen");

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

    // Frequency Calibration Controls
    const sliderFrequency = document.getElementById("sliderFrequency");
    const valFrequency = document.getElementById("valFrequency");
    const groupFrequency = document.getElementById("groupFrequency");
    const freqButtons = document.querySelectorAll(".freq-btn");

    // Zoom and Pan Controls
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");
    const btnZoomReset = document.getElementById("btnZoomReset");
    const badgeZoomLevel = document.getElementById("badgeZoomLevel");
    const hudZoom = document.getElementById("hudZoom");

    // 2. Application State
    let currentProblem = null;
    let renderer2D = null;
    let viewer3D = null;
    let gaEngine = null;

    let evaluationHistory = [];
    let bestEvaluation = null;
    let convergenceHistory = []; // { evalNum, bestFitness, currentFitness }

    // 3. Problem Instantiation
    function createNewProblem() {
        const benchmarkId = selectBenchmark.value;
        const centerMode = centerRandom.checked ? "random" : "fixed";
        const maxMode = maxRandom.checked ? "random" : "fixed";
        const freqVal = sliderFrequency ? parseFloat(sliderFrequency.value) : 1.0;

        // Domain Scale & Custom Bounds Handling
        const domainScaleVal = selectDomainScale ? selectDomainScale.value : "1";
        let domainScale = 1.0;
        let customDomain = null;

        if (domainScaleVal === "custom") {
            if (customDomainRow) customDomainRow.style.display = "grid";
            const cMin = parseFloat(customMinCoord.value) || -100;
            const cMax = parseFloat(customMaxCoord.value) || 100;
            customDomain = { minX: cMin, maxX: cMax, minY: cMin, maxY: cMax };
            if (badgeDomainInfo) badgeDomainInfo.textContent = `[${cMin}, ${cMax}]`;
        } else {
            if (customDomainRow) customDomainRow.style.display = "none";
            domainScale = parseFloat(domainScaleVal) || 1.0;
            if (badgeDomainInfo) {
                if (domainScale === 1) badgeDomainInfo.textContent = "1x Standard";
                else if (domainScale === 2) badgeDomainInfo.textContent = "2x (4x Area)";
                else if (domainScale === 5) badgeDomainInfo.textContent = "5x (25x Area)";
                else if (domainScale === 10) badgeDomainInfo.textContent = "10x (100x Area)";
                else badgeDomainInfo.textContent = `${domainScale}x Scale`;
            }
        }

        currentProblem = new OptimizationProblem(benchmarkId, {
            centerMode: centerMode,
            maxMode: maxMode,
            frequency: freqVal,
            domainScale: domainScale,
            customDomain: customDomain
        });

        // Toggle frequency calibration slider (primarily relevant for Schaffer F6)
        if (groupFrequency) {
            groupFrequency.style.display = (benchmarkId === "schaffer_f6") ? "block" : "none";
        }

        sessionBadge.textContent = `ID: ${currentProblem.seedId}`;
        hudDomain.textContent = `Domain: [${currentProblem.domain.minX}, ${currentProblem.domain.maxX}] × [${currentProblem.domain.minY}, ${currentProblem.domain.maxY}]`;

        // Update coordinate input placeholders and range limits
        const midX = ((currentProblem.domain.minX + currentProblem.domain.maxX) / 2).toFixed(1);
        const midY = ((currentProblem.domain.minY + currentProblem.domain.maxY) / 2).toFixed(1);
        inputCoordX.placeholder = midX;
        inputCoordY.placeholder = midY;
        inputCoordX.min = currentProblem.domain.minX;
        inputCoordX.max = currentProblem.domain.maxX;
        inputCoordY.min = currentProblem.domain.minY;
        inputCoordY.max = currentProblem.domain.maxY;

        // Reset history
        evaluationHistory = [];
        bestEvaluation = null;
        convergenceHistory = [];

        // Initialize or update rendering engines
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

        const gaPop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;
        const gaEli = sliderGaElitism ? parseInt(sliderGaElitism.value) : 2;

        if (!gaEngine) {
            gaEngine = new MiniGeneticAlgorithm(currentProblem, { popSize: gaPop, elitismCount: gaEli });
        } else {
            gaEngine.setProblem(currentProblem);
            gaEngine.updateConfig({ popSize: gaPop, elitismCount: gaEli });
        }

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen 0`;

        updateUI();
        drawConvergenceChart();
    }

    // 4. Evaluation and Registration of Candidate Solutions
    function evaluateAndRegister(x, y) {
        const result = currentProblem.evaluate(x, y);
        result.id = evaluationHistory.length + 1;
        result.timestamp = new Date().toLocaleTimeString();

        evaluationHistory.push(result);

        // Update best global individual
        if (!bestEvaluation || result.fitness > bestEvaluation.fitness) {
            bestEvaluation = result;
        }

        // Record in convergence history
        convergenceHistory.push({
            evalNum: evaluationHistory.length,
            bestFitness: bestEvaluation.fitness,
            currentFitness: result.fitness
        });

        // Dispatch to renderers
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

    // 5. Interface and Metric Updates
    function updateUI() {
        const total = evaluationHistory.length;
        statEvaluations.textContent = total;

        if (bestEvaluation) {
            const pct = bestEvaluation.percentOfGlobal;
            metricPercent.textContent = `${pct.toFixed(1)}%`;
            statBestFitness.textContent = bestEvaluation.fitness.toFixed(4);
            statBestCoords.textContent = `(${bestEvaluation.x.toFixed(2)}, ${bestEvaluation.y.toFixed(2)})`;

            // SVG Radial Progress (circumference = 2 * PI * 45 ≈ 283)
            const circumference = 283;
            const offset = circumference - (pct / 100) * circumference;
            radialProgressBar.style.strokeDashoffset = offset;

            // Arc color & status message based on fitness proximity
            if (pct < 40) {
                radialProgressBar.style.stroke = "#00e5ff";
                metricStatusBadge.textContent = "Initial blind search phase";
                metricStatusBadge.style.color = "#00e5ff";
                metricStatusBadge.style.borderColor = "rgba(0, 229, 255, 0.3)";
            } else if (pct < 75) {
                radialProgressBar.style.stroke = "#00f090";
                metricStatusBadge.textContent = "Trapped in local ridge / optimum";
                metricStatusBadge.style.color = "#00f090";
                metricStatusBadge.style.borderColor = "rgba(0, 240, 144, 0.3)";
            } else if (pct < 98) {
                radialProgressBar.style.stroke = "#ffd000";
                metricStatusBadge.textContent = "Global optimum basin discovered!";
                metricStatusBadge.style.color = "#ffd000";
                metricStatusBadge.style.borderColor = "rgba(255, 208, 0, 0.4)";
            } else {
                radialProgressBar.style.stroke = "#ff0077";
                metricStatusBadge.textContent = "🏆 Global optimum resolved (98%+)!";
                metricStatusBadge.style.color = "#ff0077";
                metricStatusBadge.style.borderColor = "rgba(255, 0, 119, 0.5)";
            }

            // Distance to optimum
            if (toggleGodMode.checked || pct > 98) {
                statBestDistance.textContent = `${bestEvaluation.distanceToOptimum.toFixed(2)} units`;
            } else {
                statBestDistance.textContent = "Hidden (Blind mode)";
            }
        } else {
            metricPercent.textContent = "0.0%";
            radialProgressBar.style.strokeDashoffset = 283;
            radialProgressBar.style.stroke = "var(--accent-gold)";
            metricStatusBadge.textContent = "Waiting for first solution...";
            statBestFitness.textContent = "-";
            statBestCoords.textContent = "-";
            statBestDistance.textContent = "-";
        }

        // Show or hide ground truth optimum info
        if (toggleGodMode.checked) {
            rowTrueOptimum.style.display = "flex";
            statTrueFitness.textContent = `${currentProblem.globalMaxFitness.toFixed(2)} at (${currentProblem.x0}, ${currentProblem.y0})`;
        } else {
            rowTrueOptimum.style.display = "none";
        }

        // Render history table (last 15 points, newest first)
        renderHistoryTable();
    }

    function renderHistoryTable() {
        if (evaluationHistory.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 12px;">No evaluations yet</td></tr>`;
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

    // 6. Convergence Chart Rendering
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
            ctx.fillText("Evaluate points to plot convergence...", 10, h / 2);
            chartMaxEval.textContent = `#${evaluationHistory.length}`;
            return;
        }

        const count = convergenceHistory.length;
        chartMaxEval.textContent = `#${count}`;

        const maxFit = currentProblem.globalMaxFitness;

        // Plot theoretical optimum ceiling line
        const optY = 10;
        ctx.strokeStyle = "rgba(255, 0, 85, 0.3)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, optY);
        ctx.lineTo(w, optY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot accumulated best fitness curve
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

    // 7. UI Event Handlers
    // Benchmark & parameter changes
    selectBenchmark.addEventListener("change", createNewProblem);
    if (selectDomainScale) {
        selectDomainScale.addEventListener("change", createNewProblem);
    }
    if (customMinCoord && customMaxCoord) {
        customMinCoord.addEventListener("change", createNewProblem);
        customMaxCoord.addEventListener("change", createNewProblem);
    }
    centerFixed.addEventListener("change", createNewProblem);
    centerRandom.addEventListener("change", createNewProblem);
    maxFixed.addEventListener("change", createNewProblem);
    maxRandom.addEventListener("change", createNewProblem);
    btnResetProblem.addEventListener("click", createNewProblem);

    // Manual Coordinate Input
    btnEvalManual.addEventListener("click", () => {
        const x = parseFloat(inputCoordX.value);
        const y = parseFloat(inputCoordY.value);
        if (isNaN(x) || isNaN(y)) {
            alert("Please enter valid numerical values for X and Y coordinates.");
            return;
        }
        evaluateAndRegister(x, y);
    });

    [inputCoordX, inputCoordY].forEach(inp => {
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btnEvalManual.click();
        });
    });

    // Random Monte Carlo Sampling
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

    // ==========================================
    // GA HYPERPARAMETER CONTROLLERS & ACTIONS
    // ==========================================
    function updateGaControls() {
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;
        const gen = sliderGaGenerations ? parseInt(sliderGaGenerations.value) : 10;
        const eli = sliderGaElitism ? parseInt(sliderGaElitism.value) : 2;

        if (valGaPopSize) valGaPopSize.textContent = pop;
        if (valGaGenerations) valGaGenerations.textContent = gen;
        if (valGaElitism) valGaElitism.textContent = eli;
        if (badgeGaBudget) badgeGaBudget.textContent = `${pop} ind × ${gen} gen = ${pop * gen} evals`;
        if (btnEvolveGA) btnEvolveGA.textContent = `⚡ Run Full Evolution (${gen} gens)`;
        if (btnToolbarEvolveGA) btnToolbarEvolveGA.textContent = `⚡ Run GA (${gen}g)`;

        if (gaEngine) {
            gaEngine.updateConfig({ popSize: pop, elitismCount: eli });
            if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
        }
    }

    if (sliderGaPopSize) sliderGaPopSize.addEventListener("input", updateGaControls);
    if (sliderGaGenerations) sliderGaGenerations.addEventListener("input", updateGaControls);
    if (sliderGaElitism) sliderGaElitism.addEventListener("input", updateGaControls);

    function executeFullGa() {
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;
        const gen = sliderGaGenerations ? parseInt(sliderGaGenerations.value) : 10;
        const eli = sliderGaElitism ? parseInt(sliderGaElitism.value) : 2;

        gaEngine.updateConfig({ popSize: pop, elitismCount: eli });

        // Seed GA with recent evaluations if available
        if (evaluationHistory.length > 0) {
            gaEngine.initPopulation(evaluationHistory.slice(-pop));
        } else {
            gaEngine.reset();
        }

        // Run generations
        const evolvedPoints = gaEngine.runGenerations(gen);
        evaluateBatch(evolvedPoints);

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
    }

    function executeStepGa() {
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;
        const eli = sliderGaElitism ? parseInt(sliderGaElitism.value) : 2;
        gaEngine.updateConfig({ popSize: pop, elitismCount: eli });

        if (gaEngine.population.length === 0) {
            if (evaluationHistory.length > 0) {
                gaEngine.initPopulation(evaluationHistory.slice(-pop));
            } else {
                gaEngine.reset();
            }
        }

        const stepPoints = gaEngine.stepGeneration();
        evaluateBatch(stepPoints);

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
    }

    function executeResetGa() {
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;
        const eli = sliderGaElitism ? parseInt(sliderGaElitism.value) : 2;
        gaEngine.updateConfig({ popSize: pop, elitismCount: eli });
        gaEngine.reset();
        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen 0`;
    }

    // Full GA Evolution execution from sidebar and toolbar
    if (btnEvolveGA) btnEvolveGA.addEventListener("click", executeFullGa);
    if (btnToolbarEvolveGA) btnToolbarEvolveGA.addEventListener("click", executeFullGa);

    // Step 1 generation from sidebar and toolbar
    if (btnStepGA) btnStepGA.addEventListener("click", executeStepGa);
    if (btnToolbarStepGA) btnToolbarStepGA.addEventListener("click", executeStepGa);

    // Reset GA population from sidebar and toolbar
    if (btnResetGA) btnResetGA.addEventListener("click", executeResetGa);
    if (btnToolbarResetGA) btnToolbarResetGA.addEventListener("click", executeResetGa);

    // 2D / 3D Viewport Tabs
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

    // Visualization Toggles
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
        if (gaEngine) gaEngine.reset();
        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen 0`;
        updateUI();
        drawConvergenceChart();
    });

    // CSV Data Export
    btnExportCSV.addEventListener("click", () => {
        if (evaluationHistory.length === 0) {
            alert("No evaluations recorded to export.");
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
        link.setAttribute("download", `optimization_${currentProblem.benchmark.id}_${currentProblem.seedId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Theory & Pedagogical Modal
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
    // FREQUENCY CALIBRATION CONTROLLERS
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
                renderer2D.groundTruthCanvas = null; // invalidate ground truth cache to redraw
            }
            if (viewer3D && viewer3D.isInitialized) {
                viewer3D.buildSurface(); // regenerate 3D surface mesh
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
    // ZOOM AND PAN CONTROLLERS
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

    // ==========================================
    // MODULE TAB SWITCHER (Landscape vs N-Queens)
    // ==========================================
    const tabModuleLandscape = document.getElementById("tabModuleLandscape");
    const tabModuleNQueens = document.getElementById("tabModuleNQueens");
    const moduleLandscape = document.getElementById("moduleLandscape");
    const moduleNQueens = document.getElementById("moduleNQueens");
    const brandSubtitle = document.getElementById("brandSubtitle");

    let nqueensUI = null;

    function switchModule(moduleName) {
        if (moduleName === "nqueens") {
            if (tabModuleLandscape) tabModuleLandscape.classList.remove("active");
            if (tabModuleNQueens) tabModuleNQueens.classList.add("active");
            if (moduleLandscape) moduleLandscape.style.display = "none";
            if (moduleNQueens) moduleNQueens.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 2: The N-Queens Problem & Combinatorial Optimization (4, 8, 16 Queens)";
            }

            // Instantiate or refresh N-Queens UI
            if (!nqueensUI && window.NQueensUI) {
                nqueensUI = new window.NQueensUI();
            } else if (nqueensUI) {
                nqueensUI.renderBoard();
                nqueensUI.drawThreatLines();
                nqueensUI.drawConvergenceChart();
            }
        } else {
            if (tabModuleNQueens) tabModuleNQueens.classList.remove("active");
            if (tabModuleLandscape) tabModuleLandscape.classList.add("active");
            if (moduleNQueens) moduleNQueens.style.display = "none";
            if (moduleLandscape) moduleLandscape.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 1: The Curse of Blind Search in Deceptive Landscapes (Schaffer's F6)";
            }

            // Resize 2D/3D viewport canvases
            setTimeout(() => {
                if (renderer2D) renderer2D.resize();
                if (viewer3D && viewer3D.isInitialized) viewer3D.onResize();
            }, 60);
        }
    }

    // Expose globally
    window.switchAppModule = switchModule;

    if (tabModuleLandscape) {
        tabModuleLandscape.addEventListener("click", () => switchModule("landscape"));
    }
    if (tabModuleNQueens) {
        tabModuleNQueens.addEventListener("click", () => switchModule("nqueens"));
    }

    // URL Hash Routing Support (#nqueens or #landscape)
    window.addEventListener("hashchange", () => {
        if (location.hash === "#nqueens" || location.hash === "#n-reinas") {
            switchModule("nqueens");
        } else if (location.hash === "#landscape" || location.hash === "#f6") {
            switchModule("landscape");
        }
    });

    // Pre-initialize N-Queens in background so DOM is ready when switched
    if (window.NQueensUI) {
        nqueensUI = new window.NQueensUI();
    }

    if (location.hash === "#nqueens" || location.hash === "#n-reinas") {
        switchModule("nqueens");
    }

    // Launch with initial problem instance
    createNewProblem();
});

