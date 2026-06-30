# MochiDo

> **An offline-first, production-ready student productivity platform built with Next.js, TypeScript, and Progressive Web App technologies.**

MochiDo is a modern academic productivity platform designed to help students and lecturers manage courses, assignments, routines, reminders, and academic progress—even without an internet connection.

Rather than being a simple task manager, MochiDo demonstrates how an offline-first architecture can deliver a fast, installable, resilient experience while remaining extensible for future cloud synchronization and collaborative features.

---

# Why MochiDo?

Most student productivity applications assume constant internet access.

MochiDo was engineered around a different philosophy:

- Offline-first
- Fast local performance
- Progressive Web App (PWA)
- Mobile-friendly
- Privacy-first
- Easily extendable to cloud synchronization

The application stores data locally using IndexedDB while maintaining a clean architecture that allows future migration toward hybrid online/offline synchronization.

---

# Architecture Overview

```
Next.js App Router
        │
        ▼
React Components
        │
        ▼
Custom Hooks
        │
        ▼
Service Layer
        │
        ▼
IndexedDB
        │
        ▼
Offline-first Persistence
```

The application follows a layered architecture where UI components remain separate from business logic and persistence.

Core responsibilities are divided into:

- UI Components
- Context Providers
- Custom Hooks
- IndexedDB Services
- Notification Services
- Reminder Engine
- Utility Modules

---

# Core Features

## Student Dashboard

- Daily overview
- Academic statistics
- Upcoming deadlines
- Current streak
- Productivity insights
- Wake-up planner
- Motivation system

---

## Lecturer Dashboard

- Course management
- Assignment publishing
- Student management
- Course verification
- Course claiming workflow
- Academic overview

---

## Assignment Management

Students can:

- Create personal tasks
- Track deadlines
- Complete assignments
- Organize coursework

Lecturers can:

- Publish assignments
- Manage coursework
- Track submissions

---

## Course Management

Supports:

- Student-created courses
- Lecturer-created courses
- Course catalog
- Enrollment
- Course verification
- Ownership claiming
- Browse and discover courses

---

## Routine Planner

Create recurring routines for:

- Study sessions
- Classes
- Reading
- Revision
- Personal habits

Supports:

- Recurring schedules
- Time blocks
- Notifications
- Daily planning

---

## Reminder Engine

Built-in reminder scheduler includes:

- Deadline reminders
- Assignment reminders
- Routine reminders
- Notification queue
- Local notification scheduling

Designed so cloud push notifications can later be integrated without replacing the existing system.

---

## Offline First

One of MochiDo's primary design goals.

The application continues functioning without internet using:

- IndexedDB
- Local caching
- PWA installation
- Background synchronization architecture
- Local notifications

---

## Progressive Web App

Install MochiDo on:

- Android
- iPhone
- Windows
- macOS

Features include:

- Home screen installation
- Offline launch
- Responsive layouts
- Native-like navigation

---

## Authentication

PIN-based authentication system supporting:

- Student accounts
- Lecturer accounts
- Persistent sessions
- Local authentication

Architecture prepared for future cloud authentication providers.

---

## Analytics

The application continuously computes:

- Completion rates
- Daily streaks
- Task urgency
- Productivity trends
- Academic statistics

These analytics power dashboards and future reporting modules.

---

# Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion

## State Management

- React Context
- Custom Hooks

## Storage

- IndexedDB
- Local Storage

## Progressive Web App

- Service Worker
- Web Manifest
- Offline caching

## Notifications

- Browser Notifications
- Local Reminder Scheduler

---

# Project Structure

```
src/

├── app/
│   ├── dashboard/
│   ├── login/
│   ├── register/
│   └── settings/
│
├── components/
│   ├── student/
│   ├── lecturer/
│   ├── mochi/
│   └── ui/
│
├── contexts/
│
├── hooks/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── notifications/
│   └── services/
│
└── types/
```

---

# Current Capabilities

- Offline-first data persistence
- Course catalog management
- Student enrollment
- Lecturer verification workflow
- Assignment tracking
- Routine scheduling
- Reminder engine
- Local notifications
- Mobile responsive interface
- Installable PWA
- Dark mode support
- Role-based dashboards

---

# Planned Roadmap

The architecture has been intentionally designed for future expansion.

Upcoming features include:

- Course materials & syllabus management
- Assignment grading and lecturer feedback
- Weekly and term productivity reports
- Calendar (.ics) export
- Study groups and accountability
- Cross-device synchronization
- Cloud backup
- Push notifications
- Multi-device authentication
- Hybrid offline/online data synchronization

---

# Running Locally

Clone the repository.

```bash
git clone https://github.com/EloraPeter/mochido-timeapp.git
```

Install dependencies.

```bash
npm install
```

Run the development server.

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Build

```bash
npm run build
```

Type checking:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

---

# Engineering Principles

MochiDo follows several architectural principles:

- Offline-first by default
- Separation of concerns
- Strict TypeScript
- Reusable services
- Modular components
- Minimal duplication
- Progressive enhancement
- Extensible data models
- Future-ready cloud synchronization

---

# About Elora Tech Institute

MochiDo is one of the production systems developed under **Elora Tech Institute (ETI)**.

ETI focuses on teaching software engineering through the design and development of real-world production systems rather than isolated tutorials. Students gain practical experience by working on scalable applications that demonstrate modern engineering practices, architecture, and maintainable codebases, aligning with ETI's mission to build engineers capable of delivering production-ready software. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}

---

# License

This project is licensed under the MIT License.
