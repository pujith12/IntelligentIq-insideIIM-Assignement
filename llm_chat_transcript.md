# InvestIQ - AI Pair Programming Session Transcript

This document contains the chronological chat logs and thought processes between the **Developer** and the **AI Coding Assistant (Antigravity)** while building, debugging, and deploying the **InvestIQ AI Investment Research Agent**.

---

### Phase 1: Environment Ingestion and Server Startup
* **Developer Request**: `run frontend and backend both and open localhost`
* **AI Action**: 
  * Analyzed the repository structure and found the pre-configured Node/Express backend and Vite React frontend.
  * Verified that both folders already had `node_modules` and local environment variables (`.env`) configured.
  * Started the backend server (`npm run dev`) and the frontend dev server (`npm run dev`) as background tasks.
  * Checked the logs to confirm the backend successfully connected to local MongoDB (`127.0.0.1:27017`) and Vite served the client on `http://localhost:5173`.
  * Opened the browser at `http://localhost:5173` using a browser subagent and confirmed the dashboard rendered successfully.

---

### Phase 2: Proactive Fallback Bug Diagnosis
* **Developer Request**: `is there any changes required`
* **AI Action**:
  * Inspected the backend startup logs and noticed that when the mock "TESLA" analysis was triggered, the backend logged:
    `Tavily search failed (e.g. 401 Invalid Key), switching to Live Free Wikipedia API: Request failed with status code 401`
    and immediately:
    `Wikipedia API fallback missed. Using offline sector intelligence.`
  * Wrote a temporary test script (`test_wiki.js`) to probe the Wikipedia REST API summary endpoint directly.
  * **Discovered the Issue**: Node's default client (Axios) received a `403 Forbidden` response from Wikipedia because Wikipedia blocks request headers without a descriptive custom `User-Agent`. Additionally, querying raw company names directly (like `TESLA`) returned disambiguation pages or 404s instead of corporate profiles.
  * **Implemented the Solution**:
    * Set a professional `User-Agent` header (`InvestIQ/1.0 (contact@investiq-agent.com)`) to satisfy Wikipedia's robot policies.
    * Integrated Wikipedia's **Opensearch API** to first resolve raw queries to the best matching corporate page title (e.g. mapping "TESLA" $\rightarrow$ "Tesla, Inc.") before retrieving the summary.
  * Verified that the Wikipedia fallback successfully retrieved and merged corporate data. Pushed the changes to GitHub.

---

### Phase 3: Repository Setup and Push
* **Developer Request**: `https://github.com/pujith12/IntelligentIq-insideIIM-Assignement.git push all code file and required files dont push other unnecessary files`
* **AI Action**:
  * Created a root-level `.gitignore` file to ensure database files, uploaded PDFs, `.env` files, and `node_modules` were not committed.
  * Staged and committed clean source files.
  * Ran into a merge conflict on the remote repository's `README.md`.
  * Resolved the conflict manually, completed the rebase, and successfully pushed the clean branch to `https://github.com/pujith12/IntelligentIq-insideIIM-Assignement.git`.

---

### Phase 4: Production Database Setup and local DNS Debugging
* **Developer Request**: `how to get monbgo uri`
* **AI Action**: Provided a comprehensive step-by-step guide to setting up a MongoDB Atlas cluster and whitelist access.
* **Developer Action**: Provided MongoDB Atlas production connection details.
* **AI Action**: Configured the local `.env` with the new production Atlas string.
* **DNS Resolution Error**: On restart, the local Node.js process failed to connect to Atlas with a `querySrv ECONNREFUSED` error.
  * **Analysis**: Identified that Node's standard SRV DNS record resolver fails under certain local Windows network setups.
  * **Resolution**: Updated `backend/config/db.js` with an automatic catch-and-retry mechanism. If a `querySrv ECONNREFUSED` error is encountered, the app automatically switches the Node DNS server to Google's public DNS (`8.8.8.8`) and Cloudflare (`1.1.1.1`) to establish the connection successfully.

---

### Phase 5: Production Deployment and Frontend Alignment
* **Developer Request**: `after deploying login failed / register failed`
* **AI Action**:
  * Inspected browser logs showing `Failed to load resource: 404 on intelligentiq-insideiim-assignement.onrender.com/auth/login`.
  * **Discovered the Issue**: The API URL configured on Vercel (`VITE_API_URL`) was missing the trailing `/api` route prefix.
  * **Resolution**: Updated the frontend API client (`api.js`) to automatically check the URL configuration and append `/api` if it was omitted by the user.
  * Pushed the code changes to GitHub. Vercel automatically rebuilt the site.
  * **Result**: Deployed version successfully loaded, registered users, and logged in without errors!
