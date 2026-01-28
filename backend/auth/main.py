# =============================================================================
# MICRO SERVICIO DE AUTENTICACIÓN - TeachMicroservices
# =============================================================================
# Este microservicio maneja toda la autenticación de usuarios usando Supabase
# como backend de autenticación. Proporciona endpoints para registro, login,
# refresh de tokens y recuperación de contraseña.
# =============================================================================

import os
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from supabase import create_client
from dotenv import load_dotenv
import jwt

# Cargar variables de entorno desde archivo .env
load_dotenv()

# =============================================================================
# CONFIGURACIÓN DE LA APLICACIÓN
# =============================================================================

# Crear instancia de FastAPI para el microservicio de autenticación
app = FastAPI(title="Auth Microservice")

# Inicializar cliente de Supabase para autenticación
# Utiliza las credenciales desde variables de entorno
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# =============================================================================
# MODELOS DE DATOS (PYDANTIC)
# =============================================================================

# Modelo para solicitud de registro de usuario
class SignUpRequest(BaseModel):
    email: EmailStr  # Email válido usando Pydantic EmailStr
    password: str    # Contraseña en texto plano

# Modelo para respuesta de autenticación exitosa
class AuthResponse(BaseModel):
    access_token: str   # Token JWT para acceso a recursos
    refresh_token: str  # Token para renovar el access_token
    user_id: str        # ID único del usuario en Supabase

# Modelo para solicitud de refresh token
class RefreshTokenRequest(BaseModel):
    refresh_token: str  # Token de refresh para obtener nuevos tokens

# Modelo para solicitud de recuperación de contraseña
class PasswordResetRequest(BaseModel):
    email: EmailStr  # Email del usuario que solicita reset

# Modelo para confirmación de nueva contraseña
class PasswordResetConfirm(BaseModel):
    password: str  # Nueva contraseña

# Modelo genérico para respuestas de mensajes simples
class MessageResponse(BaseModel):
    message: str  # Mensaje de respuesta (éxito, error, etc.)


# =============================================================================
# ENDPOINTS DE AUTENTICACIÓN
# =============================================================================

@app.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignUpRequest):
    """
    Endpoint para registro de nuevos usuarios.

    Crea una nueva cuenta de usuario en Supabase. Si Supabase está configurado
    para requerir confirmación de email, el usuario no podrá hacer login hasta
    confirmar su email.

    Args:
        request: Datos del usuario (email, password)

    Returns:
        AuthResponse: Tokens de acceso y ID del usuario

    Raises:
        HTTPException: Si hay error en el registro o confirmación requerida
    """
    try:
        # Intentar crear usuario en Supabase
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        # Verificar que el usuario fue creado exitosamente
        if not response.user:
            raise HTTPException(status_code=400, detail="Error al crear usuario")

        # Si no hay sesión, significa que requiere confirmación de email
        if not response.session:
            raise HTTPException(
                status_code=400,
                detail="Usuario creado. Por favor verifica tu email para confirmar la cuenta."
            )

        # Retornar tokens de autenticación
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except HTTPException:
        raise  # Re-lanzar excepciones HTTP ya manejadas
    except Exception as e:
        print(f"Error en signup: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al crear usuario: {str(e)}")


@app.post("/login", response_model=AuthResponse)
async def login(request: SignUpRequest):
    """
    Endpoint para autenticación de usuarios existentes.

    Verifica las credenciales del usuario contra Supabase y retorna
    tokens de acceso si son válidas.

    Args:
        request: Credenciales del usuario (email, password)

    Returns:
        AuthResponse: Tokens de acceso y ID del usuario

    Raises:
        HTTPException: Si las credenciales son inválidas
    """
    try:
        # Intentar autenticar usuario con email y contraseña
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        # Verificar que la autenticación fue exitosa
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")

        # Retornar tokens de autenticación
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refrescar access token usando refresh token.

    Permite obtener nuevos tokens de acceso sin requerir que el usuario
    se autentique nuevamente. El refresh token tiene mayor tiempo de vida
    que el access token.

    Args:
        request: Token de refresh válido

    Returns:
        AuthResponse: Nuevos tokens de acceso

    Raises:
        HTTPException: Si el refresh token es inválido o expirado
    """
    try:
        # Intentar refrescar la sesión con el refresh token
        response = supabase.auth.refresh_session(request.refresh_token)

        # Verificar que el refresh fue exitoso
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

        # Retornar nuevos tokens
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=response.user.id
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error al refrescar token: {str(e)}")


@app.get("/health")
async def health_check():
    """
    Endpoint de verificación de salud del servicio.

    Utilizado por Docker healthchecks y sistemas de monitoreo
    para verificar que el microservicio está funcionando correctamente.

    Returns:
        dict: Estado de salud del servicio
    """
    return {"status": "healthy"}


@app.post("/password-reset", response_model=MessageResponse)
async def request_password_reset(request: PasswordResetRequest):
    """
    Solicitar recuperación de contraseña - envía email con link de reset.

    Envía un email al usuario con un enlace seguro para restablecer
    su contraseña. El enlace incluye un token temporal.

    Args:
        request: Email del usuario

    Returns:
        MessageResponse: Confirmación de envío del email

    Raises:
        HTTPException: Si hay error al enviar el email
    """
    try:
        supabase.auth.reset_password_email(request.email)
        return MessageResponse(message="Email de recuperación enviado")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(request: PasswordResetConfirm):
    """
    Confirmar nueva contraseña con token de reset.

    Actualiza la contraseña del usuario usando el token de reset
    incluido en el enlace del email de recuperación.

    Args:
        request: Nueva contraseña

    Returns:
        MessageResponse: Confirmación de actualización

    Raises:
        HTTPException: Si hay error al actualizar la contraseña
    """
    try:
        supabase.auth.update_user({"password": request.password})
        return MessageResponse(message="Contraseña actualizada correctamente")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
