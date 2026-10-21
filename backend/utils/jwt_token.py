from datetime import datetime, timedelta
import base64
import hashlib
import hmac
import json
import os

SECRET = os.getenv("JWT_SECRET", "SUPER_SECRET_KEY")
ALGO = "HS256"

try:
    import jwt
    _HAS_PYJWT = True
except Exception:
    _HAS_PYJWT = False


def create_token(data: dict):
    payload = data.copy()
    if _HAS_PYJWT:
        payload["exp"] = datetime.utcnow() + timedelta(days=2)
        return jwt.encode(payload, SECRET, algorithm=ALGO)
    payload["exp"] = (datetime.utcnow() + timedelta(days=2)).isoformat()
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    sig = hmac.new(SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def decode_token(token: str):
    if _HAS_PYJWT:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("Invalid token")
    raw, sig = parts
    expected = hmac.new(SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise ValueError("Invalid token signature")
    return json.loads(base64.urlsafe_b64decode(raw.encode("utf-8")).decode("utf-8"))
