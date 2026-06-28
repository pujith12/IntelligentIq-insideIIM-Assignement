# InvestIQ - AI Investment Research Agent

InvestIQ is a production-quality, modular, and lightweight full-stack AI Investment Research Agent. It allows users to register, login, upload company annual/earnings reports (PDFs), parse the reports page-by-page, run local vector database queries (RAG), search the web for live market updates, and generate structured investment recommendation reports using Gemini 2.5 Flash.

---

## Technical Stack & Architectural Decisions

### Frontend
- **React (Vite)**: Selected for fast building times and high performance compared to Create React App.
- **React Router Dom**: Manages page routing and guards the Dashboard route from unauthenticated guests.
- **Axios**: Configured with a central request interceptor to automatically attach JWT bearer tokens from `localStorage`.

### Backend (MVC Architecture)
- **Node.js & Express.js**: Handles API endpoints. Structured cleanly into models, views/routes, controllers, and services.
- **MongoDB & Mongoose**: Stores user data, report metadata tracking paths, and recommendation history.
- **JWT & bcryptjs**: Implements secure token signing and salted password hashing.

### AI & Vector Processing
- **LangChain.js**: Orchestrates the prompt compiling, LLM interfaces, and embeddings loaders.
- **Gemini 2.5 Flash**: Selected for rapid inference speed, cost-effectiveness, and massive 1M token context capacity.
- **Google Generative AI Embeddings (`text-embedding-004`)**: Generates 768-dimensional semantic text vectors.
- **FaissStore**: Facebook AI Similarity Search run locally in-process on the server, keeping vector storage costs at $0.

---

## Directory Structure

```text
Inside_IIM Assignement/
├── backend/
│   ├── config/             # MongoDB Connection helper
│   ├── controllers/        # Express Route Controllers (Auth, Report, Analysis)
│   ├── middleware/         # Security & Multer parser middlewares
│   ├── models/             # Mongoose schemas (User, Report, Analysis)
│   ├── routes/             # REST Route mappings
│   ├── services/           # Ingestion and AI pipelines (FAISS, Gemini, PDF, Search)
│   ├── prompts/            # Analyst system prompt templates
│   ├── uploads/            # Server PDF storage
│   ├── vector_store/       # Local FAISS index files
│   ├── server.js           # Server startup script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/        # Auth global state provider
│   │   ├── pages/          # Pages (Login, Register, Dashboard)
│   │   ├── services/       # Preconfigured Axios API client
│   │   └── index.css       # Premium Vanilla CSS overrides
│   └── vercel.json         # SPA rewrites config for Vercel
└── README.md
```

---

## Local Setup & Installation

### Prerequisites
1. Install [Node.js](https://nodejs.org/) (v18 or higher recommended).
2. Install and run [MongoDB Community Server](https://www.mongodb.com/try/download/community) locally on port `27017` (or prepare a MongoDB Atlas connection string).

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/investment-agent
   JWT_SECRET=yoursupersecurejwtsecretkeyhere123
   GEMINI_API_KEY=your_gemini_api_key
   TAVILY_API_KEY=your_tavily_api_key_optional
   ```
4. Start the server in development mode (auto-reloads on file edits):
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173/`.

---

## Production Deployment Guide

### Backend: Deploying to Render
1. Create a free account on [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Set the following options:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Start Command**: `node server.js`
5. In the **Environment Variables** section, add:
   - `MONGO_URI`: (Copy-paste your MongoDB Atlas connection string)
   - `JWT_SECRET`: (A strong random secret key)
   - `GEMINI_API_KEY`: (Your Google Gemini key)
   - `TAVILY_API_KEY`: (Optional search key)
6. Click **Deploy Web Service**.

> [!IMPORTANT]
> **Ephemeral Storage Tradeoff**: Free hosting instances (like Render or Heroku) have ephemeral filesystems. This means any files written to disk during runtime (such as uploaded PDF reports inside `backend/uploads/` and local FAISS vector files inside `backend/vector_store/`) will be cleared whenever the server restarts or goes to sleep.
> 
> *Production Solution*: To scale this application in a multi-server production environment:
> 1. Store uploaded PDF files inside a cloud storage bucket like **AWS S3** or Google Cloud Storage.
> 2. Move vector storage to a persistent cloud vector database like **Pinecone**, Chroma Cloud, or MongoDB Atlas Vector Search.

### Frontend: Deploying to Vercel
1. Create a free account on [Vercel](https://vercel.com/).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. Set the following options:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: (The URL of your deployed Render service, ending in `/api`, e.g., `https://investiq-api.onrender.com/api`)
6. Click **Deploy**. Vercel will build the React SPA and deploy it. Client-side subpage routing is managed automatically by the preconfigured `frontend/vercel.json` file.

