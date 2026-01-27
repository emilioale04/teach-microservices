# API Gateway - Teach Microservices

API Gateway unificado que actúa como punto de entrada único para los microservicios de autenticación y gestión de cursos.

## Características

- ✅ **Proxy Routing Asíncrono** con httpx
- ✅ **Documentación Swagger Unificada** (combina OpenAPI de todos los servicios)
- ✅ **Middleware CORS** configurable
- ✅ **Validación de JWT** opcional con Supabase
- ✅ **Manejo Global de Errores**
- ✅ **Health Check** de todos los servicios
- ✅ **Logging centralizado**
- ✅ **Configuración por entornos** con pydantic-settings
- ✅ **Docker ready**

## Arquitectura

```
Cliente
   ↓
API Gateway :8000
   ├── /auth/* → Auth Service :8001
   ├── /courses/* → Courses Service :8002
   └── /students/* → Courses Service :8002
```

## Requisitos

- Python 3.11+
- Microservicios Auth y Courses en ejecución

## Instalación

### 1. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
# URLs de microservicios
AUTH_SERVICE_URL=http://localhost:8001
COURSES_SERVICE_URL=http://localhost:8002

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# JWT (opcional)
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 2. Ejecutar Localmente

```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar gateway
uvicorn main:app --reload --port 8000
```

### 3. Docker Compose (Todos los Servicios)

```bash
# Levantar gateway + auth + courses + postgres
docker-compose up -d

# Ver logs
docker-compose logs -f gateway

# Detener todo
docker-compose down
```

## Endpoints del Gateway

### Gateway Info

#### GET /
Información del gateway y servicios disponibles.

**Response:**
```json
{
  "message": "Teach Microservices API Gateway",
  "version": "1.0.0",
  "services": {
    "auth": "http://localhost:8001",
    "courses": "http://localhost:8002"
  },
  "docs": "/docs"
}
```

#### GET /health
Health check del gateway.

#### GET /services/health
Estado de salud de todos los microservicios.

**Response:**
```json
{
  "gateway": "healthy",
  "services": {
    "auth": {
      "status": "healthy",
      "url": "http://localhost:8001"
    },
    "courses": {
      "status": "healthy",
      "url": "http://localhost:8002"
    }
  },
  "overall_status": "healthy"
}
```

### Documentación Unificada

#### GET /docs
Interfaz Swagger UI con todos los endpoints de todos los microservicios.

#### GET /redoc
Interfaz ReDoc alternativa.

#### GET /openapi.json
Schema OpenAPI combinado de todos los servicios.

## Rutas Proxy

### Auth Service (puerto 8001)

Todas las rutas con prefijo `/auth/*` se redirigen al microservicio de autenticación:

- `POST /auth/signup` → `POST http://localhost:8001/signup`
- `POST /auth/login` → `POST http://localhost:8001/login`
- `GET /auth/health` → `GET http://localhost:8001/health`

**Ejemplo:**
```bash
# Desde el gateway
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

### Courses Service (puerto 8002)

Rutas con prefijo `/courses/*` y `/students/*`:

**Cursos:**
- `POST /courses` → Crear curso
- `GET /courses?teacher_id={uuid}` → Listar cursos
- `GET /courses/{id}` → Obtener curso
- `PATCH /courses/{id}` → Actualizar curso
- `DELETE /courses/{id}` → Eliminar curso

**Estudiantes:**
- `GET /students/{id}` → Obtener estudiante
- `GET /students?email={email}` → Buscar por email
- `PATCH /students/{id}` → Actualizar estudiante

**Inscripciones:**
- `POST /courses/{id}/students` → Inscribir estudiante
- `POST /courses/{id}/students/bulk` → Carga masiva
- `GET /courses/{id}/students` → Listar estudiantes
- `DELETE /courses/{id}/students/{student_id}` → Eliminar estudiante
- `GET /courses/{id}/validate/{email}` → Validar inscripción

**Ejemplo:**
```bash
# Crear curso a través del gateway
curl -X POST http://localhost:8000/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Python 101",
    "description": "Curso introductorio",
    "teacher_id": "uuid-del-docente"
  }'
```

## Autenticación

El gateway puede validar tokens JWT opcionalmente. Configura `SUPABASE_JWT_SECRET` para habilitar la validación.

### Con Token

```bash
curl http://localhost:8000/courses \
  -H "Authorization: Bearer eyJhbGc..."
```

El gateway:
1. Extrae y valida el token JWT
2. Agrega headers `X-User-ID` y `X-User-Email` a la petición al microservicio
3. El microservicio puede usar estos headers para autorización

### Sin Token

Endpoints públicos como `/auth/signup` y `/auth/login` no requieren token.

## CORS

Configurado para permitir requests desde:
- `http://localhost:3000` (React/Next.js)
- `http://localhost:5173` (Vite)

Modifica `CORS_ORIGINS` en `.env` según tus necesidades.

## Estructura del Proyecto

```
gateway/
├── main.py              # App FastAPI principal
├── config.py            # Settings con pydantic-settings
├── proxy.py             # Lógica de proxy routing
├── auth.py              # Validación de JWT
├── openapi_merger.py    # Combinación de OpenAPI schemas
├── dependencies.py      # Inyección de dependencias
├── requirements.txt     # Dependencias Python
├── Dockerfile          # Imagen Docker
├── docker-compose.yml  # Orquestación completa
├── .env.example        # Template de variables
└── README.md
```

## Manejo de Errores

El gateway maneja automáticamente:

### Errores de Conexión (503)
```json
{
  "detail": "Servicio temporalmente no disponible"
}
```

### Timeout (504)
```json
{
  "detail": "El servicio tardó demasiado en responder"
}
```

### Ruta No Encontrada (404)
```json
{
  "detail": "Ruta no encontrada"
}
```

### Token Inválido (401)
```json
{
  "detail": "Token expirado"
}
```

## Logging

El gateway registra todas las peticiones:

```
2026-01-26 10:30:00 - gateway - INFO - POST /auth/login
2026-01-26 10:30:01 - gateway - INFO - Status: 200
```

Activa `DEBUG=True` para logs más detallados.

## Testing

### Flujo Completo

```python
import httpx
import asyncio

async def test_gateway():
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # 1. Signup
        signup_response = await client.post(
            f"{base_url}/auth/signup",
            json={
                "email": "teacher@example.com",
                "password": "password123"
            }
        )
        print(f"Signup: {signup_response.status_code}")
        token = signup_response.json()["access_token"]
        
        # 2. Crear curso (con token)
        course_response = await client.post(
            f"{base_url}/courses",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Python 101",
                "description": "Intro to Python",
                "teacher_id": signup_response.json()["user_id"]
            }
        )
        print(f"Curso creado: {course_response.json()}")
        
        # 3. Health check
        health = await client.get(f"{base_url}/services/health")
        print(f"Health: {health.json()}")

asyncio.run(test_gateway())
```

### Health Check

```bash
# Gateway health
curl http://localhost:8000/health

# Todos los servicios
curl http://localhost:8000/services/health
```

## Deployment

### Desarrollo

```bash
# Iniciar microservicios primero
cd backend/auth
uvicorn main:app --reload --port 8001 &

cd backend/courses
uvicorn main:app --reload --port 8002 &

# Iniciar gateway
cd backend/gateway
uvicorn main:app --reload --port 8000
```

### Producción con Docker

```bash
# Build y push
docker build -t gateway:latest .
docker push your-registry.com/gateway:latest

# Deploy con docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Variables de Entorno en Producción

```env
DEBUG=False
AUTH_SERVICE_URL=http://auth-service:8000
COURSES_SERVICE_URL=http://courses-service:8000
SUPABASE_JWT_SECRET=production-secret
CORS_ORIGINS=["https://app.example.com"]
```

## Monitoreo

### Métricas Recomendadas

1. **Request Rate**: Requests por segundo al gateway
2. **Error Rate**: % de errores 5xx
3. **Latency**: P50, P95, P99 de tiempo de respuesta
4. **Service Health**: Estado de cada microservicio

### Prometheus + Grafana

```python
# Agregar en main.py
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

## Troubleshooting

### Error: "Servicio temporalmente no disponible"

**Causa:** El microservicio no está respondiendo.

**Solución:**
```bash
# Verificar que los servicios están corriendo
curl http://localhost:8001/health
curl http://localhost:8002/health

# Ver logs del gateway
docker-compose logs gateway
```

### Error: "Token expirado"

**Causa:** El token JWT ha expirado (1 hora por defecto).

**Solución:** Hacer login nuevamente para obtener un nuevo token.

### CORS Error en Frontend

**Causa:** El origen del frontend no está en `CORS_ORIGINS`.

**Solución:** Agregar el origen en `.env`:
```env
CORS_ORIGINS=["http://localhost:3000","https://app.example.com"]
```

## Próximos Pasos

1. **Rate Limiting**: Agregar middleware para limitar requests
2. **Caching**: Cachear respuestas frecuentes con Redis
3. **Load Balancing**: Múltiples instancias de cada microservicio
4. **Circuit Breaker**: Implementar patrón para fallos de servicios
5. **API Versioning**: Soporte para múltiples versiones de API

## Documentación Adicional

- [Auth Service](../auth/README.md)
- [Courses Service](../courses/README.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

---

🚀 **Gateway listo para producción!**
