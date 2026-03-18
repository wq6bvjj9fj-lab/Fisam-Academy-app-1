# FISAM Academy - Dojo Management App

## Problem Statement
Applicazione web per un dojo di arti marziali (FISAM Academy, Palermo) con gestione lezioni, feedback e notifiche.

## User Personas
- **Istruttore**: Crea lezioni, gestisce utenti, visualizza tutti i feedback
- **Allievo**: Visualizza lezioni, invia feedback (testo + foto), riceve notifiche

## Core Requirements
- Autenticazione JWT (email + password)
- Gestione ruoli (Istruttore/Allievo)
- CRUD Lezioni (titolo, argomenti, livello, data/ora)
- Feedback con upload fino a 5 foto (pubblico/privato)
- Archivio feedback pubblico ricercabile per data
- Notifiche in-app
- Tema scuro (sfondo nero, palette giallo-arancio e bianco)
- Supporto multi-istruttore

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI
- Backend: FastAPI, Python, Motor (MongoDB async)
- Database: MongoDB
- Auth: JWT
- Deploy: Render.com + MongoDB Atlas

## What's Been Implemented
- Full-stack app completa e funzionante
- Autenticazione JWT con ruoli
- CRUD Lezioni e Feedback con upload immagini
- Sistema notifiche in-app
- UI tema scuro con Shadcn
- Guida deploy su Render + MongoDB Atlas
- Logo FISAM migliorato (ingrandito e centrato) - 18 Mar 2026

## Key DB Schema
- users: { email, name, hashed_password, role }
- lessons: { title, topics, level, date }
- feedback: { lesson_id, user_id, content, photos, is_private }
- notifications: { user_id, message, is_read }

## Credentials
- Istruttore: admin@fisam.it / admin123
- Allievo: allievo@fisam.it / allievo123

## Open Issues
- P1: Login su Render potrebbe non funzionare (trailing slash in REACT_APP_BACKEND_URL)
- P2: Notifiche email inattive (manca API key Resend)

## Backlog
- P1: Notifiche push native (PWA)
- P2: Attivazione notifiche email (richiede Resend API key)
- P3: Refactoring backend (separare server.py in moduli)
