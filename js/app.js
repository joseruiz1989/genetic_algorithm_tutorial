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

    // Precision & Combinatorial Universe Selectors
    const selectPrecision = document.getElementById("selectPrecision");
    const badgePrecision = document.getElementById("badgePrecision");
    const statUniverseSize = document.getElementById("statUniverseSize");
    const statUniqueExplored = document.getElementById("statUniqueExplored");
    const badgeUniverseCoverage = document.getElementById("badgeUniverseCoverage");
    const statExploredBreakdown = document.getElementById("statExploredBreakdown");
    const textCoveragePedagogical = document.getElementById("textCoveragePedagogical");

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

    // Expanded GA Hyperparameter controls
    const sliderGaCrossover = document.getElementById("sliderGaCrossover");
    const valGaCrossover = document.getElementById("valGaCrossover");
    const selectGaCrossoverType = document.getElementById("selectGaCrossoverType");
    const sliderGaMutation = document.getElementById("sliderGaMutation");
    const valGaMutation = document.getElementById("valGaMutation");
    const sliderGaSigma = document.getElementById("sliderGaSigma");
    const valGaSigma = document.getElementById("valGaSigma");
    const selectGaSelection = document.getElementById("selectGaSelection");

    // Projector Mode & Inspection Controls
    const btnToggleProjector = document.getElementById("btnToggleProjector");
    const toggleScatterPop = document.getElementById("toggleScatterPop");
    const chartInspectedNotice = document.getElementById("chartInspectedNotice");

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

        // Decimal Precision
        const precVal = selectPrecision ? selectPrecision.value : "0";
        const decimals = precVal === "continuous" ? null : parseInt(precVal);
        if (badgePrecision) {
            badgePrecision.textContent = decimals === null ? "Continuous" : (decimals === 0 ? "0 Dec (Ints)" : `${decimals} Decimals`);
        }

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
            customDomain: customDomain,
            decimals: decimals
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
                evaluateAndRegister(x, y, "manual");
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
        const gaCross = sliderGaCrossover ? parseFloat(sliderGaCrossover.value) : 0.85;
        const gaCrossType = selectGaCrossoverType ? selectGaCrossoverType.value : "blend";
        const gaMut = sliderGaMutation ? parseFloat(sliderGaMutation.value) : 0.20;
        const gaSigma = sliderGaSigma ? parseFloat(sliderGaSigma.value) : 0.05;
        const gaSelect = selectGaSelection ? selectGaSelection.value : "tournament";

        const gaConfig = {
            popSize: gaPop,
            elitismCount: gaEli,
            crossoverRate: gaCross,
            crossoverType: gaCrossType,
            mutationRate: gaMut,
            mutationSigma: gaSigma,
            selectionMethod: gaSelect
        };

        if (!gaEngine) {
            gaEngine = new MiniGeneticAlgorithm(currentProblem, gaConfig);
        } else {
            gaEngine.setProblem(currentProblem);
            gaEngine.updateConfig(gaConfig);
        }

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen 0`;

        updateUI();
        drawConvergenceChart();
    }

    // 4. Evaluation and Registration of Candidate Solutions
    function evaluateAndRegister(x, y, source = "manual") {
        const result = currentProblem.evaluate(x, y, source);
        result.id = evaluationHistory.length + 1;
        result.timestamp = new Date().toLocaleTimeString();
        result.source = source;

        evaluationHistory.push(result);

        // Update best global individual
        if (!bestEvaluation || result.fitness > bestEvaluation.fitness) {
            bestEvaluation = result;
        }

        // Record in convergence history
        convergenceHistory.push({
            evalNum: evaluationHistory.length,
            bestFitness: bestEvaluation.fitness,
            currentFitness: result.fitness,
            source: source
        });

        // Dispatch to renderers
        renderer2D.addEvaluation(result);
        if (viewer3D) {
            viewer3D.addEvaluation(result);
        }

        updateUI();
        drawConvergenceChart();
    }

    function evaluateBatch(individuals, source = "ga") {
        const results = [];
        for (const ind of individuals) {
            const res = currentProblem.evaluate(ind.x, ind.y, source);
            res.id = evaluationHistory.length + 1;
            res.timestamp = new Date().toLocaleTimeString();
            res.source = source;
            evaluationHistory.push(res);

            if (!bestEvaluation || res.fitness > bestEvaluation.fitness) {
                bestEvaluation = res;
            }

            convergenceHistory.push({
                evalNum: evaluationHistory.length,
                bestFitness: bestEvaluation.fitness,
                currentFitness: res.fitness,
                source: source
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

        // Search Space Universe & Combinatorial Coverage Updates
        if (currentProblem && statUniverseSize) {
            const cov = currentProblem.getCoverageStats();
            statUniverseSize.textContent = cov.totalUniverseFormatted;
            statUniqueExplored.textContent = cov.uniqueTotal.toLocaleString();
            if (badgeUniverseCoverage) {
                if (cov.isDiscrete) {
                    const pctFormatted = cov.coveragePercent < 0.001 ? cov.coveragePercent.toExponential(2) : cov.coveragePercent.toFixed(3);
                    badgeUniverseCoverage.textContent = `${pctFormatted}% Explored`;
                } else {
                    badgeUniverseCoverage.textContent = cov.coverageFormatted;
                }
            }
            if (statExploredBreakdown) {
                statExploredBreakdown.textContent = `GA: ${cov.uniqueGA} | Rnd: ${cov.uniqueRandom} | Man: ${cov.uniqueManual}`;
            }
            if (textCoveragePedagogical && cov.isDiscrete && cov.uniqueTotal > 0 && bestEvaluation) {
                textCoveragePedagogical.innerHTML = `💡 <strong>Didactic Insight:</strong> GA discovered <strong>${bestEvaluation.percentOfGlobal.toFixed(1)}%</strong> optimum having evaluated only <strong>${badgeUniverseCoverage.textContent}</strong> of total possible states!`;
            }
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
            const rowStyle = isBest ? "background: rgba(255, 208, 0, 0.12); font-weight: bold; cursor: pointer;" : "cursor: pointer;";
            const star = isBest ? " ★" : "";
            const sourceIcon = ind.source === 'ga' ? '🧬' : (ind.source === 'random' ? '🎲' : '🎯');
            return `
                <tr style="${rowStyle}" data-id="${ind.id}" title="Click to inspect this individual on 2D map & 3D surface">
                    <td>${sourceIcon} #${ind.id}${star}</td>
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

    // Click on history table row to inspect individual
    if (historyTableBody) {
        historyTableBody.addEventListener("click", (e) => {
            const row = e.target.closest("tr");
            if (!row || !row.dataset.id) return;
            const id = parseInt(row.dataset.id);
            const ind = evaluationHistory.find(it => it.id === id);
            if (ind) {
                if (renderer2D) renderer2D.setInspectedEvaluation(ind);
                if (viewer3D) viewer3D.setInspectedEvaluation(ind);
                if (chartInspectedNotice) {
                    chartInspectedNotice.textContent = `Inspecting #${ind.id} (${ind.x.toFixed(2)}, ${ind.y.toFixed(2)}) Fit: ${ind.fitness.toFixed(3)}`;
                }
            }
        });
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
        ctx.strokeStyle = "rgba(255, 0, 85, 0.4)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, optY);
        ctx.lineTo(w, optY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot individual evaluation points (Scatter Cloud) if enabled
        if (!toggleScatterPop || toggleScatterPop.checked) {
            for (let i = 0; i < evaluationHistory.length; i++) {
                const item = evaluationHistory[i];
                const px = (i / (evaluationHistory.length - 1)) * (w - 20) + 10;
                const norm = Math.max(0, Math.min(1, item.fitness / maxFit));
                const py = h - 12 - norm * (h - 24);

                ctx.fillStyle = item.source === 'ga' 
                    ? 'rgba(0, 229, 255, 0.45)' 
                    : (item.source === 'random' ? 'rgba(255, 0, 119, 0.45)' : 'rgba(0, 240, 144, 0.6)');
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

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
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "rgba(255, 208, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Click on convergence chart to inspect nearest point
    if (convergenceChartCanvas) {
        convergenceChartCanvas.addEventListener("click", (e) => {
            const rect = convergenceChartCanvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const total = evaluationHistory.length;
            if (total < 2) return;

            const w = convergenceChartCanvas.clientWidth || 300;
            const h = convergenceChartCanvas.clientHeight || 90;
            const maxFit = currentProblem.globalMaxFitness;

            let nearest = null;
            let minDist = 30;

            for (let i = 0; i < total; i++) {
                const item = evaluationHistory[i];
                const px = (i / (total - 1)) * (w - 20) + 10;
                const norm = Math.max(0, Math.min(1, item.fitness / maxFit));
                const py = h - 12 - norm * (h - 24);

                const dist = Math.hypot(clickX - px, clickY - py);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = item;
                }
            }

            if (nearest) {
                if (renderer2D) renderer2D.setInspectedEvaluation(nearest);
                if (viewer3D) viewer3D.setInspectedEvaluation(nearest);
                if (chartInspectedNotice) {
                    chartInspectedNotice.textContent = `Inspecting #${nearest.id} (${nearest.x.toFixed(2)}, ${nearest.y.toFixed(2)}) Fit: ${nearest.fitness.toFixed(3)}`;
                }
            }
        });
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
        const cross = sliderGaCrossover ? parseFloat(sliderGaCrossover.value) : 0.85;
        const crossType = selectGaCrossoverType ? selectGaCrossoverType.value : "blend";
        const mut = sliderGaMutation ? parseFloat(sliderGaMutation.value) : 0.20;
        const sigma = sliderGaSigma ? parseFloat(sliderGaSigma.value) : 0.05;
        const selectMeth = selectGaSelection ? selectGaSelection.value : "tournament";

        if (valGaPopSize) valGaPopSize.textContent = pop;
        if (valGaGenerations) valGaGenerations.textContent = gen;
        if (valGaElitism) valGaElitism.textContent = eli;
        if (valGaCrossover) valGaCrossover.textContent = `${Math.round(cross * 100)}%`;
        if (valGaMutation) valGaMutation.textContent = `${Math.round(mut * 100)}%`;
        if (valGaSigma) valGaSigma.textContent = `${Math.round(sigma * 100)}% domain`;

        if (badgeGaBudget) badgeGaBudget.textContent = `${pop} ind × ${gen} gen = ${pop * gen} evals`;
        if (btnEvolveGA) btnEvolveGA.textContent = `⚡ Run Full Evolution (${gen} gens)`;
        if (btnToolbarEvolveGA) btnToolbarEvolveGA.textContent = `⚡ Run GA (${gen}g)`;

        if (gaEngine) {
            gaEngine.updateConfig({
                popSize: pop,
                elitismCount: eli,
                crossoverRate: cross,
                crossoverType: crossType,
                mutationRate: mut,
                mutationSigma: sigma,
                selectionMethod: selectMeth
            });
            if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
        }
    }

    // Dynamic Parameter Adjustment Listeners (Instant on-the-fly tuning)
    [sliderGaPopSize, sliderGaGenerations, sliderGaElitism, sliderGaCrossover, sliderGaMutation, sliderGaSigma].forEach(inp => {
        if (inp) inp.addEventListener("input", updateGaControls);
    });
    [selectGaCrossoverType, selectGaSelection].forEach(sel => {
        if (sel) sel.addEventListener("change", updateGaControls);
    });
    if (selectPrecision) {
        selectPrecision.addEventListener("change", createNewProblem);
    }
    if (toggleScatterPop) {
        toggleScatterPop.addEventListener("change", drawConvergenceChart);
    }

    function executeFullGa() {
        updateGaControls();
        const gen = sliderGaGenerations ? parseInt(sliderGaGenerations.value) : 10;
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;

        // Seed GA with recent evaluations if available
        if (evaluationHistory.length > 0) {
            gaEngine.initPopulation(evaluationHistory.slice(-pop));
        } else {
            gaEngine.reset();
        }

        // Run generations
        const evolvedPoints = gaEngine.runGenerations(gen);
        evaluateBatch(evolvedPoints, "ga");

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
    }

    function executeStepGa() {
        updateGaControls();
        const pop = sliderGaPopSize ? parseInt(sliderGaPopSize.value) : 30;

        if (gaEngine.population.length === 0) {
            if (evaluationHistory.length > 0) {
                gaEngine.initPopulation(evaluationHistory.slice(-pop));
            } else {
                gaEngine.reset();
            }
        }

        const stepPoints = gaEngine.stepGeneration();
        evaluateBatch(stepPoints, "ga");

        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen ${gaEngine.generation}`;
    }

    function executeResetGa() {
        updateGaControls();
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
        if (currentProblem && currentProblem.uniqueExploredStates) {
            currentProblem.uniqueExploredStates.clear();
            currentProblem.totalEvalsCount = 0;
            currentProblem.gaEvalsCount = 0;
            currentProblem.randomEvalsCount = 0;
        }
        renderer2D.clearEvaluations();
        renderer2D.setInspectedEvaluation(null);
        if (viewer3D) {
            viewer3D.clearPoints();
            viewer3D.setInspectedEvaluation(null);
        }
        if (gaEngine) gaEngine.reset();
        if (badgeToolbarGaGen) badgeToolbarGaGen.textContent = `Gen 0`;
        if (chartInspectedNotice) chartInspectedNotice.textContent = "Click any point to inspect candidate";
        updateUI();
        drawConvergenceChart();
    });

    // CSV Data Export
    btnExportCSV.addEventListener("click", () => {
        if (evaluationHistory.length === 0) {
            alert("No evaluations recorded to export.");
            return;
        }

        const headers = ["id", "timestamp", "source", "x", "y", "fitness", "percent_of_global", "distance_to_optimum"];
        const rows = evaluationHistory.map(item => [
            item.id,
            `"${item.timestamp}"`,
            `"${item.source || 'ga'}"`,
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
    // PROJECTOR / HIGH-CONTRAST MODE TOGGLE
    // ==========================================
    function setProjectorMode(enabled) {
        if (enabled) {
            document.body.classList.add("projector-mode");
            if (btnToggleProjector) {
                btnToggleProjector.textContent = "🖥️ Projector: ON";
                btnToggleProjector.classList.add("active");
            }
            try { localStorage.setItem("ga_projector_mode", "true"); } catch(e){}
        } else {
            document.body.classList.remove("projector-mode");
            if (btnToggleProjector) {
                btnToggleProjector.textContent = "🖥️ Projector Mode";
                btnToggleProjector.classList.remove("active");
            }
            try { localStorage.setItem("ga_projector_mode", "false"); } catch(e){}
        }
    }

    if (btnToggleProjector) {
        btnToggleProjector.addEventListener("click", () => {
            const isProjector = document.body.classList.contains("projector-mode");
            setProjectorMode(!isProjector);
        });
    }

    try {
        if (localStorage.getItem("ga_projector_mode") === "true") {
            setProjectorMode(true);
        }
    } catch(e){}

    // ==========================================
    // MODULE TAB SWITCHER (4 Pedagogical Modules)
    // ==========================================
    const tabModuleLandscape = document.getElementById("tabModuleLandscape");
    const tabModuleNQueens = document.getElementById("tabModuleNQueens");
    const tabModuleStepLab = document.getElementById("tabModuleStepLab");
    const tabModuleToyProblems = document.getElementById("tabModuleToyProblems");

    const moduleLandscape = document.getElementById("moduleLandscape");
    const moduleNQueens = document.getElementById("moduleNQueens");
    const moduleStepLab = document.getElementById("moduleStepLab");
    const moduleToyProblems = document.getElementById("moduleToyProblems");
    const brandSubtitle = document.getElementById("brandSubtitle");

    let nqueensUI = null;
    let stepLabUI = null;
    let toyProblemsUI = null;

    function switchModule(moduleName) {
        [tabModuleLandscape, tabModuleNQueens, tabModuleStepLab, tabModuleToyProblems].forEach(t => t?.classList.remove("active"));
        [moduleLandscape, moduleNQueens, moduleStepLab, moduleToyProblems].forEach(m => { if (m) m.style.display = "none"; });

        if (moduleName === "nqueens") {
            tabModuleNQueens?.classList.add("active");
            if (moduleNQueens) moduleNQueens.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 2: The N-Queens Problem & Combinatorial Optimization (4, 8, 16 Queens)";
            }

            if (!nqueensUI && window.NQueensUI) {
                nqueensUI = new window.NQueensUI();
            } else if (nqueensUI) {
                nqueensUI.renderBoard();
                nqueensUI.drawThreatLines();
                nqueensUI.drawConvergenceChart();
            }
        } else if (moduleName === "step_lab" || moduleName === "steplab") {
            tabModuleStepLab?.classList.add("active");
            if (moduleStepLab) moduleStepLab.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 3: Step-by-Step GA Deep Dive (Roulette Wheel & Genetic Operators)";
            }

            if (!stepLabUI && window.StepLab) {
                stepLabUI = new window.StepLab();
            } else if (stepLabUI) {
                stepLabUI.drawRouletteWheel();
                stepLabUI.updateUI();
            }
        } else if (moduleName === "toy_problems" || moduleName === "toyproblems") {
            tabModuleToyProblems?.classList.add("active");
            if (moduleToyProblems) moduleToyProblems.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 4: Classic & Discrete Toy Problems (Zero-Sum 10, Knapsack, Word Guesser)";
            }

            if (!toyProblemsUI && window.ToyProblemsLab) {
                toyProblemsUI = new window.ToyProblemsLab();
            } else if (toyProblemsUI) {
                toyProblemsUI.updateUI();
                toyProblemsUI.drawChart();
            }
        } else {
            tabModuleLandscape?.classList.add("active");
            if (moduleLandscape) moduleLandscape.style.display = "grid";
            if (brandSubtitle) {
                brandSubtitle.textContent = "Module 1: The Curse of Blind Search in Deceptive Landscapes (Schaffer's F6)";
            }

            // Resize 2D/3D viewport canvases
            setTimeout(() => {
                if (renderer2D) renderer2D.resize?.();
                if (viewer3D && viewer3D.isInitialized) viewer3D.onResize?.();
            }, 60);
        }
    }

    // Expose globally
    window.switchAppModule = switchModule;

    if (tabModuleLandscape) tabModuleLandscape.addEventListener("click", () => switchModule("landscape"));
    if (tabModuleNQueens) tabModuleNQueens.addEventListener("click", () => switchModule("nqueens"));
    if (tabModuleStepLab) tabModuleStepLab.addEventListener("click", () => switchModule("step_lab"));
    if (tabModuleToyProblems) tabModuleToyProblems.addEventListener("click", () => switchModule("toy_problems"));

    // URL Hash Routing Support
    window.addEventListener("hashchange", () => {
        if (location.hash === "#nqueens" || location.hash === "#n-reinas") {
            switchModule("nqueens");
        } else if (location.hash === "#steplab" || location.hash === "#step-lab" || location.hash === "#paso-a-paso") {
            switchModule("step_lab");
        } else if (location.hash === "#toyproblems" || location.hash === "#toy-problems" || location.hash === "#problemas") {
            switchModule("toy_problems");
        } else if (location.hash === "#landscape" || location.hash === "#f6") {
            switchModule("landscape");
        }
    });

    // Pre-initialize sub-modules in background so DOM is ready
    if (window.NQueensUI) nqueensUI = new window.NQueensUI();

    // Check initial hash route
    if (location.hash === "#nqueens" || location.hash === "#n-reinas") {
        switchModule("nqueens");
    } else if (location.hash === "#steplab" || location.hash === "#step-lab") {
        switchModule("step_lab");
    } else if (location.hash === "#toyproblems" || location.hash === "#toy-problems") {
        switchModule("toy_problems");
    }

    // Launch with initial problem instance
    createNewProblem();
});

