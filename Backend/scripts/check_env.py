import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GROQ_API_KEY")
if key:
    print(f"GROQ_API_KEY found: {key[:4]}...{key[-4:]}")
else:
    print("GROQ_API_KEY NOT found in environment.")
