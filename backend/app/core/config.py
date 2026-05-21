from functools import lru_cache
from pathlib import Path
import os
from dotenv import load_dotenv

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
if ROOT_ENV_PATH.exists():
    load_dotenv(ROOT_ENV_PATH)
else:
    load_dotenv()


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Procura API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://10.40.7.51:3000",
        "http://10.40.7.51:3001",
        "https://procura-demo.vercel.app",
        os.getenv("FRONTEND_URL", "https://procura-demo.vercel.app")
    ]

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # File Upload
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: list[str] = ["application/pdf"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
