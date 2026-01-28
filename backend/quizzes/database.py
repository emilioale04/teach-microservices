"""
Database connection module for MongoDB using Motor (async driver).
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "quizzes_db")

# Global client instance
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongo():
    """
    Create database connection on startup.
    """
    global client, database
    logger.info(f"Connecting to MongoDB at {MONGODB_URL}...")
    
    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]
    
    # Verify connection
    try:
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """
    Close database connection on shutdown.
    """
    global client
    if client:
        logger.info("Closing MongoDB connection...")
        client.close()
        logger.info("MongoDB connection closed")


def get_database():
    """
    Get the database instance.
    """
    return database


def get_collection(collection_name: str):
    """
    Get a specific collection from the database.
    """
    return database[collection_name]


# Collection names
QUIZZES_COLLECTION = "quizzes"
RESPONSES_COLLECTION = "responses"
