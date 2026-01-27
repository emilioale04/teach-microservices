# Courses Microservice

Microservicio de gestión de cursos y estudiantes usando FastAPI, SQLAlchemy y PostgreSQL.

## Características

- ✅ CRUD completo de cursos
- ✅ Gestión de estudiantes
- ✅ Inscripción individual de estudiantes
- ✅ Carga masiva desde Excel/CSV
- ✅ Validación de inscripción para Quizzes
- ✅ Relación muchos a muchos (Course ↔ Student)
- ✅ PostgreSQL con SQLAlchemy
- ✅ Procesamiento de archivos con pandas
- ✅ Docker ready

## Modelos de Datos

### Course
- `id`: UUID (PK)
- `name`: String(200)
- `description`: Text
- `teacher_id`: UUID

### Student
- `id`: UUID (PK)
- `full_name`: String(200)
- `email`: String(255) - Único

### Enrollment
- `course_id`: UUID (FK)
- `student_id`: UUID (FK)
- Constraint: unique(course_id, student_id)

## Requisitos

- Python 3.11+
- PostgreSQL 15+
- Docker (opcional)

## Configuración

### 1. Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
DATABASE_URL=postgresql://courses_user:courses_password@localhost:5432/courses_db
APP_NAME=Courses Microservice
DEBUG=True
```

### 2. Base de Datos

**Opción A: PostgreSQL Local**
```bash
# Crear base de datos
createdb courses_db

# Crear usuario
psql -c "CREATE USER courses_user WITH PASSWORD 'courses_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE courses_db TO courses_user;"
```

**Opción B: Docker Compose (Recomendado)**
```bash
docker-compose up -d
```

## Instalación

### Local

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### Docker Compose

```bash
docker-compose up -d

# Ver logs
docker-compose logs -f courses

# Detener
docker-compose down
```

## Endpoints

### Cursos

#### POST /courses
Crear un nuevo curso.

**Request:**
```json
{
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `201 Created`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### GET /courses?teacher_id={uuid}
Listar todos los cursos de un docente.

**Response:** `200 OK`
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Python Avanzado",
    "description": "Curso de Python nivel avanzado",
    "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

#### GET /courses/{course_id}
Obtener un curso con sus estudiantes.

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000",
  "students": [
    {
      "id": "student-uuid",
      "full_name": "Juan Pérez",
      "email": "juan@example.com"
    }
  ]
}
```

#### PATCH /courses/{course_id}
Actualizar un curso.

**Request:**
```json
{
  "name": "Python Avanzado 2024",
  "description": "Nueva descripción"
}
```

**Response:** `200 OK`

#### DELETE /courses/{course_id}
Eliminar un curso.

**Response:** `204 No Content`

### Estudiantes

#### POST /courses/{course_id}/students
Inscribir un estudiante individualmente.

**Request:**
```json
{
  "student_email": "juan@example.com",
  "student_name": "Juan Pérez"
}
```

**Response:** `201 Created`
```json
{
  "id": "student-uuid",
  "full_name": "Juan Pérez",
  "email": "juan@example.com"
}
```

#### POST /courses/{course_id}/students/bulk
Carga masiva de estudiantes desde Excel/CSV.

**Request:** `multipart/form-data`
- `file`: Archivo Excel (.xlsx, .xls) o CSV (.csv)

**Formato del archivo:**
| email | full_name |
|-------|-----------|
| juan@example.com | Juan Pérez |
| maria@example.com | María García |

**Response:** `200 OK`
```json
{
  "total_processed": 2,
  "successfully_enrolled": 2,
  "errors": []
}
```

#### GET /courses/{course_id}/students
Listar estudiantes de un curso.

**Response:** `200 OK`
```json
[
  {
    "id": "student-uuid",
    "full_name": "Juan Pérez",
    "email": "juan@example.com"
  }
]
```

#### DELETE /courses/{course_id}/students/{student_id}
Eliminar estudiante de un curso.

**Response:** `204 No Content`

### Validación

#### GET /courses/{course_id}/validate/{email}
Validar si un estudiante está inscrito (usado por Quizzes).

**Response:** `200 OK`
```json
{
  "is_enrolled": true,
  "student_id": "student-uuid",
  "course_id": "course-uuid",
  "email": "juan@example.com"
}
```

### Health Check

#### GET /health
**Response:** `200 OK`
```json
{
  "status": "healthy"
}
```

## Arquitectura

```
courses/
├── main.py              # FastAPI app y endpoints
├── models.py            # Modelos SQLAlchemy
├── schemas.py           # Schemas Pydantic
├── crud.py              # Operaciones CRUD
├── database.py          # Configuración DB
├── config.py            # Settings
├── dependencies.py      # Inyección de dependencias
├── requirements.txt     # Dependencias Python
├── Dockerfile          # Imagen Docker
├── docker-compose.yml  # Orquestación con PostgreSQL
└── docs/               # Documentación detallada
```

## Ejemplos de Uso

### Crear Curso y Estudiantes

```python
import httpx
import asyncio

async def demo():
    async with httpx.AsyncClient() as client:
        # 1. Crear curso
        course_response = await client.post(
            "http://localhost:8002/courses",
            json={
                "name": "Python 101",
                "description": "Introducción a Python",
                "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        )
        course = course_response.json()
        course_id = course["id"]
        
        # 2. Inscribir estudiante
        await client.post(
            f"http://localhost:8002/courses/{course_id}/students",
            json={
                "student_email": "juan@example.com",
                "student_name": "Juan Pérez"
            }
        )
        
        # 3. Listar estudiantes
        students = await client.get(
            f"http://localhost:8002/courses/{course_id}/students"
        )
        print(students.json())

asyncio.run(demo())
```

### Carga Masiva con Excel

```python
import httpx

def upload_students(course_id: str, file_path: str):
    with open(file_path, 'rb') as f:
        response = httpx.post(
            f"http://localhost:8002/courses/{course_id}/students/bulk",
            files={'file': ('students.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        )
    print(response.json())

upload_students("course-uuid", "students.xlsx")
```

## Testing

```bash
# Crear archivo de prueba
pip install pytest httpx

# Ejecutar tests
pytest tests/
```

## Troubleshooting

### Error: Connection refused (PostgreSQL)

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres
```

### Error: Archivo Excel no se procesa

- Verificar que el archivo tiene columnas `email` y `full_name` (o `nombre`)
- Verificar que el archivo no está vacío
- Probar con un archivo CSV simple primero

### Error: Duplicate key violation

- El email del estudiante ya existe
- Esto es normal: el sistema reutiliza estudiantes existentes

## Documentación Adicional

Ver carpeta `docs/` para documentación detallada:
- `API.md` - Documentación completa de API
- `DEVELOPMENT.md` - Guía de desarrollo
- `ARCHITECTURE.md` - Arquitectura del sistema
- `DEPLOYMENT.md` - Guía de despliegue

## Notas

- Las tablas se crean automáticamente al iniciar la aplicación
- Los estudiantes son únicos por email (reutilizables entre cursos)
- La carga masiva soporta Excel (.xlsx, .xls) y CSV
- Swagger/Redoc desactivados (centralizado en Gateway)
