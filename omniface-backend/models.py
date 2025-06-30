# ✅ omniface-backend/models.py
from pydantic import BaseModel, EmailStr

class Usuario(BaseModel):
    id: int
    nombre: str
    correo: EmailStr
    rol: str

    class Config:
        from_attributes = True

class UsuarioRegistro(BaseModel):
    nombre: str
    correo: EmailStr
    contraseña: str

class UsuarioLogin(BaseModel):
    correo: EmailStr
    contraseña: str
