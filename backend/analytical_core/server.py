from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from functools import lru_cache
from ibkt import iBKTModel

app = FastAPI(
    title="iBKT Analytical Core API",
    description="Математична модель Індивідуалізованого байєсівського відстеження знань (iBKT)"
)
model = iBKTModel(step=0.05)

# --- 1. Базові структури даних ---

class PreviousRecord(BaseModel):
    course_id: str
    grade: float
    date_recorded: str

class CourseDependency(BaseModel):
    parent_course_id: str
    child_course_id: str
    weight: float

class ModelParams(BaseModel):
    pLearn: float
    pSlip: float
    pGuess: float
    currentPKnown: float

class iBKTRequest(BaseModel):
    student_id: str
    target_courses: List[str]
    previous_records: List[PreviousRecord]
    course_dependencies: List[CourseDependency]
    existing_params: Optional[Dict[str, ModelParams]] = Field(default=None, description="Вже існуючі параметри для студента")

# --- 2. Ендпоінти перерахунку (Recalculate) ---

class RecalculateRequest(iBKTRequest):
    pass

class RecalculateResponse(BaseModel):
    results: Dict[str, ModelParams]

# --- 3. Ендпоінти рекомендацій (Recommend) ---

class RecommendRequest(iBKTRequest):
    pass

class RecommendResult(BaseModel):
    course_id: str
    probability: float

class RecommendResponse(BaseModel):
    recommendations: List[RecommendResult]

# --- 4. Примітивні операції iBKT (атомарні запити) ---

class CalculateL0Request(BaseModel):
    previous_scores: List[float] = Field(..., description="Список оцінок за 100-бальною шкалою")
    weights: List[float] = Field(..., description="Список вагових коефіцієнтів")

class CalculateL0Response(BaseModel):
    L0: float

class FitRequest(BaseModel):
    observations: List[float] = Field(..., description="Оцінки")
    initial_L0: float = Field(..., ge=0.0, le=1.0)

class FitResponse(BaseModel):
    p_T: float
    p_S: float
    p_G: float

class UpdateStateRequest(BaseModel):
    current_L: float = Field(..., ge=0.0, le=1.0)
    score: float = Field(..., ge=0.0, le=1.0)
    p_T: float
    p_S: float
    p_G: float

class UpdateStateResponse(BaseModel):
    next_L: float

class PredictRequest(BaseModel):
    current_L: float = Field(..., ge=0.0, le=1.0)
    p_S: float
    p_G: float

class PredictResponse(BaseModel):
    probability: float


@app.post("/api/ibkt/calculate_l0", response_model=CalculateL0Response, summary="Розрахунок початкових знань (L0)")
def calculate_l0(req: CalculateL0Request):
    try:
        L0 = model.calculate_L0(req.previous_scores, req.weights)
        return CalculateL0Response(L0=L0)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ibkt/fit", response_model=FitResponse, summary="Гібридний пошук параметрів (Навчання моделі)")
def fit(req: FitRequest):
    try:
        p_T, p_S, p_G = model.fit(req.observations, req.initial_L0)
        return FitResponse(p_T=p_T, p_S=p_S, p_G=p_G)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ibkt/update_state", response_model=UpdateStateResponse, summary="Оновлення ймовірності (Відстеження знань)")
def update_state(req: UpdateStateRequest):
    try:
        next_L = model.update_state(req.current_L, req.score, req.p_T, req.p_S, req.p_G)
        return UpdateStateResponse(next_L=next_L)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ibkt/predict", response_model=PredictResponse, summary="Прогнозування (Prediction)")
def predict(req: PredictRequest):
    try:
        prob = model.predict(req.current_L, req.p_S, req.p_G)
        return PredictResponse(probability=prob)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health", summary="Перевірка статусу сервера")
def health_check():
    return {"status": "ok"}

@app.post("/recalculate", response_model=RecalculateResponse, summary="Перерахунок параметрів моделі")
def recalculate(req: RecalculateRequest):
    try:
        records_by_course = {}
        for r in req.previous_records:
            if r.course_id not in records_by_course: records_by_course[r.course_id] = []
            records_by_course[r.course_id].append(r)
            
        deps_by_child = {}
        for d in req.course_dependencies:
            if d.child_course_id not in deps_by_child: deps_by_child[d.child_course_id] = []
            deps_by_child[d.child_course_id].append(d)

        results = {}
        for t_course in req.target_courses:
            deps = deps_by_child.get(t_course, [])
            pk_vals = []
            w_vals = []
            
            if deps:
                for d in deps:
                    if req.existing_params and d.parent_course_id in req.existing_params:
                        pk_vals.append(req.existing_params[d.parent_course_id].currentPKnown)
                    else:
                        pk_vals.append(0.0)
                    w_vals.append(d.weight)
                
                fixed_L0 = sum(p * w for p, w in zip(pk_vals, w_vals)) / sum(w_vals) if w_vals else 0.1
            else:
                fixed_L0 = 0.1
            
            fixed_L0 = max(0.01, min(0.99, fixed_L0))

            target_scores_objs = records_by_course.get(t_course, [])
            target_scores_objs.sort(key=lambda x: x.date_recorded)
            target_scores = [r.grade for r in target_scores_objs]

            saved = req.existing_params.get(t_course) if req.existing_params else None

            if saved:
                p_T, p_S, p_G = saved.pLearn, saved.pSlip, saved.pGuess
                current_L = fixed_L0
                for y in target_scores:
                    current_L = model.update_state(current_L, y/100.0, p_T, p_S, p_G)
            else:
                if target_scores:
                    parent_ids = {d.parent_course_id for d in deps}
                    obs_for_fit = [r.grade for r in req.previous_records if r.course_id in parent_ids]
                    if not obs_for_fit:
                        obs_for_fit = [r.grade for r in req.previous_records]
                    
                    p_T, p_S, p_G = model.fit(obs_for_fit, fixed_L0)
                    
                    current_L = fixed_L0
                    for y in target_scores:
                        current_L = model.update_state(current_L, y/100.0, p_T, p_S, p_G)
                else:
                    p_T, p_S, p_G = 0.1, 0.2, 0.2
                    current_L = fixed_L0

            results[t_course] = ModelParams(pLearn=p_T, pSlip=p_S, pGuess=p_G, currentPKnown=current_L)
            
        return RecalculateResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/recommend", response_model=RecommendResponse, summary="Формування рекомендацій")
def recommend(req: RecommendRequest):
    try:
        deps_by_child = {}
        for d in req.course_dependencies:
            if d.child_course_id not in deps_by_child: deps_by_child[d.child_course_id] = []
            deps_by_child[d.child_course_id].append(d)

        recommendations = []
        for t_course in req.target_courses:
            deps = deps_by_child.get(t_course, [])
            pk_vals = []
            w_vals = []
            
            if deps:
                for d in deps:
                    if req.existing_params and d.parent_course_id in req.existing_params:
                        pk_vals.append(req.existing_params[d.parent_course_id].currentPKnown)
                    else:
                        pk_vals.append(0.0)
                    w_vals.append(d.weight)
                
                current_L = sum(p * w for p, w in zip(pk_vals, w_vals)) / sum(w_vals) if w_vals else 0.1
                
                parent_ids = {d.parent_course_id for d in deps}
                obs_for_fit = [r.grade for r in req.previous_records if r.course_id in parent_ids]
                
                if obs_for_fit:
                    _, p_S, p_G = model.fit(obs_for_fit, current_L)
                else:
                    p_S, p_G = 0.2, 0.2
            else:
                all_obs = [r.grade for r in req.previous_records]
                if all_obs:
                    current_L = 0.1
                    _, p_S, p_G = model.fit(all_obs, current_L)
                else:
                    current_L = 0.1
                    p_S, p_G = 0.2, 0.2
            
            current_L = max(0.01, min(0.99, current_L))
            prob = model.predict(current_L, p_S, p_G)
            recommendations.append(RecommendResult(course_id=t_course, probability=prob))
            
        recommendations.sort(key=lambda x: x.probability, reverse=True)
        return RecommendResponse(recommendations=recommendations)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
