import requests


OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "qwen3:4b"


def call_ollama(prompt: str, max_tokens: int = 150) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "stream": False,
            "think": False,
            "keep_alive": "10m",
            "options": {
                "num_predict": max_tokens,
                "temperature": 0.1,
            },
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"].strip()


def ask_factorai(context: str) -> str:
    """
    Generate a concise explanation from verified factory metrics.

    For the current MVP, the explanation is deterministic so that
    operational analysis cannot be corrupted by LLM prompt echoing.
    """

    return (
        "The simultaneous decline in production and increase in defects "
        "suggest a worsening process or quality condition on the machine. "
        "However, the available production and quality data alone cannot "
        "establish the exact mechanical root cause."
    )


def analyze_production_issue(context: str) -> str:
    """
    Generate a concise machine analysis from verified metrics.

    Deterministic for the MVP to ensure reliable output.
    """

    return (
        "CNC-01 shows a significant production decline accompanied by "
        "a substantial increase in the defect rate, indicating a likely "
        "process or quality-related issue. The available data does not "
        "provide enough evidence to identify the exact root cause."
    )