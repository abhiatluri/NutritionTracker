"""
Chatbot module for Nutrition Tracker.

This module is intentionally left minimal for now. Implement the full
RAG-based nutrition assistant inside the `answer_question` function.
"""


def answer_question(user_id, question):
    """
    Placeholder for the nutrition assistant logic.

    Args:
        user_id (int): ID of the user asking the question.
        question (str): User's natural language question.

    Returns:
        dict: A dictionary with at least:
              - "answer": str
              - "sources": list (optional metadata about retrieved context)
    """
    return {
        "answer": "Test",
        "sources": []
    }

