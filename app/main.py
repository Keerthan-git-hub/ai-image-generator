# import os
# from dotenv import load_dotenv
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.routes.image_routes import router as image_router

# load_dotenv()

# app = FastAPI(title="AI Product Image Generator API", version="1.0.0")

# origins = [
#     origin.strip()
#     for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
#     if origin.strip()
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=False,
#     allow_methods=["GET", "POST"],
#     allow_headers=["*"],
# )

# app.include_router(image_router, prefix="/api/images", tags=["images"])

# @app.get("/health")
# def health():
#     return {"status": "ok", "service": "ai-image-generator-api"}

from pathlib import Path
import os
from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_FILE, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.image_routes import router as image_router

app = FastAPI()

origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(image_router, prefix="/api/images", tags=["images"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-image-generator-api"}
