---
name: kotaemon
description: "Build, configure, and customize document-grounded RAG (Retrieval Augmented Generation) pipelines and multi-agent document QA systems using Kotaemon. Use when building chat-with-documents features, multi-format file ingestion (PDF, DOCX, XLSX, OCR), hybrid search, citation tracking, ReAct/ReWOO agent reasoning over documents, or deploying and customizing the Kotaemon UI."
---

# Kotaemon: Production RAG & Document QA Architecture

Kotaemon is a clean, extensible, and production-ready RAG framework designed for document-grounded question answering with full citation attribution, hybrid retrieval, and multi-agent reasoning (ReAct and ReWOO).

## Key Capabilities

1. **Document Ingestion & Multi-Format Parsing**:
   - Handles PDF, DOCX, XLSX, CSV, HTML, Markdown, and scanned documents with OCR support.
   - Structured chunking with metadata preservation for precise citation tracing.

2. **Advanced Retrieval Pipeline**:
   - Hybrid retrieval combining dense vector search (Chroma, LanceDB, FAISS, Milvus, Qdrant) with sparse keyword/BM25 search.
   - Reranking models (Cohere, Cross-Encoder, bge-reranker) to prioritize top-k relevant context chunks.

3. **Multi-Agent Reasoning**:
   - **ReAct Agent**: Dynamic multi-turn reasoning and tool invocation for complex, ambiguous document queries.
   - **ReWOO Agent** (Reasoning Without Observation): Plan-ahead reasoning that reduces redundant LLM calls and latency by executing retrieval queries in parallel.

4. **Component-Based Architecture**:
   - Every processing step is a `BaseComponent`.
   - Pipelines are composable nested components that can be configured, executed, or extended with custom logic.

---

## Component Implementation Pattern

In Kotaemon, any modular unit or pipeline inherits from `kotaemon.base.BaseComponent`:

```python
from kotaemon.base import BaseComponent, Document
from kotaemon.llms import BaseLLM
from typing import List

class CustomRAGPipeline(BaseComponent):
    """Custom document-grounded QA pipeline."""
    top_k: int = 5
    score_threshold: float = 0.7
    
    # Sub-components / nodes
    llm: BaseLLM
    retriever: BaseComponent

    def run(self, query: str) -> dict:
        # 1. Retrieve relevant chunks
        docs: List[Document] = self.retriever(query)
        
        # 2. Filter / format context
        context = "\n\n".join([doc.text for doc in docs[:self.top_k]])
        
        # 3. Grounded generation
        prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer with citations:"
        response = self.llm(prompt)
        
        return {
            "answer": response.text,
            "citations": [doc.metadata for doc in docs[:self.top_k]]
        }
```

---

## Agent Architectures

### 1. ReAct Agent (`kotaemon.agents.react`)
Used when a query requires multi-hop reasoning, exploring multiple sections of a document, or interactive tool calls:
- **Thought**: Formulates sub-goals based on user question.
- **Action**: Queries retrievers or calculation tools.
- **Observation**: Evaluates retrieved chunks.
- **Repeat until final synthesis**: Generates cited conclusion.

### 2. ReWOO Agent (`kotaemon.agents.rewoo`)
Used for lower-latency complex tasks:
- **Planner**: Generates the complete execution plan upfront with variable placeholders (e.g., `#E1 = Search[Q1]`, `#E2 = Search[Q2]`).
- **Worker**: Executes all planned searches and tool calls concurrently.
- **Solver**: Synthesizes the final answer from all executed evidence.

---

## Deployment & Setup

```bash
# Fast install
pip install kotaemon

# Launch the default web UI
python app.py

# Docker run
docker run -e GRADIO_SERVER_NAME=0.0.0.0 -p 7860:7860 ghcr.io/cinnamon/kotaemon:latest
```
