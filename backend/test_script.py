import traceback
from app.core.config import get_settings

try:
    print("Loading config...")
    settings = get_settings()
    print("Config loaded successfully!")
    print(settings.model_dump())
except Exception:
    traceback.print_exc()
