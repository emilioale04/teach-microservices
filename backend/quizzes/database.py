# =============================================================================
# MÓDULO DE CONEXIÓN A BASE DE DATOS - MICROSERVICIO DE QUIZZES
# =============================================================================
# Este módulo maneja la conexión asíncrona a MongoDB utilizando Motor,
# el driver asíncrono oficial de MongoDB para Python.
#
# Funcionalidades principales:
# - Conexión y desconexión de base de datos
# - Gestión de instancias globales de cliente y base de datos
# - Verificación de conectividad
# - Acceso a colecciones específicas
# - Configuración centralizada de nombres de colección
# =============================================================================

"""
Database connection module for MongoDB using Motor (async driver).
Maneja la configuración y conexión asíncrona a MongoDB para el microservicio de quizzes.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

# =============================================================================
# CONFIGURACIÓN INICIAL
# =============================================================================

# Cargar variables de entorno desde archivo .env
load_dotenv()

# Configurar sistema de logging para monitoreo de conexiones
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURACIÓN DE MONGODB
# =============================================================================

# URL de conexión a MongoDB (con valor por defecto para desarrollo local)
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

# Nombre de la base de datos (con valor por defecto)
DATABASE_NAME = os.getenv("DATABASE_NAME", "quizzes_db")

# =============================================================================
# INSTANCIAS GLOBALES
# =============================================================================

# Instancia global del cliente MongoDB (se inicializa en connect_to_mongo)
client: AsyncIOMotorClient = None

# Instancia global de la base de datos (se inicializa en connect_to_mongo)
database = None


# =============================================================================
# FUNCIONES DE CONEXIÓN Y DESCONEXIÓN
# =============================================================================

async def connect_to_mongo():
    """
    Establecer conexión a MongoDB durante el inicio de la aplicación.

    Crea una instancia del cliente Motor y verifica la conectividad
    mediante un comando 'ping' a la base de datos admin.

    Esta función debe ser llamada durante el startup del microservicio
    (por ejemplo, en el lifespan manager de FastAPI).

    Raises:
        Exception: Si falla la conexión o verificación de ping
    """
    global client, database

    logger.info(f"Connecting to MongoDB at {MONGODB_URL}...")

    # Crear cliente Motor con la URL de conexión
    client = AsyncIOMotorClient(MONGODB_URL)

    # Obtener referencia a la base de datos específica
    database = client[DATABASE_NAME]

    # Verificar la conexión mediante ping
    try:
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """
    Cerrar la conexión a MongoDB durante el apagado de la aplicación.

    Libera los recursos de conexión de manera ordenada.
    Esta función debe ser llamada durante el shutdown del microservicio.

    Nota: Es importante cerrar las conexiones para evitar leaks de recursos.
    """
    global client

    if client:
        logger.info("Closing MongoDB connection...")
        client.close()
        logger.info("MongoDB connection closed")


# =============================================================================
# FUNCIONES DE ACCESO A BASE DE DATOS
# =============================================================================

def get_database():
    """
    Obtener la instancia de la base de datos.

    Retorna la instancia global de la base de datos que fue inicializada
    durante la conexión. Debe llamarse después de connect_to_mongo().

    Returns:
        Database: Instancia de la base de datos MongoDB

    Raises:
        AttributeError: Si la base de datos no ha sido inicializada
    """
    return database


def get_collection(collection_name: str):
    """
    Obtener una colección específica de la base de datos.

    Proporciona acceso directo a colecciones individuales de MongoDB.
    Esta es la función principal utilizada por las operaciones CRUD.

    Args:
        collection_name: Nombre de la colección a acceder

    Returns:
        AsyncIOMotorCollection: Instancia de la colección especificada

    Example:
        quizzes_collection = get_collection("quizzes")
        await quizzes_collection.find_one({"_id": ObjectId(quiz_id)})
    """
    return database[collection_name]


# =============================================================================
# CONSTANTES DE NOMBRES DE COLECCIÓN
# =============================================================================

# Nombre de la colección que almacena los documentos de quizzes
QUIZZES_COLLECTION = "quizzes"

# Nombre de la colección que almacena las respuestas de estudiantes
RESPONSES_COLLECTION = "responses"
