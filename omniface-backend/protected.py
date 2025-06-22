# ✅ src/protected.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from config import SECRET_KEY, ALGORITHM

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

@usuarios_router.get("/perfil")
def perfil_usuario(usuario: DatosToken = Depends(verificar_token)):
    return {
        "mensaje": "Acceso concedido",
        "usuario_id": usuario.id,
        "correo": usuario.sub,
        "rol": usuario.rol
    }

@usuarios_router.get("/panel-admin")
def acceso_admin(usuario: DatosToken = Depends(verificar_token)):
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder")
    return {
        "mensaje": f"Bienvenido al panel admin, {usuario.sub}"
    }
