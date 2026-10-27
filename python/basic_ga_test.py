import random
from deap import base, creator, tools, algorithms


def run_sum_of_two_numbers_ga(population_size=50, generations=40, cxpb=0.5, mutpb=0.2):
    """Experiment 1: Maximize the sum of 2 numbers (integers between 0 and 100)."""
    print("=" * 60)
    print("EXPERIMENT 1: Maximize sum of 2 numbers (range: 0 to 100)")
    print("=" * 60)

    # 1. Define optimization problem (Maximization)
    if not hasattr(creator, "FitnessMax"):
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    if not hasattr(creator, "IndividualTwo"):
        creator.create("IndividualTwo", list, fitness=creator.FitnessMax)

    # 2. Fitness function: sum of the 2 numbers
    def eval_sum_two(individual):
        return (sum(individual),)

    # 3. Setup toolbox
    toolbox = base.Toolbox()
    toolbox.register("attr_int", random.randint, 0, 100)
    toolbox.register("individual", tools.initRepeat, creator.IndividualTwo, toolbox.attr_int, n=2)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("evaluate", eval_sum_two)
    toolbox.register("mate", tools.cxTwoPoint)
    toolbox.register("mutate", tools.mutUniformInt, low=0, up=100, indpb=0.2)
    toolbox.register("select", tools.selTournament, tournsize=3)

    # 4. Run GA
    population = toolbox.population(n=population_size)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(
        population,
        toolbox,
        cxpb=cxpb,
        mutpb=mutpb,
        ngen=generations,
        halloffame=hof,
        verbose=False,
    )

    best_individual = hof[0]
    print(f"Generations: {generations} | Population size: {population_size}")
    print(f"Best Individual (2 numbers): {best_individual}")
    print(f"Fitness (Sum): {best_individual.fitness.values[0]}")
    print()


def run_min_sum_ten_numbers_ga(population_size=50, generations=40, cxpb=0.5, mutpb=0.2):
    """Experiment 2: Find 10 numbers between 0 and 100 with the minimum sum."""
    print("=" * 60)
    print("EXPERIMENT 2: Minimize sum of 10 numbers (range: 0 to 100)")
    print("=" * 60)

    # 1. Define optimization problem (Minimization)
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "IndividualTen"):
        creator.create("IndividualTen", list, fitness=creator.FitnessMin)

    # 2. Fitness function: sum of 10 numbers
    def eval_min_sum_ten(individual):
        return (sum(individual),)

    # 3. Setup toolbox
    toolbox = base.Toolbox()
    toolbox.register("attr_int", random.randint, 0, 100)
    toolbox.register("individual", tools.initRepeat, creator.IndividualTen, toolbox.attr_int, n=10)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("evaluate", eval_min_sum_ten)
    toolbox.register("mate", tools.cxTwoPoint)
    toolbox.register("mutate", tools.mutUniformInt, low=0, up=100, indpb=0.2)
    toolbox.register("select", tools.selTournament, tournsize=3)

    # 4. Run GA
    population = toolbox.population(n=population_size)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(
        population,
        toolbox,
        cxpb=cxpb,
        mutpb=mutpb,
        ngen=generations,
        halloffame=hof,
        verbose=False,
    )

    best_individual = hof[0]
    print(f"Generations: {generations} | Population size: {population_size}")
    print(f"Best Individual (10 numbers): {best_individual}")
    print(f"Fitness (Sum): {best_individual.fitness.values[0]}")
    print()


if __name__ == "__main__":
    # Basic configuration parameters
    POPULATION_SIZE = 50
    GENERATIONS = 40

    run_sum_of_two_numbers_ga(population_size=POPULATION_SIZE, generations=GENERATIONS)
    run_min_sum_ten_numbers_ga(population_size=POPULATION_SIZE, generations=GENERATIONS)
