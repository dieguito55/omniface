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
import sys
from typing import Optional
from typing import Optional, List
import numpy as np
import pickle, json, faiss, os
from pathlib import Path as FilePath
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from fastapi import Query
from typing import Optional, List, Union

# --------------------------
personas_router = APIRouter(prefix="/personas", tags=["Personas"])

CARPETA_IMAGENES = "imagenes_originales"
os.makedirs(CARPETA_IMAGENES, exist_ok=True)

# 🔵 POST /personas/registrar
@personas_router.post("/registrar")
async def registrar_persona(
    nombre_completo: str = Form(...),
    departamentos_id: int = Form(...),          #  ←  INT, no string
    codigo_app: str = Form(...),
    imagen: UploadFile = Form(...),
    usuario: DatosToken = Depends(verificar_token)
):
     # 1.  Validar que el departamento exista y sea del usuario
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM departamentos WHERE id = %s AND usuario_id = %s",
        (departamentos_id, usuario.id)
    )
    if cursor.fetchone() is None:
        raise HTTPException(status_code=400, detail="Departamento inválido")
    extension = os.path.splitext(imagen.filename)[1].lower()
    if extension not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido")

    # Sanitizar nombre para nombre del archivo
    nombre_sanitizado = (
        nombre_completo.strip()
        .lower()
        .replace(" ", "_")
        .replace("á", "a").replace("é", "e")
        .replace("í", "i").replace("ó", "o").replace("ú", "u")
    )

    # Crear carpeta del usuario
    carpeta_usuario = os.path.join(CARPETA_IMAGENES, f"usuario_{usuario.id}")
    os.makedirs(carpeta_usuario, exist_ok=True)

    # Generar nombre único con timestamp
    nombre_archivo = f"{nombre_sanitizado}{extension}"
    ruta = os.path.join(carpeta_usuario, nombre_archivo)

    # Guardar imagen en disco
    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    # Ruta relativa a guardar en la BD
    ruta_relativa = f"usuario_{usuario.id}/{nombre_archivo}"

    # Guardar en base de datos
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO personas (usuario_id, nombre_completo, departamentos_id, codigo_app, imagen_original)
        VALUES (%s, %s, %s, %s, %s)
    """, (usuario.id, nombre_completo, departamentos_id, codigo_app, ruta_relativa))
    conn.commit()

    return JSONResponse(status_code=200, content={"mensaje": "Persona registrada correctamente"})

# 🟢 GET /personas/listar
@personas_router.get("/listar")
def listar_personas(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT p.id,
               p.nombre_completo,
               d.nombre          AS departamento,
               p.departamentos_id,  
               p.codigo_app,
               p.imagen_original,
               p.imagen_mejorada,
               p.imagen_mejorada_listo,
               p.creado_en
        FROM personas  AS p
        JOIN departamentos AS d ON p.departamentos_id = d.id
        WHERE p.usuario_id = %s
        ORDER BY p.creado_en DESC
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

    lista_relativa = [p["imagen_original"] for p in pendientes]  # Ej: usuario_5/juan_172345.jpg

    try:
        # Enviar rutas relativas al script
        proceso = subprocess.run(
            ["python", "mejorar_imagenes.py"],
            input=json.dumps(lista_relativa).encode("utf-8"),
            capture_output=True,
            check=True,
        )
        resultado = json.loads(proceso.stdout.decode("utf-8"))
        procesadas = resultado.get("procesadas", [])

        for archivo_rel in procesadas:
            cursor.execute("""
                UPDATE personas
                SET imagen_mejorada = %s,
                    imagen_mejorada_listo = TRUE
                WHERE imagen_original = %s AND usuario_id = %s
            """, (archivo_rel, archivo_rel, usuario.id))

        conn.commit()
        return {
            "mensaje": "Imágenes mejoradas",
            "total": len(procesadas),
            "archivos": procesadas
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


def guardar_imagen(imagen: UploadFile, nombre_completo: str, usuario_id: int) -> str:
    # Validar extensión
    extension = os.path.splitext(imagen.filename)[1].lower()
    if extension not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido")

    # Sanitizar nombre
    nombre_sanitizado = (
        nombre_completo.strip()
        .lower()
        .replace(" ", "_")
        .replace("á", "a").replace("é", "e")
        .replace("í", "i").replace("ó", "o").replace("ú", "u")
    )

    # Crear carpeta del usuario
    carpeta_usuario = os.path.join(CARPETA_IMAGENES, f"usuario_{usuario_id}")
    os.makedirs(carpeta_usuario, exist_ok=True)

    # Guardar imagen
    nombre_archivo = f"{nombre_sanitizado}{extension}"
    ruta_absoluta = os.path.join(carpeta_usuario, nombre_archivo)
    with open(ruta_absoluta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    # Devolver ruta relativa
    return f"usuario_{usuario_id}/{nombre_archivo}"
# ✏️ PUT /personas/modificar/{persona_id}
@personas_router.put("/modificar/{persona_id}")
async def modificar_persona(
    persona_id: int,
    nombre_completo: str = Form(...),
    departamentos_id: int = Form(...),   # ←  INT
    codigo_app: str = Form(...),
    imagen: UploadFile = Form(None),
    imagen_cambiada: str = Form("false"),
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id FROM departamentos WHERE id=%s AND usuario_id=%s",
        (departamentos_id, usuario.id)
    )
    if cursor.fetchone() is None:
        raise HTTPException(status_code=400, detail="Departamento inválido")

    # 🧠 Verificar existencia y propiedad
    cursor.execute("SELECT * FROM personas WHERE id = %s AND usuario_id = %s", (persona_id, usuario.id))
    persona = cursor.fetchone()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    imagen_cambiada = imagen_cambiada.lower() == "true"
    nueva_ruta_relativa = persona["imagen_original"]  # mantener si no cambia imagen

    if imagen_cambiada and imagen:
        extension = os.path.splitext(imagen.filename)[1].lower()
        if extension not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Formato de imagen inválido")

        nombre_sanitizado = (
            nombre_completo.strip()
            .lower()
            .replace(" ", "_")
            .replace("á", "a").replace("é", "e")
            .replace("í", "i").replace("ó", "o").replace("ú", "u")
        )

        # 📁 Crear carpeta del usuario
        carpeta_usuario = os.path.join(CARPETA_IMAGENES, f"usuario_{usuario.id}")
        os.makedirs(carpeta_usuario, exist_ok=True)

        # 📝 Generar nombre único (por timestamp)
        nombre_archivo = f"{nombre_sanitizado}{int(datetime.now().timestamp())}{extension}"
        ruta_absoluta = os.path.join(carpeta_usuario, nombre_archivo)

        # 💾 Guardar imagen
        try:
            with open(ruta_absoluta, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"No se pudo guardar la imagen: {str(e)}")

        # 🗑️ Eliminar imagen anterior
        anterior = os.path.join(CARPETA_IMAGENES, persona["imagen_original"])
        if os.path.exists(anterior):
            os.remove(anterior)

        # 🗑️ Eliminar imagen mejorada
        if persona["imagen_mejorada"]:
            mejorada = os.path.join("imagenes_optimizadas", persona["imagen_mejorada"])
            if os.path.exists(mejorada):
                os.remove(mejorada)

        # ✅ Nueva ruta relativa
        nueva_ruta_relativa = f"usuario_{usuario.id}/{nombre_archivo}"

        # 🧠 Actualizar datos e invalidar mejora
        cursor.execute("""
            UPDATE personas
            SET nombre_completo = %s, departamentos_id = %s, codigo_app = %s,
                imagen_original = %s, imagen_mejorada = NULL, imagen_mejorada_listo = FALSE
            WHERE id = %s AND usuario_id = %s
        """, (nombre_completo, departamentos_id, codigo_app, nueva_ruta_relativa, persona_id, usuario.id))
    else:
        # 🔁 Solo datos de texto
        cursor.execute("""
            UPDATE personas
            SET nombre_completo = %s, departamentos_id = %s, codigo_app = %s
            WHERE id = %s AND usuario_id = %s
        """, (nombre_completo, departamentos_id, codigo_app, persona_id, usuario.id))

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

# ────────────────────────────────────────────────────────────────────────────────
# 1️⃣  POST  /personas/registrar_modelo   (dispara generar_embeddings.py)
# ────────────────────────────────────────────────────────────────────────────────
@personas_router.post("/registrar_modelo")
def registrar_modelo(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # ¿Hay personas optimizadas?
    cursor.execute("""
        SELECT COUNT(*) AS total,
               SUM(imagen_mejorada_listo) AS optimizadas
        FROM personas
        WHERE usuario_id = %s
    """, (usuario.id,))
    fila = cursor.fetchone()
    if fila["total"] == 0:
        raise HTTPException(status_code=400, detail="No hay personas registradas")
    if fila["total"] != fila["optimizadas"]:
        raise HTTPException(status_code=400, detail="Existen imágenes sin optimizar")

    # ── Ejecutar el script de embeddings ───────────────────────────────────────
    try:
        proc = subprocess.run(
            ["python", "generar_embeddings.py", str(usuario.id)],
            capture_output=True, text=True, check=True
        )
        # (El script ya inserta el registro en modelos_generados)
        print(proc.stdout)       # ▶️  logs útiles en consola
        print(proc.stderr, file=sys.stderr)

    except subprocess.CalledProcessError as e:
        # Muestra parte del log para depurar
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr, file=sys.stderr)
        raise HTTPException(status_code=500, detail="Error al generar el modelo")

    # ── Consultar el registro recién creado para devolver métricas ─────────────
    cursor.execute("""
        SELECT id, ruta_modelo, fecha, cantidad_embeddings,
               cantidad_descartados, tiempo_total_segundos
        FROM modelos_generados
        WHERE usuario_id = %s
        ORDER BY fecha DESC LIMIT 1
    """, (usuario.id,))
    modelo = cursor.fetchone()

    return {
        "mensaje": "Modelo generado correctamente",
        "modelo": modelo
    }


# ────────────────────────────────────────────────────────────────────────────────
# 2️⃣  GET  /personas/errores_modelo      (devuelve el JSON de fallos)
#      • Sin parámetro → último modelo
#      • Con parámetro  → modelo específico
# ────────────────────────────────────────────────────────────────────────────────
@personas_router.get("/errores_modelo")
def errores_modelo(
    modelo_id: Optional[int] = None,
    usuario: DatosToken = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Seleccionar el modelo
    if modelo_id:
        cursor.execute("""
            SELECT ruta_errores FROM modelos_generados
            WHERE id = %s AND usuario_id = %s
        """, (modelo_id, usuario.id))
    else:
        cursor.execute("""
            SELECT ruta_errores FROM modelos_generados
            WHERE usuario_id = %s ORDER BY fecha DESC LIMIT 1
        """, (usuario.id,))
    fila = cursor.fetchone()
    if not fila or not fila["ruta_errores"]:
        raise HTTPException(status_code=404, detail="No se encontró el modelo o no hay errores")

    ruta_errores = FilePath(fila["ruta_errores"])
    if not ruta_errores.exists():
        raise HTTPException(status_code=404, detail="Archivo de errores no encontrado")

    with open(ruta_errores, "r", encoding="utf-8") as f:
        errores = json.load(f)

    return {"errores": errores}

# ────────────────────────────────────────────────────────────────
# 3️⃣  POST /personas/generar_modelo_async
#     • Devuelve lista de personas + tiempo estimado
#     • Lanza generar_embeddings.py en segundo plano (Popen)
# ────────────────────────────────────────────────────────────────
@personas_router.post("/generar_modelo_async")
def generar_modelo_async(usuario: DatosToken = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Comprobar que todas las imágenes están optimizadas
    cursor.execute("""
        SELECT p.id, p.nombre_completo, d.nombre AS departamento,
        p.imagen_mejorada
        FROM personas p
        JOIN departamentos d ON p.departamentos_id = d.id
        WHERE p.usuario_id = %s AND p.imagen_mejorada_listo = TRUE
    """, (usuario.id,))
    lista = cursor.fetchall()
    if not lista:
        raise HTTPException(status_code=400, detail="No hay imágenes optimizadas")

    # ➜ TIEMPO ESTIMADO - simple heurística (2 s/img + 5 s sobre-head)
    estimado = len(lista) * 10 + 10

    # Lanza el script sin bloquear
    subprocess.Popen(
        ["python", "generar_embeddings.py", str(usuario.id)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Devuelve datos mínimos para la animación
    personas_anim = [
        {
            "nombre": p["nombre_completo"],
            "departamento": p["departamento"],  # Añade este campo
            "imagen_url": f"/imagenes_optimizadas/{p['imagen_mejorada']}"
        } for p in lista
    ]

    return {
        "mensaje": "Generación de modelo iniciada",
        "estimado_segundos": estimado,
        "personas": personas_anim
    }


# ───────────────────────────────────────────────────────────────
@personas_router.get("/analitica_modelo")
def analitica_modelo(usuario: DatosToken = Depends(verificar_token)):
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    # último modelo p/usuario
    cursor.execute("""
        SELECT ruta_modelo, ruta_errores
        FROM modelos_generados
        WHERE usuario_id = %s
        ORDER BY fecha DESC LIMIT 1
    """, (usuario.id,))
    modelo = cursor.fetchone()
    if not modelo:
        raise HTTPException(status_code=404, detail="No existe un modelo todavía")

    # ── cargar embeddings.pkl ───────────────────────────────────
    carpeta   = FilePath(modelo["ruta_modelo"]).parent
    pkl_path  = carpeta / "embeddings.pkl"
    if not pkl_path.exists():
        raise HTTPException(status_code=404, detail="embeddings.pkl no encontrado")

    with open(pkl_path, "rb") as f:
        data_pkl = pickle.load(f)

    nombres   = data_pkl.get("nombres", [])
    embeds    = data_pkl.get("embeddings", [])
    DIM       = 512
    if not nombres or not isinstance(embeds, (list, np.ndarray)):
        raise HTTPException(status_code=500, detail="embeddings.pkl corrupto")

    # filtra vectores correctos
    vectores, rechazados = [], []
    for n, v in zip(nombres, embeds):
        if isinstance(v, np.ndarray) and v.shape == (DIM,):
            vectores.append(v.astype(np.float32))
        else:
            rechazados.append(n)
    vectores = np.stack(vectores)
    faiss.normalize_L2(vectores)

    # ── stats ───────────────────────────────────────────────────
    stats = {
        "personas"   : len(nombres),
        "rechazados" : len(rechazados),
        "dimension"  : DIM,
        "clusters"   : min(3, len(nombres)) if len(nombres) >= 3 else 1
    }

    # ── t-SNE + KMeans ──────────────────────────────────────────
    if len(nombres) > 1:
        tsne = TSNE(n_components=2, random_state=42,
                    perplexity=min(30, len(nombres)-1))
        coords = tsne.fit_transform(vectores)
        km     = KMeans(n_clusters=stats["clusters"], random_state=42)
        labels = km.fit_predict(vectores)
    else:
        coords = np.zeros((1, 2))
        labels = np.array([0])

    tsne_list = [
        {"nombre": n, "x": float(x), "y": float(y), "cluster": int(c)}
        for n, (x, y), c in zip(nombres, coords, labels)
    ]

    # ── vecinos más cercanos ───────────────────────────────────
    index = faiss.IndexFlatIP(DIM)
    index.add(vectores)
    K = min(3, len(nombres)-1)
    D, I = index.search(vectores, K+1)
    vecinos = []
    for i, nombre in enumerate(nombres):
        for k in range(1, K+1):
            j   = int(I[i][k])
            sim = float(D[i][k])
            vecinos.append({
                "persona"   : nombre,
                "vecino"    : nombres[j],
                "similitud" : round(sim, 4)
            })

    return {
        "stats"   : stats,
        "tsne"    : tsne_list,
        "vecinos" : vecinos
    }