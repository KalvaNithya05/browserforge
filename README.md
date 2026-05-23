# BrowserForge

BrowserForge is a browser-based IDE inspired by modern development tools like VS Code. It allows users to create, edit, organize, and preview code directly in the browser using Monaco Editor, live preview rendering, AI-powered code explanation, and MongoDB-based project persistence.

---

## Features

- Monaco Editor integration
- Dynamic file explorer
- File and folder creation
- Rename and delete files/folders
- Live HTML/CSS/JavaScript preview
- AI-powered code explanation using Gemini API
- MongoDB project save/load functionality
- LocalStorage auto-restore
- Resizable IDE panels
- Multi-language syntax highlighting
- Responsive dark-themed UI

---

## Tech Stack

### Frontend
- React
- Tailwind CSS
- Monaco Editor
- Vite

### Backend
- Node.js
- Express.js
- Gemini API

### Database
- MongoDB Atlas

### Deployment
- Vercel
- Render

---

## Live Demo

### Frontend
https://browserforge-three.vercel.app

### Backend API
https://browserforge.onrender.com

---

## Project Structure

```bash
browserforge/
│
├── client/          # React frontend
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── server/          # Express backend
│   ├── db/
│   ├── models/
│   ├── routes/
│   ├── gemini.js
│   └── index.js
│
└── README.md
