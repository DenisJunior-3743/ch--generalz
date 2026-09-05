import os

from dotenv import load_dotenv
from gridfs import GridFSBucket
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["university_app"]
photo_bucket = GridFSBucket(mongo_db, bucket_name="photos")
