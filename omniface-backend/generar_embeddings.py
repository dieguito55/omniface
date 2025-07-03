# ✅ omniface-backend/generar_embeddings.py
import os
import cv2
import faiss
import json
import pickle
import logging
import traceback
import numpy as np
import sys
import csv
import pymysql
from tqdm import tqdm
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from logging.handlers import RotatingFileHandler
from insightface.app import FaceAnalysis

# ========= CONFIG ==========
CONFIG_PATH = "configuracion.json"
DEFAULT_CONFIG = {
    "carpeta_imagenes": "imagenes_optimizadas",
    "carpeta_salida": "modelo_flatip",
    "n_hilos": 8,
    "use_gpu": True,
    "umbral_enfoque": 40.0,
    "resolucion_minima": [100, 100],
    "guardar_rechazadas": True,
    "debug_visual": True
}
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    user_config = json.load(f)
config = {**DEFAULT_CONFIG, **user_config}

# ========= PARÁMETROS ==========
if len(sys.argv) != 2:
    print("Uso: python generar_embeddings.py <usuario_id>")
    sys.exit(1)

USUARIO_ID = int(sys.argv[1])

# ========= BASE DE DATOS ==========
conn = pymysql.connect(host="localhost", user="root", password="", database="omniface")
cursor = conn.cursor()
cursor.execute("SELECT nombre_completo, imagen_mejorada FROM personas WHERE usuario_id = %s", (USUARIO_ID,))
personas = [(nombre, os.path.join(config["carpeta_imagenes"], ruta)) for nombre, ruta in cursor.fetchall()]
if not personas:
    print(f"No hay imágenes para el usuario {USUARIO_ID}")
    sys.exit(1)

# ========= RUTAS ==========
CARPETA_SALIDA = os.path.join(config["carpeta_salida"], f"usuario_{USUARIO_ID}")
# Eliminar carpeta anterior si ya existe para sobrescribir (ANTES de crear logging)
if os.path.exists(CARPETA_SALIDA):
    import shutil
    shutil.rmtree(CARPETA_SALIDA)
CARPETA_ERRORES = os.path.join(CARPETA_SALIDA, "errores")
os.makedirs(CARPETA_SALIDA, exist_ok=True)
if config["guardar_rechazadas"]:
    for sub in ["borrosas", "sin_rostro", "cortado", "resolucion", "oscura", "norma", "pose"]:
        os.makedirs(os.path.join(CARPETA_ERRORES, sub), exist_ok=True)

# ========= LOGGING ==========
LOG_PATH = os.path.join(CARPETA_SALIDA, "procesamiento.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        RotatingFileHandler(LOG_PATH, maxBytes=5*1024*1024, backupCount=3),
        logging.StreamHandler(sys.stdout)
    ]
)


# ========= MODELO ==========
try:
    app = FaceAnalysis(name="antelopev2", providers=['CUDAExecutionProvider' if config["use_gpu"] else 'CPUExecutionProvider'])
    app.prepare(ctx_id=0 if config["use_gpu"] else -1)
except Exception:
    logging.error(f"Error cargando modelo:\n{traceback.format_exc()}")
    sys.exit(1)

# ========= VALIDACIONES ==========
def imagen_borrosa(img):
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gris, cv2.CV_64F).var() < config["umbral_enfoque"]

def imagen_oscura(img):
    return np.mean(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)) < 40

def rostro_centrado(rostro, shape):
    x1, y1, x2, y2 = rostro.bbox.astype(int)
    h, w = shape[:2]
    return x1 > 10 and y1 > 10 and x2 < w - 10 and y2 < h - 10

def guardar_fallo(img, nombre_archivo, motivo):
    if config["guardar_rechazadas"]:
        ruta = os.path.join(CARPETA_ERRORES, motivo, nombre_archivo)
        cv2.imwrite(ruta, img)

# ========= PROCESAR ==========
def procesar_imagen(nombre, url):
    try:
        img = cv2.imread(url)
        if img is None or img.shape[2] != 3:
            return None, None, "formato inválido", None

        if img.shape[0] < config["resolucion_minima"][1] or img.shape[1] < config["resolucion_minima"][0]:
            guardar_fallo(img, nombre + ".jpg", "resolucion")
            return None, None, "resolución baja", None

        if imagen_borrosa(img):
            guardar_fallo(img, nombre + ".jpg", "borrosas")
            return None, None, "borrosa", None

        if imagen_oscura(img):
            guardar_fallo(img, nombre + ".jpg", "oscura")
            return None, None, "oscura", None

        rostros = app.get(img)
        if not rostros:
            guardar_fallo(img, nombre + ".jpg", "sin_rostro")
            return None, None, "sin rostro", None

        rostro = rostros[0]
        if not rostro_centrado(rostro, img.shape):
            guardar_fallo(img, nombre + ".jpg", "cortado")
            return None, None, "rostro fuera de marco", None

        yaw, pitch, roll = rostro.pose
        if abs(yaw) > 30 or abs(pitch) > 30 or abs(roll) > 30:
            guardar_fallo(img, nombre + ".jpg", "pose")
            return None, None, "pose incorrecta", None

        emb = rostro.embedding
        if emb is None or np.isnan(emb).any():
            return None, None, "embedding inválido", None

        norma = np.linalg.norm(emb)
        if not (20.0 < norma < 30.0):
            guardar_fallo(img, nombre + ".jpg", "norma")
            return None, None, "norma inválida", None

        return nombre, emb.astype(np.float32), None, norma

    except Exception:
        return None, None, f"error:\n{traceback.format_exc(limit=1)}", None

# ========= EMBEDDINGS ==========
def generar_embeddings():
    nombres, embeddings, errores = [], [], []
    with ThreadPoolExecutor(max_workers=config["n_hilos"]) as executor:
        resultados = list(tqdm(executor.map(lambda p: procesar_imagen(p[0], p[1]), personas), total=len(personas)))
    for nombre, emb, error, norma in resultados:
        if error:
            errores.append({"nombre": nombre, "error": error, "norma": norma})
        else:
            nombres.append(nombre)
            embeddings.append(emb)
    return np.array(embeddings, dtype=np.float32), nombres, errores

# ========= FAISS ==========
def crear_indice_faiss(embeddings):
    faiss.normalize_L2(embeddings)
    d = embeddings.shape[1]
    index = faiss.IndexFlatIP(d)
    if config["use_gpu"] and hasattr(faiss, "StandardGpuResources"):
        res = faiss.StandardGpuResources()
        index = faiss.index_cpu_to_gpu(res, 0, index)
    index.add(embeddings)
    return index

# ========= GUARDAR ==========
def guardar_resultado(nombres, embeddings, index, errores, duracion):
    ruta_modelo = os.path.join(CARPETA_SALIDA, "faiss.index")
    faiss.write_index(faiss.index_gpu_to_cpu(index), ruta_modelo)
    # Guardar embeddings + nombres juntos
    with open(os.path.join(CARPETA_SALIDA, "embeddings.pkl"), "wb") as f:
        pickle.dump({"nombres": nombres, "embeddings": embeddings}, f)

    # Guardar solo los nombres por separado (para producción)
    with open(os.path.join(CARPETA_SALIDA, "nombres.pkl"), "wb") as f:
        pickle.dump(nombres, f)
    with open(os.path.join(CARPETA_SALIDA, "errores.json"), "w", encoding="utf-8") as f:
        json.dump(errores, f, indent=2, ensure_ascii=False)

    # ✅ Eliminar modelos anteriores del mismo usuario
    cursor.execute("DELETE FROM modelos_generados WHERE usuario_id = %s", (USUARIO_ID,))
    # Guardar en la BD
    cursor.execute("""
        INSERT INTO modelos_generados (usuario_id, ruta_modelo, fecha, cantidad_embeddings, cantidad_descartados, tiempo_total_segundos, ruta_errores)
        VALUES (%s, %s, NOW(), %s, %s, %s, %s)
    """, (USUARIO_ID, ruta_modelo, len(nombres), len(errores), duracion, os.path.join(CARPETA_SALIDA, "errores.json")))
    conn.commit()

# ========= MAIN ==========
if __name__ == "__main__":
    debug_muestras = []
    inicio = datetime.now()

    embeddings, nombres, errores = generar_embeddings()
    if len(embeddings) == 0:
        logging.error("No se generaron embeddings válidos.")
        sys.exit(1)

    index = crear_indice_faiss(embeddings)
    guardar_resultado(nombres, embeddings, index, errores, (datetime.now() - inicio).total_seconds())
    logging.info(f"Finalizado: {len(nombres)} embeddings generados. Errores: {len(errores)}")
