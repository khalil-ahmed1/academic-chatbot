# 📘 Academic RAG Chatbot API Documentation

This document explains how your **frontend developer** can interact with the **Academic RAG Chatbot API**. It provides detailed instructions, endpoint explanations, example payloads, and response formats.

---

## 🧠 Overview
The API allows users to:
1. **Upload academic PDFs** (lecture notes, question papers, etc.)
2. **Ask questions** related to uploaded content
3. Get **AI-generated responses** combining local retrieval (RAG) + Gemini refinement.

---

## ⚙️ Base URL
```
http://localhost:8000
```
> Replace `localhost:8000` with your deployed backend URL when hosting online.

---

## 🔐 Authentication
Currently, the API does **not require authentication**. If needed later, JWT or API key auth can be added easily.

---

## 🚀 Endpoints

### 1️⃣ `/upload` — Upload a PDF file
**Method:** `POST`

#### 📄 Description
This endpoint allows a user to upload a PDF file to the backend. Once uploaded, the system automatically rebuilds the **FAISS index** for academic search.

#### 🧾 Request Type
`multipart/form-data`

#### 🧠 Request Parameters
| Parameter | Type | Description |
|------------|------|--------------|
| `file` | File | The academic PDF you want to upload |

#### 🧩 Example (Frontend Axios)
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', selectedFile);

axios.post('http://localhost:8000/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));
```

#### ✅ Example Response
```json
{
  "message": "✅ notes.pdf uploaded and index updated successfully!"
}
```

#### ⚠️ Notes
- The index rebuild may take a few seconds if the file is large.
- Uploaded PDFs are saved under: `data/academic/`
- The FAISS index is auto-generated after every new upload.

---

### 2️⃣ `/ask` — Ask a question to the chatbot
**Method:** `POST`

#### 📄 Description
This endpoint allows the frontend to send a user’s question. The system automatically detects if the question is **academic** or **general**.

If academic → the backend retrieves the most relevant content from the PDFs and refines it using **Gemini LLM**.

If general → the query is sent directly to **Gemini**.

#### 🧾 Request Type
`application/json`

#### 🧠 Request Body
| Field | Type | Description |
|--------|------|--------------|
| `query` | string | The question the user asks |

#### 🧩 Example (Frontend Axios)
```javascript
import axios from 'axios';

axios.post('http://localhost:8000/ask', {
  query: 'Explain polymorphism in OOP.'
})
.then(res => {
  console.log(res.data.type); // 'academic' or 'general'
  console.log(res.data.answer); // Chatbot's answer
})
.catch(err => console.error(err));
```

#### ✅ Example Response (Academic Question)
```json
{
  "type": "academic",
  "answer": "Great question! Polymorphism allows objects of different classes to be treated as instances of the same parent class. It enables methods to behave differently based on the object that calls them, promoting flexibility and code reusability."
}
```

#### ✅ Example Response (General Question)
```json
{
  "type": "general",
  "answer": "I'm a hybrid chatbot built with Gemini and FAISS! How can I assist you today?"
}
```

#### ⚙️ Backend Logic Flow
1. Detects **keywords** like “programming”, “data structure”, “algorithm”, etc.
2. If academic → uses FAISS retriever + Flan-T5 local model.
3. Passes retrieved answer to Gemini for final refinement.
4. Returns clean and contextual output.

---

### 3️⃣ `/` — Root Endpoint
**Method:** `GET`

#### 📄 Description
Basic test route to confirm if API is running.

#### ✅ Example Response
```json
{
  "message": "Welcome to the Academic RAG Chatbot API 🚀"
}
```

---

## 🧱 Integration Flow for Frontend
1. **Upload PDFs** through the `/upload` endpoint.
2. Wait for success message (ensures FAISS index is updated).
3. Use `/ask` to send user questions.
4. Display chatbot responses in chat UI.

---

## 🧩 Recommended Frontend UI Workflow
- Step 1: User uploads PDFs via an upload button.
- Step 2: Display a toast/snackbar saying: “Index updated successfully!”
- Step 3: User types academic question in chat.
- Step 4: Hit `/ask` and render `answer` in chat bubble.
- Step 5: Optionally show `academic` / `general` label to indicate answer type.

---

## ⚡ Performance Notes
- For large PDFs, the first index creation may take ~5–10 seconds.
- Subsequent queries are fast because FAISS runs in-memory.
- Gemini API provides smooth natural language refinement.

---

## 🔍 Example Testing (Postman)
**Upload Test:**
```
POST http://localhost:8000/upload
form-data:
  file: choose a PDF
```

**Ask Test:**
```
POST http://localhost:8000/ask
Body (JSON):
{
  "query": "What is an operating system kernel?"
}
```

---

## 🧾 Response Types Summary
| Type | Description | Source |
|------|--------------|---------|
| `academic` | Retrieved from FAISS + refined by Gemini | PDFs in `data/academic/` |
| `general` | Directly answered by Gemini | General knowledge |

---

## 🧰 Error Codes
| Code | Meaning | Possible Cause |
|-------|----------|----------------|
| 400 | Bad Request | Invalid query or file format |
| 404 | Not Found | No PDFs found to build index |
| 500 | Server Error | AI model or FAISS index error |

---

## ✅ Summary for Developer
- Base URL: `http://localhost:8000`
- Endpoints:
  - `POST /upload` → Upload PDF
  - `POST /ask` → Ask question
  - `GET /` → Health check
- Response always returns JSON with `type` and `answer` fields.

---

**Author:** Abhinav  
**Version:** 1.0.0  
**Last Updated:** October 2025

