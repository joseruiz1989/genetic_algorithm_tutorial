"""
demo_blind_search_vs_ga.py - Comparación empírica: Búsqueda Aleatoria vs Algoritmo Genético
Demuestra por qué el muestreo a ciegas fracasa en la función F6 de Schaffer.
"""

import random
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from benchmarks import OptimizationProblem


def run_random_search(problem: OptimizationProblem, budget: int = 300):
    """Búsqueda Aleatoria Uniforme (Monte Carlo puro)."""
    best_fitness = -float("inf")
    best_individual = None
    convergence = []

    for i in range(budget):
        rx, ry = problem.generate_random_individual()
        eval_res = problem.evaluate(rx, ry)

        if eval_res["fitness"] > best_fitness:
            best_fitness = eval_res["fitness"]
            best_individual = eval_res

        convergence.append(best_fitness)

    return best_individual, convergence


def run_grid_search(problem: OptimizationProblem, budget: int = 300):
    """Búsqueda Sistemática por Malla (Grid Search)."""
    side = int(np.sqrt(budget))
    xs = np.linspace(problem.min_x, problem.max_x, side)
    ys = np.linspace(problem.min_y, problem.max_y, side)

    best_fitness = -float("inf")
    best_individual = None
    convergence = []

    count = 0
    for x in xs:
        for y in ys:
            if count >= budget:
                break
            eval_res = problem.evaluate(x, y)
            count += 1

            if eval_res["fitness"] > best_fitness:
                best_fitness = eval_res["fitness"]
                best_individual = eval_res

            convergence.append(best_fitness)

    while len(convergence) < budget:
        convergence.append(best_fitness)

    return best_individual, convergence


def run_genetic_algorithm(
    problem: OptimizationProblem,
    pop_size: int = 25,
    generations: int = 12,
    crossover_rate: float = 0.85,
    mutation_rate: float = 0.25
):
    """
    Algoritmo Genético Real:
    - Selección por Torneo (k=3)
    - Cruzamiento Aritmético
    - Mutación Gaussiana
    - Elitismo (top 2)
    """
    population = []
    convergence = []
    best_overall = None

    # Inicialización
    for _ in range(pop_size):
        rx, ry = problem.generate_random_individual()
        res = problem.evaluate(rx, ry)
        population.append(res)
        if not best_overall or res["fitness"] > best_overall["fitness"]:
            best_overall = res
        convergence.append(best_overall["fitness"])

    # Ciclo Evolutivo
    for _ in range(1, generations):
        population.sort(key=lambda ind: ind["fitness"], reverse=True)
        new_pop = []

        # 1. Elitismo
        new_pop.append(population[0])
        new_pop.append(population[1])

        # 2. Torneo
        def tournament():
            k = 3
            candidates = random.sample(population, k)
            return max(candidates, key=lambda c: c["fitness"])

        # 3. Reproducción
        while len(new_pop) < pop_size:
            p1 = tournament()
            p2 = tournament()

            # Cruce
            if random.random() < crossover_rate:
                alpha = 0.5
                c1x = alpha * p1["x"] + (1 - alpha) * p2["x"]
                c1y = alpha * p1["y"] + (1 - alpha) * p2["y"]
                c2x = (1 - alpha) * p1["x"] + alpha * p2["x"]
                c2y = (1 - alpha) * p1["y"] + alpha * p2["y"]
            else:
                c1x, c1y = p1["x"], p1["y"]
                c2x, c2y = p2["x"], p2["y"]

            # Mutación
            span_x = problem.max_x - problem.min_x
            span_y = problem.max_y - problem.min_y
            sigma_x = span_x * 0.05
            sigma_y = span_y * 0.05

            def mutate(x, y):
                mx, my = x, y
                if random.random() < mutation_rate:
                    mx += random.gauss(0, sigma_x)
                if random.random() < mutation_rate:
                    my += random.gauss(0, sigma_y)
                return mx, my

            m1x, m1y = mutate(c1x, c1y)
            e1 = problem.evaluate(m1x, m1y)
            new_pop.append(e1)
            if e1["fitness"] > best_overall["fitness"]:
                best_overall = e1
            convergence.append(best_overall["fitness"])

            if len(new_pop) < pop_size:
                m2x, m2y = mutate(c2x, c2y)
                e2 = problem.evaluate(m2x, m2y)
                new_pop.append(e2)
                if e2["fitness"] > best_overall["fitness"]:
                    best_overall = e2
                convergence.append(best_overall["fitness"])

        population = new_pop

    return best_overall, convergence[:pop_size * generations]


def main():
    print("=" * 70)
    print("EXPERIMENTO PEDAGÓGICO: MUESTREO A CIEGAS VS. ALGORITMO GENÉTICO")
    print("Problema: Función F6 de Schaffer (Centro aleatorio oculto, Máx = 100)")
    print("=" * 70)

    budget = 300
    seed = 42

    # Instanciar problema con centro aleatorio y máximo = 100.0
    problem = OptimizationProblem(
        benchmark_name="schaffer_f6",
        center_mode="random",
        max_mode="fixed",
        fixed_max=100.0,
        random_seed=seed
    )

    print(f"\n[CONFIGURACIÓN OCULTA DEL PROFESOR]")
    print(f"- Centro real (x0, y0): ({problem.x0:.2f}, {problem.y0:.2f})")
    print(f"- Máximo teórico global: {problem.global_max:.2f}")
    print(f"- Dominio de búsqueda: [{problem.min_x}, {problem.max_x}] x [{problem.min_y}, {problem.max_y}]")
    print(f"- Presupuesto computacional: {budget} evaluaciones de función\n")

    # 1. Búsqueda Aleatoria
    random.seed(seed)
    best_rnd, conv_rnd = run_random_search(problem, budget=budget)

    # 2. Grid Search
    best_grid, conv_grid = run_grid_search(problem, budget=budget)

    # 3. Algoritmo Genético
    random.seed(seed)
    best_ga, conv_ga = run_genetic_algorithm(problem, pop_size=25, generations=12)

    # Mostrar tabla de resultados
    print("-" * 70)
    print(f"{'Método':<22} | {'Mejor Aptitud':<15} | {'% del Óptimo':<14} | {'Distancia al Óptimo':<15}")
    print("-" * 70)
    print(f"{'Búsqueda Aleatoria':<22} | {best_rnd['fitness']:<15.4f} | {best_rnd['percent_of_global']:<14.2f}% | {best_rnd['distance_to_optimum']:<15.2f}")
    print(f"{'Búsqueda por Malla':<22} | {best_grid['fitness']:<15.4f} | {best_grid['percent_of_global']:<14.2f}% | {best_grid['distance_to_optimum']:<15.2f}")
    print(f"{'Algoritmo Genético':<22} | {best_ga['fitness']:<15.4f} | {best_ga['percent_of_global']:<14.2f}% | {best_ga['distance_to_optimum']:<15.2f}")
    print("-" * 70)

    # Generar gráfico de convergencia
    plt.figure(figsize=(10, 5), dpi=150)
    plt.plot(conv_rnd, label="Búsqueda Aleatoria (Monte Carlo)", color="#3498db", linestyle="--", linewidth=1.8)
    plt.plot(conv_grid, label="Búsqueda por Malla (Grid Search)", color="#95a5a6", linestyle=":", linewidth=1.8)
    plt.plot(conv_ga, label="Algoritmo Genético (AG)", color="#e74c3c", linewidth=2.4)
    plt.axhline(problem.global_max, color="#2ecc71", linestyle="-.", label="Óptimo Teórico Global (100%)", linewidth=1.5)

    plt.title("Comparativa de Convergencia: F6 de Schaffer (300 Evaluaciones)", fontsize=13, fontweight="bold")
    plt.xlabel("Evaluación de la Función de Aptitud (# llamadas)", fontsize=11)
    plt.ylabel("Mejor Aptitud Acumulada", fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.legend(loc="lower right", fontsize=10)
    plt.tight_layout()

    out_plot = "comparativa_convergencia.png"
    plt.savefig(out_plot)
    print(f"\n[OK] Gráfico de convergencia guardado exitosamente en: {out_plot}")


if __name__ == "__main__":
    main()
