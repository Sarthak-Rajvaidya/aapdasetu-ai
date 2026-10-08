"""
Database schema for AapdaSetu AI.

Entities: User, Course, CourseProgress, Quiz, QuizAttempt, Simulation,
SimulationAttempt, Achievement, UserAchievement, ChatSession, ChatMessage,
PredictionHistory.

Design notes:
- Passwords are stored ONLY as bcrypt hashes (`password_hash`).
- Every attempt/progress table stores a foreign key to `users.id`
  (the surrogate primary key) rather than trusting a client-supplied
  user_id string, so ownership is unambiguous.
- Timestamps use server-side defaults so records are auditable.
"""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)  # login handle
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    role = Column(String, default="student")  # student | elderly | admin
    profile_image = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course_progress = relationship("CourseProgress", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    simulation_attempts = relationship("SimulationAttempt", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("PredictionHistory", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    """Static-ish catalog of learning modules (seeded once)."""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)  # e.g. "earthquake"
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    disaster_type = Column(String, nullable=False)
    total_sections = Column(Integer, default=4)
    created_at = Column(DateTime, default=datetime.utcnow)

    progress_entries = relationship("CourseProgress", back_populates="course")


class CourseProgress(Base):
    __tablename__ = "course_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    progress = Column(Integer, default=0)  # 0-100
    viewed_sections = Column(JSON, default=list)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="course_progress")
    course = relationship("Course", back_populates="progress_entries")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    disaster_type = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)  # list of {question, options, correct_index, topic}

    attempts = relationship("QuizAttempt", back_populates="quiz")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Integer, default=0)  # percentage
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    weak_topics = Column(JSON, default=list)
    time_taken_seconds = Column(Integer, default=0)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")


class Simulation(Base):
    """Catalog entry describing a scenario (data lives in JSON scenario files)."""
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)  # e.g. "earthquake"
    codename = Column(String, nullable=False)  # e.g. "OPERATION: SEISMIC SHIELD"
    disaster_type = Column(String, nullable=False)
    difficulty = Column(String, default="Standard")
    estimated_duration_minutes = Column(Integer, default=10)
    description = Column(Text, default="")

    attempts = relationship("SimulationAttempt", back_populates="simulation")


class SimulationAttempt(Base):
    __tablename__ = "simulation_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), nullable=False)

    score = Column(Integer, default=0)  # final % score, 0-100
    decision_accuracy = Column(Integer, default=0)
    response_time_score = Column(Integer, default=0)
    safety_awareness = Column(Integer, default=0)
    resource_management = Column(Integer, default=0)

    correct_decisions = Column(Integer, default=0)
    total_decisions = Column(Integer, default=0)
    mistakes = Column(JSON, default=list)  # list of human-readable mistake strings
    decisions_log = Column(JSON, default=list)  # raw decision ids chosen, for auditing
    completion_time_seconds = Column(Integer, default=0)
    difficulty = Column(String, default="Standard")

    ai_feedback = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="simulation_attempts")
    simulation = relationship("Simulation", back_populates="attempts")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    icon = Column(String, default="bi-award")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list)  # list of {title, disaster_type}
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rainfall = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    predicted_label = Column(Integer)
    disaster_type = Column(String)
    model_confidence = Column(Float, nullable=True)  # only populated if model exposes predict_proba
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")
