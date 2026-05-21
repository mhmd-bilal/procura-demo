from supabase import create_client, Client
from app.core.config import get_settings

settings = get_settings()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get or create Supabase client with service role key."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_client


def get_supabase_anon() -> Client:
    """Get Supabase client with anon key (for user-context operations)."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )
