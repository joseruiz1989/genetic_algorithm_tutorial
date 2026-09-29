/**
 * landscape_renderer.js - Motor de renderizado en Canvas 2D interactivo con Zoom y Pan
 * Incluye:
 * - Zoom dinámico con rueda del ratón y botones (+ / - / Reset)
 * - Panorámica (arrastrar mapa con click y arrastre)
 * - Modo Niebla de Guerra (Fog of War) con reconstrucción progresiva (IDW)
 * - Modo Dios (Revelar terreno real con mapa de calor de alta resolución)
 * - Retícula matemática adaptativa con graduación dinámica
 * - Ondas de impacto animadas y marcadores de mejor solución
 */

class LandscapeRenderer {
    constructor(canvas, problem, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.problem = problem;

        // Opciones de visualización
        this.showGodMode = options.showGodMode || false;
        this.showFogOfWar = options.showFogOfWar !== undefined ? options.showFogOfWar : true;
        this.showInterpolation = options.showInterpolation !== undefined ? options.showInterpolation : true;
        this.radarRadius = options.radarRadius || 18;
        this.pointSize = options.pointSize || 6;

        // Vista actual (soporte de Zoom y Pan)
        const d = this.problem.domain;
        this.view = {
            minX: d.minX,
            maxX: d.maxX,
            minY: d.minY,
            maxY: d.maxY
        };

        // Estado del mouse / arrastre (Pan)
        this.isMouseDown = false;
        this.isDragging = false;
        this.mouseDownPos = { px: 0, py: 0 };
        this.viewAtMouseDown = null;

        // Historial de evaluaciones
        this.evaluations = [];
        this.bestEvaluation = null;

        // Animaciones (ondas al hacer click)
        this.ripples = [];

        // Estado del cursor
        this.hoverCoords = null; // {x, y}

        // Cache de imagen del terreno real
        this.groundTruthCanvas = null;

        // Configuración de visualización DPI
        this.dpr = window.devicePixelRatio || 1;
        this.setupDPI();

        // Eventos
        this.bindEvents();

        // Loop de animación
        this.isAnimating = true;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupDPI() {
        const rect = this.canvas.getBoundingClientRect();
        const displayWidth = rect.width || 600;
        const displayHeight = rect.height || 600;

        this.canvas.width = displayWidth * this.dpr;
        this.canvas.height = displayHeight * this.dpr;
        this.width = displayWidth;
        this.height = displayHeight;

        this.ctx.resetTransform?.();
        this.ctx.scale(this.dpr, this.dpr);
    }

    setProblem(newProblem) {
        this.problem = newProblem;
        const d = this.problem.domain;
        this.view = {
            minX: d.minX,
            maxX: d.maxX,
            minY: d.minY,
            maxY: d.maxY
        };
        this.evaluations = [];
        this.bestEvaluation = null;
        this.ripples = [];
        this.groundTruthCanvas = null;
        this.notifyViewChange();
    }

    addEvaluation(point) {
        this.evaluations.push(point);
        if (!this.bestEvaluation || point.fitness > this.bestEvaluation.fitness) {
            this.bestEvaluation = point;
        }

        this.ripples.push({
            x: point.x,
            y: point.y,
            radius: 2,
            maxRadius: 35,
            alpha: 1.0,
            fitnessRatio: point.percentOfGlobal / 100
        });
    }

    addEvaluations(points) {
        for (const pt of points) {
            this.evaluations.push(pt);
            if (!this.bestEvaluation || pt.fitness > this.bestEvaluation.fitness) {
                this.bestEvaluation = pt;
            }
        }
        if (points.length > 0) {
            const last = points[points.length - 1];
            this.ripples.push({
                x: last.x,
                y: last.y,
                radius: 4,
                maxRadius: 30,
                alpha: 0.9,
                fitnessRatio: last.percentOfGlobal / 100
            });
        }
    }

    clearEvaluations() {
        this.evaluations = [];
        this.bestEvaluation = null;
        this.ripples = [];
    }

    // ==========================================
    // SISTEMA DE COORDENADAS CON ZOOM & PAN
    // ==========================================
    mathToScreen(x, y) {
        const spanX = this.view.maxX - this.view.minX;
        const spanY = this.view.maxY - this.view.minY;
        const px = ((x - this.view.minX) / spanX) * this.width;
        const py = this.height - (((y - this.view.minY) / spanY) * this.height);
        return { px, py };
    }

    screenToMath(px, py) {
        const spanX = this.view.maxX - this.view.minX;
        const spanY = this.view.maxY - this.view.minY;
        const x = this.view.minX + (px / this.width) * spanX;
        const y = this.view.minY + ((this.height - py) / this.height) * spanY;
        return { x, y };
    }

    getZoomLevel() {
        const initSpan = this.problem.domain.maxX - this.problem.domain.minX;
        const currentSpan = this.view.maxX - this.view.minX;
        return initSpan / currentSpan;
    }

    /**
     * Aplica zoom centrado en un punto matemático específico
     * @param {number} factor - < 1 para acercar, > 1 para alejar
     * @param {number} centerX - coordenada matemática X de anclaje
     * @param {number} centerY - coordenada matemática Y de anclaje
     */
    zoom(factor, centerX = null, centerY = null) {
        const currentSpanX = this.view.maxX - this.view.minX;
        const currentSpanY = this.view.maxY - this.view.minY;

        if (centerX === null || centerY === null) {
            centerX = this.view.minX + currentSpanX / 2;
            centerY = this.view.minY + currentSpanY / 2;
        }

        // Proporción relativa de la posición de anclaje
        const rx = (centerX - this.view.minX) / currentSpanX;
        const ry = (centerY - this.view.minY) / currentSpanY;

        let newSpanX = currentSpanX * factor;
        let newSpanY = currentSpanY * factor;

        // Límites de zoom: desde 0.25x (alejado) hasta 60x (ultra-zoom)
        const initSpan = this.problem.domain.maxX - this.problem.domain.minX;
        const minSpan = initSpan / 60.0;
        const maxSpan = initSpan * 3.5;

        if (newSpanX < minSpan) {
            newSpanX = minSpan;
            newSpanY = (minSpan / currentSpanX) * currentSpanY;
        } else if (newSpanX > maxSpan) {
            newSpanX = maxSpan;
            newSpanY = (maxSpan / currentSpanX) * currentSpanY;
        }

        this.view.minX = centerX - rx * newSpanX;
        this.view.maxX = this.view.minX + newSpanX;
        this.view.minY = centerY - ry * newSpanY;
        this.view.maxY = this.view.minY + newSpanY;

        this.groundTruthCanvas = null; // Regenerar buffer en nueva resolución
        this.notifyViewChange();
    }

    resetZoom() {
        const d = this.problem.domain;
        this.view = {
            minX: d.minX,
            maxX: d.maxX,
            minY: d.minY,
            maxY: d.maxY
        };
        this.groundTruthCanvas = null;
        this.notifyViewChange();
    }

    notifyViewChange() {
        if (this.onViewChangeCallback) {
            this.onViewChangeCallback({
                zoomLevel: this.getZoomLevel(),
                view: { ...this.view }
            });
        }
    }

    onViewChange(callback) {
        this.onViewChangeCallback = callback;
    }

    /**
     * Paleta de colores perceptual Turbo / Spectral
     */
    getFitnessColor(ratio) {
        const clamped = Math.max(0, Math.min(1, ratio));
        if (clamped < 0.25) {
            const t = clamped / 0.25;
            const r = Math.round(20 + t * (20 - 20));
            const g = Math.round(40 + t * (190 - 40));
            const b = Math.round(140 + t * (240 - 140));
            return `rgb(${r}, ${g}, ${b})`;
        } else if (clamped < 0.5) {
            const t = (clamped - 0.25) / 0.25;
            const r = Math.round(20 + t * (30 - 20));
            const g = Math.round(190 + t * (220 - 190));
            const b = Math.round(240 - t * (120));
            return `rgb(${r}, ${g}, ${b})`;
        } else if (clamped < 0.75) {
            const t = (clamped - 0.5) / 0.25;
            const r = Math.round(30 + t * (255 - 30));
            const g = Math.round(220 - t * (30));
            const b = Math.round(120 - t * (100));
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const t = (clamped - 0.75) / 0.25;
            const r = 255;
            const g = Math.round(190 - t * (110));
            const b = Math.round(20 + t * (210));
            return `rgb(${r}, ${g}, ${b})`;
        }
    }

    /**
     * Genera un buffer con el mapa de calor del terreno real en la vista actual
     */
    generateGroundTruthBuffer() {
        const res = 120;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = res;
        offCanvas.height = res;
        const offCtx = offCanvas.getContext("2d");
        const imgData = offCtx.createImageData(res, res);
        const data = imgData.data;

        const v = this.view;
        const stepX = (v.maxX - v.minX) / res;
        const stepY = (v.maxY - v.minY) / res;

        for (let j = 0; j < res; j++) {
            const mathY = v.maxY - j * stepY;
            for (let i = 0; i < res; i++) {
                const mathX = v.minX + i * stepX;
                const evalResult = this.problem.evaluate(mathX, mathY);
                const ratio = evalResult.percentOfGlobal / 100;

                const colorStr = this.getFitnessColor(ratio);
                const rgb = colorStr.match(/\d+/g).map(Number);

                const idx = (j * res + i) * 4;
                data[idx] = rgb[0];
                data[idx + 1] = rgb[1];
                data[idx + 2] = rgb[2];
                data[idx + 3] = 230;
            }
        }

        offCtx.putImageData(imgData, 0, 0);
        this.groundTruthCanvas = offCanvas;
    }

    /**
     * Renderizado de la reconstrucción progresiva (IDW) adaptada al zoom
     */
    renderProgressiveReconstruction() {
        if (this.evaluations.length < 2 || !this.showInterpolation) return;

        const res = 60;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = res;
        offCanvas.height = res;
        const offCtx = offCanvas.getContext("2d");
        const imgData = offCtx.createImageData(res, res);
        const data = imgData.data;

        const v = this.view;
        const stepX = (v.maxX - v.minX) / res;
        const stepY = (v.maxY - v.minY) / res;
        
        // Radio de revelado alrededor de muestras adaptado al zoom
        const domainDiagonal = Math.sqrt(Math.pow(v.maxX - v.minX, 2) + Math.pow(v.maxY - v.minY, 2));
        const maxInfluenceDist = domainDiagonal * 0.28;

        const pts = this.evaluations;

        for (let j = 0; j < res; j++) {
            const mathY = v.maxY - j * stepY;
            for (let i = 0; i < res; i++) {
                const mathX = v.minX + i * stepX;

                let sumWeight = 0;
                let sumFitness = 0;
                let minDist = Infinity;

                for (let k = 0; k < pts.length; k++) {
                    const pt = pts[k];
                    const dist = Math.hypot(mathX - pt.x, mathY - pt.y);
                    if (dist < minDist) minDist = dist;

                    if (dist < 0.001) {
                        sumFitness = pt.percentOfGlobal;
                        sumWeight = 1;
                        break;
                    }
                    const w = 1 / (dist * dist + 1);
                    sumWeight += w;
                    sumFitness += w * pt.percentOfGlobal;
                }

                const idx = (j * res + i) * 4;
                if (minDist <= maxInfluenceDist && sumWeight > 0) {
                    const estRatio = (sumFitness / sumWeight) / 100;
                    const rgb = this.getFitnessColor(estRatio).match(/\d+/g).map(Number);
                    
                    const fade = Math.max(0, 1 - (minDist / maxInfluenceDist));
                    const alpha = Math.floor(fade * 180);

                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = alpha;
                } else {
                    data[idx + 3] = 0;
                }
            }
        }

        offCtx.putImageData(imgData, 0, 0);

        this.ctx.save();
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.globalAlpha = 0.85;
        this.ctx.drawImage(offCanvas, 0, 0, this.width, this.height);
        this.ctx.restore();
    }

    /**
     * Dibuja la cuadrícula adaptativa con graduación dinámica según el nivel de zoom
     */
    drawGrid() {
        const v = this.view;
        const ctx = this.ctx;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;

        // Calcular paso "agradable" (nice step) adaptativo
        const spanX = v.maxX - v.minX;
        const roughStep = spanX / 8;
        const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const frac = roughStep / power;
        let step = power;
        if (frac > 5) step = 5 * power;
        else if (frac > 2) step = 2 * power;

        const startX = Math.ceil(v.minX / step) * step;
        const startY = Math.ceil(v.minY / step) * step;

        const decimals = step < 0.1 ? 3 : (step < 1 ? 2 : (step < 10 ? 1 : 0));

        // Líneas verticales
        for (let x = startX; x <= v.maxX; x += step) {
            const { px } = this.mathToScreen(x, 0);
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, this.height);
            ctx.stroke();

            ctx.fillStyle = "rgba(180, 200, 230, 0.45)";
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillText(x.toFixed(decimals), px + 3, this.height - 6);
        }

        // Líneas horizontales
        for (let y = startY; y <= v.maxY; y += step) {
            const { py } = this.mathToScreen(0, y);
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(this.width, py);
            ctx.stroke();

            ctx.fillStyle = "rgba(180, 200, 230, 0.45)";
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillText(y.toFixed(decimals), 6, py - 4);
        }

        // Ejes centrales (x=0, y=0) si están dentro de la vista
        if (v.minX <= 0 && v.maxX >= 0) {
            const { px } = this.mathToScreen(0, 0);
            ctx.strokeStyle = "rgba(0, 220, 255, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, this.height);
            ctx.stroke();
        }

        if (v.minY <= 0 && v.maxY >= 0) {
            const { py } = this.mathToScreen(0, 0);
            ctx.strokeStyle = "rgba(0, 220, 255, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(this.width, py);
            ctx.stroke();
        }

        // Bordes del dominio original (para que el usuario sepa dónde termina el universo)
        const d = this.problem.domain;
        const p1 = this.mathToScreen(d.minX, d.maxY);
        const p2 = this.mathToScreen(d.maxX, d.minY);
        ctx.strokeStyle = "rgba(255, 170, 0, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(p1.px, p1.py, p2.px - p1.px, p2.py - p1.py);
        ctx.setLineDash([]);

        ctx.restore();
    }

    /**
     * Dibuja los puntos explorados
     */
    drawEvaluations() {
        const ctx = this.ctx;
        const pts = this.evaluations;
        const v = this.view;

        // Escalar tamaño de puntos ligeramente al hacer mucho zoom
        const zoom = this.getZoomLevel();
        const effectivePointSize = Math.max(4, Math.min(12, this.pointSize * Math.pow(zoom, 0.2)));

        for (let i = 0; i < pts.length; i++) {
            const pt = pts[i];
            // Solo dibujar si está en el viewport
            if (pt.x < v.minX || pt.x > v.maxX || pt.y < v.minY || pt.y > v.maxY) continue;

            const { px, py } = this.mathToScreen(pt.x, pt.y);
            const ratio = pt.percentOfGlobal / 100;
            const color = this.getFitnessColor(ratio);

            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, effectivePointSize, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = ratio > 0.8 ? 12 : 5;
            ctx.fill();

            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // Destacar el mejor punto
        if (this.bestEvaluation) {
            const b = this.bestEvaluation;
            if (b.x >= v.minX && b.x <= v.maxX && b.y >= v.minY && b.y <= v.maxY) {
                const { px, py } = this.mathToScreen(b.x, b.y);

                ctx.save();
                const pulse = 10 + Math.sin(Date.now() / 180) * 4;
                ctx.beginPath();
                ctx.arc(px, py, pulse, 0, Math.PI * 2);
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 2.5;
                ctx.shadowColor = "#ffd700";
                ctx.shadowBlur = 18;
                ctx.stroke();

                ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 1;
                const tagText = `★ MEJOR (${b.percentOfGlobal.toFixed(1)}%)`;
                ctx.font = "bold 11px 'JetBrains Mono', monospace";
                const textWidth = ctx.measureText(tagText).width;

                const boxX = Math.min(this.width - textWidth - 14, Math.max(10, px - textWidth / 2));
                const boxY = py - pulse - 18;

                ctx.beginPath();
                ctx.roundRect(boxX - 4, boxY - 12, textWidth + 8, 16, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#ffd700";
                ctx.fillText(tagText, boxX, boxY);
                ctx.restore();
            }
        }
    }

    drawTrueOptimumMarker() {
        if (!this.showGodMode) return;
        const v = this.view;
        const x0 = this.problem.x0;
        const y0 = this.problem.y0;

        if (x0 < v.minX || x0 > v.maxX || y0 < v.minY || y0 > v.maxY) return;

        const ctx = this.ctx;
        const { px, py } = this.mathToScreen(x0, y0);

        ctx.save();
        ctx.strokeStyle = "#ff0077";
        ctx.lineWidth = 2;
        const size = 10;
        ctx.beginPath();
        ctx.moveTo(px - size, py);
        ctx.lineTo(px + size, py);
        ctx.moveTo(px, py - size);
        ctx.lineTo(px, py + size);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ff0077";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText(`Óptimo Global Real (${x0}, ${y0})`, px + 12, py + 4);
        ctx.restore();
    }

    drawRipples() {
        const ctx = this.ctx;
        const v = this.view;

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            if (r.x < v.minX || r.x > v.maxX || r.y < v.minY || r.y > v.maxY) {
                this.ripples.splice(i, 1);
                continue;
            }

            const { px, py } = this.mathToScreen(r.x, r.y);
            const color = this.getFitnessColor(r.fitnessRatio);

            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = r.alpha;
            ctx.stroke();
            ctx.restore();

            r.radius += 1.6;
            r.alpha -= 0.04;
            if (r.alpha <= 0) {
                this.ripples.splice(i, 1);
            }
        }
    }

    drawCrosshair() {
        if (!this.hoverCoords || this.isDragging) return;
        const ctx = this.ctx;
        const { px, py } = this.mathToScreen(this.hoverCoords.x, this.hoverCoords.y);

        ctx.save();
        ctx.strokeStyle = "rgba(0, 220, 255, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, this.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(this.width, py);
        ctx.stroke();

        const coordText = `X: ${this.hoverCoords.x.toFixed(2)}, Y: ${this.hoverCoords.y.toFixed(2)}`;
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(10, 20, 40, 0.85)";
        ctx.strokeStyle = "rgba(0, 220, 255, 0.6)";
        ctx.setLineDash([]);
        
        const w = ctx.measureText(coordText).width;
        const bx = Math.min(this.width - w - 16, px + 10);
        const by = Math.max(20, py - 10);

        ctx.beginPath();
        ctx.roundRect(bx - 4, by - 12, w + 8, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#00dcff";
        ctx.fillText(coordText, bx, by + 1);

        ctx.restore();
    }

    drawColorBar() {
        const ctx = this.ctx;
        const barWidth = 120;
        const barHeight = 8;
        const x = this.width - barWidth - 16;
        const y = 16;

        ctx.save();
        const grad = ctx.createLinearGradient(x, 0, x + barWidth, 0);
        grad.addColorStop(0.0, this.getFitnessColor(0.0));
        grad.addColorStop(0.25, this.getFitnessColor(0.25));
        grad.addColorStop(0.5, this.getFitnessColor(0.5));
        grad.addColorStop(0.75, this.getFitnessColor(0.75));
        grad.addColorStop(1.0, this.getFitnessColor(1.0));

        ctx.fillStyle = "rgba(10, 15, 30, 0.75)";
        ctx.roundRect(x - 6, y - 6, barWidth + 12, barHeight + 24, 6);
        ctx.fill();

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = "rgba(200, 220, 240, 0.8)";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("0% Aptitud", x, y + barHeight + 12);
        ctx.fillText("100% Óptimo", x + barWidth - 62, y + barHeight + 12);
        ctx.restore();
    }

    render() {
        const ctx = this.ctx;

        ctx.fillStyle = "#0b101c";
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. Modo Dios
        if (this.showGodMode) {
            if (!this.groundTruthCanvas) {
                this.generateGroundTruthBuffer();
            }
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.drawImage(this.groundTruthCanvas, 0, 0, this.width, this.height);
            ctx.restore();
        } else if (this.showFogOfWar) {
            // 2. Modo Niebla de Guerra
            this.renderProgressiveReconstruction();
        }

        // 3. Cuadrícula y ejes matemáticos
        this.drawGrid();

        // 4. Marcador de óptimo real si Dios está activo
        this.drawTrueOptimumMarker();

        // 5. Ondas de animación
        this.drawRipples();

        // 6. Puntos de soluciones evaluadas
        this.drawEvaluations();

        // 7. Cursor interactivo
        this.drawCrosshair();

        // 8. Barra de color (leyenda)
        this.drawColorBar();
    }

    animate() {
        if (this.isAnimating) {
            this.render();
            requestAnimationFrame(this.animate);
        }
    }

    bindEvents() {
        window.addEventListener("resize", () => {
            this.setupDPI();
            if (this.showGodMode) this.generateGroundTruthBuffer();
        });

        // ==========================================
        // EVENTOS DE ZOOM (RUEDA DEL RATÓN)
        // ==========================================
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            // Coordenada matemática bajo el cursor
            const math = this.screenToMath(px, py);

            // Factor de zoom
            const factor = e.deltaY < 0 ? 0.82 : 1.22;
            this.zoom(factor, math.x, math.y);
        }, { passive: false });

        // ==========================================
        // EVENTOS DE PANORÁMICA (ARRASTRAR MAPA) Y CLICK
        // ==========================================
        this.canvas.addEventListener("mousedown", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.isMouseDown = true;
            this.isDragging = false;
            this.mouseDownPos = {
                px: e.clientX - rect.left,
                py: e.clientY - rect.top
            };
            this.viewAtMouseDown = { ...this.view };
        });

        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            if (this.isMouseDown) {
                const dxScreen = px - this.mouseDownPos.px;
                const dyScreen = py - this.mouseDownPos.py;

                // Detectar si el usuario está arrastrando (movimiento > 5px)
                if (Math.hypot(dxScreen, dyScreen) > 5 || this.isDragging) {
                    this.isDragging = true;
                    this.canvas.style.cursor = "grabbing";

                    const spanX = this.viewAtMouseDown.maxX - this.viewAtMouseDown.minX;
                    const spanY = this.viewAtMouseDown.maxY - this.viewAtMouseDown.minY;

                    const mathDx = -(dxScreen / this.width) * spanX;
                    const mathDy = (dyScreen / this.height) * spanY;

                    this.view.minX = this.viewAtMouseDown.minX + mathDx;
                    this.view.maxX = this.viewAtMouseDown.maxX + mathDx;
                    this.view.minY = this.viewAtMouseDown.minY + mathDy;
                    this.view.maxY = this.viewAtMouseDown.maxY + mathDy;

                    this.groundTruthCanvas = null;
                    this.notifyViewChange();
                }
            } else {
                this.hoverCoords = this.screenToMath(px, py);
            }
        });

        const finishDrag = (e) => {
            if (this.isMouseDown) {
                const rect = this.canvas.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;

                if (!this.isDragging) {
                    // Click limpio sin arrastre -> Evaluar punto
                    const coords = this.screenToMath(px, py);
                    if (this.onCanvasClickCallback) {
                        this.onCanvasClickCallback(coords.x, coords.y);
                    }
                }

                this.isMouseDown = false;
                this.isDragging = false;
                this.canvas.style.cursor = "crosshair";
            }
        };

        this.canvas.addEventListener("mouseup", finishDrag);
        this.canvas.addEventListener("mouseleave", () => {
            this.isMouseDown = false;
            this.isDragging = false;
            this.hoverCoords = null;
            this.canvas.style.cursor = "crosshair";
        });
    }

    onCanvasClick(callback) {
        this.onCanvasClickCallback = callback;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { LandscapeRenderer };
}
