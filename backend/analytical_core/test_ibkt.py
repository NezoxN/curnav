import pytest
import numpy as np
from ibkt import iBKTModel

@pytest.fixture
def model():
    return iBKTModel(step=0.05)

@pytest.mark.parametrize("scores, weights, expected", [
    ([80, 40], [0.5, 0.5], 0.6),
    ([100, 50], [0.8, 0.2], 0.9),
    ([100, 100, 0, 0], [0.25, 0.25, 0.25, 0.25], 0.5),
    ([90, 85, 70, 95, 100], [0.1, 0.1, 0.4, 0.2, 0.2], 0.845),
])
def test_calculate_L0_precision(model, scores, weights, expected):
    assert pytest.approx(model.calculate_L0(scores, weights)) == expected

def test_parameter_impact_on_update(model):
    p_k = 0.5
    L_high_T = model.update_state(p_k, 1.0, p_T=0.4, p_S=0.1, p_G=0.1)
    L_low_T = model.update_state(p_k, 1.0, p_T=0.1, p_S=0.1, p_G=0.1)
    assert L_high_T > L_low_T
    L_high_G = model.update_state(p_k, 1.0, p_T=0.1, p_S=0.1, p_G=0.4)
    L_low_G = model.update_state(p_k, 1.0, p_T=0.1, p_S=0.1, p_G=0.1)
    assert L_high_G < L_low_G
    L_high_S = model.update_state(p_k, 0.0, p_T=0.1, p_S=0.4, p_G=0.1)
    L_low_S = model.update_state(p_k, 0.0, p_T=0.1, p_S=0.1, p_G=0.1)
    assert L_high_S > L_low_S

@pytest.mark.parametrize("L, p_S, p_G, expected", [
    (0.8, 0.1, 0.2, 0.8*0.9 + 0.2*0.2),
    (0.5, 0.0, 0.0, 0.5),
    (0.0, 0.1, 0.3, 0.3),
    (0.99, 0.05, 0.05, 0.99*0.95 + 0.01*0.05),
    (0.01, 0.2, 0.4, 0.01*0.8 + 0.99*0.4),
])
def test_predict_accuracy(model, L, p_S, p_G, expected):
    assert pytest.approx(model.predict(L, p_S, p_G)) == expected

def test_fit_trend_recognition(model):
    p_T_a, p_S_a, _ = model.fit([0, 0, 0, 10, 0, 5], initial_L0=0.1)
    p_T_b, p_S_b, p_G_b = model.fit([0, 20, 40, 60, 80, 100], initial_L0=0.1)
    p_T_c, p_S_c, p_G_c = model.fit([100, 0, 100, 0, 100, 0], initial_L0=0.1)
    assert p_T_b > p_T_a
    assert p_S_a < p_S_b
    assert p_G_c > p_G_b
    for res in [ (p_T_b, p_S_b, p_G_b), (p_T_c, p_S_c, p_G_c)]:
        assert all(0.0 <= p <= 1.0 for p in res)

def test_full_learning_cycle(model):
    observations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    initial_L0 = 0.1
    p_T, p_S, p_G = model.fit(observations, initial_L0)
    current_L = initial_L0
    for obs in observations:
        current_L = model.update_state(current_L, obs/100.0, p_T, p_S, p_G)
    assert current_L > 0.8
    assert model.predict(current_L, p_S, p_G) > 0.8