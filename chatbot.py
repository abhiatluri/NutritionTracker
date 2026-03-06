"""
Chatbot module for Nutrition Tracker.
RAG helpers and answer_question entrypoint.
"""

import os

import DB

try:
    import chromadb
except ImportError:  # pragma: no cover - optional dependency
    chromadb = None

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional dependency
    OpenAI = None


EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_MEALS_COLLECTION", "user_meals")

_CHROMA_CLIENT = None
_MEALS_COLLECTION = None
_OPENAI_CLIENT = None


def meal_to_document(meal):
    """
    Turn a single meal dict (from get_user_meals / get_user_daily_meals) into
    a short text string suitable for embedding and semantic search.
    """
    date_val = meal.get('entry_date')
    if hasattr(date_val, 'isoformat'):
        date_str = date_val.isoformat()
    else:
        date_str = str(date_val)
    meal_type = (meal.get('meal_type') or 'meal').lower()
    name = meal.get('food_name') or 'Unknown'
    qty = meal.get('quantity_servings', 1)
    cal = meal.get('calories', 0)
    p = meal.get('protein_g', 0)
    c = meal.get('carbs_g', 0)
    f = meal.get('fat_g', 0)
    return (
        f"{date_str} {meal_type}: {name}, "
        f"{qty} serving(s), {cal} cal, {p}g P, {c}g C, {f}g F"
    )


def _get_openai_client():
    # Lazily create and cache an OpenAI client if configured
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is not None:
        return _OPENAI_CLIENT
    api_key = os.getenv("OPENAI_API_KEY")
    if OpenAI is None or not api_key:
        return None
    _OPENAI_CLIENT = OpenAI()
    return _OPENAI_CLIENT


def _embed_text(text):
    # Get an embedding vector for the given text, or None if not configured 
    client = _get_openai_client()
    if client is None:
        return None
    resp = client.embeddings.create(model=EMBEDDING_MODEL, input=[text])
    return resp.data[0].embedding


def _get_chroma_collection():
    # Lazily create and cache the Chroma client/collection
    global _CHROMA_CLIENT, _MEALS_COLLECTION
    if chromadb is None:
        return None
    if _CHROMA_CLIENT is None:
        _CHROMA_CLIENT = chromadb.Client()
    if _MEALS_COLLECTION is None:
        _MEALS_COLLECTION = _CHROMA_CLIENT.get_or_create_collection(
            name=CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _MEALS_COLLECTION


def index_meal(meal):
    """
    Index or update a single meal in the Chroma collection.

    This is called from the Flask endpoints whenever a meal is added
    or updated. It is best-effort: if indexing fails, it logs to the
    server console but does not break the main request.
    """
    try:
        collection = _get_chroma_collection()
        if collection is None:
            print("[chatbot.index_meal] Chroma not configured; skipping indexing.")
            return

        meal_id = meal.get("id")
        if meal_id is None:
            print("[chatbot.index_meal] Meal missing 'id'; skipping indexing.")
            return

        # Ensure we have user_id; fallback to DB lookup if needed
        user_id = meal.get("user_id")
        if user_id is None:
            try:
                db_meal = DB.get_meal_by_id(meal_id)
            except Exception as db_err:
                print(f"[chatbot.index_meal] Error fetching meal from DB: {db_err}")
                db_meal = None
            if db_meal:
                meal = db_meal
                user_id = db_meal.get("user_id")

        doc = meal_to_document(meal)
        embedding = _embed_text(doc)
        if embedding is None:
            print("[chatbot.index_meal] Embedding unavailable; skipping indexing.")
            return

        metadata = {
            "user_id": user_id,
            "meal_id": meal_id,
            "food_name": meal.get("food_name"),
            "entry_date": str(meal.get("entry_date")),
            "meal_type": meal.get("meal_type"),
        }

        collection.upsert(
            ids=[str(meal_id)],
            embeddings=[embedding],
            documents=[doc],
            metadatas=[metadata],
        )
        
    except Exception as e:
        try:
            meal_id = meal.get("id")
        except Exception:
            meal_id = None
        print(f"[chatbot.index_meal] Error while indexing meal {meal_id}: {e}")


def remove_meal_from_index(meal):
    """
    Remove a single meal from the Chroma collection.

    Called from the Flask endpoint when a meal is deleted.
    """
    try:
        collection = _get_chroma_collection()
        if collection is None:
            print("[chatbot.remove_meal_from_index] Chroma not configured; skipping removal.")
            return

        meal_id = meal.get("id")
        if meal_id is None:
            print("[chatbot.remove_meal_from_index] Meal missing 'id'; skipping removal.")
            return

        collection.delete(ids=[str(meal_id)])
    except Exception as e:
        try:
            meal_id = meal.get("id")
        except Exception:
            meal_id = None
        print(f"[chatbot.remove_meal_from_index] Error while removing meal {meal_id}: {e}")


def _retrieve_relevant_meals(user_id, question, k=10):
    """
    Retrieve top-k meals for this user that are semantically related
    to the question, using Chroma.
    """
    collection = _get_chroma_collection()
    if collection is None:
        print("[chatbot._retrieve_relevant_meals] Chroma not configured; skipping retrieval.")
        return []

    query_embedding = _embed_text(question)
    if query_embedding is None:
        print("[chatbot._retrieve_relevant_meals] Embedding unavailable; skipping retrieval.")
        return []

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where={"user_id": user_id},
        )
    except Exception as e:
        print(f"[chatbot._retrieve_relevant_meals] Error during Chroma query: {e}")
        return []

    docs = results.get("documents", [[]])[0] if results.get("documents") else []
    metas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []

    items = []
    for doc, meta in zip(docs, metas):
        items.append({
            "document": doc,
            "metadata": meta or {},
        })
    return items


def answer_question(user_id, question):
    """
    Main entrypoint for the conversational nutrition assistant.

    Args:
        user_id (int): ID of the user asking the question.
        question (str): User's natural language question.

    Returns:
        dict with:
            - "answer": str
            - "sources": list of retrieved meal documents/metadata
    """
    client = _get_openai_client()
    if client is None:
        msg = (
            "Chatbot is not configured. Please set OPENAI_API_KEY and install "
            "the OpenAI client to enable answers."
        )
        return {"answer": msg, "sources": []}

    # Retrieve relevant meals for this user
    retrieved = _retrieve_relevant_meals(user_id, question, k=10)

    # Build context string for the model
    if retrieved:
        context_lines = [
            f"{idx+1}. {item['document']}"
            for idx, item in enumerate(retrieved)
        ]
        context_block = "\n".join(context_lines)
    else:
        context_block = "No prior meals were found for this user."

    system_prompt = (
        "You are a helpful nutrition assistant for a meal tracking app. "
        "Answer the user's question using the provided meal history when relevant. "
        "Be concise and specific. If the meal history does not contain enough "
        "information, say so instead of making up details."
    )

    user_prompt = (
        "User question:\n"
        f"{question}\n\n"
        "Relevant meal history (one entry per line):\n"
        f"{context_block}\n\n"
        "Use this meal history to answer questions about what the user has eaten, "
        "their calories, macros, or patterns. You may also use general nutrition "
        "knowledge, but do not invent meals that are not listed."
    )

    try:
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        answer = resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[chatbot.answer_question] Error calling chat model: {e}")
        answer = "Could not generate an answer due to server error."

    return {
        "answer": answer,
        "sources": retrieved,
    }
