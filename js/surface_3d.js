/**
 * surface_3d.js - Visualizador 3D interactivo para paisajes de aptitud
 * Permite rotar en 360 grados, hacer zoom y observar en 3 dimensiones
 * los picos, valles y cómo se distribuyen las soluciones evaluadas.
 */

class Surface3DViewer {
    constructor(containerElement, problem) {
        this.container = containerElement;
        this.problem = problem;
        this.evaluations = [];
        this.isInitialized = false;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.surfaceMesh = null;
        this.pointsGroup = null;

        // Verificar disponibilidad de THREE
        if (typeof THREE !== "undefined") {
            this.initThree();
        } else {
            console.warn("Three.js no detectado, esperando carga de script...");
            window.addEventListener("load", () => {
                if (typeof THREE !== "undefined") this.initThree();
            });
        }
    }

    initThree() {
        if (this.isInitialized) return;

        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 450;

        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1d);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(70, 70, 90);

        // Renderizador
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.container.innerHTML = "";
        this.container.appendChild(this.renderer.domElement);

        // Controles de órbita
        if (typeof THREE.OrbitControls !== "undefined") {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // No bajar demasiado bajo la base
        }

        // Iluminación
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00e5ff, 0.8);
        dirLight.position.set(50, 100, 50);
        this.scene.add(dirLight);

        const dirLight2 = new THREE.DirectionalLight(0xff0077, 0.4);
        dirLight2.position.set(-50, 50, -50);
        this.scene.add(dirLight2);

        // Grupo para soluciones evaluadas
        this.pointsGroup = new THREE.Group();
        this.scene.add(this.pointsGroup);

        // Construir superficie
        this.buildSurface();

        // Grid auxiliar en la base
        const gridHelper = new THREE.GridHelper(100, 20, 0x00d2ff, 0x1f2e4d);
        gridHelper.position.y = -0.5;
        this.scene.add(gridHelper);

        this.isInitialized = true;

        // Resize
        window.addEventListener("resize", () => this.onResize());

        // Bucle de animación
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    onResize() {
        if (!this.renderer || !this.container) return;
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 450;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    setProblem(newProblem) {
        this.problem = newProblem;
        this.evaluations = [];
        if (this.isInitialized) {
            this.buildSurface();
            this.clearPoints();
        }
    }

    /**
     * Construye la malla 3D evaluando z = f(x, y)
     */
    buildSurface() {
        if (!this.scene) return;
        if (this.surfaceMesh) {
            this.scene.remove(this.surfaceMesh);
            this.surfaceMesh.geometry.dispose();
            this.surfaceMesh.material.dispose();
        }

        const segments = 60; // 60x60 vértices
        const geom = new THREE.PlaneGeometry(80, 80, segments, segments);
        geom.rotateX(-Math.PI / 2); // Orientar en plano XZ horizontal

        const pos = geom.attributes.position;
        const count = pos.count;
        const colors = new Float32Array(count * 3);

        const d = this.problem.domain;
        const heightScale = 25.0; // Altura máxima en unidades 3D

        for (let i = 0; i < count; i++) {
            const x3d = pos.getX(i);
            const z3d = pos.getZ(i);

            // Mapear de [-40, 40] a [d.minX, d.maxX]
            const mathX = d.minX + ((x3d + 40) / 80) * (d.maxX - d.minX);
            const mathY = d.minY + ((z3d + 40) / 80) * (d.maxY - d.minY);

            const res = this.problem.evaluate(mathX, mathY);
            const ratio = res.percentOfGlobal / 100;
            const y3d = ratio * heightScale;

            pos.setY(i, y3d);

            // Color del vértice según aptitud
            const rgb = this.getRGBForRatio(ratio);
            colors[i * 3] = rgb.r;
            colors[i * 3 + 1] = rgb.g;
            colors[i * 3 + 2] = rgb.b;
        }

        geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geom.computeVertexNormals();

        const mat = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            wireframe: false,
            shininess: 40,
            flatShading: false,
            transparent: true,
            opacity: 0.92
        });

        this.surfaceMesh = new THREE.Mesh(geom, mat);
        this.scene.add(this.surfaceMesh);
    }

    getRGBForRatio(ratio) {
        const clamped = Math.max(0, Math.min(1, ratio));
        if (clamped < 0.3) {
            return { r: 0.08, g: 0.2 + clamped * 1.5, b: 0.8 };
        } else if (clamped < 0.6) {
            return { r: 0.1, g: 0.85, b: 0.5 - (clamped - 0.3) };
        } else if (clamped < 0.85) {
            return { r: 0.95, g: 0.75, b: 0.1 };
        } else {
            return { r: 1.0, g: 0.15, b: 0.5 + (clamped - 0.85) * 3 };
        }
    }

    mathTo3D(mathX, mathY, fitnessRatio) {
        const d = this.problem.domain;
        const x3d = ((mathX - d.minX) / (d.maxX - d.minX)) * 80 - 40;
        const z3d = ((mathY - d.minY) / (d.maxY - d.minY)) * 80 - 40;
        const y3d = fitnessRatio * 25.0;
        return { x: x3d, y: y3d, z: z3d };
    }

    addEvaluation(point) {
        this.evaluations.push(point);
        if (!this.pointsGroup) return;

        const ratio = point.percentOfGlobal / 100;
        const p3d = this.mathTo3D(point.x, point.y, ratio);

        // Crear esfera para el punto
        const sphereGeom = new THREE.SphereGeometry(1.2, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: ratio > 0.85 ? 0xffd700 : 0x00f0ff,
            emissive: ratio > 0.85 ? 0xffaa00 : 0x005577,
            emissiveIntensity: 0.6,
            roughness: 0.3
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.position.set(p3d.x, p3d.y + 0.6, p3d.z);

        // Vástago vertical desde la base hacia el punto
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(p3d.x, 0, p3d.z),
            new THREE.Vector3(p3d.x, p3d.y, p3d.z)
        ]);
        const stem = new THREE.Line(lineGeom, lineMat);

        const markerGroup = new THREE.Group();
        markerGroup.add(sphere);
        markerGroup.add(stem);

        this.pointsGroup.add(markerGroup);
    }

    addEvaluations(points) {
        for (const pt of points) {
            this.addEvaluation(pt);
        }
    }

    clearPoints() {
        if (!this.pointsGroup) return;
        while (this.pointsGroup.children.length > 0) {
            const obj = this.pointsGroup.children[0];
            this.pointsGroup.remove(obj);
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { Surface3DViewer };
}
