#omniface-backend/asistencia.py
from fastapi import APIRouter, HTTPException
import mysql.connector
from mysql.connector import Error
from datetime import timedelta, time as datetime_time

router = APIRouter(prefix="/asistencia", tags=["Asistencia"])

def _conn_cursor():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="omniface",
    )
    return conn, conn.cursor(dictionary=True)

def _normalize_hora(rows):
    for r in rows:
        h = r.get("hora")
        if isinstance(h, bytes):                 # bytes ➜ str
            r["hora"] = h.decode()
        elif isinstance(h, datetime_time):       # time ➜ HH:MM:SS
            r["hora"] = h.strftime("%H:%M:%S")
        elif isinstance(h, timedelta):           # timedelta ➜ HH:MM:SS
            r["hora"] = str(h)
        elif h is None:                          # NULL en la BD
            r["hora"] = ""
    return rows

SQL_BASE = """
    SELECT  a.id, a.nombre, a.estado, a.usuario_id,
            a.fecha, a.hora,                   -- sin TIME_FORMAT
            a.tipo, a.departamento_id, a.foto_path,
            d.nombre AS departamento
    FROM asistencias a
    LEFT JOIN departamentos d ON a.departamento_id = d.id
    WHERE a.usuario_id = %s
"""

@router.get("/dia/{usuario_id}")
def asistencias_dia(usuario_id: int):
    sql = SQL_BASE + "  AND a.fecha = CURDATE() ORDER BY a.hora DESC"
    conn, cur = _conn_cursor()
    try:
        cur.execute(sql, (usuario_id,))
        return _normalize_hora(cur.fetchall())
    except Error as e:
        raise HTTPException(500, f"DB /dia: {e}")
    finally:
        cur.close()
        conn.close()

@router.get("/historial/{usuario_id}")
def historial(usuario_id: int):
    sql = SQL_BASE + "  ORDER BY a.fecha DESC, a.hora DESC"
    conn, cur = _conn_cursor()
    try:
        cur.execute(sql, (usuario_id,))
        return _normalize_hora(cur.fetchall())
    except Error as e:
        raise HTTPException(500, f"DB /historial: {e}")
    finally:
        cur.close()
        conn.close()
@router.get("/salida/historial/{usuario_id}")
def salidas_historial(usuario_id: int):
    try:
        conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.nombre, s.foto_path, s.fecha, s.hora, d.nombre AS departamento
            FROM salidas s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.usuario_id = %s
            ORDER BY s.fecha DESC, s.hora DESC
        """, (usuario_id,))
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))