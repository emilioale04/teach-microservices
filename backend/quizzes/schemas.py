"""
Pydantic schemas for the Quizzes microservice.
Handles validation and serialization for Quiz, Question, and Response models.
"""
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


# Custom type for MongoDB ObjectId compatibility
class PyObjectId(str):
    """
    Custom type to handle MongoDB ObjectId as string in the API.
    """
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            raise ValueError("Invalid ObjectId format")
        raise ValueError("ObjectId must be a string or ObjectId instance")


# Enums
class QuizStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    FINISHED = "finished"


# ========================
# Question Schemas
# ========================
class QuestionBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="Question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Exactly 4 answer options")
    correct_option: int = Field(..., ge=0, le=3, description="Index of the correct option (0-3)")

    @field_validator('options')
    @classmethod
    def validate_options_count(cls, v):
        if len(v) != 4:
            raise ValueError("A question must have exactly 4 options")
        return v


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=1000)
    options: Optional[List[str]] = Field(None, min_length=4, max_length=4)
    correct_option: Optional[int] = Field(None, ge=0, le=3)

    @field_validator('options')
    @classmethod
    def validate_options_count(cls, v):
        if v is not None and len(v) != 4:
            raise ValueError("A question must have exactly 4 options")
        return v


class QuestionResponse(QuestionBase):
    id: str = Field(..., alias="_id", description="Question ID")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


class QuestionForStudent(BaseModel):
    """Question schema for students (without correct answer)"""
    id: str = Field(..., alias="_id")
    text: str
    options: List[str]

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


# ========================
# Quiz Schemas
# ========================
class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Quiz title")
    description: Optional[str] = Field(None, max_length=1000, description="Quiz description")
    course_id: str = Field(..., description="UUID of the course this quiz belongs to")


class QuizCreate(QuizBase):
    pass


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class QuizResponse(QuizBase):
    id: str = Field(..., alias="_id", description="Quiz ID")
    status: QuizStatus = QuizStatus.DRAFT
    questions: List[QuestionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


class QuizSummary(BaseModel):
    """Simplified quiz response for listing"""
    id: str = Field(..., alias="_id")
    title: str
    description: Optional[str]
    course_id: str
    status: QuizStatus
    question_count: int
    created_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


class QuizForStudent(BaseModel):
    """Quiz schema for students (questions without correct answers)"""
    id: str = Field(..., alias="_id")
    title: str
    description: Optional[str]
    questions: List[QuestionForStudent]

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


# ========================
# Student Participation Schemas
# ========================
class JoinQuizRequest(BaseModel):
    email: EmailStr = Field(..., description="Student email")


class JoinQuizResponse(BaseModel):
    message: str
    quiz_id: str
    student_email: str
    quiz_title: str
    question_count: int


# ========================
# Answer/Response Schemas
# ========================
class AnswerSubmit(BaseModel):
    question_id: str = Field(..., description="ID of the question being answered")
    selected_option: int = Field(..., ge=0, le=3, description="Index of the selected option (0-3)")


class StudentAnswer(BaseModel):
    question_id: str
    selected_option: int
    is_correct: bool
    answered_at: datetime


class StudentQuizResponse(BaseModel):
    """Complete student response for a quiz"""
    id: str = Field(..., alias="_id")
    quiz_id: str
    student_email: str
    student_name: Optional[str] = None
    answers: List[StudentAnswer] = []
    score: int = 0
    total_questions: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    is_completed: bool = False

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str}
    }


class AnswerResult(BaseModel):
    """Result returned after submitting an answer"""
    is_correct: bool
    correct_option: int
    message: str
    current_score: int
    questions_answered: int
    total_questions: int


# ========================
# Quiz Activation Schemas
# ========================
class ActivateQuizResponse(BaseModel):
    message: str
    quiz_id: str
    status: QuizStatus


# ========================
# WebSocket Message Schemas
# ========================
class WSStudentProgress(BaseModel):
    """WebSocket message for student progress updates"""
    event: str = "student_progress"
    student_email: str
    student_name: Optional[str]
    question_number: int
    total_questions: int
    is_correct: bool
    current_score: int
    timestamp: datetime

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class WSStudentJoined(BaseModel):
    """WebSocket message when a student joins"""
    event: str = "student_joined"
    student_email: str
    timestamp: datetime

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class WSStudentCompleted(BaseModel):
    """WebSocket message when a student completes the quiz"""
    event: str = "student_completed"
    student_email: str
    student_name: Optional[str]
    final_score: int
    total_questions: int
    timestamp: datetime

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class WSQuizStats(BaseModel):
    """WebSocket message with current quiz statistics"""
    event: str = "quiz_stats"
    active_students: int
    completed_students: int
    average_score: float


# ========================
# Statistics Schemas
# ========================
class QuizStatistics(BaseModel):
    quiz_id: str
    title: str
    total_participants: int
    completed_participants: int
    average_score: float
    highest_score: int
    lowest_score: int
    questions_stats: List[dict]


# ========================
# Health Check Schema
# ========================
class HealthCheck(BaseModel):
    status: str
    service: str = "quizzes"
    mongodb: str
