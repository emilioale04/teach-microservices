# API Documentation - Courses Microservice

## Descripción General

Microservicio de gestión de cursos y estudiantes con soporte para inscripción individual y carga masiva desde archivos Excel/CSV. Utiliza PostgreSQL como base de datos y SQLAlchemy como ORM.

---

## Tabla de Contenidos

- [Endpoints](#endpoints)
  - [Cursos (CRUD)](#cursos-crud)
  - [Estudiantes](#estudiantes)
  - [Validación](#validación)
- [Modelos de Datos](#modelos-de-datos)
- [Códigos de Estado](#códigos-de-estado)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Endpoints

### Cursos (CRUD)

#### 1. Crear Curso

Crea un nuevo curso asociado a un docente.

**Endpoint:** `POST /courses`

**Request Body:**
```json
{
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request Schema:**
| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| name | string | Sí | min_length=1, max_length=200 | Nombre del curso |
| description | string | No | - | Descripción del curso |
| teacher_id | UUID | Sí | UUID válido | ID del docente (del microservicio Auth) |

**Responses:**

**✅ 201 Created**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**❌ 400 Bad Request**
```json
{
  "detail": "Error al crear curso: ..."
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8002/courses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Avanzado",
    "description": "Curso de Python nivel avanzado",
    "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

#### 2. Listar Cursos de un Docente

Obtiene todos los cursos de un docente específico.

**Endpoint:** `GET /courses?teacher_id={uuid}`

**Query Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| teacher_id | UUID | Sí | ID del docente |

**Responses:**

**✅ 200 OK**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Python Avanzado",
    "description": "Curso de Python nivel avanzado",
    "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "JavaScript Moderno",
    "description": "React, Vue, Node.js",
    "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

**Ejemplo cURL:**
```bash
curl "http://localhost:8002/courses?teacher_id=550e8400-e29b-41d4-a716-446655440000"
```

---

#### 3. Obtener Curso por ID

Obtiene un curso específico con su lista de estudiantes inscritos.

**Endpoint:** `GET /courses/{course_id}`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Responses:**

**✅ 200 OK**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Avanzado",
  "description": "Curso de Python nivel avanzado",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000",
  "students": [
    {
      "id": "student-uuid-1",
      "full_name": "Juan Pérez",
      "email": "juan@example.com"
    },
    {
      "id": "student-uuid-2",
      "full_name": "María García",
      "email": "maria@example.com"
    }
  ]
}
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000
```

---

#### 4. Actualizar Curso

Actualiza los datos de un curso existente (actualización parcial).

**Endpoint:** `PATCH /courses/{course_id}`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Request Body:**
```json
{
  "name": "Python Avanzado 2024",
  "description": "Curso actualizado con nuevas tecnologías"
}
```

**Request Schema:**
| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| name | string | No | min_length=1, max_length=200 | Nuevo nombre |
| description | string | No | - | Nueva descripción |

**Responses:**

**✅ 200 OK**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Avanzado 2024",
  "description": "Curso actualizado con nuevas tecnologías",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl -X PATCH http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Avanzado 2024"
  }'
```

---

#### 5. Eliminar Curso

Elimina un curso y todas sus inscripciones asociadas.

**Endpoint:** `DELETE /courses/{course_id}`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Responses:**

**✅ 204 No Content**

Sin contenido en el body.

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl -X DELETE http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000
```

---

### Estudiantes

#### 6. Inscribir Estudiante Individual

Inscribe un estudiante en un curso. Si el estudiante no existe, lo crea automáticamente.

**Endpoint:** `POST /courses/{course_id}/students`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Request Body:**
```json
{
  "student_email": "juan@example.com",
  "student_name": "Juan Pérez"
}
```

**Request Schema:**
| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| student_email | EmailStr | Sí | Email válido | Email del estudiante |
| student_name | string | Sí | min_length=1, max_length=200 | Nombre completo |

**Responses:**

**✅ 201 Created**
```json
{
  "id": "student-uuid",
  "full_name": "Juan Pérez",
  "email": "juan@example.com"
}
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**❌ 400 Bad Request**
```json
{
  "detail": "Error al inscribir estudiante: ..."
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000/students \
  -H "Content-Type: application/json" \
  -d '{
    "student_email": "juan@example.com",
    "student_name": "Juan Pérez"
  }'
```

---

#### 7. Carga Masiva de Estudiantes

Inscribe múltiples estudiantes desde un archivo Excel o CSV.

**Endpoint:** `POST /courses/{course_id}/students/bulk`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Request:** `multipart/form-data`
- **file**: Archivo Excel (.xlsx, .xls) o CSV (.csv)

**Formato del Archivo:**

**Excel/CSV debe contener:**
| email | full_name |
|-------|-----------|
| juan@example.com | Juan Pérez |
| maria@example.com | María García |
| pedro@example.com | Pedro López |

**Columnas aceptadas para nombre:**
- `full_name`
- `nombre`
- `name`
- `Full Name`
- `Nombre`

**Responses:**

**✅ 200 OK**
```json
{
  "total_processed": 3,
  "successfully_enrolled": 3,
  "errors": []
}
```

**Con errores parciales:**
```json
{
  "total_processed": 5,
  "successfully_enrolled": 3,
  "errors": [
    {
      "row": 3,
      "email": "invalid-email",
      "error": "Email inválido"
    },
    {
      "row": 5,
      "email": "test@example.com",
      "error": "Nombre inválido"
    }
  ]
}
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**❌ 400 Bad Request**
```json
{
  "detail": "Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)"
}
```

```json
{
  "detail": "El archivo debe contener columnas 'email' y 'full_name' (o 'nombre')"
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000/students/bulk \
  -F "file=@students.xlsx"
```

**Ejemplo Python:**
```python
import httpx

def upload_students(course_id: str, file_path: str):
    with open(file_path, 'rb') as f:
        files = {'file': (file_path, f)}
        response = httpx.post(
            f"http://localhost:8002/courses/{course_id}/students/bulk",
            files=files
        )
    return response.json()

result = upload_students(
    "123e4567-e89b-12d3-a456-426614174000",
    "students.xlsx"
)
print(f"Inscritos: {result['successfully_enrolled']}/{result['total_processed']}")
```

---

#### 8. Listar Estudiantes de un Curso

Obtiene todos los estudiantes inscritos en un curso.

**Endpoint:** `GET /courses/{course_id}/students`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |

**Responses:**

**✅ 200 OK**
```json
[
  {
    "id": "student-uuid-1",
    "full_name": "Juan Pérez",
    "email": "juan@example.com"
  },
  {
    "id": "student-uuid-2",
    "full_name": "María García",
    "email": "maria@example.com"
  }
]
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000/students
```

---

#### 9. Eliminar Estudiante de un Curso

Desinscribe un estudiante de un curso específico.

**Endpoint:** `DELETE /courses/{course_id}/students/{student_id}`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |
| student_id | UUID | ID del estudiante |

**Responses:**

**✅ 204 No Content**

Sin contenido en el body.

**❌ 404 Not Found**
```json
{
  "detail": "Curso o estudiante no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl -X DELETE http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000/students/student-uuid
```

---

### Validación

#### 10. Validar Inscripción de Estudiante

Verifica si un estudiante está inscrito en un curso. **Usado por el microservicio de Quizzes.**

**Endpoint:** `GET /courses/{course_id}/validate/{email}`

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| course_id | UUID | ID del curso |
| email | string | Email del estudiante |

**Responses:**

**✅ 200 OK - Estudiante inscrito**
```json
{
  "is_enrolled": true,
  "student_id": "student-uuid",
  "course_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "juan@example.com"
}
```

**✅ 200 OK - Estudiante NO inscrito**
```json
{
  "is_enrolled": false,
  "student_id": null,
  "course_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "noexiste@example.com"
}
```

**❌ 404 Not Found**
```json
{
  "detail": "Curso no encontrado"
}
```

**Ejemplo cURL:**
```bash
curl http://localhost:8002/courses/123e4567-e89b-12d3-a456-426614174000/validate/juan@example.com
```

**Ejemplo Python:**
```python
import httpx

async def validate_student(course_id: str, email: str) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8002/courses/{course_id}/validate/{email}"
        )
        data = response.json()
        return data["is_enrolled"]

# Uso desde microservicio de Quizzes
is_enrolled = await validate_student(
    "123e4567-e89b-12d3-a456-426614174000",
    "juan@example.com"
)
if not is_enrolled:
    raise HTTPException(403, "Estudiante no inscrito en el curso")
```

---

### Health Check

#### 11. Health Check

Verifica el estado del servicio.

**Endpoint:** `GET /health`

**Responses:**

**✅ 200 OK**
```json
{
  "status": "healthy"
}
```

**Ejemplo cURL:**
```bash
curl http://localhost:8002/health
```

---

## Modelos de Datos

### Course

```python
class Course:
    id: UUID               # PK, auto-generado
    name: str              # Nombre del curso
    description: str       # Descripción (opcional)
    teacher_id: UUID       # ID del docente (del microservicio Auth)
    students: List[Student]  # Relación muchos a muchos
```

### Student

```python
class Student:
    id: UUID           # PK, auto-generado
    full_name: str     # Nombre completo
    email: str         # Email único (índice)
    courses: List[Course]  # Relación muchos a muchos
```

### Enrollment

```python
# Tabla intermedia (sin modelo explícito)
course_id: UUID    # FK a courses.id
student_id: UUID   # FK a students.id
# Constraint: unique(course_id, student_id)
```

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado exitosamente |
| 204 | No Content - Eliminación exitosa |
| 400 | Bad Request - Error en los datos enviados |
| 404 | Not Found - Recurso no encontrado |
| 422 | Unprocessable Entity - Error de validación Pydantic |
| 500 | Internal Server Error - Error del servidor |

---

## Ejemplos de Uso

### Flujo Completo: Crear Curso y Agregar Estudiantes

```python
import httpx
import asyncio

async def setup_course():
    base_url = "http://localhost:8002"
    teacher_id = "550e8400-e29b-41d4-a716-446655440000"
    
    async with httpx.AsyncClient() as client:
        # 1. Crear curso
        course_response = await client.post(
            f"{base_url}/courses",
            json={
                "name": "FastAPI Masterclass",
                "description": "Curso completo de FastAPI",
                "teacher_id": teacher_id
            }
        )
        course = course_response.json()
        course_id = course["id"]
        print(f"✅ Curso creado: {course_id}")
        
        # 2. Inscribir estudiante individual
        student_response = await client.post(
            f"{base_url}/courses/{course_id}/students",
            json={
                "student_email": "juan@example.com",
                "student_name": "Juan Pérez"
            }
        )
        print(f"✅ Estudiante inscrito: {student_response.json()}")
        
        # 3. Carga masiva (si tienes archivo)
        # with open("students.xlsx", "rb") as f:
        #     bulk_response = await client.post(
        #         f"{base_url}/courses/{course_id}/students/bulk",
        #         files={"file": f}
        #     )
        #     print(f"✅ Carga masiva: {bulk_response.json()}")
        
        # 4. Listar estudiantes
        students = await client.get(f"{base_url}/courses/{course_id}/students")
        print(f"✅ Total estudiantes: {len(students.json())}")
        
        # 5. Validar inscripción
        validation = await client.get(
            f"{base_url}/courses/{course_id}/validate/juan@example.com"
        )
        print(f"✅ Validación: {validation.json()}")

asyncio.run(setup_course())
```

### Crear Archivo Excel para Carga Masiva

```python
import pandas as pd

# Crear DataFrame con estudiantes
students_data = {
    'email': [
        'juan@example.com',
        'maria@example.com',
        'pedro@example.com',
        'ana@example.com',
        'luis@example.com'
    ],
    'full_name': [
        'Juan Pérez',
        'María García',
        'Pedro López',
        'Ana Martínez',
        'Luis Rodríguez'
    ]
}

df = pd.DataFrame(students_data)

# Guardar como Excel
df.to_excel('students.xlsx', index=False)

# O como CSV
df.to_csv('students.csv', index=False)

print("✅ Archivo creado: students.xlsx")
```

---

## Rate Limiting

**Recomendaciones para el Gateway:**
- Endpoints de creación/modificación: 30 requests/minuto
- Carga masiva: 5 requests/minuto
- Lectura (GET): Sin límite estricto
- Validación: Sin límite (usado por otros microservicios)

---

## Integración con Otros Microservicios

### Desde Gateway

```python
# El Gateway debe extraer teacher_id del JWT y pasarlo al endpoint
@app.post("/courses")
async def create_course_gateway(
    request: CourseCreateRequest,
    token_data: dict = Depends(get_current_user)
):
    teacher_id = token_data["user_id"]
    
    # Forward a microservicio de courses
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://courses-service:8000/courses",
            json={
                "name": request.name,
                "description": request.description,
                "teacher_id": teacher_id
            }
        )
    return response.json()
```

### Desde Microservicio de Quizzes

```python
# Validar que el estudiante esté inscrito antes de permitir quiz
@app.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: UUID,
    course_id: UUID,
    student_email: str,
    answers: List[Answer]
):
    # Validar inscripción
    async with httpx.AsyncClient() as client:
        validation = await client.get(
            f"http://courses-service:8000/courses/{course_id}/validate/{student_email}"
        )
        data = validation.json()
        
        if not data["is_enrolled"]:
            raise HTTPException(
                status_code=403,
                detail="Estudiante no inscrito en el curso"
            )
    
    # Procesar quiz...
```

---

## Troubleshooting

### Error: "Duplicate key violation"
**Causa:** Email de estudiante ya existe.  
**Solución:** Normal, el sistema reutiliza estudiantes. Si quieres actualizar el nombre, simplemente envía el nuevo nombre con el mismo email.

### Error: "El archivo debe contener columnas 'email' y 'full_name'"
**Causa:** Archivo Excel sin las columnas requeridas.  
**Solución:** Verificar que el Excel tenga columnas `email` y `full_name` (o `nombre`).

### Error: "Curso no encontrado" en validación
**Causa:** El course_id no existe o es inválido.  
**Solución:** Verificar que el UUID del curso sea correcto.

### Archivo Excel no se procesa
**Soluciones:**
1. Verificar formato del archivo (.xlsx, .xls, .csv)
2. Verificar que no esté vacío
3. Verificar que los emails sean válidos
4. Probar con un CSV simple primero

---

## Testing

```bash
# Health check
curl http://localhost:8002/health

# Crear curso de prueba
curl -X POST http://localhost:8002/courses \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Course","teacher_id":"550e8400-e29b-41d4-a716-446655440000"}'

# Listar cursos
curl "http://localhost:8002/courses?teacher_id=550e8400-e29b-41d4-a716-446655440000"
```
