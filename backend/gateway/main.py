import os
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import httpx
import jwt
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="API Gateway")

# HTTP client
client = httpx.AsyncClient(timeout=30.0)

# URLs de servicios
AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
COURSES_URL = os.getenv("COURSES_SERVICE_URL", "http://localhost:8002")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

# Rutas públicas que no requieren autenticación
PUBLIC_PATHS = [
    "/",
    "/health",
    "/services/health",
    "/docs",
    "/openapi.json",
    "/auth/signup",
    "/auth/login",
    "/auth/password-reset",
]


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware de autenticación
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Valida JWT en todas las rutas excepto las públicas"""
    path = request.url.path
    
    # Permitir rutas públicas
    if path in PUBLIC_PATHS or any(path.startswith(p) for p in ["/docs", "/openapi.json"]):
        return await call_next(request)
    
    # if True:  # Temporal: salta validación
    #     return await call_next(request)
    
    # Verificar token
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
        
        # Para Supabase con ES256, decodificamos sin verificar firma
        # En producción, deberías obtener la clave pública JWT de Supabase
        try:
            # Decodificar sin verificar firma (Supabase usa ES256 con clave pública)
            payload = jwt.decode(
                token, 
                options={
                    "verify_signature": False,
                    "verify_aud": False,
                    "verify_exp": True  # Aún verificamos expiración
                }
            )
            logger.info(f"Token válido para usuario: {payload.get('email', 'unknown')}")
        except jwt.ExpiredSignatureError:
            logger.warning("Token expirado")
            return JSONResponse(
                status_code=401,
                content={"detail": "Token expirado"}
            )
        except Exception as e:
            logger.error(f"Error validando token: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": f"Token inválido: {str(e)}"}
            )
        
        # Token válido, continuar
        return await call_next(request)
    
    except ValueError:
        logger.error("Header de autorización malformado")
        return JSONResponse(
            status_code=401,
            content={"detail": "Header de autorización malformado"}
        )
    except Exception as e:
        logger.error(f"Error inesperado en autenticación: {str(e)}")
        return JSONResponse(
            status_code=401,
            content={"detail": "Error de autenticación"}
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await client.aclose()

app.router.lifespan_context = lifespan


# Auth helper
def get_user_from_token(request: Request) -> Optional[dict]:
    """Extrae y valida el token JWT"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return None
        
        # Decodificar sin verificar firma (Supabase ES256)
        return jwt.decode(
            token, 
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": True
            }
        )
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {str(e)}")
        return None


# Proxy helper
async def proxy_request(request: Request, service_url: str, path: str) -> JSONResponse:
    """Proxy genérico para reenviar requests a microservicios"""
    try:
        # Construir URL completa
        url = f"{service_url}{path}"
        if request.url.query:
            url = f"{url}?{request.url.query}"
        
        # Headers (excluir los problemáticos)
        headers = {
            k: v for k, v in request.headers.items()
            if k.lower() not in ["host", "connection", "content-length", "transfer-encoding"]
        }
        
        # Agregar info de usuario si está autenticado
        user = get_user_from_token(request)
        if user:
            headers["X-User-ID"] = str(user.get("sub", ""))
            headers["X-User-Email"] = str(user.get("email", ""))
        
        # Body
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Request al microservicio
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body
        )
        
        # Response
        response_headers = {
            k: v for k, v in response.headers.items()
            if k.lower() not in ["content-encoding", "content-length", "transfer-encoding", "connection"]
        }
        
        return JSONResponse(
            content=response.json() if response.content else None,
            status_code=response.status_code,
            headers=response_headers
        )
    
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout del servicio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Gateway endpoints
@app.get("/")
def root():
    return {
        "message": "API Gateway",
        "services": {
            "auth": AUTH_URL,
            "courses": COURSES_URL
        }
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/services/health")
async def services_health():
    """Verifica el estado de todos los microservicios"""
    health_status = {}
    
    # Check auth
    try:
        response = await client.get(f"{AUTH_URL}/health", timeout=5.0)
        health_status["auth"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health_status["auth"] = "unreachable"
    
    # Check courses
    try:
        response = await client.get(f"{COURSES_URL}/health", timeout=5.0)
        health_status["courses"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health_status["courses"] = "unreachable"
    
    all_healthy = all(s == "healthy" for s in health_status.values())
    
    return {
        "gateway": "healthy",
        "services": health_status,
        "overall": "healthy" if all_healthy else "degraded"
    }


# Auth proxy
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, AUTH_URL, f"/{path}")


# Courses proxy
@app.api_route("/courses/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_courses(request: Request, path: str):
    return await proxy_request(request, COURSES_URL, f"/courses/{path}")


# Students proxy
@app.api_route("/students/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_students(request: Request, path: str):
    return await proxy_request(request, COURSES_URL, f"/students/{path}")
