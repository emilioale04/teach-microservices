# =============================================================================
# OPERACIONES CRUD - MICROSERVICIO DE QUIZZES
# =============================================================================
# Este módulo contiene todas las operaciones CRUD (Create, Read, Update, Delete)
# para el microservicio de quizzes. Maneja la persistencia de datos en MongoDB
# para quizzes, preguntas y respuestas de estudiantes.
#
# Funcionalidades principales:
# - Gestión completa de quizzes (crear, actualizar, activar, finalizar)
# - Manejo de preguntas dentro de quizzes
# - Registro y seguimiento de respuestas de estudiantes
# - Estadísticas y reportes de participación
# - Validaciones de integridad de datos
# =============================================================================

"""
CRUD operations for the Quizzes microservice.
Handles database operations for quizzes, questions, and student responses.
"""

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from database import get_collection, QUIZZES_COLLECTION, RESPONSES_COLLECTION
from schemas import (
    QuizCreate, QuizUpdate, QuizStatus,
    QuestionCreate, QuestionUpdate,
    StudentAnswer
)


# =============================================================================
# OPERACIONES CRUD DE QUIZZES
# =============================================================================

async def create_quiz(quiz_data: QuizCreate) -> dict:
    """
    Crear un nuevo quiz en estado DRAFT.

    Inserta un documento de quiz en MongoDB con estado inicial 'DRAFT',
    lista vacía de preguntas y timestamps de creación y actualización.

    Args:
        quiz_data: Datos del quiz a crear (title, description, course_id, etc.)

    Returns:
        dict: Documento del quiz creado con _id convertido a string

    Raises:
        Exception: Si hay error en la inserción en MongoDB
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Crear documento del quiz con campos adicionales
    quiz_doc = {
        **quiz_data.model_dump(),  # Deserializar datos del Pydantic model
        "status": QuizStatus.DRAFT.value,  # Estado inicial: borrador
        "questions": [],  # Lista vacía de preguntas inicialmente
        "created_at": datetime.utcnow(),  # Timestamp de creación
        "updated_at": datetime.utcnow()   # Timestamp de última modificación
    }

    # Insertar en MongoDB y obtener el ObjectId generado
    result = await collection.insert_one(quiz_doc)
    quiz_doc["_id"] = str(result.inserted_id)  # Convertir ObjectId a string

    return quiz_doc


async def get_quiz_by_id(quiz_id: str) -> Optional[dict]:
    """
    Obtener un quiz específico por su ID.

    Busca un quiz en la colección y convierte los ObjectIds a strings
    para compatibilidad con JSON/HTTP.

    Args:
        quiz_id: ID del quiz (como string, se convierte a ObjectId)

    Returns:
        Optional[dict]: Documento del quiz o None si no existe/inválido

    Raises:
        Exception: Si hay error en la consulta a MongoDB
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Validar que el ID sea un ObjectId válido
    if not ObjectId.is_valid(quiz_id):
        return None

    # Buscar el quiz por _id
    quiz = await collection.find_one({"_id": ObjectId(quiz_id)})

    if quiz:
        quiz["_id"] = str(quiz["_id"])  # Convertir _id a string
        # Convertir IDs de preguntas anidadas a strings
        for question in quiz.get("questions", []):
            if isinstance(question.get("_id"), ObjectId):
                question["_id"] = str(question["_id"])

    return quiz


async def get_quizzes_by_course(course_id: Optional[str] = None) -> List[dict]:
    """
    Obtener todos los quizzes, opcionalmente filtrados por curso.

    Lista todos los quizzes ordenados por fecha de creación descendente.
    Si se especifica course_id, filtra solo los quizzes de ese curso.

    Args:
        course_id: ID del curso para filtrar (opcional)

    Returns:
        List[dict]: Lista de quizzes con _id como string y contador de preguntas

    Raises:
        Exception: Si hay error en la consulta a MongoDB
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Construir query: filtrar por course_id si se proporciona
    query = {"course_id": course_id} if course_id else {}
    quizzes = []

    # Consultar con ordenamiento por fecha de creación (más recientes primero)
    cursor = collection.find(query).sort("created_at", -1)

    # Procesar cada documento del cursor
    async for quiz in cursor:
        quiz["_id"] = str(quiz["_id"])  # Convertir _id a string
        quiz["question_count"] = len(quiz.get("questions", []))  # Agregar contador
        quizzes.append(quiz)

    return quizzes


async def get_quizzes_by_course_ids(course_ids: List[str]) -> List[dict]:
    """
    Obtener todos los quizzes para una lista de IDs de cursos.

    Utilizado para filtrar quizzes por cursos de un profesor específico.
    Optimiza consultas cuando se necesitan múltiples cursos.

    Args:
        course_ids: Lista de IDs de cursos

    Returns:
        List[dict]: Lista de quizzes filtrados con metadatos adicionales

    Raises:
        Exception: Si hay error en la consulta a MongoDB
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Si no hay cursos especificados, retornar lista vacía
    if not course_ids:
        return []

    quizzes = []

    # Query con operador $in para buscar en múltiples cursos
    cursor = collection.find({"course_id": {"$in": course_ids}}).sort("created_at", -1)

    # Procesar resultados
    async for quiz in cursor:
        quiz["_id"] = str(quiz["_id"])
        quiz["question_count"] = len(quiz.get("questions", []))
        quizzes.append(quiz)

    return quizzes


async def update_quiz(quiz_id: str, quiz_update: QuizUpdate) -> Optional[dict]:
    """
    Actualizar información básica de un quiz.

    Actualiza solo los campos proporcionados en QuizUpdate y actualiza
    el timestamp de modificación.

    Args:
        quiz_id: ID del quiz a actualizar
        quiz_update: Campos a actualizar (usa exclude_unset=True)

    Returns:
        Optional[dict]: Documento actualizado o None si no existe

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Validar ID del quiz
    if not ObjectId.is_valid(quiz_id):
        return None

    # Obtener solo campos que se van a actualizar
    update_data = quiz_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()  # Actualizar timestamp

    # Actualizar documento y retornar versión actualizada
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id)},
        {"$set": update_data},
        return_document=True  # Retornar documento después de la actualización
    )

    if result:
        result["_id"] = str(result["_id"])
        # Convertir IDs de preguntas a strings
        for question in result.get("questions", []):
            if isinstance(question.get("_id"), ObjectId):
                question["_id"] = str(question["_id"])

    return result


async def delete_quiz(quiz_id: str) -> bool:
    """
    Eliminar un quiz y todas sus respuestas asociadas.

    Realiza una eliminación en cascada: primero elimina todas las respuestas
    de estudiantes para este quiz, luego elimina el quiz mismo.

    Args:
        quiz_id: ID del quiz a eliminar

    Returns:
        bool: True si se eliminó exitosamente, False si el ID es inválido

    Raises:
        Exception: Si hay error en las operaciones de eliminación
    """
    quizzes_collection = get_collection(QUIZZES_COLLECTION)
    responses_collection = get_collection(RESPONSES_COLLECTION)

    # Validar ID del quiz
    if not ObjectId.is_valid(quiz_id):
        return False

    # Eliminar todas las respuestas asociadas al quiz
    await responses_collection.delete_many({"quiz_id": quiz_id})

    # Eliminar el quiz
    result = await quizzes_collection.delete_one({"_id": ObjectId(quiz_id)})

    return result.deleted_count > 0


async def activate_quiz(quiz_id: str) -> Optional[dict]:
    """
    Activar un quiz (cambiar estado de DRAFT a ACTIVE).

    Solo se puede activar un quiz que esté en estado DRAFT.
    Establece timestamp de activación.

    Args:
        quiz_id: ID del quiz a activar

    Returns:
        Optional[dict]: Documento actualizado o None si no existe/no se puede activar

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(QUIZZES_COLLECTION)

    if not ObjectId.is_valid(quiz_id):
        return None

    # Actualizar solo si está en estado DRAFT
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id), "status": QuizStatus.DRAFT.value},
        {
            "$set": {
                "status": QuizStatus.ACTIVE.value,
                "updated_at": datetime.utcnow(),
                "activated_at": datetime.utcnow()  # Timestamp de activación
            }
        },
        return_document=True
    )

    if result:
        result["_id"] = str(result["_id"])

    return result


async def finish_quiz(quiz_id: str) -> Optional[dict]:
    """
    Finalizar/desactivar un quiz (cambiar estado a FINISHED).

    Solo se puede finalizar un quiz que esté en estado ACTIVE.
    Establece timestamp de finalización.

    Args:
        quiz_id: ID del quiz a finalizar

    Returns:
        Optional[dict]: Documento actualizado o None si no existe/no se puede finalizar

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(QUIZZES_COLLECTION)

    if not ObjectId.is_valid(quiz_id):
        return None

    # Actualizar solo si está en estado ACTIVE
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id), "status": QuizStatus.ACTIVE.value},
        {
            "$set": {
                "status": QuizStatus.FINISHED.value,
                "updated_at": datetime.utcnow(),
                "finished_at": datetime.utcnow()  # Timestamp de finalización
            }
        },
        return_document=True
    )

    if result:
        result["_id"] = str(result["_id"])

    return result


# =============================================================================
# OPERACIONES CRUD DE PREGUNTAS
# =============================================================================

async def add_question(quiz_id: str, question_data: QuestionCreate) -> Optional[dict]:
    """
    Agregar una pregunta a un quiz existente.

    Inserta una nueva pregunta en el array 'questions' del documento del quiz.
    La pregunta se agrega al final de la lista.

    Args:
        quiz_id: ID del quiz donde agregar la pregunta
        question_data: Datos de la pregunta a crear

    Returns:
        Optional[dict]: Documento de la pregunta creada o None si el quiz no existe

    Raises:
        Exception: Si hay error en la actualización del documento
    """
    collection = get_collection(QUIZZES_COLLECTION)

    if not ObjectId.is_valid(quiz_id):
        return None

    # Crear documento de pregunta con ObjectId único
    question_doc = {
        "_id": ObjectId(),  # ID único para la pregunta
        **question_data.model_dump()  # Deserializar datos del Pydantic model
    }

    # Agregar pregunta al array 'questions' del quiz
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id)},
        {
            "$push": {"questions": question_doc},  # Agregar al final del array
            "$set": {"updated_at": datetime.utcnow()}  # Actualizar timestamp
        },
        return_document=True
    )

    if result:
        question_doc["_id"] = str(question_doc["_id"])  # Convertir ID a string
        return question_doc

    return None


async def update_question(quiz_id: str, question_id: str, question_update: QuestionUpdate) -> Optional[dict]:
    """
    Actualizar una pregunta específica dentro de un quiz.

    Utiliza el operador posicional ($) de MongoDB para actualizar elementos
    específicos dentro de un array anidado.

    Args:
        quiz_id: ID del quiz que contiene la pregunta
        question_id: ID de la pregunta a actualizar
        question_update: Campos a actualizar en la pregunta

    Returns:
        Optional[dict]: Pregunta actualizada o None si no existe

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(QUIZZES_COLLECTION)

    # Validar ambos IDs
    if not ObjectId.is_valid(quiz_id) or not ObjectId.is_valid(question_id):
        return None

    # Obtener campos a actualizar
    update_data = question_update.model_dump(exclude_unset=True)

    # Construir query de actualización para array anidado
    # questions.$.campo: actualiza el elemento encontrado en el array
    set_fields = {f"questions.$.{key}": value for key, value in update_data.items()}
    set_fields["updated_at"] = datetime.utcnow()

    # Actualizar usando operador posicional
    result = await collection.find_one_and_update(
        {
            "_id": ObjectId(quiz_id),
            "questions._id": ObjectId(question_id)  # Encontrar pregunta específica
        },
        {"$set": set_fields},
        return_document=True
    )

    if result:
        # Encontrar y retornar la pregunta actualizada
        for question in result.get("questions", []):
            if str(question["_id"]) == question_id:
                question["_id"] = str(question["_id"])
                return question

    return None


async def delete_question(quiz_id: str, question_id: str) -> bool:
    """
    Eliminar una pregunta específica de un quiz.

    Utiliza el operador $pull de MongoDB para remover elementos
    específicos de un array.

    Args:
        quiz_id: ID del quiz que contiene la pregunta
        question_id: ID de la pregunta a eliminar

    Returns:
        bool: True si se eliminó exitosamente, False si IDs inválidos

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(QUIZZES_COLLECTION)

    if not ObjectId.is_valid(quiz_id) or not ObjectId.is_valid(question_id):
        return False

    # Remover pregunta específica del array usando $pull
    result = await collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {
            "$pull": {"questions": {"_id": ObjectId(question_id)}},  # Remover elemento
            "$set": {"updated_at": datetime.utcnow()}  # Actualizar timestamp
        }
    )

    return result.modified_count > 0


async def get_question(quiz_id: str, question_id: str) -> Optional[dict]:
    """
    Obtener una pregunta específica de un quiz.

    Busca la pregunta dentro del array de preguntas del documento del quiz.

    Args:
        quiz_id: ID del quiz que contiene la pregunta
        question_id: ID de la pregunta a obtener

    Returns:
        Optional[dict]: Documento de la pregunta o None si no existe

    Raises:
        Exception: Si hay error en la consulta
    """
    # Obtener el quiz completo
    quiz = await get_quiz_by_id(quiz_id)

    if not quiz:
        return None

    # Buscar la pregunta específica en el array
    for question in quiz.get("questions", []):
        if question.get("_id") == question_id:
            return question

    return None
            return question
    
    return None


# =============================================================================
# OPERACIONES CRUD DE RESPUESTAS DE ESTUDIANTES
# =============================================================================

async def create_student_response(quiz_id: str, student_email: str, student_name: Optional[str], total_questions: int) -> dict:
    """
    Crear un nuevo registro de respuesta de estudiante al unirse a un quiz.

    Inicializa el documento de respuesta con puntuación 0, lista vacía de
    respuestas y marca como no completado.

    Args:
        quiz_id: ID del quiz al que se une el estudiante
        student_email: Email del estudiante (se normaliza a minúsculas)
        student_name: Nombre del estudiante (opcional)
        total_questions: Número total de preguntas en el quiz

    Returns:
        dict: Documento de respuesta creado con _id como string

    Raises:
        Exception: Si hay error en la inserción
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Crear documento de respuesta inicial
    response_doc = {
        "quiz_id": quiz_id,
        "student_email": student_email.lower(),  # Normalizar email
        "student_name": student_name,
        "answers": [],  # Lista vacía de respuestas inicialmente
        "score": 0,     # Puntuación inicial
        "total_questions": total_questions,
        "started_at": datetime.utcnow(),  # Timestamp de inicio
        "completed_at": None,  # Se establece al completar
        "is_completed": False  # Estado inicial
    }

    # Insertar en colección de respuestas
    result = await collection.insert_one(response_doc)
    response_doc["_id"] = str(result.inserted_id)  # Convertir ID a string

    return response_doc


async def get_student_response(quiz_id: str, student_email: str) -> Optional[dict]:
    """
    Obtener el registro de respuesta de un estudiante para un quiz específico.

    Busca por combinación única de quiz_id y student_email.

    Args:
        quiz_id: ID del quiz
        student_email: Email del estudiante (se normaliza a minúsculas)

    Returns:
        Optional[dict]: Documento de respuesta o None si no existe

    Raises:
        Exception: Si hay error en la consulta
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Buscar respuesta por quiz y email del estudiante
    response = await collection.find_one({
        "quiz_id": quiz_id,
        "student_email": student_email.lower()  # Normalizar email
    })

    if response:
        response["_id"] = str(response["_id"])  # Convertir ID a string

    return response


async def add_answer(quiz_id: str, student_email: str, answer: StudentAnswer, is_correct: bool) -> Optional[dict]:
    """
    Agregar una respuesta de estudiante a su registro de respuestas.

    Agrega la respuesta al array de answers e incrementa la puntuación
    si la respuesta es correcta.

    Args:
        quiz_id: ID del quiz
        student_email: Email del estudiante
        answer: Datos de la respuesta (question_id, selected_option)
        is_correct: Si la respuesta es correcta o no

    Returns:
        Optional[dict]: Documento de respuesta actualizado o None si no existe

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Crear documento de respuesta individual
    answer_doc = {
        "question_id": answer.question_id,
        "selected_option": answer.selected_option,
        "is_correct": is_correct,
        "answered_at": datetime.utcnow()  # Timestamp de respuesta
    }

    # Incremento de puntuación (1 si correcta, 0 si incorrecta)
    score_increment = 1 if is_correct else 0

    # Agregar respuesta y actualizar puntuación
    result = await collection.find_one_and_update(
        {
            "quiz_id": quiz_id,
            "student_email": student_email.lower()
        },
        {
            "$push": {"answers": answer_doc},  # Agregar respuesta al array
            "$inc": {"score": score_increment}  # Incrementar puntuación
        },
        return_document=True
    )

    if result:
        result["_id"] = str(result["_id"])  # Convertir ID a string

    return result


async def complete_student_response(quiz_id: str, student_email: str) -> Optional[dict]:
    """
    Marcar la respuesta de un estudiante como completada.

    Establece is_completed=True y el timestamp de finalización.
    Se llama cuando el estudiante termina el quiz.

    Args:
        quiz_id: ID del quiz
        student_email: Email del estudiante

    Returns:
        Optional[dict]: Documento actualizado o None si no existe

    Raises:
        Exception: Si hay error en la actualización
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Marcar como completado y establecer timestamp
    result = await collection.find_one_and_update(
        {
            "quiz_id": quiz_id,
            "student_email": student_email.lower()
        },
        {
            "$set": {
                "is_completed": True,
                "completed_at": datetime.utcnow()  # Timestamp de finalización
            }
        },
        return_document=True
    )

    if result:
        result["_id"] = str(result["_id"])

    return result


async def get_quiz_responses(quiz_id: str) -> List[dict]:
    """
    Obtener todas las respuestas de estudiantes para un quiz específico.

    Lista todas las respuestas ordenadas por fecha de inicio (más recientes primero).
    Utilizado para generar reportes y análisis de participación.

    Args:
        quiz_id: ID del quiz

    Returns:
        List[dict]: Lista de todas las respuestas con _id como string

    Raises:
        Exception: Si hay error en la consulta
    """
    collection = get_collection(RESPONSES_COLLECTION)

    responses = []
    # Ordenar por fecha de inicio descendente (más recientes primero)
    cursor = collection.find({"quiz_id": quiz_id}).sort("started_at", -1)

    async for response in cursor:
        response["_id"] = str(response["_id"])  # Convertir ID a string
        responses.append(response)

    return responses


async def get_quiz_statistics(quiz_id: str) -> dict:
    """
    Obtener estadísticas agregadas para un quiz.

    Calcula métricas como número total de participantes, participantes que
    completaron, puntuaciones promedio, máxima y mínima.

    Args:
        quiz_id: ID del quiz para el cual calcular estadísticas

    Returns:
        dict: Diccionario con estadísticas calculadas

    Raises:
        Exception: Si hay error en la agregación
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Pipeline de agregación de MongoDB
    pipeline = [
        {"$match": {"quiz_id": quiz_id}},  # Filtrar por quiz
        {
            "$group": {
                "_id": None,
                "total_participants": {"$sum": 1},  # Contar total de participantes
                "completed_participants": {
                    "$sum": {"$cond": ["$is_completed", 1, 0]}  # Contar completados
                },
                "average_score": {"$avg": "$score"},  # Promedio de puntuaciones
                "highest_score": {"$max": "$score"},  # Puntuación máxima
                "lowest_score": {"$min": "$score"}    # Puntuación mínima
            }
        }
    ]

    # Ejecutar agregación
    results = await collection.aggregate(pipeline).to_list(1)

    if results:
        stats = results[0]
        stats.pop("_id", None)  # Remover campo _id del resultado
        return stats

    # Retornar estadísticas vacías si no hay respuestas
    return {
        "total_participants": 0,
        "completed_participants": 0,
        "average_score": 0,
        "highest_score": 0,
        "lowest_score": 0
    }


async def has_answered_question(quiz_id: str, student_email: str, question_id: str) -> bool:
    """
    Verificar si un estudiante ya ha respondido una pregunta específica.

    Utilizado para prevenir respuestas duplicadas y validar el flujo
    de respuestas durante un quiz.

    Args:
        quiz_id: ID del quiz
        student_email: Email del estudiante
        question_id: ID de la pregunta a verificar

    Returns:
        bool: True si ya ha respondido la pregunta, False en caso contrario

    Raises:
        Exception: Si hay error en la consulta
    """
    collection = get_collection(RESPONSES_COLLECTION)

    # Buscar respuesta que contenga la pregunta específica en el array de answers
    response = await collection.find_one({
        "quiz_id": quiz_id,
        "student_email": student_email.lower(),
        "answers.question_id": question_id  # Buscar en array anidado
    })

    return response is not None
