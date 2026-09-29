# 🧬 Tutorial de Algoritmos Genéticos (Nivel Doctorado / Posgrado)

Bienvenido a este repositorio de recursos abiertos diseñado para la enseñanza e investigación en **Algoritmos Genéticos (AG)** y **Computación Evolutiva**, orientado a estudiantes de posgrado/doctorado con bases en programación (Python) pero sin formación previa en Inteligencia Artificial o metaheurísticas.

---

## 🎯 Módulo 1: Exploración de Paisajes de Aptitud (*Fitness Landscapes*) y el Fracaso del Muestreo a Ciegas

En la optimización de caja negra (*Black-Box Optimization*), no tenemos acceso analítico a la función ni a sus derivadas. El optimizador solo puede proponer soluciones candidatas $\mathbf{x}$ y observar su aptitud $f(\mathbf{x})$.

Este primer recurso interactivo permite al estudiante experimentar directamente:
1. **La dificultad de la búsqueda en espacios no convexos y altamente multimodales:** ¿Por qué no basta con probar puntos al azar o usar métodos de gradiente?
2. **El espacio de búsqueda a oscuras (*Fog of War*):** El terreno comienza completamente vacío. A medida que el estudiante sugiere soluciones (haciendo click en el mapa o ingresando coordenadas), el mapa de calor se reconstruye progresivamente mediante interpolación espacial (*Inverse Distance Weighting*).
3. **Pico y centro ocultos / aleatorios:** El centro $(x_0, y_0)$ del paisaje y el valor máximo global $f^*$ pueden fijarse o generarse de manera aleatoria oculta. Esto simula problemas de investigación reales donde se desconoce la ubicación y el valor exacto del óptimo global, mientras el sistema mide en tiempo real a qué **porcentaje de aproximación** se encuentra la mejor solución descubierta.
4. **Muestreo aleatorio masivo vs. Inteligencia Evolutiva:** Permite inyectar lotes de soluciones aleatorias (Monte Carlo) y compararlas visual y cuantitativamente contra la convergencia de un Algoritmo Genético real (selección, cruce, mutación y elitismo).

---

## 🚀 Cómo Iniciar la Interfaz Interactiva

### Opción 1: Abrir directamente en el navegador (Sin instalación)
Haz doble click sobre el archivo [`index.html`](file:///c:/Users/ruij3340/Documents/codes/genetic_algorithm_tutorial/index.html) o ábrelo con cualquier navegador web moderno (Chrome, Firefox, Edge, Safari). Funciona de forma autónoma.

### Opción 2: Servidor local en Python
En la terminal, ejecuta:
```bash
python -m http.server 8080
```
Y abre en tu navegador: [http://localhost:8080](http://localhost:8080)

### Opción 3: GitHub Pages
Al estar `index.html` en la raíz del repositorio, puedes activar **GitHub Pages** en la rama `main` en los ajustes del repositorio (`Settings -> Pages -> Deploy from branch -> main / root`). El laboratorio interactivo quedará publicado de inmediato para tus estudiantes en la web.

---

## 📂 Estructura del Repositorio

```text
genetic_algorithm_tutorial/
├── index.html                      # Aplicación web interactiva principal
├── css/
│   └── style.css                   # Diseño dark-mode con estética glassmorphic y tipografía científica
├── js/
│   ├── benchmarks.js               # Definiciones matemáticas (Schaffer F6, Rastrigin, Ackley, etc.)
│   ├── landscape_renderer.js       # Renderizador Canvas 2D: niebla de guerra, IDW y God Mode
│   ├── surface_3d.js               # Visualizador 3D interactivo WebGL (Three.js) con órbita 360°
│   ├── ga_engine.js                # Motor pedagógico de Algoritmo Genético en tiempo real
│   └── app.js                      # Controlador de la aplicación, métricas y exportación CSV
├── python/
│   ├── __init__.py
│   ├── benchmarks.py               # Biblioteca Python espejo de las funciones de prueba
│   └── demo_blind_search_vs_ga.py  # Script de comparación empírica (Monte Carlo vs AG)
├── notebooks/
│   └── 01_exploracion_paisaje_f6.ipynb # Cuaderno Jupyter con teoría doctoral, gráficos y ejercicios
└── README.md                       # Documentación y guía pedagógica
```

---

## 📐 Funciones de Optimización Incluidas

### 1. Función F6 de Schaffer con Frecuencia Calibrable (J. David Schaffer, 1989)
Es el problema estrella de este módulo. Posee infinitos anillos concéntricos ondulados y un pico óptimo muy estrecho:

$$f(x, y) = A \cdot \left[ 0.5 - \frac{\sin^2\left(\omega \cdot \sqrt{(x-x_0)^2 + (y-y_0)^2}\right) - 0.5}{\left[1 + 0.001\cdot\left((x-x_0)^2 + (y-y_0)^2\right)\right]^2} \right]$$

- **Dominio típico:** $[-100, 100] \times [-100, 100]$ (Área = $40,000$).
- **Frecuencia de oscilaciones ($\omega$):** Ajustable desde $0.2\times$ (ondas anchas) hasta $5.0\times$ (altísima densidad de crestas engañosas).
- **Óptimo global:** Ocurre exactamente en $(x_0, y_0)$ con $f(x_0, y_0) = A$, independientemente de $\omega$.
- **Dificultad y Cuenca Central:** El radio del pico central disminuye con $r_{pico} \approx \frac{\pi}{2\omega}$. A $\omega = 1.0$ el radio es $r \approx 1.57$ (área $< 0.019\%$), y a $\omega = 5.0$ el radio se reduce a $r \approx 0.31$ unidades (área $< 0.00075\%$).
- **Navegación con Zoom y Panorámica:** El estudiante puede usar la rueda del ratón o los botones `🔍+`, `🔍−` y `⟲ 1:1` para acercarse a inspeccionar las micro-crestas y arrastrar con el cursor para desplazarse por el universo de búsqueda.

### 2. Otras funciones de prueba disponibles en el selector:
- **Función de Rastrigin:** Retícula altamente multimodal con decenas de óptimos locales periódicos generados por componentes cosenoidales.
- **Función de Ackley:** Periferia casi plana con un embudo pronunciado y empinado hacia el centro.
- **Valle de Rosenbrock (Banana):** Valle parabólico curvado y estrecho donde las variables presentan fuerte epistasis (correlación).
- **Función de Himmelblau:** Paisaje con 4 picos óptimos idénticos para estudiar nichos y especiación.

---

## 🧪 Práctica en Python para el Estudiante

Además de la interfaz visual, el estudiante puede reproducir los experimentos en Python:

```bash
# Ejecutar comparativa entre búsqueda aleatoria, búsqueda por malla y AG
python python/demo_blind_search_vs_ga.py
```

Salida típica:
```text
======================================================================
EXPERIMENTO PEDAGÓGICO: MUESTREO A CIEGAS VS. ALGORITMO GENÉTICO
Problema: Función F6 de Schaffer (Centro aleatorio oculto, Máx = 100)
======================================================================
Método                 | Mejor Aptitud   | % del Óptimo   | Distancia al Óptimo
----------------------------------------------------------------------
Búsqueda Aleatoria     | 77.6948         | 77.69%         | 12.92
Búsqueda por Malla     | 88.5644         | 88.56%         | 9.21
Algoritmo Genético     | 99.0269         | 99.03%         | 3.13
----------------------------------------------------------------------
```

El script genera automáticamente el gráfico `comparativa_convergencia.png` que demuestra cómo la curva del AG despega hacia el 99% mientras el muestreo aleatorio se estanca en una meseta.

Para trabajar con Jupyter Notebook:
```bash
jupyter notebook notebooks/01_exploracion_paisaje_f6.ipynb
```

---

## 🗺️ Hoja de Ruta de los Siguientes Módulos

Este repositorio continuará expandiéndose con los siguientes módulos de aprendizaje:
- **Módulo 2:** Representación de Individuos (Cromosomas Binarios vs. Valores Reales).
- **Módulo 3:** Mecanismos de Selección (Ruleta, Torneo, Rango) y Presión Selectiva.
- **Módulo 4:** Operadores de Cruzamiento (*Crossover*) y el Principio de Bloques Constructivos (*Building Block Hypothesis*).
- **Módulo 5:** Operadores de Mutación, Control Adaptativo y Prevención de Convergencia Prematura.
- **Módulo 6:** Optimización Multiobjetivo (Frente de Pareto y Algoritmo NSGA-II).

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT. Libre para uso educativo, académico y de investigación.