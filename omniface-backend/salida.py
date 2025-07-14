from fastapi import APIRouter, HTTPException
import mysql.connector
from mysql.connector import Error

router = APIRouter(prefix="/salida", tags=["Salida"])  # Nuevo prefix "/salida"

def _conn_cursor():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="omniface",
    )
    return conn, conn.cursor(dictionary=True)

# Endpoint para salidas del día (ya lo tienes, pero ahora con nuevo prefix)
@router.get("/dia/{usuario_id}")
def salidas_dia(usuario_id: int):
    try:
        conn, cur = _conn_cursor()
        cur.execute("""
            SELECT s.nombre, s.foto_path, s.fecha, s.hora, d.nombre AS departamento
            FROM salidas s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.usuario_id = %s AND s.fecha = CURDATE()
            ORDER BY s.hora DESC
        """, (usuario_id,))
        resultados = cur.fetchall()
        cur.close()
        conn.close()
        return resultados
    except Error as e:
        raise HTTPException(500, f"DB /dia: {e}")

# Endpoint para historial completo de salidas
@router.get("/historial/{usuario_id}")
def salidas_historial(usuario_id: int):
    try:
        conn, cur = _conn_cursor()
        cur.execute("""
            SELECT s.nombre, s.foto_path, s.fecha, s.hora, d.nombre AS departamento
            FROM salidas s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.usuario_id = %s
            ORDER BY s.fecha DESC, s.hora DESC
        """, (usuario_id,))
        resultados = cur.fetchall()
        cur.close()
        conn.close()
        return resultados
    except Error as e:
        raise HTTPException(500, f"DB /historial: {e}")