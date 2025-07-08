# ✅ omniface-backend/departamentos.py
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from database import get_connection
from protected import verificar_token, DatosToken

departamentos_router = APIRouter(prefix="/departamentos", tags=["Departamentos"])

@departamentos_router.get("/listar")
def listar_departamentos(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, nombre FROM departamentos
        WHERE usuario_id = %s
        ORDER BY nombre ASC
    """, (usuario.id,))
    return {"departamentos": cursor.fetchall()}

@departamentos_router.post("/agregar")
def agregar_departamento(
    nombre: str = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO departamentos (usuario_id, nombre)
            VALUES (%s, %s)
        """, (usuario.id, nombre))
        conn.commit()
        return JSONResponse(content={"mensaje": "Departamento agregado correctamente"})
    except:
        raise HTTPException(status_code=400, detail="Ese departamento ya existe.")

@departamentos_router.delete("/eliminar/{departamento_id}")
def eliminar_departamento(departamento_id: int, usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # ¿Lo usa alguna persona?
    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM personas
        WHERE departamentos_id = %s AND usuario_id = %s
    """, (departamento_id, usuario.id))
    if cursor.fetchone()["total"] > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay personas asociadas a este departamento."
        )

    cursor.execute("""
        DELETE FROM departamentos
        WHERE id = %s AND usuario_id = %s
    """, (departamento_id, usuario.id))
    conn.commit()
    return JSONResponse(content={"mensaje": "Departamento eliminado"})
@departamentos_router.put("/modificar/{departamento_id}")
def modificar_departamento(
    departamento_id: int,
    nombre: str = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE departamentos
            SET nombre = %s
            WHERE id = %s AND usuario_id = %s
        """, (nombre, departamento_id, usuario.id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
        conn.commit()
        return JSONResponse(content={"mensaje": "Departamento actualizado"})
    except:
        raise HTTPException(status_code=400, detail="Nombre duplicado o error al actualizar")
