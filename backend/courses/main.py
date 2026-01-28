# =============================================================================
# MICRO SERVICIO DE CURSOS - TeachMicroservices
# =============================================================================
# Este microservicio maneja la gestión completa de cursos y estudiantes.
# Proporciona funcionalidades para:
# - Crear, leer, actualizar y eliminar cursos
# - Gestionar estudiantes y matrículas
# - Importación masiva de estudiantes via CSV
# - Validación de permisos de profesores
# - Integración con el microservicio de quizzes
# =============================================================================

import os
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, UUID4
from sqlalchemy import create_engine, Column, String, Text, ForeignKey, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker, relationship, declarative_base, Session
from typing import List, Optional
from contextlib import contextmanager, asynccontextmanager
from dotenv import load_dotenv
import uuid
import pandas as pd
import io
import jwt
import time
import logging

# =============================================================================
# CONFIGURACIÓN INICIAL
# =============================================================================

# Cargar variables de entorno
load_dotenv()

# Configurar sistema de logging para monitoreo y debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =============================================================================

# Obtener URL de conexión a PostgreSQL desde variables de entorno
DATABASE_URL = os.getenv("DATABASE_URL")

# Crear engine de SQLAlchemy con configuración optimizada
# pool_pre_ping: Verifica conexiones antes de usarlas
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Configurar sesión de base de datos
# expire_on_commit=False: Mantiene objetos después del commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# Base declarativa para modelos SQLAlchemy
Base = declarative_base()

# =============================================================================
# LIFESPAN MANAGEMENT
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestor del ciclo de vida de la aplicación FastAPI.

    Se ejecuta al iniciar la aplicación para crear las tablas de la base de datos
    con sistema de reintentos en caso de fallos de conexión.

    Args:
        app: Instancia de FastAPI

    Yields:
        None
    """
    # STARTUP: Intentar crear tablas con reintentos
    max_retries = 5
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to create database tables (attempt {attempt + 1}/{max_retries})...")
            # Crear todas las tablas definidas en los modelos
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            break
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 2 seconds...")
                time.sleep(2)  # Esperar antes del siguiente intento
            else:
                logger.error("Failed to initialize database after maximum retries")
                raise

    # Aplicación corriendo
    yield

    # SHUTDOWN: Aquí se podría agregar limpieza si fuera necesaria
    # (por ahora no se necesita)

# =============================================================================
# CONFIGURACIÓN DE FASTAPI
# =============================================================================

# Crear instancia de FastAPI con lifespan manager
app = FastAPI(title="Courses Microservice", lifespan=lifespan)


# =============================================================================
# MODELOS DE BASE DE DATOS (SQLAlchemy)
# =============================================================================

# Tabla de asociación many-to-many entre cursos y estudiantes
# Esta tabla maneja las matrículas de estudiantes en cursos
enrollments = Table(
    'enrollments', Base.metadata,
    # Clave primaria compuesta
    Column('course_id', UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), primary_key=True),
    Column('student_id', UUID(as_uuid=True), ForeignKey('students.id', ondelete='CASCADE'), primary_key=True),
    # Restricción de unicidad para evitar matrículas duplicadas
    UniqueConstraint('course_id', 'student_id', name='unique_enrollment')
)

class Course(Base):
    """
    Modelo que representa un curso en el sistema.

    Un curso pertenece a un profesor (teacher_id) y puede tener múltiples estudiantes
    matriculados a través de la tabla de asociación 'enrollments'.
    """
    __tablename__ = 'courses'

    # Identificador único del curso (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Nombre del curso (máximo 200 caracteres)
    name = Column(String(200), nullable=False)

    # Descripción opcional del curso
    description = Column(Text, nullable=True)

    # ID del profesor que creó el curso (índice para optimizar consultas)
    teacher_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Relación many-to-many con estudiantes
    # lazy='selectin': Carga los estudiantes cuando se accede a la propiedad
    students = relationship('Student', secondary=enrollments, back_populates='courses', lazy='selectin')


class Student(Base):
    """
    Modelo que representa un estudiante en el sistema.

    Un estudiante puede estar matriculado en múltiples cursos a través de
    la tabla de asociación 'enrollments'.
    """
    __tablename__ = 'students'

    # Identificador único del estudiante (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Nombre completo del estudiante
    full_name = Column(String(200), nullable=False)

    # Email único del estudiante (con índice para búsquedas rápidas)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Relación many-to-many con cursos
    courses = relationship('Course', secondary=enrollments, back_populates='students', lazy='selectin')


# =============================================================================
# ESQUEMAS PYDANTIC (Request/Response Models)
# =============================================================================

class CourseCreate(BaseModel):
    """Esquema para crear un nuevo curso."""
    name: str
    description: Optional[str] = None
    teacher_id: UUID4


class CourseUpdate(BaseModel):
    """Esquema para actualizar un curso existente."""
    name: Optional[str] = None
    description: Optional[str] = None


class StudentResponse(BaseModel):
    """Esquema de respuesta para datos de estudiante."""
    id: UUID4
    full_name: str
    email: EmailStr
    # Configuración para compatibilidad con SQLAlchemy
    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    """Esquema de respuesta básico para datos de curso."""
    id: UUID4
    name: str
    description: Optional[str]
    teacher_id: UUID4
    # Configuración para compatibilidad con SQLAlchemy
    model_config = {"from_attributes": True}


class CourseWithStudents(CourseResponse):
    """Esquema de respuesta extendido que incluye lista de estudiantes."""
    students: List[StudentResponse]


class EnrollStudentRequest(BaseModel):
    """Esquema para matricular un estudiante en un curso."""
    student_email: EmailStr
    student_name: str


class BulkEnrollResponse(BaseModel):
    """Esquema de respuesta para matriculación masiva."""
    success_count: int  # Número de estudiantes matriculados exitosamente
    error_count: int    # Número de errores encontrados
    errors: List[str]   # Lista detallada de errores


class StudentUpdate(BaseModel):
    """Esquema para actualizar datos de estudiante."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


# =============================================================================
# FUNCIONES HELPER Y UTILIDADES
# =============================================================================

@contextmanager
def get_db():
    """
    Context manager para obtener una sesión de base de datos.

    Garantiza que la sesión se cierre correctamente después de su uso,
    incluso si ocurre una excepción.

    Yields:
        Session: Sesión activa de SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_course_ownership(db: Session, course_id: UUID4, teacher_id: str) -> Course:
    """
    Verificar que un curso existe y pertenece al profesor especificado.

    Args:
        db: Sesión de base de datos activa
        course_id: ID del curso a verificar
        teacher_id: ID del profesor que debería ser propietario

    Returns:
        Course: Objeto Course si la verificación es exitosa

    Raises:
        HTTPException: Si el curso no existe o no pertenece al profesor
    """
    # Buscar el curso en la base de datos
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    # Verificar propiedad - comparar UUIDs como strings para manejar diferentes formatos
    if str(course.teacher_id) != str(teacher_id):
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para acceder a este curso"
        )
    return course


# =============================================================================
# ENDPOINTS DE CURSOS
# =============================================================================

@app.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course: CourseCreate):
    """
    Crear un nuevo curso.

    Args:
        course: Datos del curso a crear (name, description, teacher_id)

    Returns:
        CourseResponse: Datos del curso creado

    Raises:
        HTTPException: Si hay error en la creación
    """
    with get_db() as db:
        # Crear instancia del curso
        db_course = Course(name=course.name, description=course.description, teacher_id=course.teacher_id)

        # Agregar a la sesión y confirmar cambios
        db.add(db_course)
        db.commit()
        db.refresh(db_course)  # Recargar para obtener el ID generado

        return db_course


@app.get("/courses", response_model=List[CourseResponse])
def list_courses(teacher_id: UUID4):
    """
    Listar todos los cursos de un profesor específico.

    Args:
        teacher_id: ID del profesor cuyos cursos se quieren listar

    Returns:
        List[CourseResponse]: Lista de cursos del profesor
    """
    with get_db() as db:
        return db.query(Course).filter(Course.teacher_id == teacher_id).all()


@app.get("/courses/{course_id}", response_model=CourseWithStudents)
def get_course(course_id: UUID4, x_user_id: Optional[str] = Header(None)):
    """
    Obtener detalles de un curso específico, incluyendo estudiantes matriculados.

    Args:
        course_id: ID del curso a consultar
        x_user_id: ID del usuario (opcional, para verificación de permisos)

    Returns:
        CourseWithStudents: Datos del curso con lista de estudiantes

    Raises:
        HTTPException: Si el curso no existe o no tiene permisos
    """
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        # Si se proporciona X-User-ID, verificar propiedad del curso
        if x_user_id:
            if str(course.teacher_id) != str(x_user_id):
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para acceder a este curso"
                )
        return course


@app.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: UUID4, course_update: CourseUpdate, x_user_id: str = Header(...)):
    """
    Actualizar un curso existente.

    Solo el profesor propietario puede actualizar su curso.

    Args:
        course_id: ID del curso a actualizar
        course_update: Campos a actualizar (name, description)
        x_user_id: ID del profesor (requerido para verificación de permisos)

    Returns:
        CourseResponse: Datos actualizados del curso

    Raises:
        HTTPException: Si el curso no existe o no tiene permisos
    """
    with get_db() as db:
        # Verificar propiedad del curso
        course = verify_course_ownership(db, course_id, x_user_id)

        # Aplicar solo los campos proporcionados (no None)
        update_data = course_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(course, field, value)

        # Confirmar cambios y recargar
        db.commit()
        db.refresh(course)
        return course


@app.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: UUID4, x_user_id: str = Header(...)):
    """
    Eliminar un curso existente.

    Solo el profesor propietario puede eliminar su curso.
    La eliminación en cascada removerá automáticamente las matrículas.

    Args:
        course_id: ID del curso a eliminar
        x_user_id: ID del profesor (requerido para verificación de permisos)

    Raises:
        HTTPException: Si el curso no existe o no tiene permisos
    """
    with get_db() as db:
        # Verificar propiedad del curso
        course = verify_course_ownership(db, course_id, x_user_id)

        # Eliminar el curso (las matrículas se eliminan automáticamente por CASCADE)
        db.delete(course)
        db.commit()


# =============================================================================
# ENDPOINTS DE ESTUDIANTES
# =============================================================================

@app.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: UUID4):
    """
    Obtener datos de un estudiante específico por ID.

    Args:
        student_id: ID único del estudiante

    Returns:
        StudentResponse: Datos del estudiante

    Raises:
        HTTPException: Si el estudiante no existe
    """
    with get_db() as db:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        return student


@app.get("/students", response_model=StudentResponse)
def get_student_by_email(email: str):
    """
    Obtener datos de un estudiante por email.

    Args:
        email: Email del estudiante (se normaliza a minúsculas)

    Returns:
        StudentResponse: Datos del estudiante

    Raises:
        HTTPException: Si el estudiante no existe
    """
    with get_db() as db:
        # Buscar por email normalizado (minúsculas y sin espacios)
        student = db.query(Student).filter(Student.email == email.lower().strip()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        return student


@app.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(student_id: UUID4, student_update: StudentUpdate):
    """
    Actualizar datos de un estudiante.

    Args:
        student_id: ID del estudiante a actualizar
        student_update: Campos a actualizar (full_name, email)

    Returns:
        StudentResponse: Datos actualizados del estudiante

    Raises:
        HTTPException: Si el estudiante no existe
    """
    with get_db() as db:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        # Aplicar solo los campos proporcionados
        update_data = student_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)

        # Confirmar cambios y recargar
        db.commit()
        db.refresh(student)
        return student


# Enrollment endpoints
# =============================================================================
# ENDPOINTS DE MATRÍCULAS (ENROLLMENT)
# =============================================================================

@app.post("/courses/{course_id}/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def enroll_student(course_id: UUID4, request: EnrollStudentRequest, x_user_id: str = Header(...)):
    """
    Matricular un estudiante en un curso.

    Si el estudiante no existe, se crea automáticamente.
    Si ya está matriculado, no hace nada (idempotente).

    Args:
        course_id: ID del curso donde matricular
        request: Datos del estudiante (email, nombre)
        x_user_id: ID del profesor (requerido para verificación de permisos)

    Returns:
        StudentResponse: Datos del estudiante matriculado

    Raises:
        HTTPException: Si el curso no existe o no tiene permisos
    """
    with get_db() as db:
        # Verificar que el profesor es propietario del curso
        course = verify_course_ownership(db, course_id, x_user_id)

        # Buscar estudiante existente por email (normalizado)
        student = db.query(Student).filter(Student.email == request.student_email.lower()).first()

        # Si no existe, crear nuevo estudiante
        if not student:
            student = Student(full_name=request.student_name, email=request.student_email.lower())
            db.add(student)
            db.commit()
            db.refresh(student)

        # Matricular estudiante en el curso (si no está ya matriculado)
        if student not in course.students:
            course.students.append(student)
            db.commit()
            db.refresh(student)

        return student


@app.post("/courses/{course_id}/students/bulk", response_model=BulkEnrollResponse)
async def bulk_enroll_students(course_id: UUID4, x_user_id: str = Header(...), file: UploadFile = File(...)):
    """
    Matricular estudiantes masivamente desde un archivo CSV.

    El CSV debe contener las columnas:
    - 'email': Email del estudiante (requerido)
    - 'full_name' o 'nombre': Nombre completo del estudiante (requerido)

    Procesa cada fila del CSV, creando estudiantes nuevos si no existen
    y matriculándolos en el curso. Reporta éxito y errores por fila.

    Args:
        course_id: ID del curso donde matricular
        x_user_id: ID del profesor (requerido para verificación de permisos)
        file: Archivo CSV con datos de estudiantes

    Returns:
        BulkEnrollResponse: Resumen de matriculaciones exitosas y errores

    Raises:
        HTTPException: Si el archivo no es válido o hay problemas de permisos
    """
    with get_db() as db:
        # Verificar propiedad del curso
        course = verify_course_ownership(db, course_id, x_user_id)

        # VALIDACIÓN DEL ARCHIVO
        # Verificar que sea un archivo CSV
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Solo se aceptan archivos CSV. Por favor sube un archivo con extensión .csv"
            )

        # Leer contenido del archivo
        content = await file.read()

        # Verificar que el archivo no esté vacío
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        # Intentar parsear el CSV con pandas
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error leyendo archivo CSV: {str(e)}. Asegúrate de que el archivo tenga el formato correcto."
            )

        # Verificar que el CSV tenga datos
        if df.empty:
            raise HTTPException(status_code=400, detail="El archivo CSV no contiene datos")

        # VALIDACIÓN DE COLUMNAS
        # Verificar columna de email (requerida)
        if 'email' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="El archivo debe tener una columna 'email'. Columnas encontradas: " + ", ".join(df.columns)
            )

        # Verificar columna de nombre (acepta 'full_name' o 'nombre')
        name_col = 'full_name' if 'full_name' in df.columns else 'nombre' if 'nombre' in df.columns else None
        if not name_col:
            raise HTTPException(
                status_code=400,
                detail="El archivo debe tener una columna 'full_name' o 'nombre'. Columnas encontradas: " + ", ".join(df.columns)
            )

        # PROCESAMIENTO DE ESTUDIANTES
        success_count = 0
        error_count = 0
        errors = []

        # Procesar cada fila del CSV
        for idx, row in df.iterrows():
            try:
                # Extraer y normalizar datos
                email = str(row['email']).lower().strip()
                name = str(row[name_col]).strip()

                # Validar que los campos no estén vacíos
                if not email or not name:
                    errors.append(f"Fila {idx + 2}: email o nombre vacío")
                    error_count += 1
                    continue

                # Buscar o crear estudiante
                student = db.query(Student).filter(Student.email == email).first()
                if not student:
                    student = Student(full_name=name, email=email)
                    db.add(student)
                    db.flush()  # Flush para obtener ID sin commit

                # Matricular en el curso (si no está ya matriculado)
                if student not in course.students:
                    course.students.append(student)

                success_count += 1

            except Exception as e:
                # Registrar error específico de la fila
                errors.append(f"Fila {idx + 2}: {str(e)}")
                error_count += 1

        # Confirmar todos los cambios
        db.commit()

        return BulkEnrollResponse(success_count=success_count, error_count=error_count, errors=errors)


@app.delete("/courses/{course_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_student(course_id: UUID4, student_id: UUID4, x_user_id: str = Header(...)):
    """
    Desmatricular un estudiante de un curso.

    Solo el profesor propietario del curso puede desmatricular estudiantes.

    Args:
        course_id: ID del curso
        student_id: ID del estudiante a desmatricular
        x_user_id: ID del profesor (requerido para verificación de permisos)

    Raises:
        HTTPException: Si el curso/estudiante no existe o no tiene permisos
    """
    with get_db() as db:
        # Verificar propiedad del curso
        course = verify_course_ownership(db, course_id, x_user_id)

        # Verificar que el estudiante existe
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        # Desmatricular si está inscrito
        if student in course.students:
            course.students.remove(student)
            db.commit()


@app.get("/health")
def health_check():
    """
    Endpoint de verificación de salud del microservicio.

    Utilizado por Docker healthchecks y sistemas de monitoreo
    para verificar que el servicio está funcionando correctamente.

    Returns:
        dict: Estado de salud del servicio
    """
    return {"status": "healthy"}


# =============================================================================
# ENDPOINTS DE INTEGRACIÓN CON OTROS MICROSERVICIOS
# =============================================================================

@app.get("/courses/{course_id}/validate/{email}", response_model=StudentResponse)
def validate_student_enrollment(course_id: UUID4, email: str):
    """
    Validar que un estudiante está matriculado en un curso específico.

    Endpoint utilizado por el microservicio de quizzes para verificar
    que un estudiante tiene derecho a participar en un quiz de un curso.

    Args:
        course_id: ID del curso
        email: Email del estudiante a validar

    Returns:
        StudentResponse: Datos del estudiante si está matriculado

    Raises:
        HTTPException: Si el curso no existe, estudiante no existe,
                      o estudiante no está matriculado
    """
    with get_db() as db:
        # Verificar que el curso existe
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        # Buscar estudiante por email
        student = db.query(Student).filter(Student.email == email.lower().strip()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        # Verificar que el estudiante está matriculado en el curso
        if student not in course.students:
            raise HTTPException(status_code=404, detail="Estudiante no inscrito en el curso")

        return student
