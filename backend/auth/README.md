# Auth Microservice

Microservicio de autenticación para docentes usando FastAPI y Supabase Auth.

## Características

- ✅ Registro de docentes (SignUp)
- ✅ Autenticación (Login)
- ✅ Integración con Supabase Auth
- ✅ Tipado estricto con Pydantic v2
- ✅ Inyección de dependencias
- ✅ Docker ready

## Requisitos

- Python 3.11+
- Supabase account

## Configuración

1. Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configurar las variables de entorno en `.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

## Instalación

### Local

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Docker

```bash
docker build -t auth-service .
docker run -p 8000:8000 --env-file .env auth-service
```

## Endpoints

### POST /signup
Registro de nuevo docente.

**Request:**
```json
{
  "email": "docente@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user_id": "uuid-here"
}
```

### POST /login
Autenticación de docente.

**Request:**
```json
{
  "email": "docente@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user_id": "uuid-here"
}
```

### GET /health
Health check del servicio.

**Response:**
```json
{
  "status": "healthy"
}
```

## Arquitectura

```
auth/
├── main.py              # FastAPI app y endpoints
├── schemas.py           # Modelos Pydantic
├── auth_service.py      # Lógica de negocio
├── dependencies.py      # Inyección de dependencias
├── config.py            # Configuración con pydantic-settings
├── requirements.txt     # Dependencias Python
└── Dockerfile          # Imagen Docker
```

## Notas

- La documentación Swagger/Redoc está desactivada (centralizada en el Gateway)
- Todas las validaciones se manejan con Pydantic v2
- El cliente de Supabase se inyecta como dependencia
