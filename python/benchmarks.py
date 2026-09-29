"""
benchmarks.py - Colección matemática de funciones de prueba para optimización
Compatible con NumPy y diseñado para experimentación pedagógica en Algoritmos Genéticos.
"""

import math
import random
from typing import Dict, Tuple, Optional, Any
import numpy as np


class BenchmarkFunction:
    """Clase base abstracta para funciones de prueba."""
    name: str = "Benchmark"
    category: str = "General"
    default_domain: Tuple[float, float, float, float] = (-100.0, 100.0, -100.0, 100.0)
    recommended_random_range: Tuple[float, float] = (-75.0, 75.0)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0) -> float:
        raise NotImplementedError

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0) -> np.ndarray:
        raise NotImplementedError


class SchafferF6(BenchmarkFunction):
    """
    Función F6 de Schaffer (J. David Schaffer, 1989).
    Maximización con óptimo global en (x0, y0).
    f_raw(x0, y0) = 1.0. Rango de salida: [0.0, 1.0].
    """
    name = "Función F6 de Schaffer"
    category = "Multimodal / Altamente Deceptiva"
    default_domain = (-100.0, 100.0, -100.0, 100.0)
    recommended_random_range = (-75.0, 75.0)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0, frequency: float = 1.0) -> float:
        dx = x - x0
        dy = y - y0
        r2 = dx * dx + dy * dy
        r = math.sqrt(r2)
        sin_r = math.sin(frequency * r)
        num = (sin_r * sin_r) - 0.5
        den = (1.0 + 0.001 * r2) ** 2
        return 0.5 - (num / den)

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0, frequency: float = 1.0) -> np.ndarray:
        dx = X - x0
        dy = Y - y0
        r2 = dx * dx + dy * dy
        r = np.sqrt(r2)
        sin_r = np.sin(frequency * r)
        num = (sin_r * sin_r) - 0.5
        den = (1.0 + 0.001 * r2) ** 2
        return 0.5 - (num / den)


class Rastrigin(BenchmarkFunction):
    """
    Función de Rastrigin adaptada para maximización.
    Óptimo global en (x0, y0) con valor normalizado 1.0.
    """
    name = "Función de Rastrigin"
    category = "Multimodal / Retícula de Trampas"
    default_domain = (-5.12, 5.12, -5.12, 5.12)
    recommended_random_range = (-3.5, 3.5)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0) -> float:
        dx = x - x0
        dy = y - y0
        term_x = dx * dx - 10.0 * math.cos(2.0 * math.pi * dx) + 10.0
        term_y = dy * dy - 10.0 * math.cos(2.0 * math.pi * dy) + 10.0
        cost = term_x + term_y
        max_cost = 80.7
        return max(0.0, 1.0 - (cost / max_cost))

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0) -> np.ndarray:
        dx = X - x0
        dy = Y - y0
        term_x = dx * dx - 10.0 * np.cos(2.0 * np.pi * dx) + 10.0
        term_y = dy * dy - 10.0 * np.cos(2.0 * np.pi * dy) + 10.0
        cost = term_x + term_y
        max_cost = 80.7
        return np.clip(1.0 - (cost / max_cost), 0.0, 1.0)


class Ackley(BenchmarkFunction):
    """
    Función de Ackley invertida para maximización.
    Óptimo global en (x0, y0) con valor normalizado 1.0.
    """
    name = "Función de Ackley"
    category = "Casi Plana con Embudo Profundo"
    default_domain = (-30.0, 30.0, -30.0, 30.0)
    recommended_random_range = (-20.0, 20.0)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0) -> float:
        dx = x - x0
        dy = y - y0
        r = math.sqrt(0.5 * (dx * dx + dy * dy))
        term1 = -20.0 * math.exp(-0.2 * r)
        term2 = -math.exp(0.5 * (math.cos(2.0 * math.pi * dx) + math.cos(2.0 * math.pi * dy)))
        cost = term1 + term2 + 20.0 + math.e
        max_cost = 22.0
        return max(0.0, 1.0 - (cost / max_cost))

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0) -> np.ndarray:
        dx = X - x0
        dy = Y - y0
        r = np.sqrt(0.5 * (dx * dx + dy * dy))
        term1 = -20.0 * np.exp(-0.2 * r)
        term2 = -np.exp(0.5 * (np.cos(2.0 * np.pi * dx) + np.cos(2.0 * np.pi * dy)))
        cost = term1 + term2 + 20.0 + np.e
        max_cost = 22.0
        return np.clip(1.0 - (cost / max_cost), 0.0, 1.0)


class Rosenbrock(BenchmarkFunction):
    """
    Valle de Rosenbrock (Banana) para maximización.
    """
    name = "Valle de Rosenbrock (Banana)"
    category = "Valle Estrecho y Curvado"
    default_domain = (-3.0, 3.0, -2.0, 4.0)
    recommended_random_range = (-1.5, 1.5)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0) -> float:
        u = (x - x0) + 1.0
        v = (y - y0) + 1.0
        cost = (1.0 - u) ** 2 + 100.0 * (v - u * u) ** 2
        return 1.0 / (1.0 + 0.005 * cost)

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0) -> np.ndarray:
        u = (X - x0) + 1.0
        v = (Y - y0) + 1.0
        cost = (1.0 - u) ** 2 + 100.0 * (v - u * u) ** 2
        return 1.0 / (1.0 + 0.005 * cost)


class Himmelblau(BenchmarkFunction):
    """
    Función de Himmelblau con 4 máximos.
    """
    name = "Función de Himmelblau"
    category = "Multimodal (4 Máximos Idénticos)"
    default_domain = (-5.0, 5.0, -5.0, 5.0)
    recommended_random_range = (-1.0, 1.0)

    @staticmethod
    def evaluate_raw(x: float, y: float, x0: float = 0.0, y0: float = 0.0) -> float:
        dx = x - x0
        dy = y - y0
        t1 = dx * dx + dy - 11.0
        t2 = dx + dy * dy - 7.0
        cost = t1 * t1 + t2 * t2
        return 1.0 / (1.0 + 0.008 * cost)

    @staticmethod
    def evaluate_grid(X: np.ndarray, Y: np.ndarray, x0: float = 0.0, y0: float = 0.0) -> np.ndarray:
        dx = X - x0
        dy = Y - y0
        t1 = dx * dx + dy - 11.0
        t2 = dx + dy * dy - 7.0
        cost = t1 * t1 + t2 * t2
        return 1.0 / (1.0 + 0.008 * cost)


BENCHMARK_REGISTRY: Dict[str, Any] = {
    "schaffer_f6": SchafferF6,
    "rastrigin": Rastrigin,
    "ackley": Ackley,
    "rosenbrock": Rosenbrock,
    "himmelblau": Himmelblau
}


class OptimizationProblem:
    """
    Instancia de problema de optimización con parámetros configurados.
    Permite fijar o aleatorizar el centro y el máximo global teórico.
    """
    def __init__(
        self,
        benchmark_name: str = "schaffer_f6",
        center_mode: str = "fixed",       # 'fixed' o 'random'
        max_mode: str = "fixed",          # 'fixed' o 'random'
        fixed_x0: float = 0.0,
        fixed_y0: float = 0.0,
        fixed_max: float = 1.0,
        frequency: float = 1.0,
        random_seed: Optional[int] = None
    ):
        if random_seed is not None:
            random.seed(random_seed)
            np.random.seed(random_seed)

        self.benchmark_cls = BENCHMARK_REGISTRY.get(benchmark_name, SchafferF6)
        self.domain = self.benchmark_cls.default_domain
        self.min_x, self.max_x, self.min_y, self.max_y = self.domain
        self.frequency = frequency

        # Configurar centro
        self.center_mode = center_mode
        if center_mode == "random":
            rmin, rmax = self.benchmark_cls.recommended_random_range
            self.x0 = round(random.uniform(rmin, rmax), 2)
            self.y0 = round(random.uniform(rmin, rmax), 2)
        else:
            self.x0 = fixed_x0
            self.y0 = fixed_y0

        # Configurar máximo global teórico
        self.max_mode = max_mode
        if max_mode == "random":
            self.global_max = round(random.uniform(100.0, 500.0), 1)
        else:
            self.global_max = fixed_max

        self.evaluations_count = 0

    def set_frequency(self, freq: float) -> None:
        """Permite calibrar la frecuencia de oscilación dinámicamente."""
        self.frequency = max(0.1, min(10.0, freq))

    def evaluate(self, x: float, y: float) -> Dict[str, Any]:
        """
        Evalúa un punto individual y cuenta las llamadas a la función de aptitud.
        """
        self.evaluations_count += 1
        clamped_x = max(self.min_x, min(self.max_x, x))
        clamped_y = max(self.min_y, min(self.max_y, y))

        raw_norm = self.benchmark_cls.evaluate_raw(clamped_x, clamped_y, self.x0, self.y0, self.frequency)
        fitness = raw_norm * self.global_max
        percent_of_global = min(100.0, max(0.0, (fitness / self.global_max) * 100.0))

        dx = clamped_x - self.x0
        dy = clamped_y - self.y0
        dist = math.sqrt(dx * dx + dy * dy)

        return {
            "x": clamped_x,
            "y": clamped_y,
            "fitness": fitness,
            "raw_normalized": raw_norm,
            "percent_of_global": percent_of_global,
            "distance_to_optimum": dist
        }

    def generate_random_individual(self) -> Tuple[float, float]:
        """Genera un punto aleatorio uniforme dentro del espacio de búsqueda."""
        rx = random.uniform(self.min_x, self.max_x)
        ry = random.uniform(self.min_y, self.max_y)
        return round(rx, 4), round(ry, 4)

    def evaluate_mesh(self, num_points: int = 150) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Genera una malla 2D para visualización con matplotlib."""
        xs = np.linspace(self.min_x, self.max_x, num_points)
        ys = np.linspace(self.min_y, self.max_y, num_points)
        X, Y = np.meshgrid(xs, ys)
        Z_norm = self.benchmark_cls.evaluate_grid(X, Y, self.x0, self.y0, self.frequency)
        Z = Z_norm * self.global_max
        return X, Y, Z
