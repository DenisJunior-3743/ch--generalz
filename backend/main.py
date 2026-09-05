from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import (
    auth,
    course,
    faculty,
    files,
    grade_band,
    health,
    mark,
    me,
    overview,
    permission,
    program,
    role_permission,
    semester,
    staff,
    student,
    user,
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.39.113.143:5173",
        "https://ch-generalz-dygc.vercel.app",  # the deployed web frontend
    ],
    # Four cases beyond plain localhost: (1) ngrok hands out a new
    # https://<random>.ngrok-free.app hostname every run, so match the
    # domain instead of hardcoding one — see vite.config.js's allowedHosts
    # for the frontend-side counterpart. (2) a phone on the same Wi-Fi
    # reaches the Vite dev server via the PC's LAN IP (Vite's `host: true`
    # prints these as "Network:" URLs), which has a different Origin than
    # localhost — match any private LAN address on the dev server's port.
    # `localhost` and `127.0.0.1` are different Origins to a browser even
    # though they're the same machine, hence both being listed explicitly
    # above instead of relying on the regex for that one. (3) Vercel gives
    # every preview deployment (per branch/PR) its own random *.vercel.app
    # subdomain too, alongside the fixed production one already listed
    # above — match the whole domain so those don't need adding by hand
    # each time, same reasoning as the ngrok case.
    allow_origin_regex=(
        r"https://.*\.(ngrok-free\.app|ngrok-free\.dev|ngrok\.io|ngrok\.app|vercel\.app)"
        r"|http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):5173"
        r"|http://10.39.113.143:5173"
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(staff.router)
app.include_router(faculty.router)
app.include_router(program.router)
app.include_router(course.router)
app.include_router(semester.router)
app.include_router(student.router)
app.include_router(mark.router)
app.include_router(grade_band.router)
app.include_router(overview.router)
app.include_router(user.router)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(permission.router)
app.include_router(role_permission.router)
app.include_router(files.router)
