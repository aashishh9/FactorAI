import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "qwen3:4b"


def ask_factorai(context: str) -> str:
    """
    Send factory evidence to the local LLM and return
    a concise, evidence-based operational answer.
    """

    prompt = f"""
/no_think

You are FactorAI, an AI assistant for factory operations.

Answer the manager's question using ONLY the factory evidence provided below.

Rules:
- Do not invent facts.
- Do not assume information that is not present.
- Use specific numbers when available.
- Explain the most likely interpretation of the evidence.
- If the evidence is insufficient, explicitly say so.
- Keep the answer concise and professional.
- Do not explain your internal reasoning.
- Do not mention that you are an AI unless necessary.

Factory evidence:
{context}
"""

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
                "num_predict": 250,
                "temperature": 0.1,
            },
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"]


def analyze_production_issue(context: str) -> str:
    """
    Generate a structured production analysis.
    Used for machine-specific analysis.
    """

    prompt = f"""
/no_think

You are FactorAI, a factory operations analyst.

Analyze the following machine data.

Return EXACTLY these 5 lines:

What happened: <one short sentence>
Likely cause: <one short sentence>
Evidence: <one short sentence containing specific numbers>
Recommended action: <one short sentence>
Confidence: <number between 0 and 100>%

Rules:
- Use ONLY the provided data.
- Do not invent machine conditions.
- Do not invent causes that are unsupported by the data.
- If the evidence is weak, reflect that in the confidence.
- Do not explain your reasoning.
- Do not add any other text.

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
                    "content": prompt,
                }
            ],
            "stream": False,
            "think": False,
            "keep_alive": "10m",
            "options": {
                "num_predict": 200,
                "temperature": 0.1,
            },
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"]