# ✅ omniface-backend/personas.py
from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from protected import verificar_token, DatosToken
from database import get_connection
import os
import shutil
from datetime import datetime
import subprocess
import json
from fastapi import Path

personas_router = APIRouter(prefix="/personas", tags=["Personas"])

CARPETA_IMAGENES = "imagenes_originales"
os.makedirs(CARPETA_IMAGENES, exist_ok=True)


# 🔵 POST /personas/registrar
@personas_router.post("/registrar")
async def registrar_persona(
    nombre_completo: str = Form(...),
    departamento: str = Form(...),
    codigo_app: str = Form(...),
    imagen: UploadFile = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
    extension = os.path.splitext(imagen.filename)[1]
    if extension.lower() not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido")

    # Generar nombre único
    nombre_archivo = f"{usuario.id}_{int(datetime.now().timestamp())}{extension}"
    ruta = os.path.join(CARPETA_IMAGENES, nombre_archivo)

    # Guardar imagen
    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    # Guardar en base de datos
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO personas (usuario_id, nombre_completo, departamento, codigo_app, imagen_original)
        VALUES (%s, %s, %s, %s, %s)
    """, (usuario.id, nombre_completo, departamento, codigo_app, nombre_archivo))
    conn.commit()

    return JSONResponse(status_code=200, content={"mensaje": "Persona registrada correctamente"})


# 🟢 GET /personas/listar
@personas_router.get("/listar")
def listar_personas(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, nombre_completo, departamento, codigo_app,
               imagen_original, imagen_mejorada, imagen_mejorada_listo, creado_en
        FROM personas
        WHERE usuario_id = %s
        ORDER BY creado_en DESC
    """, (usuario.id,))
    personas = cursor.fetchall()

    # Añadir rutas completas a imágenes
    for p in personas:
        if p["imagen_mejorada_listo"] and p["imagen_mejorada"]:
            p["imagen_url"] = f"/imagenes_optimizadas/{p['imagen_mejorada']}"
        else:
            p["imagen_url"] = f"/imagenes_originales/{p['imagen_original']}"

    return {"personas": personas}

@personas_router.post("/mejorar")
def mejorar_imagenes(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, imagen_original FROM personas
        WHERE usuario_id = %s AND imagen_mejorada_listo = FALSE
    """, (usuario.id,))
    pendientes = cursor.fetchall()

    if not pendientes:
        return {"mensaje": "No hay imágenes por mejorar", "total": 0, "archivos": []}

    lista_archivos = [p["imagen_original"] for p in pendientes]

    try:
        proceso = subprocess.run(
            ["python", "mejorar_imagenes.py"],
            input=json.dumps(lista_archivos).encode("utf-8"),
            capture_output=True,
            check=True,
        )
        resultado = json.loads(proceso.stdout.decode("utf-8"))
        procesadas = resultado.get("procesadas", [])

        # Actualizar base de datos
        for archivo in procesadas:
            cursor.execute("""
                UPDATE personas
                SET imagen_mejorada = %s,
                    imagen_mejorada_listo = TRUE
                WHERE imagen_original = %s AND usuario_id = %s
            """, (archivo, archivo, usuario.id))

        conn.commit()
        return {
            "mensaje": "Imágenes mejoradas",
            "total": len(procesadas),
            "archivos": lista_archivos
        }

    except subprocess.CalledProcessError as e:
        print("STDOUT:", e.stdout.decode("utf-8", errors="ignore"))
        print("STDERR:", e.stderr.decode("utf-8", errors="ignore"))
        raise HTTPException(status_code=500, detail="Error al ejecutar el script de mejora")
# 🔴 DELETE /personas/eliminar/{persona_id}
@personas_router.delete("/eliminar/{persona_id}")
def eliminar_persona(persona_id: int = Path(...), usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Buscar la persona
    cursor.execute("""
        SELECT imagen_original, imagen_mejorada, imagen_mejorada_listo
        FROM personas WHERE id = %s AND usuario_id = %s
    """, (persona_id, usuario.id))
    persona = cursor.fetchone()

    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    # Eliminar imágenes del sistema
    ruta_original = os.path.join("imagenes_originales", persona["imagen_original"])
    if os.path.exists(ruta_original):
        os.remove(ruta_original)

    if persona["imagen_mejorada_listo"] and persona["imagen_mejorada"]:
        ruta_mejorada = os.path.join("imagenes_optimizadas", persona["imagen_mejorada"])
        if os.path.exists(ruta_mejorada):
            os.remove(ruta_mejorada)

    # Eliminar en la base de datos
    cursor.execute("DELETE FROM personas WHERE id = %s AND usuario_id = %s", (persona_id, usuario.id))
    conn.commit()

    return JSONResponse(content={"mensaje": "Persona eliminada correctamente"})


# ✏️ PUT /personas/modificar/{id}
@personas_router.put("/modificar/{persona_id}")
async def modificar_persona(
    persona_id: int,
    nombre_completo: str = Form(...),
    departamento: str = Form(...),
    codigo_app: str = Form(...),
    imagen: UploadFile = Form(None),
    imagen_cambiada: str = Form("false"),  # NUEVO
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Verificar que la persona existe y pertenece al usuario
    cursor.execute("SELECT * FROM personas WHERE id = %s AND usuario_id = %s", (persona_id, usuario.id))
    persona = cursor.fetchone()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    imagen_cambiada = imagen_cambiada.lower() == "true"
    nombre_archivo = persona["imagen_original"]

    if imagen_cambiada and imagen:
        extension = os.path.splitext(imagen.filename)[1]
        if extension.lower() not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Formato de imagen inválido")

        # Generar nuevo nombre y guardar imagen
        nombre_archivo = f"{usuario.id}_{int(datetime.now().timestamp())}{extension}"
        ruta = os.path.join(CARPETA_IMAGENES, nombre_archivo)
        with open(ruta, "wb") as buffer:
            shutil.copyfileobj(imagen.file, buffer)

        # Eliminar imagen anterior
        anterior = os.path.join(CARPETA_IMAGENES, persona["imagen_original"])
        if os.path.exists(anterior):
            os.remove(anterior)

        # Eliminar imagen mejorada si existía
        if persona["imagen_mejorada"]:
            mejorada = os.path.join("imagenes_optimizadas", persona["imagen_mejorada"])
            if os.path.exists(mejorada):
                os.remove(mejorada)

        # Actualizar con reinicio de mejora
        cursor.execute("""
            UPDATE personas
            SET nombre_completo = %s, departamento = %s, codigo_app = %s,
                imagen_original = %s, imagen_mejorada = NULL, imagen_mejorada_listo = FALSE
            WHERE id = %s AND usuario_id = %s
        """, (nombre_completo, departamento, codigo_app, nombre_archivo, persona_id, usuario.id))
    else:
        # Solo actualizar los datos de texto, sin tocar imagen ni mejora
        cursor.execute("""
            UPDATE personas
            SET nombre_completo = %s, departamento = %s, codigo_app = %s
            WHERE id = %s AND usuario_id = %s
        """, (nombre_completo, departamento, codigo_app, persona_id, usuario.id))

    conn.commit()
    return {"mensaje": "Persona modificada correctamente"}
# ✅ personas.py (al final)
@personas_router.get("/notificaciones")
async def obtener_notificaciones(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM personas
        WHERE usuario_id = %s AND imagen_mejorada_listo = FALSE
    """, (usuario.id,))
    total = cursor.fetchone()[0]
    return {"pendientes": total}


# ✅ GET /personas/estado_modelo
@personas_router.get("/estado_modelo")
def estado_modelo(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Conteo total de personas
    cursor.execute("SELECT COUNT(*) AS total FROM personas WHERE usuario_id = %s", (usuario.id,))
    total = cursor.fetchone()["total"]

    # Total mejoradas
    cursor.execute("SELECT COUNT(*) AS mejoradas FROM personas WHERE usuario_id = %s AND imagen_mejorada_listo = TRUE", (usuario.id,))
    mejoradas = cursor.fetchone()["mejoradas"]

    # Última generación de modelo
    cursor.execute("SELECT fecha FROM modelos_generados WHERE usuario_id = %s ORDER BY fecha DESC LIMIT 1", (usuario.id,))
    fila = cursor.fetchone()
    ultima_fecha = fila["fecha"].strftime("%Y-%m-%d %H:%M:%S") if fila else None

    return {
        "total": total,
        "mejoradas": mejoradas,
        "faltan": total - mejoradas,
        "ultima_fecha": ultima_fecha,
        "hay_similares": False  # Por ahora en falso (puedes implementar luego con embeddings)
    }

