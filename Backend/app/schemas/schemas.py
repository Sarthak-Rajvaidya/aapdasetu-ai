# ---------------- Dashboard ----------------

class ReadinessBreakdown(BaseModel):
    overall: int
    knowledge: int
    decision_making: int
    emergency_response: int
    disaster_awareness: int


class PerformanceTrendPoint(BaseModel):
    date: str
    score: int
    type: Literal["quiz", "simulation"]


class SimulationCapabilities(BaseModel):
    decision_accuracy: int
    response_time_score: int
    safety_awareness: int
    resource_management: int


class CapabilityScores(BaseModel):
    knowledge: int
    decision_making: int
    emergency_response: int
    disaster_awareness: int


class ActivityHistoryPoint(BaseModel):
    date: str
    quiz_count: int
    simulation_count: int
    total: int


class RecentActivityItem(BaseModel):
    type: Literal["quiz", "simulation"]
    title: str
    score: int
    completed_at: datetime


class DashboardOut(BaseModel):
    name: str
    readiness: ReadinessBreakdown

    course_progress: List[CourseProgressOut]

    recent_simulations: list
    recent_quizzes: list

    performance_trend: List[PerformanceTrendPoint]
    simulation_capabilities: SimulationCapabilities
    capability_scores: CapabilityScores
    activity_history: List[ActivityHistoryPoint]
    recent_activity: List[RecentActivityItem]

    achievements_unlocked: int
    achievements_total: int
    learning_streak_days: int

    recommended_training: Optional[str] = None
    recommendation_reason: Optional[str] = None