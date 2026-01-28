"""
Quizzes Microservice - FastAPI Application
Handles quiz management, student participation, and real-time progress monitoring via WebSockets.
"""
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect, Query, Header
from fastapi.responses import JSONResponse
import httpx
from dotenv import load_dotenv

from database import connect_to_mongo, close_mongo_connection, get_collection, QUIZZES_COLLECTION
from schemas import (
    QuizCreate, QuizUpdate, QuizResponse, QuizSummary, QuizForStudent,
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionForStudent,
    JoinQuizRequest, JoinQuizResponse,
    AnswerSubmit, AnswerResult, StudentQuizResponse,
    ActivateQuizResponse, QuizStatus,
    WSStudentProgress, WSStudentJoined, WSStudentCompleted, WSQuizStats,
    QuizStatistics, HealthCheck
)
import crud

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service URLs
COURSES_SERVICE_URL = os.getenv("COURSES_SERVICE_URL", "http://courses:8000")


# ========================
# WebSocket Connection Manager
# ========================
class ConnectionManager:
    """
    Manages WebSocket connections for real-time quiz monitoring.
    """
    def __init__(self):
        # quiz_id -> list of websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, quiz_id: str):
        """Accept a new WebSocket connection for a quiz."""
        await websocket.accept()
        if quiz_id not in self.active_connections:
            self.active_connections[quiz_id] = []
        self.active_connections[quiz_id].append(websocket)
        logger.info(f"WebSocket connected for quiz {quiz_id}. Total connections: {len(self.active_connections[quiz_id])}")

    def disconnect(self, websocket: WebSocket, quiz_id: str):
        """Remove a WebSocket connection."""
        if quiz_id in self.active_connections:
            if websocket in self.active_connections[quiz_id]:
                self.active_connections[quiz_id].remove(websocket)
            if not self.active_connections[quiz_id]:
                del self.active_connections[quiz_id]
        logger.info(f"WebSocket disconnected for quiz {quiz_id}")

    async def broadcast_to_quiz(self, quiz_id: str, message: dict):
        """Send a message to all connections monitoring a quiz."""
        logger.info(f"Broadcasting to quiz {quiz_id}: {message.get('event', 'unknown')} - Active connections: {self.get_connection_count(quiz_id)}")
        
        if quiz_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[quiz_id]:
                try:
                    await connection.send_json(message)
                    logger.info(f"Message sent successfully to a monitor for quiz {quiz_id}")
                except Exception as e:
                    logger.error(f"Error sending message to monitor: {e}")
                    dead_connections.append(connection)
            
            # Clean up dead connections
            for dead in dead_connections:
                self.disconnect(dead, quiz_id)
        else:
            logger.warning(f"No active connections for quiz {quiz_id}. Active quizzes: {list(self.active_connections.keys())}")

    def get_connection_count(self, quiz_id: str) -> int:
        """Get the number of active connections for a quiz."""
        return len(self.active_connections.get(quiz_id, []))


# Global connection manager
manager = ConnectionManager()


# ========================
# Lifespan Context Manager
# ========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting Quizzes Microservice...")
    await connect_to_mongo()
    
    # Create indexes
    try:
        quizzes_collection = get_collection(QUIZZES_COLLECTION)
        await quizzes_collection.create_index("course_id")
        await quizzes_collection.create_index("status")
        
        responses_collection = get_collection("responses")
        await responses_collection.create_index([("quiz_id", 1), ("student_email", 1)], unique=True)
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Quizzes Microservice...")
    await close_mongo_connection()


# ========================
# FastAPI Application
# ========================
app = FastAPI(
    title="Quizzes Microservice",
    description="Microservice for managing quizzes, questions, and real-time student participation",
    version="1.0.0",
    lifespan=lifespan
)


# ========================
# Helper Functions
# ========================
async def validate_student_enrollment(course_id: str, student_email: str) -> dict:
    """
    Validate that a student is enrolled in a course by calling the courses microservice.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{COURSES_SERVICE_URL}/courses/{course_id}/validate/{student_email}"
            response = await client.get(url)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                logger.error(f"Error validating student: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Error al comunicarse con el servicio de cursos"
                )
    except httpx.TimeoutException:
        logger.error("Timeout connecting to courses service")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de cursos no está disponible"
        )
    except httpx.ConnectError:
        logger.error("Cannot connect to courses service")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se puede conectar con el servicio de cursos"
        )


async def verify_course_ownership(course_id: str, teacher_id: str) -> dict:
    """
    Verify that a course exists and belongs to the specified teacher.
    Calls the courses microservice with X-User-ID header to validate ownership.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{COURSES_SERVICE_URL}/courses/{course_id}"
            headers = {"X-User-ID": teacher_id}
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Curso no encontrado")
            elif response.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para acceder a los quizzes de este curso"
                )
            else:
                logger.error(f"Error verifying course ownership: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Error al comunicarse con el servicio de cursos"
                )
    except httpx.TimeoutException:
        logger.error("Timeout connecting to courses service")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de cursos no está disponible"
        )
    except httpx.ConnectError:
        logger.error("Cannot connect to courses service")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se puede conectar con el servicio de cursos"
        )
    except HTTPException:
        raise


async def verify_quiz_ownership(quiz_id: str, teacher_id: str) -> dict:
    """
    Verify that a quiz exists and the teacher owns its associated course.
    """
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    # Verify the teacher owns the course
    await verify_course_ownership(quiz["course_id"], teacher_id)
    
    return quiz


async def get_teacher_course_ids(teacher_id: str) -> List[str]:
    """
    Get all course IDs that belong to a teacher.
    Calls the courses microservice to get the teacher's courses.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{COURSES_SERVICE_URL}/courses"
            params = {"teacher_id": teacher_id}
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                courses = response.json()
                return [course["id"] for course in courses]
            else:
                logger.error(f"Error getting teacher courses: {response.status_code}")
                return []
    except Exception as e:
        logger.error(f"Error connecting to courses service: {e}")
        return []


# ========================
# Health Check Endpoint
# ========================
@app.get("/health", response_model=HealthCheck, tags=["Health"])
async def health_check():
    """Check the health status of the service."""
    try:
        # Test MongoDB connection
        collection = get_collection(QUIZZES_COLLECTION)
        await collection.find_one()
        mongodb_status = "connected"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        mongodb_status = "disconnected"
    
    return HealthCheck(
        status="healthy" if mongodb_status == "connected" else "unhealthy",
        mongodb=mongodb_status
    )


# ========================
# Quiz Endpoints (CRUD)
# ========================
@app.post("/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED, tags=["Quizzes"])
async def create_quiz(quiz: QuizCreate, x_user_id: str = Header(...)):
    """
    Create a new quiz for a course.
    Requires ownership of the course.
    """
    # Verify teacher owns the course
    await verify_course_ownership(quiz.course_id, x_user_id)
    
    quiz_doc = await crud.create_quiz(quiz)
    return quiz_doc


@app.get("/quizzes", response_model=List[QuizSummary], tags=["Quizzes"])
async def list_quizzes(
    course_id: Optional[str] = Query(None, description="UUID of the course (optional)"),
    x_user_id: Optional[str] = Header(None)
):
    """
    List quizzes. If X-User-ID header is present, returns only quizzes
    from courses owned by the teacher. Otherwise returns all (for internal use).
    """
    if x_user_id:
        # Teacher is requesting - filter by their courses
        if course_id:
            # Verify they own this specific course
            await verify_course_ownership(course_id, x_user_id)
            quizzes = await crud.get_quizzes_by_course(course_id)
        else:
            # Get all quizzes from teacher's courses
            course_ids = await get_teacher_course_ids(x_user_id)
            quizzes = await crud.get_quizzes_by_course_ids(course_ids)
    else:
        # Internal request - return all (or filtered by course_id)
        quizzes = await crud.get_quizzes_by_course(course_id)
    
    return quizzes


@app.get("/quizzes/{quiz_id}", response_model=QuizResponse, tags=["Quizzes"])
async def get_quiz(quiz_id: str, x_user_id: Optional[str] = Header(None)):
    """
    Get a quiz by ID with all its questions.
    If X-User-ID header is present, verifies ownership.
    """
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    # If teacher is requesting, verify ownership
    if x_user_id:
        await verify_course_ownership(quiz["course_id"], x_user_id)
    
    return quiz


@app.patch("/quizzes/{quiz_id}", response_model=QuizResponse, tags=["Quizzes"])
async def update_quiz(quiz_id: str, quiz_update: QuizUpdate, x_user_id: str = Header(...)):
    """
    Update quiz title or description.
    Requires ownership of the course.
    """
    # Verify ownership first
    await verify_quiz_ownership(quiz_id, x_user_id)
    
    quiz = await crud.update_quiz(quiz_id, quiz_update)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    return quiz


@app.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Quizzes"])
async def delete_quiz(quiz_id: str, x_user_id: str = Header(...)):
    """
    Delete a quiz and all its responses.
    Requires ownership of the course.
    """
    # Verify ownership first
    await verify_quiz_ownership(quiz_id, x_user_id)
    
    deleted = await crud.delete_quiz(quiz_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")


@app.post("/quizzes/{quiz_id}/activate", response_model=ActivateQuizResponse, tags=["Quizzes"])
async def activate_quiz(quiz_id: str, x_user_id: str = Header(...)):
    """
    Activate a quiz so students can participate.
    Only draft quizzes can be activated.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    if quiz["status"] == QuizStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="El quiz ya está activo")
    
    if quiz["status"] == QuizStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="El quiz ya ha finalizado")
    
    if not quiz.get("questions") or len(quiz["questions"]) == 0:
        raise HTTPException(status_code=400, detail="El quiz debe tener al menos una pregunta")
    
    activated_quiz = await crud.activate_quiz(quiz_id)
    
    return ActivateQuizResponse(
        message="Quiz activado exitosamente",
        quiz_id=quiz_id,
        status=QuizStatus.ACTIVE
    )


@app.post("/quizzes/{quiz_id}/finish", response_model=ActivateQuizResponse, tags=["Quizzes"])
async def finish_quiz(quiz_id: str, x_user_id: str = Header(...)):
    """
    Finish/deactivate an active quiz.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    if quiz["status"] != QuizStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Solo se pueden finalizar quizzes activos")
    
    finished_quiz = await crud.finish_quiz(quiz_id)
    
    # Notify all connected monitors
    await manager.broadcast_to_quiz(quiz_id, {
        "event": "quiz_finished",
        "quiz_id": quiz_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return ActivateQuizResponse(
        message="Quiz finalizado",
        quiz_id=quiz_id,
        status=QuizStatus.FINISHED
    )


# ========================
# Question Endpoints
# ========================
@app.post("/quizzes/{quiz_id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED, tags=["Questions"])
async def add_question(quiz_id: str, question: QuestionCreate, x_user_id: str = Header(...)):
    """
    Add a new question to a quiz.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    if quiz["status"] != QuizStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Solo se pueden agregar preguntas a quizzes en borrador")
    
    question_doc = await crud.add_question(quiz_id, question)
    if not question_doc:
        raise HTTPException(status_code=500, detail="Error al agregar la pregunta")
    
    return question_doc


@app.patch("/quizzes/{quiz_id}/questions/{question_id}", response_model=QuestionResponse, tags=["Questions"])
async def update_question(quiz_id: str, question_id: str, question_update: QuestionUpdate, x_user_id: str = Header(...)):
    """
    Update a question in a quiz.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    if quiz["status"] != QuizStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Solo se pueden modificar preguntas de quizzes en borrador")
    
    updated_question = await crud.update_question(quiz_id, question_id, question_update)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    
    return updated_question


@app.delete("/quizzes/{quiz_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Questions"])
async def delete_question(quiz_id: str, question_id: str, x_user_id: str = Header(...)):
    """
    Remove a question from a quiz.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    if quiz["status"] != QuizStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar preguntas de quizzes en borrador")
    
    deleted = await crud.delete_question(quiz_id, question_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")


# ========================
# Student Participation Endpoints
# ========================
@app.post("/quizzes/{quiz_id}/join", response_model=JoinQuizResponse, tags=["Student Participation"])
async def join_quiz(quiz_id: str, request: JoinQuizRequest):
    """
    Student joins a quiz.
    Validates enrollment in the course before allowing participation.
    """
    # Get quiz
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    if quiz["status"] != QuizStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="El quiz no está activo")
    
    # Validate student enrollment in the course
    student_data = await validate_student_enrollment(quiz["course_id"], request.email)
    if not student_data:
        raise HTTPException(
            status_code=403,
            detail="No estás inscrito en este curso. Contacta a tu profesor."
        )
    
    # Check if student already joined
    existing_response = await crud.get_student_response(quiz_id, request.email)
    if existing_response:
        return JoinQuizResponse(
            message="Ya te has unido a este quiz",
            quiz_id=quiz_id,
            student_email=request.email,
            quiz_title=quiz["title"],
            question_count=len(quiz.get("questions", []))
        )
    
    # Create student response record
    student_name = student_data.get("full_name", student_data.get("name"))
    await crud.create_student_response(
        quiz_id=quiz_id,
        student_email=request.email,
        student_name=student_name,
        total_questions=len(quiz.get("questions", []))
    )
    
    # Notify monitors via WebSocket
    await manager.broadcast_to_quiz(quiz_id, WSStudentJoined(
        student_email=request.email,
        timestamp=datetime.utcnow()
    ).model_dump(mode='json'))
    
    return JoinQuizResponse(
        message="Te has unido al quiz exitosamente",
        quiz_id=quiz_id,
        student_email=request.email,
        quiz_title=quiz["title"],
        question_count=len(quiz.get("questions", []))
    )


@app.get("/quizzes/{quiz_id}/student", response_model=QuizForStudent, tags=["Student Participation"])
async def get_quiz_for_student(quiz_id: str, email: str = Query(..., description="Student email")):
    """
    Get quiz questions for a student (without correct answers).
    Student must have joined the quiz first.
    """
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    if quiz["status"] != QuizStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="El quiz no está activo")
    
    # Check if student has joined
    student_response = await crud.get_student_response(quiz_id, email)
    if not student_response:
        raise HTTPException(status_code=403, detail="Debes unirte al quiz primero")
    
    # Return quiz without correct answers
    questions_for_student = []
    for q in quiz.get("questions", []):
        questions_for_student.append({
            "_id": q["_id"],
            "text": q["text"],
            "options": q["options"]
        })
    
    return {
        "_id": quiz["_id"],
        "title": quiz["title"],
        "description": quiz.get("description"),
        "questions": questions_for_student
    }


@app.post("/quizzes/{quiz_id}/answer", response_model=AnswerResult, tags=["Student Participation"])
async def submit_answer(quiz_id: str, answer: AnswerSubmit, email: str = Query(..., description="Student email")):
    """
    Submit an answer to a question.
    """
    # Get quiz
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    if quiz["status"] != QuizStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="El quiz no está activo")
    
    # Check if student has joined
    student_response = await crud.get_student_response(quiz_id, email)
    if not student_response:
        raise HTTPException(status_code=403, detail="Debes unirte al quiz primero")
    
    if student_response.get("is_completed"):
        raise HTTPException(status_code=400, detail="Ya completaste este quiz")
    
    # Check if already answered this question
    already_answered = await crud.has_answered_question(quiz_id, email, answer.question_id)
    if already_answered:
        raise HTTPException(status_code=400, detail="Ya respondiste esta pregunta")
    
    # Find the question
    question = await crud.get_question(quiz_id, answer.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    
    # Check answer
    is_correct = answer.selected_option == question["correct_option"]
    
    # Save answer
    from schemas import StudentAnswer
    student_answer = StudentAnswer(
        question_id=answer.question_id,
        selected_option=answer.selected_option,
        is_correct=is_correct,
        answered_at=datetime.utcnow()
    )
    
    updated_response = await crud.add_answer(quiz_id, email, student_answer, is_correct)
    
    questions_answered = len(updated_response["answers"])
    total_questions = len(quiz.get("questions", []))
    
    # Check if quiz is completed
    if questions_answered >= total_questions:
        await crud.complete_student_response(quiz_id, email)
        
        # Notify monitors that student completed
        await manager.broadcast_to_quiz(quiz_id, WSStudentCompleted(
            student_email=email,
            student_name=student_response.get("student_name"),
            final_score=updated_response["score"],
            total_questions=total_questions,
            timestamp=datetime.utcnow()
        ).model_dump(mode='json'))
    else:
        # Notify monitors of progress
        await manager.broadcast_to_quiz(quiz_id, WSStudentProgress(
            student_email=email,
            student_name=student_response.get("student_name"),
            question_number=questions_answered,
            total_questions=total_questions,
            is_correct=is_correct,
            current_score=updated_response["score"],
            timestamp=datetime.utcnow()
        ).model_dump(mode='json'))
    
    return AnswerResult(
        is_correct=is_correct,
        correct_option=question["correct_option"],
        message="¡Correcto!" if is_correct else "Incorrecto",
        current_score=updated_response["score"],
        questions_answered=questions_answered,
        total_questions=total_questions
    )


@app.get("/quizzes/{quiz_id}/my-progress", response_model=StudentQuizResponse, tags=["Student Participation"])
async def get_my_progress(quiz_id: str, email: str = Query(..., description="Student email")):
    """
    Get student's progress in a quiz.
    """
    student_response = await crud.get_student_response(quiz_id, email)
    if not student_response:
        raise HTTPException(status_code=404, detail="No has participado en este quiz")
    
    return student_response


# ========================
# Quiz Results & Statistics Endpoints
# ========================
@app.get("/quizzes/{quiz_id}/responses", response_model=List[StudentQuizResponse], tags=["Results"])
async def get_quiz_responses(quiz_id: str, x_user_id: str = Header(...)):
    """
    Get all student responses for a quiz (for teachers).
    Requires ownership of the course.
    """
    # Verify ownership first
    await verify_quiz_ownership(quiz_id, x_user_id)
    
    responses = await crud.get_quiz_responses(quiz_id)
    return responses


@app.get("/quizzes/{quiz_id}/statistics", response_model=QuizStatistics, tags=["Results"])
async def get_quiz_statistics(quiz_id: str, x_user_id: str = Header(...)):
    """
    Get statistics for a quiz.
    Requires ownership of the course.
    """
    # Verify ownership first
    quiz = await verify_quiz_ownership(quiz_id, x_user_id)
    
    stats = await crud.get_quiz_statistics(quiz_id)
    
    # Calculate per-question statistics
    responses = await crud.get_quiz_responses(quiz_id)
    question_stats = []
    
    for idx, question in enumerate(quiz.get("questions", [])):
        q_id = question["_id"]
        correct_count = 0
        total_answers = 0
        
        for response in responses:
            for answer in response.get("answers", []):
                if answer["question_id"] == q_id:
                    total_answers += 1
                    if answer["is_correct"]:
                        correct_count += 1
        
        question_stats.append({
            "question_number": idx + 1,
            "question_id": q_id,
            "text": question["text"][:50] + "..." if len(question["text"]) > 50 else question["text"],
            "total_answers": total_answers,
            "correct_answers": correct_count,
            "accuracy": round(correct_count / total_answers * 100, 1) if total_answers > 0 else 0
        })
    
    return QuizStatistics(
        quiz_id=quiz_id,
        title=quiz["title"],
        total_participants=stats["total_participants"],
        completed_participants=stats["completed_participants"],
        average_score=round(stats["average_score"], 2) if stats["average_score"] else 0,
        highest_score=stats["highest_score"] or 0,
        lowest_score=stats["lowest_score"] or 0,
        questions_stats=question_stats
    )


# ========================
# WebSocket Endpoint for Real-Time Monitoring
# ========================
@app.websocket("/ws/quizzes/{quiz_id}/monitor")
async def websocket_monitor(websocket: WebSocket, quiz_id: str, teacher_id: Optional[str] = Query(None)):
    """
    WebSocket endpoint for teachers to monitor quiz progress in real-time.
    Sends updates when students join, answer questions, or complete the quiz.
    Requires teacher_id query parameter for ownership verification.
    """
    # Verify quiz exists
    quiz = await crud.get_quiz_by_id(quiz_id)
    if not quiz:
        await websocket.close(code=4004, reason="Quiz not found")
        return
    
    # Verify ownership if teacher_id provided
    if teacher_id:
        try:
            await verify_course_ownership(quiz["course_id"], teacher_id)
        except HTTPException as e:
            await websocket.close(code=4003, reason="Access denied")
            return
    
    await manager.connect(websocket, quiz_id)
    
    try:
        # Send initial stats
        stats = await crud.get_quiz_statistics(quiz_id)
        responses = await crud.get_quiz_responses(quiz_id)
        
        await websocket.send_json({
            "event": "connected",
            "quiz_id": quiz_id,
            "quiz_title": quiz["title"],
            "quiz_status": quiz["status"],
            "total_questions": len(quiz.get("questions", [])),
            "current_stats": {
                "active_students": stats["total_participants"],
                "completed_students": stats["completed_participants"],
                "average_score": round(stats["average_score"], 2) if stats["average_score"] else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive and listen for messages
        while True:
            try:
                # Wait for ping messages or other data
                data = await websocket.receive_text()
                
                if data == "ping":
                    await websocket.send_json({"event": "pong"})
                elif data == "stats":
                    # Send updated stats on request
                    stats = await crud.get_quiz_statistics(quiz_id)
                    await websocket.send_json(WSQuizStats(
                        active_students=stats["total_participants"],
                        completed_students=stats["completed_participants"],
                        average_score=round(stats["average_score"], 2) if stats["average_score"] else 0
                    ).model_dump(mode='json'))
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket, quiz_id)


# ========================
# Course Validation Endpoint (for courses service to call)
# ========================
@app.get("/courses/{course_id}/validate/{email}", tags=["Internal"])
async def validate_enrollment_endpoint(course_id: str, email: str):
    """
    Internal endpoint that courses service can use to validate enrollment.
    This is a proxy endpoint - the actual validation happens in courses service.
    """
    # This endpoint is here for documentation purposes
    # The actual validation is done by calling courses service
    raise HTTPException(
        status_code=501,
        detail="Use courses service directly for validation"
    )
