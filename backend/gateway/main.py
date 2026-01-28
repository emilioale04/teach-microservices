"""
API Gateway with BFF (Backend for Frontend) Pattern
Separates Teacher (JWT auth) and Student (email-only) flows
"""
import os
import asyncio
from fastapi import FastAPI, Request, HTTPException, status, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import httpx
import jwt
import logging
import websockets

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ========================
# Configuration
# ========================
AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
COURSES_URL = os.getenv("COURSES_SERVICE_URL", "http://localhost:8002")
QUIZZES_URL = os.getenv("QUIZZES_SERVICE_URL", "http://localhost:8003")

# Public paths (no auth required)
PUBLIC_PATHS = [
    "/",
    "/health",
    "/services/health",
    "/docs",
    "/openapi.json",
    "/auth/signup",
    "/auth/login",
    "/auth/refresh",
    "/auth/password-reset",
    "/auth/password-reset/confirm",
]

# Student BFF prefix (email validation only, no JWT)
STUDENT_BFF_PREFIX = "/student/"


# ========================
# Pydantic Models for Student BFF
# ========================
class StudentJoinRequest(BaseModel):
    email: EmailStr

class StudentAnswerRequest(BaseModel):
    question_id: str
    selected_option: int


# ========================
# HTTP Client & Lifespan
# ========================
client: httpx.AsyncClient = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = httpx.AsyncClient(timeout=30.0)
    yield
    await client.aclose()


# ========================
# FastAPI Application
# ========================
app = FastAPI(
    title="EduPlataforma API Gateway",
    description="API Gateway with BFF pattern - Separate flows for Teachers and Students",
    version="2.0.0",
    lifespan=lifespan
)


# ========================
# CORS Middleware
# ========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Teacher frontend
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",  # Student frontend
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ========================
# Authentication Middleware
# ========================
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    JWT validation for Teacher routes.
    Student BFF routes only require email validation (no JWT).
    """
    path = request.url.path
    
    # Allow OPTIONS (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)
    
    # Allow public paths
    if path in PUBLIC_PATHS or any(path.startswith(p) for p in ["/docs", "/openapi.json"]):
        return await call_next(request)
    
    # Allow Student BFF paths (no JWT required)
    if path.startswith(STUDENT_BFF_PREFIX):
        return await call_next(request)
    
    # Require JWT for all other paths (Teacher BFF)
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return JSONResponse(
            status_code=401,
            content={"detail": "Token de autenticación requerido"}
        )
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return JSONResponse(
                status_code=401,
                content={"detail": "Esquema de autenticación inválido"}
            )
        
        try:
            payload = jwt.decode(
                token, 
                options={
                    "verify_signature": False,
                    "verify_aud": False,
                    "verify_exp": True
                }
            )
            logger.info(f"Token válido para docente: {payload.get('email', 'unknown')}")
        except jwt.ExpiredSignatureError:
            return JSONResponse(status_code=401, content={"detail": "Token expirado"})
        except Exception as e:
            return JSONResponse(status_code=401, content={"detail": f"Token inválido: {str(e)}"})
        
        return await call_next(request)
    
    except ValueError:
        return JSONResponse(status_code=401, content={"detail": "Header de autorización malformado"})
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        return JSONResponse(status_code=401, content={"detail": "Error de autenticación"})


# ========================
# Helper Functions
# ========================
def get_user_from_token(request: Request) -> Optional[dict]:
    """Extract user info from JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return None
        
        return jwt.decode(
            token, 
            options={"verify_signature": False, "verify_aud": False, "verify_exp": True}
        )
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        return None


async def proxy_request(request: Request, service_url: str, path: str) -> JSONResponse:
    """Generic proxy to forward requests to microservices"""
    try:
        url = f"{service_url}{path}"
        if request.url.query:
            url = f"{url}?{request.url.query}"
        
        logger.info(f"Proxying {request.method} to: {url}")
        
        headers = {
            k: v for k, v in request.headers.items()
            if k.lower() not in ["host", "connection", "content-length", "transfer-encoding"]
        }
        
        user = get_user_from_token(request)
        if user:
            headers["X-User-ID"] = str(user.get("sub", ""))
            headers["X-User-Email"] = str(user.get("email", ""))
        
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        response = await client.request(method=request.method, url=url, headers=headers, content=body)
        
        response_headers = {
            k: v for k, v in response.headers.items()
            if k.lower() not in ["content-encoding", "content-length", "transfer-encoding", "connection"]
        }
        
        content = None
        if response.content:
            try:
                content = response.json()
            except:
                content = {"message": response.text}
        
        return JSONResponse(content=content, status_code=response.status_code, headers=response_headers)
    
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout del servicio")
    except Exception as e:
        logger.error(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Gateway Health Endpoints
# ========================
@app.get("/", tags=["Gateway"])
def root():
    return {
        "message": "EduPlataforma API Gateway",
        "version": "2.0.0",
        "bff_endpoints": {
            "teacher": "All /auth, /courses, /quizzes, /students endpoints (JWT required)",
            "student": "/student/* endpoints (email validation only)"
        }
    }


@app.get("/health", tags=["Gateway"])
def health():
    return {"status": "healthy", "service": "gateway"}


@app.get("/services/health", tags=["Gateway"])
async def services_health():
    """Check health of all microservices"""
    health_status = {}
    
    for name, url in [("auth", AUTH_URL), ("courses", COURSES_URL), ("quizzes", QUIZZES_URL)]:
        try:
            response = await client.get(f"{url}/health", timeout=5.0)
            health_status[name] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            health_status[name] = "unreachable"
    
    return {
        "gateway": "healthy",
        "services": health_status,
        "overall": "healthy" if all(s == "healthy" for s in health_status.values()) else "degraded"
    }


# ========================
# STUDENT BFF ENDPOINTS
# (No JWT required - email validation only)
# ========================
@app.get("/student/quiz/{quiz_id}/info", tags=["Student BFF"])
async def student_get_quiz_info(quiz_id: str):
    """
    Get basic quiz info for students (public).
    Returns quiz title, description, status, and question count.
    """
    try:
        response = await client.get(f"{QUIZZES_URL}/quizzes/{quiz_id}")
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Quiz no encontrado")
        
        quiz = response.json()
        
        # Return limited info for students
        return {
            "quiz_id": quiz.get("_id"),
            "title": quiz.get("title"),
            "description": quiz.get("description"),
            "status": quiz.get("status"),
            "question_count": len(quiz.get("questions", [])),
            "is_active": quiz.get("status") == "active"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quiz info: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener información del quiz")


@app.post("/student/quiz/{quiz_id}/join", tags=["Student BFF"])
async def student_join_quiz(quiz_id: str, request: StudentJoinRequest):
    """
    Student joins a quiz using their email.
    Validates enrollment in the course before allowing access.
    """
    try:
        response = await client.post(
            f"{QUIZZES_URL}/quizzes/{quiz_id}/join",
            json={"email": request.email}
        )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Quiz no encontrado")
        elif response.status_code == 400:
            raise HTTPException(status_code=400, detail=response.json().get("detail", "El quiz no está activo"))
        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="No estás inscrito en este curso")
        elif response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))
        
        return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining quiz: {e}")
        raise HTTPException(status_code=500, detail="Error al unirse al quiz")


@app.get("/student/quiz/{quiz_id}/questions", tags=["Student BFF"])
async def student_get_questions(quiz_id: str, email: str = Query(..., description="Student email")):
    """
    Get quiz questions for a student (without correct answers).
    Student must have joined the quiz first.
    Transforms options from string[] to {id, text}[] format for frontend.
    """
    try:
        response = await client.get(
            f"{QUIZZES_URL}/quizzes/{quiz_id}/student",
            params={"email": email}
        )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Quiz no encontrado")
        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="Debes unirte al quiz primero")
        elif response.status_code == 400:
            raise HTTPException(status_code=400, detail=response.json().get("detail", "El quiz no está activo"))
        elif response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))
        
        # Transform response for frontend
        data = response.json()
        transformed_questions = []
        for idx, question in enumerate(data.get("questions", [])):
            # Transform options from string[] to {id, text}[]
            options = question.get("options", [])
            transformed_options = [
                {"id": i, "text": opt} for i, opt in enumerate(options)
            ]
            transformed_questions.append({
                "question_id": question.get("_id"),
                "text": question.get("text"),
                "options": transformed_options,
                "order": idx
            })
        
        return {
            "quiz_id": data.get("_id"),
            "title": data.get("title"),
            "questions": transformed_questions
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting questions: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener preguntas")


@app.post("/student/quiz/{quiz_id}/answer", tags=["Student BFF"])
async def student_submit_answer(
    quiz_id: str, 
    answer: StudentAnswerRequest,
    email: str = Query(..., description="Student email")
):
    """Submit an answer to a question."""
    try:
        response = await client.post(
            f"{QUIZZES_URL}/quizzes/{quiz_id}/answer",
            params={"email": email},
            json=answer.model_dump()
        )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail=response.json().get("detail", "No encontrado"))
        elif response.status_code == 403:
            raise HTTPException(status_code=403, detail="Debes unirte al quiz primero")
        elif response.status_code == 400:
            raise HTTPException(status_code=400, detail=response.json().get("detail", "Error en la respuesta"))
        elif response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))
        
        return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail="Error al enviar respuesta")


@app.get("/student/quiz/{quiz_id}/progress", tags=["Student BFF"])
async def student_get_progress(quiz_id: str, email: str = Query(..., description="Student email")):
    """Get student's progress in a quiz."""
    try:
        response = await client.get(
            f"{QUIZZES_URL}/quizzes/{quiz_id}/my-progress",
            params={"email": email}
        )
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="No has participado en este quiz")
        elif response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))
        
        # Transform response for frontend
        data = response.json()
        answers = data.get("answers", [])
        total_questions = data.get("total_questions", 0)
        correct_answers = sum(1 for a in answers if a.get("is_correct"))
        
        return {
            "quiz_id": data.get("quiz_id"),
            "student_email": data.get("student_email"),
            "total_questions": total_questions,
            "answered_questions": len(answers),
            "correct_answers": correct_answers,
            "score_percentage": round((correct_answers / total_questions * 100) if total_questions > 0 else 0, 1),
            "answers": answers,
            "is_completed": data.get("is_completed", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener progreso")


# ========================
# TEACHER BFF ENDPOINTS
# (JWT required - full administrative access)
# ========================


# Auth proxy
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Teacher BFF - Auth"])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, AUTH_URL, f"/{path}")


# Courses proxy
@app.api_route("/courses", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=True, tags=["Teacher BFF - Courses"])
async def proxy_courses_base(request: Request):
    return await proxy_request(request, COURSES_URL, "/courses")


@app.api_route("/courses/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Teacher BFF - Courses"])
async def proxy_courses(request: Request, path: str):
    return await proxy_request(request, COURSES_URL, f"/courses/{path}")


# Students proxy
@app.api_route("/students/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Teacher BFF - Students"])
async def proxy_students(request: Request, path: str):
    return await proxy_request(request, COURSES_URL, f"/students/{path}")


# Quizzes proxy
@app.api_route("/quizzes", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=True, tags=["Teacher BFF - Quizzes"])
async def proxy_quizzes_base(request: Request):
    return await proxy_request(request, QUIZZES_URL, "/quizzes")


@app.api_route("/quizzes/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Teacher BFF - Quizzes"])
async def proxy_quizzes(request: Request, path: str):
    return await proxy_request(request, QUIZZES_URL, f"/quizzes/{path}")


# ========================
# WebSocket Proxy (Teachers)
# ========================
@app.websocket("/ws/quizzes/{quiz_id}/monitor")
async def websocket_proxy(websocket: WebSocket, quiz_id: str):
    """WebSocket proxy for real-time quiz monitoring (teachers only)"""
    # Extract teacher_id from token in query params or headers
    teacher_id = None
    
    # Try to get token from query params
    token = websocket.query_params.get("token")
    if token:
        try:
            payload = jwt.decode(
                token, 
                options={"verify_signature": False, "verify_aud": False, "verify_exp": True}
            )
            teacher_id = payload.get("sub")
        except Exception as e:
            logger.error(f"Error decoding WebSocket token: {e}")
    
    await websocket.accept()
    
    quizzes_ws_url = QUIZZES_URL.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{quizzes_ws_url}/ws/quizzes/{quiz_id}/monitor"
    
    # Add teacher_id to query params for ownership verification
    if teacher_id:
        ws_url = f"{ws_url}?teacher_id={teacher_id}"
    
    logger.info(f"Connecting to backend WebSocket: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as backend_ws:
            logger.info(f"WebSocket proxy connected for quiz {quiz_id}")
            
            async def forward_to_client():
                """Forward messages from backend to client"""
                try:
                    async for message in backend_ws:
                        logger.debug(f"Forwarding to client: {message[:100]}...")
                        await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("Backend WebSocket closed")
                except Exception as e:
                    logger.error(f"Error forwarding to client: {e}")
            
            async def forward_to_backend():
                """Forward messages from client to backend"""
                try:
                    while True:
                        data = await websocket.receive_text()
                        logger.debug(f"Forwarding to backend: {data}")
                        await backend_ws.send(data)
                except Exception as e:
                    logger.info(f"Client disconnected: {e}")
            
            # Run both forwarding tasks concurrently
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(forward_to_client()),
                    asyncio.create_task(forward_to_backend())
                ],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
                
    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"Backend WebSocket connection rejected: {e}")
        await websocket.close(code=1011, reason="Backend rejected connection")
    except Exception as e:
        logger.error(f"WebSocket proxy error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
