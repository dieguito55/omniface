from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from database import get_connection
from protected import verificar_token, DatosToken
from datetime import time as dt_time, timedelta
import mysql.connector

departamentos_router = APIRouter(prefix="/departamentos", tags=["Departamentos"])

@departamentos_router.get("/listar")
def listar_departamentos(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT  id,
                    nombre,
                    CAST(hora_temprano AS CHAR) AS hora_temprano,
                    CAST(hora_tarde   AS CHAR) AS hora_tarde
            FROM departamentos
            WHERE usuario_id = %s
            ORDER BY nombre ASC
        """, (usuario.id,))
        resultados = cursor.fetchall()        # → '08:10:00', '14:30:00', …
        return {"departamentos": resultados}
    except mysql.connector.Error as e:
        print(f"[ERROR] Listar departamentos: {e}")
        raise HTTPException(status_code=500, detail=f"DB: {e}")
    finally:
        cursor.close()
        conn.close()


@departamentos_router.post("/agregar")
def agregar_departamento(
    nombre: str = Form(...),
    hora_temprano: str = Form(...),
    hora_tarde: str = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO departamentos (usuario_id, nombre, hora_temprano, hora_tarde)
            VALUES (%s, %s, %s, %s)
        """, (usuario.id, nombre, hora_temprano, hora_tarde))
        conn.commit()
        return JSONResponse(content={"mensaje": "Departamento agregado correctamente"})
    except mysql.connector.Error as e:
        print(f"[ERROR] Agregar departamento: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Ese departamento ya existe o error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departamentos_router.delete("/eliminar/{departamento_id}")
def eliminar_departamento(departamento_id: int, usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
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
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
        conn.commit()
        return JSONResponse(content={"mensaje": "Departamento eliminado"})
    except mysql.connector.Error as e:
        print(f"[ERROR] Eliminar departamento: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al eliminar: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departamentos_router.put("/modificar/{departamento_id}")
def modificar_departamento(
    departamento_id: int,
    nombre: str = Form(...),
    hora_temprano: str = Form(...),
    hora_tarde: str = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE departamentos
            SET nombre = %s, hora_temprano = %s, hora_tarde = %s
            WHERE id = %s AND usuario_id = %s
        """, (nombre, hora_temprano, hora_tarde, departamento_id, usuario.id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
        conn.commit()
        return JSONResponse(content={"mensaje": "Departamento actualizado"})
    except mysql.connector.Error as e:
        print(f"[ERROR] Modificar departamento: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Nombre duplicado o error: {str(e)}")
    finally:
        cursor.close()
        conn.close()