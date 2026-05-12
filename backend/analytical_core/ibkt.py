import numpy as np
from typing import Tuple, List, Optional

class iBKTModel:
    
    def __init__(self, step: float = 0.05):
        """
        Ініціалізує модель iBKT з заданим кроком сітки.
        
        :param step: Крок для дискретної сітки параметрів p(S) та p(G).
        """
        self.step = step
        self.p_grid = np.arange(step, 0.5, step)

    def calculate_L0(self, previous_scores: List[float], weights: List[float]) -> float:
        """
        Розрахунок початкових знань (L0) на основі попередніх релевантних дисциплін.
        
        :param previous_scores: Список оцінок за 100-бальною шкалою.
        :param weights: Список вагових коефіцієнтів для кожної оцінки.
        :return: Початкова ймовірність знань L0 в діапазоні (0, 1).
        """
        if not previous_scores or not weights:
            return 0.1
        
        if len(previous_scores) != len(weights):
            raise ValueError("Довжина списку оцінок повинна дорівнювати довжині списку ваг.")
        normalized_scores = np.array(previous_scores) / 100.0
        weights_arr = np.array(weights)
        
        sum_weights = np.sum(weights_arr)
        if sum_weights == 0:
            return 0.1
            
        # Формула: $L_0 = sum(L_i * W_i) / sum(W_i)$
        L0 = np.sum(normalized_scores * weights_arr) / sum_weights
        

        return np.clip(L0, 0.01, 0.99)

    def _em_for_pT(self, observations: np.ndarray, L0: float, p_S: float, p_G: float, epsilon: float = 1e-4, max_iter: int = 50) -> float:
        """
        Внутрішній метод. Виконує EM-алгоритм для знаходження оптимального параметра ймовірності навчання p(T)
        при заданих p_S та p_G.
        """
        p_T = 0.1
        J = len(observations)
        
        if J <= 1:
            return p_T
            
        for _ in range(max_iter):
            # p_L зберігатиме ймовірність освоєння на кожному кроці j
            p_L = np.zeros(J)
            p_L[0] = L0
            
            # E-крок: розрахунок ймовірностей освоєння (Forward pass)
            for j in range(1, J):
                y_prev = observations[j-1]
                p_L[j] = self.update_state(p_L[j-1], y_prev, p_T, p_S, p_G)
                
            # M-крок: оновлення p(T)
            # Формула: p(T) = sum((1 - p(L_j)) * p(L_{j+1})) / sum(1 - p(L_j))
            not_known = 1.0 - p_L[:-1]
            sum_den = np.sum(not_known)
            
            if sum_den < 1e-6:
                break
                
            # Векторизоване оновлення p_T
            new_p_T = np.sum(not_known * p_L[1:]) / sum_den
            
            if abs(new_p_T - p_T) < epsilon:
                p_T = new_p_T
                break
                
            p_T = new_p_T
            
        return np.clip(p_T, 0.01, 0.95)

    def _log_likelihood(self, observations: np.ndarray, L0: float, p_T: float, p_S: float, p_G: float) -> float:
        """
        Внутрішній метод. Обчислює лог-правдоподібність для комбінації параметрів (p_T, p_S, p_G).
        Використовує Cross-Entropy апроксимацію для неперервних спостережень.
        """
        log_L = 0.0
        current_L = L0
        
        for y in observations:
            p_success = current_L * (1 - p_S) + (1 - current_L) * p_G
            p_success = np.clip(p_success, 1e-10, 1 - 1e-10)
            
            # log-likelihood за принципом перехресної ентропії
            log_L += y * np.log(p_success) + (1 - y) * np.log(1 - p_success)
            
            # Оновлюємо стан знань для наступного кроку
            current_L = self.update_state(current_L, y, p_T, p_S, p_G)
            
        return log_L

    def fit(self, observations: List[float], initial_L0: float) -> Tuple[float, float, float]:
        """
        Крок 3: Гібридний пошук параметрів моделі (p(T), p(S), p(G)) при зафіксованому L0.
        """
        y_obs = np.array(observations) / 100.0
        if len(y_obs) == 0:
            return 0.1, 0.2, 0.2
        
        best_params = (0.1, 0.2, 0.2)
        max_log_L = -np.inf
        
        # Дискретний Grid Search для p(S) та p(G)
        for p_S in self.p_grid:
            for p_G in self.p_grid:
                # Знаходимо оптимальний p_T для поточної пари (S, G)
                p_T = self._em_for_pT(y_obs, initial_L0, p_S, p_G)
                
                # Обчислюємо правдоподібність моделі
                log_L = self._log_likelihood(y_obs, initial_L0, p_T, p_S, p_G)
                
                if log_L > max_log_L:
                    max_log_L = log_L
                    best_params = (float(p_T), float(p_S), float(p_G))
                    
        return best_params

    def update_state(self, current_L: float, score: float, p_T: float, p_S: float, p_G: float) -> float:
        """
        Оновлення ймовірності (Відстеження знань) за Байєсом.
        Підтримує "м'яке" оновлення для неперервних оцінок (Soft-BKT).
        """
        # 1. Сценарій: Відповідь правильна (c)
        num_c = (1 - p_S) * (current_L + p_T * (1 - current_L))
        den_c = num_c + p_G * (1 - p_T) * (1 - current_L)
        p_L_c = num_c / den_c if den_c > 0 else 0.0
        
        # 2. Сценарій: Відповідь неправильна (w)
        num_w = p_S * (current_L + p_T * (1 - current_L))
        den_w = num_w + (1 - p_G) * (1 - p_T) * (1 - current_L)
        p_L_w = num_w / den_w if den_w > 0 else 0.0
        
        # Інтерполяція стану на основі реального балу студента
        p_L_next = score * p_L_c + (1 - score) * p_L_w
        
        return np.clip(p_L_next, 0.0, 1.0)

    def predict(self, current_L: float, p_S: float, p_G: float) -> float:
        """
        Прогнозування ймовірності успіху P(C).
        """
        p_c = current_L * (1 - p_S) + (1 - current_L) * p_G
        return np.clip(p_c, 0.0, 1.0)
