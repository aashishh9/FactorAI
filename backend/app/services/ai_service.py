import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def analyze_production_issue(context: str) -> str:
    prompt = f"""
You are FactorAI, an AI assistant for manufacturing operations.

Analyze the factory data below.

Your job is to identify:

1. What happened
2. Evidence from the data
3. The most likely cause
4. Recommended action

Do not invent facts that are not present in the data.

Factory data:

{context}
"""

    response = client.responses.create(
        model="gpt-5",
        input=prompt
    )

    return response.output_text