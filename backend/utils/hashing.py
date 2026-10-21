import hashlib

try:
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _HAS_PASSLIB = True
except Exception:
    _HAS_PASSLIB = False


def hash_password(password: str):
    if _HAS_PASSLIB:
        try:
            return pwd.hash(password)
        except Exception:
            pass
    return "sha256$" + hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain, hashed):
    if str(hashed).startswith("sha256$"):
        return hash_password(plain) == hashed
    if _HAS_PASSLIB:
        try:
            return pwd.verify(plain, hashed)
        except Exception:
            pass
    return hash_password(plain) == hashed
