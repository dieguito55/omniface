# ✅ src/protected.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from config import SECRET_KEY, ALGORITHM
from database import get_connection

usuarios_router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class DatosToken(BaseModel):
    sub: str
    id: int
    rol: str

def verificar_token(token: str = Depends(oauth2_scheme)) -> DatosToken:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return DatosToken(sub=payload["sub"], id=payload["id"], rol=payload["rol"])
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
def obtener_nombre_desde_bd(usuario_id: int) -> str:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nombre FROM usuarios WHERE id = %s", (usuario_id,))
    resultado = cursor.fetchone()
    return resultado[0] if resultado else "Usuario"

@usuarios_router.get("/perfil")
def perfil_usuario(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT nombre, correo, imagen FROM usuarios WHERE id = %s", (usuario.id,))
    datos = cursor.fetchone()
    if not datos:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "mensaje": "Acceso concedido",
        "usuario_id": usuario.id,
        "correo": usuario.sub,
        "rol": usuario.rol,
        "imagen": datos["imagen"],  # ✅ Este es nuevo
        "nombre": obtener_nombre_desde_bd(usuario.id)  # 👈 Agrega esta línea

        
    }

@usuarios_router.get("/panel-admin")
def acceso_admin(usuario: DatosToken = Depends(verificar_token)):
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder")
    return {
        "mensaje": f"Bienvenido al panel admin, {usuario.sub}"
    }
