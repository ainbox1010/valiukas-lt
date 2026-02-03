from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


@app.get("/health")
def health_check():
    return {"status": "ok"}


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(_: ChatRequest):
    raise HTTPException(status_code=501, detail="Chat endpoint not implemented.")
