import os
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from supabase import create_client
from dotenv import load_dotenv
import jwt

load_dotenv()

app = FastAPI(title="Auth Microservice")

# Cliente Supabase
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    password: str


class MessageResponse(BaseModel):
    message: str


@app.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignUpRequest):
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        # Supabase puede crear el usuario pero no devolver sesión si requiere confirmación de email
        if not response.user:
            raise HTTPException(status_code=400, detail="Error al crear usuario")
        
        # Si no hay sesión, es porque requiere confirmación de email
        if not response.session:
            raise HTTPException(
                status_code=400, 
                detail="Usuario creado. Por favor verifica tu email para confirmar la cuenta."
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en signup: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al crear usuario: {str(e)}")


@app.post("/login", response_model=AuthResponse)
async def login(request: SignUpRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refrescar access token usando refresh token"""
    try:
        response = supabase.auth.refresh_session(request.refresh_token)
        
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error al refrescar token: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/password-reset", response_model=MessageResponse)
async def request_password_reset(request: PasswordResetRequest):
    """Solicitar recuperación de contraseña - envía email con link de reset"""
    try:
        supabase.auth.reset_password_email(request.email)
        return MessageResponse(message="Email de recuperación enviado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(request: PasswordResetConfirm):
    """Confirmar nueva contraseña con token de reset"""
    try:
        supabase.auth.update_user({"password": request.password})
        return MessageResponse(message="Contraseña actualizada correctamente")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
