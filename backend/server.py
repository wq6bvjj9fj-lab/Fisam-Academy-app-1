from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

try:
    import resend
    HAS_RESEND = True
except ImportError:
    HAS_RESEND = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Uploads
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "fisam-academy-secret-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# App
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# === MODELS ===
class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class LessonCreate(BaseModel):
    title: str
    date: str
    time: str
    topics: List[str]
    level: str

class FeedbackCreate(BaseModel):
    lesson_id: str
    text: str
    photos: List[str] = []
    is_private: bool = False


# === AUTH HELPERS ===
def create_token(user_id: str, role: str):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorizzato")
    payload = verify_token(authorization.split(" ")[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user

async def require_instructor(user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Solo gli istruttori possono eseguire questa azione")
    return user


# === AUTH ENDPOINTS ===
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password_hash"}
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user


# === USER MANAGEMENT ===
@api_router.post("/users", status_code=201)
async def create_user(req: UserCreate, instructor=Depends(require_instructor)):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia registrata")
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user = {
        "id": str(uuid.uuid4()),
        "email": req.email,
        "name": req.name,
        "password_hash": hashed,
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {k: v for k, v in user.items() if k not in ("_id", "password_hash")}

@api_router.get("/users")
async def list_users(instructor=Depends(require_instructor)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, instructor=Depends(require_instructor)):
    result = await db.users.delete_one({"id": user_id, "role": "student"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Allievo non trovato")
    # Also clean up notifications
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "Allievo eliminato"}


# === LESSONS ===
@api_router.post("/lessons", status_code=201)
async def create_lesson(req: LessonCreate, instructor=Depends(require_instructor)):
    lesson = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "date": req.date,
        "time": req.time,
        "topics": req.topics,
        "level": req.level,
        "instructor_id": instructor["id"],
        "instructor_name": instructor["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lessons.insert_one(lesson)

    # Create notifications for all students
    students = await db.users.find({"role": "student"}, {"_id": 0}).to_list(1000)
    notifications = []
    for student in students:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": student["id"],
            "message": f"Nuova lezione: {req.title} - {req.date} alle {req.time}",
            "type": "lesson",
            "lesson_id": lesson["id"],
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        notifications.append(notification)

    if notifications:
        await db.notifications.insert_many(notifications)

    # Send emails in background
    asyncio.create_task(send_lesson_emails(students, lesson))

    return {k: v for k, v in lesson.items() if k != "_id"}

@api_router.get("/lessons")
async def list_lessons(date: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if date:
        query["date"] = date
    lessons = await db.lessons.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return lessons

@api_router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user=Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")
    return lesson


# === FEEDBACK ===
@api_router.post("/feedback", status_code=201)
async def create_feedback(req: FeedbackCreate, user=Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": req.lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lezione non trovata")

    feedback = {
        "id": str(uuid.uuid4()),
        "lesson_id": req.lesson_id,
        "lesson_title": lesson.get("title", ""),
        "lesson_date": lesson.get("date", ""),
        "student_id": user["id"],
        "student_name": user["name"],
        "text": req.text,
        "photos": req.photos[:5],
        "is_private": req.is_private,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(feedback)

    # Notify instructors about new feedback
    instructors = await db.users.find({"role": "instructor"}, {"_id": 0}).to_list(100)
    privacy_label = " (privato)" if req.is_private else ""
    notifications = []
    for inst in instructors:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": inst["id"],
            "message": f"Nuovo feedback{privacy_label} da {user['name']} per '{lesson['title']}'",
            "type": "feedback",
            "lesson_id": req.lesson_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        notifications.append(notification)
    if notifications:
        await db.notifications.insert_many(notifications)

    return {k: v for k, v in feedback.items() if k != "_id"}

@api_router.get("/feedback")
async def list_feedback(date: Optional[str] = None, lesson_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if lesson_id:
        query["lesson_id"] = lesson_id

    if date:
        lessons_on_date = await db.lessons.find({"date": date}, {"_id": 0}).to_list(1000)
        lesson_ids = [l["id"] for l in lessons_on_date]
        if lesson_ids:
            query["lesson_id"] = {"$in": lesson_ids}
        else:
            return []

    feedback_list = await db.feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    # Filter private feedback for non-instructors
    if user.get("role") != "instructor":
        feedback_list = [f for f in feedback_list if not f.get("is_private", False)]

    return feedback_list


# === FILE UPLOAD ===
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo di file non supportato. Usa JPEG, PNG, GIF o WebP.")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/api/uploads/{filename}"}

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(str(filepath))


# === NOTIFICATIONS ===
@api_router.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.get("/notifications/unread-count")
async def unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notifica letta"}

@api_router.put("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Tutte le notifiche segnate come lette"}


# === EMAIL (OPTIONAL) ===
async def send_lesson_emails(students, lesson):
    resend_key = os.environ.get("RESEND_API_KEY")
    if not resend_key or not HAS_RESEND:
        logger.info("RESEND_API_KEY non configurata, email non inviate")
        return

    resend.api_key = resend_key
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    topics_html = "".join([f"<li style='margin:4px 0;'>{t}</li>" for t in lesson["topics"]])

    for student in students:
        try:
            params = {
                "from": sender,
                "to": [student["email"]],
                "subject": f"FISAM Academy - Lezione del {lesson['date']}",
                "html": f"""
                <div style="background:#0A0A0A;color:#FFFFFF;padding:40px;font-family:Arial,sans-serif;max-width:600px;">
                    <div style="text-align:center;margin-bottom:30px;">
                        <h1 style="color:#F5A623;margin:0;font-size:28px;">FISAM ACADEMY</h1>
                        <p style="color:#A1A1AA;margin:5px 0;">Palermo</p>
                    </div>
                    <div style="background:#121212;border-left:4px solid #F5A623;padding:20px;border-radius:4px;">
                        <h2 style="color:#FFFFFF;margin:0 0 15px;">{lesson['title']}</h2>
                        <p style="margin:8px 0;"><span style="color:#F5A623;font-weight:bold;">Data:</span> {lesson['date']}</p>
                        <p style="margin:8px 0;"><span style="color:#F5A623;font-weight:bold;">Ora:</span> {lesson['time']}</p>
                        <p style="margin:8px 0;"><span style="color:#F5A623;font-weight:bold;">Livello:</span> {lesson['level']}</p>
                        <p style="margin:15px 0 5px;color:#F5A623;font-weight:bold;">Argomenti:</p>
                        <ul style="color:#FFFFFF;padding-left:20px;margin:0;">{topics_html}</ul>
                    </div>
                    <p style="margin-top:25px;color:#A1A1AA;text-align:center;font-size:14px;">Ti aspettiamo al dojo!</p>
                </div>
                """
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email inviata a {student['email']}")
        except Exception as e:
            logger.error(f"Errore invio email a {student['email']}: {e}")


# === STARTUP ===
@app.on_event("startup")
async def startup():
    existing = await db.users.find_one({"role": "instructor"})
    if not existing:
        hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        user = {
            "id": str(uuid.uuid4()),
            "email": "admin@fisam.it",
            "name": "Istruttore FISAM",
            "password_hash": hashed,
            "role": "instructor",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        logger.info("Istruttore predefinito creato: admin@fisam.it / admin123")

@app.on_event("shutdown")
async def shutdown():
    client.close()


# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
