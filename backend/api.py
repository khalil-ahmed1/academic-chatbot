import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.llms import HuggingFacePipeline
from langchain_google_genai import ChatGoogleGenerativeAI
from transformers import pipeline

# -----------------------------
# Step 1: Load environment variables
# -----------------------------
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY not found in .env file")

genai.configure(api_key=GOOGLE_API_KEY)

# -----------------------------
# Step 2: Initialize FastAPI
# -----------------------------
app = FastAPI(
    title="Academic RAG Chatbot API",
    description="Upload PDFs and ask academic questions using hybrid Gemini + FAISS RAG pipeline.",
    version="1.0.0",
)

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Step 3: Initialize constants
# -----------------------------
PDF_DIR = "data/academic"
INDEX_PATH = "faiss_index"

# Ensure folder exists
os.makedirs(PDF_DIR, exist_ok=True)

# -----------------------------
# Step 3.5: Load FAISS index at startup
# -----------------------------
vectorstore = None

def load_index():
    global vectorstore
    if vectorstore is None:
        vectorstore = build_or_load_index()
    return vectorstore

# -----------------------------
# Step 4: Helper - Build or Reload Index
# -----------------------------
def build_or_load_index():
    """Build FAISS index if not exists or new PDFs are uploaded."""
    embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Check if FAISS index already exists
    if os.path.exists(INDEX_PATH):
        print("✅ Loading existing FAISS index...")
        vectorstore = FAISS.load_local(INDEX_PATH, embedding, allow_dangerous_deserialization=True)
    else:
        print("⚙️ Building new FAISS index...")
        docs = []
        for filename in os.listdir(PDF_DIR):
            if filename.endswith(".pdf"):
                loader = PyPDFLoader(os.path.join(PDF_DIR, filename))
                docs.extend(loader.load())

        if not docs:
            raise ValueError("❌ No PDFs found to build index")

        # Use smaller chunk size to reduce token length
        text_splitter = CharacterTextSplitter(chunk_size=400, chunk_overlap=50)
        documents = text_splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(documents, embedding)
        vectorstore.save_local(INDEX_PATH)
        print("✅ FAISS index built and saved!")

    return vectorstore


# -----------------------------
# Step 5: Initialize Models
# -----------------------------
print("🔍 Checking Gemini models...")
models = genai.list_models()
available_models = [m.name for m in models]
preferred_models = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-flash-latest",
    "models/gemini-pro-latest"
]

model_to_use = next((m for m in preferred_models if m in available_models), None)
if not model_to_use:
    raise ValueError("❌ No supported Gemini model found.")

gemini_llm = ChatGoogleGenerativeAI(model=model_to_use, temperature=0.7)

local_pipe = pipeline("text2text-generation", model="google/flan-t5-small", tokenizer="google/flan-t5-small", max_length=512)
llm = HuggingFacePipeline(pipeline=local_pipe)

# -----------------------------
# Step 6: Define Models
# -----------------------------
class QueryRequest(BaseModel):
    query: str
    history: list = []
    exam_type: str | None = None

class TopicRequest(BaseModel):
    topic: str


# -----------------------------
# Step 7: Endpoints
# -----------------------------

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    📂 Upload a PDF file.
    Automatically rebuilds FAISS index after upload.
    """
    file_path = os.path.join(PDF_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # After upload, rebuild FAISS index
    global vectorstore
    vectorstore = build_or_load_index()

    return {"message": f"✅ {file.filename} uploaded and index updated successfully!"}


@app.post("/ask")
async def ask_question(request: QueryRequest):
    """
    💬 Ask a question to the RAG chatbot.
    Detects academic queries and uses FAISS + Gemini hybrid pipeline.
    """
    query = request.query.strip()

    # Build conversation history
    conversation = ""
    for msg in request.history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role == "user":
            conversation += f"User: {content}\n"
        elif role == "assistant":
            conversation += f"Assistant: {content}\n"

    full_query = conversation + f"User: {query}\nAssistant:"

    length_instruction = ""
    if request.exam_type == "viva":
        length_instruction = "\nKeep your response to 2-3 lines only."
    elif request.exam_type == "theory":
        length_instruction = "\nKeep your response to 8-10 lines."

    vectorstore = load_index()
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 1})

    qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever, chain_type="map_reduce", return_source_documents=True)

    # Detect academic question
    academic_keywords = [
        "logic", "design", "programming", "DSA", "algorithm", "data structure",
        "computer", "engineering", "database", "operating system",
        "microprocessor", "network", "compiler"
    ]

    if any(word.lower() in query.lower() for word in academic_keywords):
        rag_response = qa_chain.invoke({"query": query})  # Keep original query for RAG retrieval
        academic_answer = rag_response["result"].strip()

        final_prompt = f"""
        You are an expert academic assistant. Below is the conversation history and a retrieved academic answer:

        Conversation:
        {conversation}

        Retrieved Answer: "{academic_answer}"

        User Question: {query}

        Please provide a helpful response considering the conversation history. Refine the answer — make it more structured, engaging, and easy to understand.
        Keep the meaning accurate but improve clarity. Limit your answer in 200 words.{length_instruction}
        """ 

        enhanced_response = gemini_llm.invoke(final_prompt)
        return {"type": "academic", "answer": enhanced_response.content}
    else:
        response = gemini_llm.invoke(full_query + length_instruction)
        return {"type": "general", "answer": response.content}


class SummarizeRequest(BaseModel):
    history: list

@app.post("/summarize")
async def summarize_chat(request: SummarizeRequest):
    conversation = ""
    for msg in request.history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role == "user":
            conversation += f"User: {content}\n"
        elif role == "assistant":
            conversation += f"Assistant: {content}\n"

    prompt = f"""Summarize the following conversation in 3-5 bullet points, focusing on key academic topics and insights discussed:

{conversation}"""

    response = gemini_llm.invoke(prompt)
    return {"summary": response.content}


import re

def extract_json_from_response(text: str):
    # Try to extract JSON from markdown code block
    json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', text, re.DOTALL)
    if json_match:
        return json_match.group(1)
    
    # If no markdown, try the whole text
    try:
        # Remove any leading/trailing non-JSON text
        json_start = text.find('[')
        json_end = text.rfind(']') + 1
        if json_start != -1 and json_end > json_start:
            return text[json_start:json_end]
    except:
        pass
    
    return text.strip()

@app.post("/generate_mcqs")
async def generate_mcqs():
    docs = []
    for filename in os.listdir(PDF_DIR):
        if filename.endswith(".pdf"):
            loader = PyPDFLoader(os.path.join(PDF_DIR, filename))
            docs.extend(loader.load())

    if not docs:
        return {"error": "No documents uploaded yet. Please upload PDFs first."}

    # Combine text, limit length to avoid token limits
    full_text = "\n".join([doc.page_content for doc in docs])[:10000]

    prompt = f"""You are an academic expert. Generate exactly 10 multiple-choice questions (MCQs) based on the following document content.

Each MCQ should have:
- question: A clear question
- options: Object with A, B, C, D keys containing the options
- correct: The correct option letter (A, B, C, or D)
- explanation: A short explanation (2-3 sentences) of why the correct answer is right and key learning point

Output ONLY a valid JSON array of 10 objects, no other text or explanations.

Document content: {full_text}

JSON format example:
[
  {{
    "question": "What is the main topic?",
    "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
    "correct": "A",
    "explanation": "This is correct because... Key point: ..."
  }}
]"""

    response = gemini_llm.invoke(prompt)
    json_text = extract_json_from_response(response.content)
    return {"mcqs": json_text}


@app.get("/list_documents")
async def list_documents():
    """
    📂 List all uploaded PDF documents.
    """
    try:
        files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
        return {"documents": files}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/delete_document")
async def delete_document(filename: str):
    """
    🗑️ Delete a specific document.
    """
    file_path = os.path.join(PDF_DIR, filename)
    if not os.path.exists(file_path):
        return {"error": "Document not found"}
    
    try:
        os.remove(file_path)
        return {"message": f"{filename} deleted successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/download/{filename}")
async def download_document(filename: str):
    """
    📥 Download a specific document.
    """
    file_path = os.path.join(PDF_DIR, filename)
    if not os.path.exists(file_path):
        return {"error": "Document not found"}
    
    return FileResponse(file_path, media_type='application/pdf', filename=filename)

@app.post("/rebuild_index")
async def rebuild_index():
    """
    🔄 Rebuild FAISS index after document changes.
    """
    try:
        global vectorstore
        vectorstore = build_or_load_index()
        return {"message": "FAISS index rebuilt successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate_question")
async def generate_question(request: TopicRequest):
    """
    🎯 Generate a viva-style question based on a given topic.
    """
    topic = request.topic.strip()

    prompt = f"""You are an expert academic tutor conducting a viva voce (oral examination) on the topic: "{topic}".

Generate a SHORT, focused viva-style question that:
- Is concise (1-2 sentences maximum)
- Tests specific conceptual understanding
- Could be asked in a real viva examination
- Requires precise, direct answers
- Is suitable for university-level students

Viva questions are typically:
- Short and direct: "What is X?" "How does Y work?" "Why is Z important?"
- Specific: Focus on one key concept
- Oral: Designed for verbal responses, not long essays

Examples of good viva questions:
- "What is the time complexity of binary search?"
- "How does a stack differ from a queue?"
- "What is the purpose of normalization in databases?"

Output only the viva-style question, nothing else."""

    response = gemini_llm.invoke(prompt)
    return {"question": response.content.strip()}

class AnswerRequest(BaseModel):
    question: str
    answer: str
    topic: str
    conversation_history: list = []

@app.post("/evaluate_answer")
async def evaluate_answer(request: AnswerRequest):
    """
    📝 Evaluate a student's answer and provide feedback with follow-up questions.
    """
    question = request.question.strip()
    answer = request.answer.strip()
    topic = request.topic.strip()

    # Build conversation history for context
    history_text = ""
    if request.conversation_history:
        history_text = "\nPrevious conversation:\n" + "\n".join([
            f"Q: {msg.get('question', '')}\nA: {msg.get('answer', '')}\nFeedback: {msg.get('feedback', '')}"
            for msg in request.conversation_history[-3:]  # Last 3 exchanges
        ])

    prompt = f"""You are an expert academic tutor conducting a deep-dive learning session on "{topic}".

Current Question: {question}
Student's Answer: {answer}{history_text}

Please evaluate the answer and continue the learning session by:
1. A score out of 10 (be fair and constructive)
2. Brief feedback on what's correct and what needs improvement
3. Identify specific gaps or misconceptions in their understanding
4. Provide a deeper explanation of the key concepts they missed
5. Ask 2-3 follow-up questions that probe deeper into the topic, building on their current understanding
6. Suggest related concepts they should explore next

Format your response as:
Score: X/10

Feedback: [Your detailed feedback here]

Deeper Explanation: [Additional learning content addressing their gaps]

Follow-up Questions:
1. [First probing question]
2. [Second probing question]
3. [Third probing question - optional]

Related Concepts: [List 2-3 related topics to explore]"""

    response = gemini_llm.invoke(prompt)
    return {"evaluation": response.content}

class ContinueVivaRequest(BaseModel):
    topic: str
    evaluation: str
    conversation_history: list = []

@app.post("/continue_viva_chat")
async def continue_viva_chat(request: ContinueVivaRequest):
    """
    🎯 Generate the next viva question based on the evaluation and conversation history.
    """
    topic = request.topic.strip()
    evaluation = request.evaluation.strip()

    # Build conversation history for context
    history_text = ""
    if request.conversation_history:
        history_text = "\nPrevious conversation:\n" + "\n".join([
            f"Q: {msg.get('question', '')}\nA: {msg.get('answer', '')}\nFeedback: {msg.get('feedback', '')}"
            for msg in request.conversation_history[-3:]  # Last 3 exchanges
        ])

    prompt = f"""You are an expert academic tutor conducting a viva voce examination on "{topic}".

Based on this evaluation and conversation history, generate the next SHORT, focused viva-style question to continue the deep learning session.

Evaluation: {evaluation}{history_text}

The next question should:
- Be concise (1 sentence maximum)
- Build naturally on the current evaluation and feedback
- Probe deeper into areas identified as needing improvement
- Be suitable for viva voce (oral examination)
- Focus on one specific concept or aspect

Output only the viva-style question, nothing else."""

    response = gemini_llm.invoke(prompt)
    return {"question": response.content.strip()}

@app.get("/")
async def root():
    return {"message": "Welcome to the Academic RAG Chatbot API 🚀"}


# Load index on startup
try:
    load_index()
    print("✅ FAISS index loaded on startup.")
except ValueError as e:
    print(f"⚠️ {e}. Index will be built on first upload.")

# Run server: uvicorn main:app --reload
