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


# ========================
# Quiz CRUD Operations
# ========================

async def create_quiz(quiz_data: QuizCreate) -> dict:
    """
    Create a new quiz.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    quiz_doc = {
        **quiz_data.model_dump(),
        "status": QuizStatus.DRAFT.value,
        "questions": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await collection.insert_one(quiz_doc)
    quiz_doc["_id"] = str(result.inserted_id)
    
    return quiz_doc


async def get_quiz_by_id(quiz_id: str) -> Optional[dict]:
    """
    Get a quiz by its ID.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return None
    
    quiz = await collection.find_one({"_id": ObjectId(quiz_id)})
    
    if quiz:
        quiz["_id"] = str(quiz["_id"])
        # Convert question IDs to strings
        for question in quiz.get("questions", []):
            if isinstance(question.get("_id"), ObjectId):
                question["_id"] = str(question["_id"])
    
    return quiz


async def get_quizzes_by_course(course_id: Optional[str] = None) -> List[dict]:
    """
    Get all quizzes, optionally filtered by course.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    query = {"course_id": course_id} if course_id else {}
    quizzes = []
    cursor = collection.find(query).sort("created_at", -1)
    
    async for quiz in cursor:
        quiz["_id"] = str(quiz["_id"])
        quiz["question_count"] = len(quiz.get("questions", []))
        quizzes.append(quiz)
    
    return quizzes


async def get_quizzes_by_course_ids(course_ids: List[str]) -> List[dict]:
    """
    Get all quizzes for a list of course IDs.
    Used to filter quizzes by teacher's courses.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not course_ids:
        return []
    
    quizzes = []
    cursor = collection.find({"course_id": {"$in": course_ids}}).sort("created_at", -1)
    
    async for quiz in cursor:
        quiz["_id"] = str(quiz["_id"])
        quiz["question_count"] = len(quiz.get("questions", []))
        quizzes.append(quiz)
    
    return quizzes


async def update_quiz(quiz_id: str, quiz_update: QuizUpdate) -> Optional[dict]:
    """
    Update a quiz's basic information.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return None
    
    update_data = quiz_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
        for question in result.get("questions", []):
            if isinstance(question.get("_id"), ObjectId):
                question["_id"] = str(question["_id"])
    
    return result


async def delete_quiz(quiz_id: str) -> bool:
    """
    Delete a quiz and all associated responses.
    """
    quizzes_collection = get_collection(QUIZZES_COLLECTION)
    responses_collection = get_collection(RESPONSES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return False
    
    # Delete all responses for this quiz
    await responses_collection.delete_many({"quiz_id": quiz_id})
    
    # Delete the quiz
    result = await quizzes_collection.delete_one({"_id": ObjectId(quiz_id)})
    
    return result.deleted_count > 0


async def activate_quiz(quiz_id: str) -> Optional[dict]:
    """
    Activate a quiz (change status from DRAFT to ACTIVE).
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return None
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id), "status": QuizStatus.DRAFT.value},
        {
            "$set": {
                "status": QuizStatus.ACTIVE.value,
                "updated_at": datetime.utcnow(),
                "activated_at": datetime.utcnow()
            }
        },
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
    
    return result


async def finish_quiz(quiz_id: str) -> Optional[dict]:
    """
    Finish/deactivate a quiz (change status to FINISHED).
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return None
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id), "status": QuizStatus.ACTIVE.value},
        {
            "$set": {
                "status": QuizStatus.FINISHED.value,
                "updated_at": datetime.utcnow(),
                "finished_at": datetime.utcnow()
            }
        },
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
    
    return result


# ========================
# Question CRUD Operations
# ========================

async def add_question(quiz_id: str, question_data: QuestionCreate) -> Optional[dict]:
    """
    Add a question to a quiz.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id):
        return None
    
    question_doc = {
        "_id": ObjectId(),
        **question_data.model_dump()
    }
    
    result = await collection.find_one_and_update(
        {"_id": ObjectId(quiz_id)},
        {
            "$push": {"questions": question_doc},
            "$set": {"updated_at": datetime.utcnow()}
        },
        return_document=True
    )
    
    if result:
        question_doc["_id"] = str(question_doc["_id"])
        return question_doc
    
    return None


async def update_question(quiz_id: str, question_id: str, question_update: QuestionUpdate) -> Optional[dict]:
    """
    Update a specific question in a quiz.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id) or not ObjectId.is_valid(question_id):
        return None
    
    update_data = question_update.model_dump(exclude_unset=True)
    
    # Build the update query for nested array element
    set_fields = {f"questions.$.{key}": value for key, value in update_data.items()}
    set_fields["updated_at"] = datetime.utcnow()
    
    result = await collection.find_one_and_update(
        {
            "_id": ObjectId(quiz_id),
            "questions._id": ObjectId(question_id)
        },
        {"$set": set_fields},
        return_document=True
    )
    
    if result:
        # Find and return the updated question
        for question in result.get("questions", []):
            if str(question["_id"]) == question_id:
                question["_id"] = str(question["_id"])
                return question
    
    return None


async def delete_question(quiz_id: str, question_id: str) -> bool:
    """
    Remove a question from a quiz.
    """
    collection = get_collection(QUIZZES_COLLECTION)
    
    if not ObjectId.is_valid(quiz_id) or not ObjectId.is_valid(question_id):
        return False
    
    result = await collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {
            "$pull": {"questions": {"_id": ObjectId(question_id)}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return result.modified_count > 0


async def get_question(quiz_id: str, question_id: str) -> Optional[dict]:
    """
    Get a specific question from a quiz.
    """
    quiz = await get_quiz_by_id(quiz_id)
    
    if not quiz:
        return None
    
    for question in quiz.get("questions", []):
        if question.get("_id") == question_id:
            return question
    
    return None


# ========================
# Student Response CRUD Operations
# ========================

async def create_student_response(quiz_id: str, student_email: str, student_name: Optional[str], total_questions: int) -> dict:
    """
    Create a new student response record when they join a quiz.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    response_doc = {
        "quiz_id": quiz_id,
        "student_email": student_email.lower(),
        "student_name": student_name,
        "answers": [],
        "score": 0,
        "total_questions": total_questions,
        "started_at": datetime.utcnow(),
        "completed_at": None,
        "is_completed": False
    }
    
    result = await collection.insert_one(response_doc)
    response_doc["_id"] = str(result.inserted_id)
    
    return response_doc


async def get_student_response(quiz_id: str, student_email: str) -> Optional[dict]:
    """
    Get a student's response record for a quiz.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    response = await collection.find_one({
        "quiz_id": quiz_id,
        "student_email": student_email.lower()
    })
    
    if response:
        response["_id"] = str(response["_id"])
    
    return response


async def add_answer(quiz_id: str, student_email: str, answer: StudentAnswer, is_correct: bool) -> Optional[dict]:
    """
    Add a student's answer to their response record.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    answer_doc = {
        "question_id": answer.question_id,
        "selected_option": answer.selected_option,
        "is_correct": is_correct,
        "answered_at": datetime.utcnow()
    }
    
    # Increment score if correct
    score_increment = 1 if is_correct else 0
    
    result = await collection.find_one_and_update(
        {
            "quiz_id": quiz_id,
            "student_email": student_email.lower()
        },
        {
            "$push": {"answers": answer_doc},
            "$inc": {"score": score_increment}
        },
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
    
    return result


async def complete_student_response(quiz_id: str, student_email: str) -> Optional[dict]:
    """
    Mark a student's response as completed.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    result = await collection.find_one_and_update(
        {
            "quiz_id": quiz_id,
            "student_email": student_email.lower()
        },
        {
            "$set": {
                "is_completed": True,
                "completed_at": datetime.utcnow()
            }
        },
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
    
    return result


async def get_quiz_responses(quiz_id: str) -> List[dict]:
    """
    Get all student responses for a quiz.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    responses = []
    cursor = collection.find({"quiz_id": quiz_id}).sort("started_at", -1)
    
    async for response in cursor:
        response["_id"] = str(response["_id"])
        responses.append(response)
    
    return responses


async def get_quiz_statistics(quiz_id: str) -> dict:
    """
    Get statistics for a quiz.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    pipeline = [
        {"$match": {"quiz_id": quiz_id}},
        {
            "$group": {
                "_id": None,
                "total_participants": {"$sum": 1},
                "completed_participants": {
                    "$sum": {"$cond": ["$is_completed", 1, 0]}
                },
                "average_score": {"$avg": "$score"},
                "highest_score": {"$max": "$score"},
                "lowest_score": {"$min": "$score"}
            }
        }
    ]
    
    results = await collection.aggregate(pipeline).to_list(1)
    
    if results:
        stats = results[0]
        stats.pop("_id", None)
        return stats
    
    return {
        "total_participants": 0,
        "completed_participants": 0,
        "average_score": 0,
        "highest_score": 0,
        "lowest_score": 0
    }


async def has_answered_question(quiz_id: str, student_email: str, question_id: str) -> bool:
    """
    Check if a student has already answered a specific question.
    """
    collection = get_collection(RESPONSES_COLLECTION)
    
    response = await collection.find_one({
        "quiz_id": quiz_id,
        "student_email": student_email.lower(),
        "answers.question_id": question_id
    })
    
    return response is not None
