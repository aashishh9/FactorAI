import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "qwen3:4b"


def analyze_production_issue(context: str) -> str:

    prompt = f"""
/no_think

You are FactorAI.

Analyze this factory data.

Give ONLY these 5 lines:

What happened: one short sentence
Likely cause: one short sentence
Evidence: one short sentence with numbers
Recommended action: one short sentence
Confidence: number between 0 and 100%

Do not explain your reasoning.
Do not write anything else.

Factory data:
{context}
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": False,
            "think": False,
            "keep_alive": "10m",
            "options": {
                "num_predict": 100,
                "temperature": 0.1
            }
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"]