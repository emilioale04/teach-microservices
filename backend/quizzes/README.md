# Quizzes Microservice

Microservicio para gestión de quizzes en tiempo real con soporte para WebSockets.

## 📋 Características

- **CRUD de Quizzes**: Crear, leer, actualizar y eliminar quizzes
- **Gestión de Preguntas**: Cada pregunta tiene 4 opciones y una respuesta correcta
- **Validación de Estudiantes**: Verifica inscripción en el curso antes de permitir participación
- **Tiempo Real**: WebSockets para monitorear progreso de estudiantes en vivo
- **Estadísticas**: Métricas detalladas por quiz y por pregunta

## 🛠 Stack Tecnológico

- **Framework**: FastAPI
- **Base de Datos**: MongoDB (Motor - async driver)
- **WebSockets**: FastAPI WebSockets nativos
- **HTTP Client**: httpx para comunicación entre microservicios

## 📁 Estructura de Archivos

```
quizzes/
├── main.py          # Aplicación FastAPI con endpoints y WebSockets
├── schemas.py       # Modelos Pydantic para validación
├── crud.py          # Operaciones CRUD con MongoDB
├── database.py      # Configuración de conexión a MongoDB
├── requirements.txt # Dependencias Python
├── Dockerfile       # Configuración Docker
└── README.md        # Esta documentación
```

## 🚀 Ejecución Local

### Prerequisitos
- Python 3.11+
- MongoDB 6.0+

### Instalación

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar servidor
uvicorn main:app --reload --port 8003
```

## 🐳 Docker

```bash
# Construir imagen
docker build -t quizzes-service .

# Ejecutar contenedor
docker run -p 8003:8000 \
  -e MONGODB_URL=mongodb://mongo:27017 \
  -e COURSES_SERVICE_URL=http://courses:8000 \
  quizzes-service
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Estado del servicio

### Quizzes (Docente)
- `POST /quizzes` - Crear quiz
- `GET /quizzes?course_id={uuid}` - Listar quizzes de un curso
- `GET /quizzes/{quiz_id}` - Obtener quiz con preguntas
- `PATCH /quizzes/{quiz_id}` - Actualizar quiz
- `DELETE /quizzes/{quiz_id}` - Eliminar quiz
- `POST /quizzes/{quiz_id}/activate` - Activar quiz
- `POST /quizzes/{quiz_id}/finish` - Finalizar quiz

### Preguntas (Docente)
- `POST /quizzes/{quiz_id}/questions` - Agregar pregunta
- `PATCH /quizzes/{quiz_id}/questions/{question_id}` - Actualizar pregunta
- `DELETE /quizzes/{quiz_id}/questions/{question_id}` - Eliminar pregunta

### Participación (Estudiante)
- `POST /quizzes/{quiz_id}/join` - Unirse al quiz (requiere email)
- `GET /quizzes/{quiz_id}/student?email={email}` - Obtener preguntas (sin respuestas)
- `POST /quizzes/{quiz_id}/answer?email={email}` - Enviar respuesta
- `GET /quizzes/{quiz_id}/my-progress?email={email}` - Ver mi progreso

### Resultados (Docente)
- `GET /quizzes/{quiz_id}/responses` - Todas las respuestas
- `GET /quizzes/{quiz_id}/statistics` - Estadísticas del quiz

### WebSocket (Docente)
- `WS /ws/quizzes/{quiz_id}/monitor` - Monitoreo en tiempo real

## 🔌 WebSocket Events

### Eventos enviados al docente:
```json
// Estudiante se une
{"event": "student_joined", "student_email": "...", "timestamp": "..."}

// Estudiante responde pregunta
{"event": "student_progress", "student_email": "...", "question_number": 3, ...}

// Estudiante completa quiz
{"event": "student_completed", "student_email": "...", "final_score": 8, ...}

// Quiz finalizado
{"event": "quiz_finished", "quiz_id": "...", "timestamp": "..."}
```

### Comandos del cliente:
- `ping` → Responde con `{"event": "pong"}`
- `stats` → Envía estadísticas actualizadas

## 📊 Modelos de Datos

### Quiz
```json
{
  "_id": "ObjectId",
  "title": "Quiz de Matemáticas",
  "description": "Evaluación del tema 1",
  "course_id": "uuid-del-curso",
  "status": "draft|active|finished",
  "questions": [...],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Question
```json
{
  "_id": "ObjectId",
  "text": "¿Cuánto es 2+2?",
  "options": ["3", "4", "5", "6"],
  "correct_option": 1
}
```

### Student Response
```json
{
  "_id": "ObjectId",
  "quiz_id": "...",
  "student_email": "estudiante@email.com",
  "student_name": "Juan Pérez",
  "answers": [...],
  "score": 8,
  "total_questions": 10,
  "is_completed": true
}
```

## 🔐 Validación de Estudiantes

Antes de permitir que un estudiante participe, el servicio consulta al microservicio de cursos:

```
GET http://courses:8000/courses/{course_id}/validate/{email}
```

Solo estudiantes inscritos en el curso pueden participar.

## 🔧 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `MONGODB_URL` | URL de conexión a MongoDB | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Nombre de la base de datos | `quizzes_db` |
| `COURSES_SERVICE_URL` | URL del servicio de cursos | `http://courses:8000` |
