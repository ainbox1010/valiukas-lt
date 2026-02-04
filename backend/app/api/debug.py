from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.rag.retrieval import retrieve_context

router = APIRouter()


@router.get("/debug/retrieval")
def debug_retrieval(query: str = Query(..., min_length=1, max_length=2000)) -> dict:
    settings = get_settings()
    if settings.ENV != "dev":
        raise HTTPException(status_code=404, detail="Not found")

    chunks = retrieve_context(query)
    return {
        "query": query,
        "chunks": [
            {
                "doc_id": chunk.doc_id,
                "title": chunk.title,
                "section": chunk.section,
                "source": chunk.source,
                "chunk_id": chunk.chunk_id,
                "score": chunk.score,
                "text": chunk.text,
            }
            for chunk in chunks
        ],
    }
