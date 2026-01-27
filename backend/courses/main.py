import os
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, UUID4
from sqlalchemy import create_engine, Column, String, Text, ForeignKey, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from typing import List, Optional
from contextlib import contextmanager, asynccontextmanager
from dotenv import load_dotenv
import uuid
import pandas as pd
import io
import jwt

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown (if needed)

app = FastAPI(title="Courses Microservice", lifespan=lifespan)

# Database setup
engine = create_engine(os.getenv("DATABASE_URL"), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Models
enrollments = Table(
    'enrollments', Base.metadata,
    Column('course_id', UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), primary_key=True),
    Column('student_id', UUID(as_uuid=True), ForeignKey('students.id', ondelete='CASCADE'), primary_key=True),
    UniqueConstraint('course_id', 'student_id', name='unique_enrollment')
)


class Course(Base):
    __tablename__ = 'courses'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    students = relationship('Student', secondary=enrollments, back_populates='courses', lazy='selectin')


class Student(Base):
    __tablename__ = 'students'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    courses = relationship('Course', secondary=enrollments, back_populates='students', lazy='selectin')


# Schemas
class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    teacher_id: UUID4


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class StudentResponse(BaseModel):
    id: UUID4
    full_name: str
    email: EmailStr
    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: UUID4
    name: str
    description: Optional[str]
    teacher_id: UUID4
    model_config = {"from_attributes": True}


class CourseWithStudents(CourseResponse):
    students: List[StudentResponse]


class EnrollStudentRequest(BaseModel):
    student_email: EmailStr
    student_name: str


class BulkEnrollResponse(BaseModel):
    success_count: int
    error_count: int
    errors: List[str]


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


# Database helper
@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Course endpoints
@app.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course: CourseCreate):
    with get_db() as db:
        db_course = Course(name=course.name, description=course.description, teacher_id=course.teacher_id)
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        return db_course


@app.get("/courses", response_model=List[CourseResponse])
def list_courses(teacher_id: UUID4):
    with get_db() as db:
        return db.query(Course).filter(Course.teacher_id == teacher_id).all()


@app.get("/courses/{course_id}", response_model=CourseWithStudents)
def get_course(course_id: UUID4):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        return course


@app.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: UUID4, course_update: CourseUpdate):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        update_data = course_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(course, field, value)
        
        db.commit()
        db.refresh(course)
        return course


@app.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: UUID4):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        db.delete(course)
        db.commit()


# Student endpoints
@app.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: UUID4):
    with get_db() as db:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        return student


@app.get("/students", response_model=StudentResponse)
def get_student_by_email(email: str):
    with get_db() as db:
        student = db.query(Student).filter(Student.email == email.lower().strip()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        return student


@app.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(student_id: UUID4, student_update: StudentUpdate):
    with get_db() as db:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
        update_data = student_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        
        db.commit()
        db.refresh(student)
        return student


# Enrollment endpoints
@app.post("/courses/{course_id}/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def enroll_student(course_id: UUID4, request: EnrollStudentRequest):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # Get or create student
        student = db.query(Student).filter(Student.email == request.student_email.lower()).first()
        if not student:
            student = Student(full_name=request.student_name, email=request.student_email.lower())
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Enroll
        if student not in course.students:
            course.students.append(student)
            db.commit()
        
        return student


@app.post("/courses/{course_id}/students/bulk", response_model=BulkEnrollResponse)
async def bulk_enroll_students(course_id: UUID4, file: UploadFile = File(...)):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # Read file
        content = await file.read()
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error leyendo archivo: {str(e)}")
        
        # Validate columns
        if 'email' not in df.columns:
            raise HTTPException(status_code=400, detail="Archivo debe tener columna 'email'")
        
        name_col = 'full_name' if 'full_name' in df.columns else 'nombre' if 'nombre' in df.columns else None
        if not name_col:
            raise HTTPException(status_code=400, detail="Archivo debe tener columna 'full_name' o 'nombre'")
        
        # Process students
        success_count = 0
        error_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                email = str(row['email']).lower().strip()
                name = str(row[name_col]).strip()
                
                if not email or not name:
                    errors.append(f"Fila {idx + 2}: email o nombre vacío")
                    error_count += 1
                    continue
                
                # Get or create student
                student = db.query(Student).filter(Student.email == email).first()
                if not student:
                    student = Student(full_name=name, email=email)
                    db.add(student)
                    db.flush()
                
                # Enroll
                if student not in course.students:
                    course.students.append(student)
                
                success_count += 1
            except Exception as e:
                errors.append(f"Fila {idx + 2}: {str(e)}")
                error_count += 1
        
        db.commit()
        return BulkEnrollResponse(success_count=success_count, error_count=error_count, errors=errors)


@app.delete("/courses/{course_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_student(course_id: UUID4, student_id: UUID4):
    with get_db() as db:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
        if student in course.students:
            course.students.remove(student)
            db.commit()


@app.get("/health")
def health_check():
    return {"status": "healthy"}
