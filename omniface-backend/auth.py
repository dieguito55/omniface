# ✅ omniface-backend/auth.py
from fastapi import APIRouter, HTTPException, Request
from database import get_connection
from utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from models import UsuarioRegistro, UsuarioLoginzwh
from jose.exceptions import JWTError

auth_router = APIRouter(prefix="/auth", tags=["Autenticación"])

@auth_router.post("/registrar")
def registrar(usuario: UsuarioRegistro):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM usuarios WHERE correo = %s", (usuario.correo,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Correo ya registrado")

    hash_clave = hash_password(usuario.contraseña)
    cursor.execute("""
        INSERT INTO usuarios (nombre, correo, contrasena_hash, rol)
        VALUES (%s, %s, %s, %s)
    """, (usuario.nombre, usuario.correo, hash_clave, "admin"))
    conn.commit()
    return {"mensaje": "Usuario registrado correctamente"}

@auth_router.post("/login")
def login(datos: UsuarioLogin):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (datos.correo,))
    usuario = cursor.fetchone()

    if not usuario or not verify_password(datos.contraseña, usuario["contrasena_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    payload = {
        "sub": usuario["correo"],
        "id": usuario["id"],
        "rol": usuario["rol"]
    }

    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "nombre": usuario["nombre"],
        "correo": usuario["correo"],
        "rol": usuario["rol"]
    }

@auth_router.post("/refrescar-token")
async def refrescar_token(request: Request):
    body = await request.json()
    refresh_token = body.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token requerido")

    try:
        datos = decode_token(refresh_token)
        nuevo_access_token = create_access_token({
            "sub": datos["sub"],
            "id": datos["id"],
            "rol": datos["rol"]
        })
        return {"access_token": nuevo_access_token}
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
