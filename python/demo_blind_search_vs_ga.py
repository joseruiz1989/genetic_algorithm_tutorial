"""
demo_blind_search_vs_ga.py - Empirical Comparison: Blind Search vs. Genetic Algorithm
Demonstrates why blind sampling fails on Schaffer's F6 function,
and how expanding the search domain renders blind search completely ineffective.
"""

import argparse
import random
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from benchmarks import OptimizationProblem


def run_random_search(problem: OptimizationProblem, budget: int = 300):
    """Uniform Random Search (Pure Monte Carlo)."""
    best_fitness = -float("inf")
    best_individual = None
    convergence = []

    for _ in range(budget):
        rx, ry = problem.generate_random_individual()
        eval_res = problem.evaluate(rx, ry)

        if eval_res["fitness"] > best_fitness:
            best_fitness = eval_res["fitness"]
            best_individual = eval_res

        convergence.append(best_fitness)

    return best_individual, convergence


def run_grid_search(problem: OptimizationProblem, budget: int = 300):
    """Systematic Grid Search."""
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
    elitism: int = 2,
    crossover_rate: float = 0.85,
    mutation_rate: float = 0.25
):
    """
    Real-Coded Genetic Algorithm:
    - Tournament Selection (k=3)
    - Arithmetic Crossover
    - Gaussian Mutation (scaled to search domain span)
    - Elitism (preserves top E individuals)
    """
    population = []
    convergence = []
    best_overall = None

    # Population Initialization
    for _ in range(pop_size):
        rx, ry = problem.generate_random_individual()
        res = problem.evaluate(rx, ry)
        population.append(res)
        if not best_overall or res["fitness"] > best_overall["fitness"]:
            best_overall = res
        convergence.append(best_overall["fitness"])

    # Evolutionary Cycle
    for _ in range(1, generations):
        population.sort(key=lambda ind: ind["fitness"], reverse=True)
        new_pop = []

        # 1. Elitism: preserve top E solutions without modification
        elite_count = min(elitism, len(population))
        for e_idx in range(elite_count):
            new_pop.append(population[e_idx])

        # 2. Tournament Selection
        def tournament():
            k = 3
            candidates = random.sample(population, k)
            return max(candidates, key=lambda c: c["fitness"])

        # 3. Reproduction Loop
        while len(new_pop) < pop_size:
            p1 = tournament()
            p2 = tournament()

            # Arithmetic Crossover
            if random.random() < crossover_rate:
                alpha = 0.5
                c1x = alpha * p1["x"] + (1 - alpha) * p2["x"]
                c1y = alpha * p1["y"] + (1 - alpha) * p2["y"]
                c2x = (1 - alpha) * p1["x"] + alpha * p2["x"]
                c2y = (1 - alpha) * p1["y"] + alpha * p2["y"]
            else:
                c1x, c1y = p1["x"], p1["y"]
                c2x, c2y = p2["x"], p2["y"]

            # Adaptive Gaussian Mutation
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
    parser = argparse.ArgumentParser(description="Empirical comparison between blind search and Genetic Algorithm.")
    parser.add_argument("--domain-scale", type=float, default=1.0, help="Search domain scale factor (e.g., 1.0, 2.0, 5.0, 10.0)")
    parser.add_argument("--budget", type=int, default=300, help="Total function evaluation budget")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--benchmark", type=str, default="schaffer_f6", help="Benchmark identifier")
    parser.add_argument("--freq", type=float, default=1.0, help="Wave frequency (F6)")
    parser.add_argument("--pop-size", type=int, default=25, help="Population size for GA")
    parser.add_argument("--generations", type=int, default=12, help="Number of generations for GA")
    parser.add_argument("--elitism", type=int, default=2, help="Number of elite solutions preserved unmodified (0 to disable)")
    args = parser.parse_args()

    budget = args.budget
    seed = args.seed
    domain_scale = args.domain_scale
    pop_size = args.pop_size
    generations = args.generations
    elitism = args.elitism

    # Instantiate problem with scaled domain and hidden center
    problem = OptimizationProblem(
        benchmark_name=args.benchmark,
        center_mode="random",
        max_mode="fixed",
        fixed_max=100.0,
        frequency=args.freq,
        domain_scale=domain_scale,
        random_seed=seed
    )

    area = (problem.max_x - problem.min_x) * (problem.max_y - problem.min_y)

    print("=" * 72)
    print("PEDAGOGICAL EXPERIMENT: BLIND SEARCH VS. GENETIC ALGORITHM")
    print(f"Problem: {problem.benchmark_cls.name} (Hidden Random Center, Max = 100.0)")
    print("=" * 72)

    print(f"\n[TEACHER'S HIDDEN CONFIGURATION]")
    print(f"- Ground truth center (x0, y0): ({problem.x0:.2f}, {problem.y0:.2f})")
    print(f"- Theoretical global maximum: {problem.global_max:.2f}")
    print(f"- Search domain bounds: [{problem.min_x:.1f}, {problem.max_x:.1f}] x [{problem.min_y:.1f}, {problem.max_y:.1f}]")
    print(f"- Domain scale: {domain_scale:.1f}x (Total search area: {area:,.0f} sq units)")
    print(f"- Computational budget: {budget} function evaluations")
    print(f"- GA parameters: Population = {pop_size}, Generations = {generations}, Elitism = {elitism}\n")

    # 1. Random Search (Monte Carlo)
    random.seed(seed)
    best_rnd, conv_rnd = run_random_search(problem, budget=budget)

    # 2. Grid Search
    best_grid, conv_grid = run_grid_search(problem, budget=budget)

    # 3. Genetic Algorithm
    random.seed(seed)
    best_ga, conv_ga = run_genetic_algorithm(
        problem,
        pop_size=pop_size,
        generations=generations,
        elitism=elitism
    )

    # Display results table
    print("-" * 72)
    print(f"{'Method':<24} | {'Best Fitness':<14} | {'% of Optimum':<13} | {'Distance to Opt':<15}")
    print("-" * 72)
    print(f"{'Random Search (Monte Carlo)':<24} | {best_rnd['fitness']:<14.4f} | {best_rnd['percent_of_global']:<13.2f}% | {best_rnd['distance_to_optimum']:<15.2f}")
    print(f"{'Grid Search':<24} | {best_grid['fitness']:<14.4f} | {best_grid['percent_of_global']:<13.2f}% | {best_grid['distance_to_optimum']:<15.2f}")
    print(f"{'Genetic Algorithm (GA)':<24} | {best_ga['fitness']:<14.4f} | {best_ga['percent_of_global']:<13.2f}% | {best_ga['distance_to_optimum']:<15.2f}")
    print("-" * 72)

    # Generate convergence plot
    plt.figure(figsize=(10, 5), dpi=150)
    plt.plot(conv_rnd, label="Random Search (Monte Carlo)", color="#3498db", linestyle="--", linewidth=1.8)
    plt.plot(conv_grid, label="Grid Search", color="#95a5a6", linestyle=":", linewidth=1.8)
    plt.plot(conv_ga, label="Genetic Algorithm (GA)", color="#e74c3c", linewidth=2.4)
    plt.axhline(problem.global_max, color="#2ecc71", linestyle="-.", label="Theoretical Global Optimum (100%)", linewidth=1.5)

    title_suffix = f" (Scale: {domain_scale:.1f}x, Budget: {budget} Evals)"
    plt.title(f"Convergence Comparison: {problem.benchmark_cls.name}{title_suffix}", fontsize=13, fontweight="bold")
    plt.xlabel("Function Evaluations (# calls)", fontsize=11)
    plt.ylabel("Accumulated Best Fitness", fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.legend(loc="lower right", fontsize=10)
    plt.tight_layout()

    out_plot = "comparativa_convergencia.png"
    plt.savefig(out_plot)
    print(f"\n[OK] Convergence graph successfully saved to: {out_plot}")


if __name__ == "__main__":
    main()
