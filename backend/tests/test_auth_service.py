from jose import jwt

from app.services.auth_service import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    password = "FactorAI-test-password-123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_access_token_contains_user_id():
    token = create_access_token(42)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == "42"
    assert "exp" in payload
