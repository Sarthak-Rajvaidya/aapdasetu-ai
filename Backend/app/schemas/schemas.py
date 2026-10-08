from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================
# Auth
# ============================================================

class UserCreate(BaseModel):
    user_id: str = Field(..., min_length=3, max_length=40)
    name: str = Field(..., min_length=1, max_length=80)
    email: Optional[EmailStr] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    role: Literal["student", "elderly"] = "student"
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("user_id")
    @classmethod
    def user_id_no_spaces(cls, v: str) -> str:
        if " " in v:
            raise ValueError("user_id cannot contain spaces")
        return v.lower()


class UserLogin(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    role: str
    created_at: datetime
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    profile_image: Optional[str] = None


# ============================================================
# Courses
# ============================================================

class CourseProgressUpdate(BaseModel):
    progress: int = Field(..., ge=0, le=100)
    viewed_sections: List[str] = []


class CourseProgressOut(BaseModel):
    course_slug: str
    progress: int
    completed: bool
    viewed_sections: List[str]


# ============================================================
# Quiz
# ============================================================

class QuizAnswer(BaseModel):
    question_index: int
    selected_option: int


class QuizSubmission(BaseModel):
    answers: List[QuizAnswer]
    time_taken_seconds: int = 0


class QuizResultOut(BaseModel):
    score: int
    correct_count: int
    total_questions: int
    weak_topics: List[str]
    recommended_course: Optional[str] = None


# ============================================================
# Simulations
# ============================================================

class SimulationDecision(BaseModel):
    step_id: str
    option_id: str
    time_taken_seconds: float = 0


class SimulationSubmission(BaseModel):
    decisions: List[SimulationDecision]
    total_time_seconds: int = 0


class SimulationResultOut(BaseModel):
    score: int
    decision_accuracy: int
    response_time_score: int
    safety_awareness: int
    resource_management: int
    correct_decisions: int
    total_decisions: int
    mistakes: List[str]
    critical_mistake: Optional[str] = None
    recommended_training: Optional[str] = None
    ai_feedback: Optional[str] = None
    new_achievements: List[str] = []


# ============================================================
# Predictor
# ============================================================

class PredictRequest(BaseModel):
    rainfall: float = Field(..., ge=0)
    temperature: float
    humidity: float = Field(..., ge=0, le=100)


class PredictResponse(BaseModel):
    prediction_label: int
    disaster_type: str
    model_confidence: Optional[float] = None
    risk_interpretation: str
    recommended_steps: List[str]
    disclaimer: str = (
        "Educational risk assessment — not an official emergency warning."
    )


# ============================================================
# AI Assistant
# ============================================================

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[int] = None


class ChatSourceOut(BaseModel):
    title: str
    disaster_type: str


class ChatResponse(BaseModel):
    session_id: int
    reply: str
    sources: List[ChatSourceOut]
    provider: str  # "gemini" | "extractive-fallback"


# ============================================================
# Dashboard
# ============================================================

class ReadinessBreakdown(BaseModel):
    overall: int
    knowledge: int
    decision_making: int
    emergency_response: int
    disaster_awareness: int


class PerformanceTrendPoint(BaseModel):
    """
    Single point used by the dashboard performance trend chart.
    """

    date: str
    score: int
    type: Literal["quiz", "simulation"]


class SimulationCapabilities(BaseModel):
    """
    Average simulation capability scores.
    """

    decision_accuracy: int
    response_time_score: int
    safety_awareness: int
    resource_management: int


class CapabilityScores(BaseModel):
    """
    Overall capability scores displayed on the dashboard.
    """

    knowledge: int
    decision_making: int
    emergency_response: int
    disaster_awareness: int


class ActivityHistoryPoint(BaseModel):
    """
    Daily learning activity used by the dashboard activity heatmap.

    dashboard.py currently returns:
        {
            "date": "...",
            "count": 0
        }
    """

    date: str
    count: int


class RecentActivityItem(BaseModel):
    """
    Recent quiz or simulation activity.
    """

    type: Literal["quiz", "simulation"]
    title: str
    score: int
    completed_at: datetime


class DashboardOut(BaseModel):
    # User
    name: str

    # Readiness
    readiness: ReadinessBreakdown

    # Course progress
    course_progress: List[CourseProgressOut]

    # Recent attempts
    recent_simulations: list
    recent_quizzes: list

    # Analytics
    performance_trend: List[PerformanceTrendPoint]
    simulation_capabilities: SimulationCapabilities
    capability_scores: CapabilityScores

    # Learning activity
    activity_history: List[ActivityHistoryPoint]
    recent_activity: List[RecentActivityItem]

    # Achievements
    achievements_unlocked: int
    achievements_total: int

    # Learning streak
    learning_streak_days: int

    # Recommendation
    recommended_training: Optional[str] = None
    recommendation_reason: Optional[str] = None