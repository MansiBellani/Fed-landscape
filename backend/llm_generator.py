import os
from openai import OpenAI, APIError
from dotenv import load_dotenv

load_dotenv()

class ReportGenerator:
    """
    Uses OpenAI's powerful language models to generate high-quality, structured summaries.
    """
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print("⚠️ OpenAI API key not found. Summarization will be basic.")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
            print("✅ Report Generator configured to use OpenAI GPT-4o.")

    def summarize_article_in_points(self, article_content: str) -> str:
        """
        Generates a concise, 5-point technical summary for a single article's content.
        """
        if not self.client:
            return "OpenAI client not configured. Cannot generate summary."
        
        if not article_content:
            return "No content provided for summarization."

        system_prompt = (
            "You are a specialized analyst for a university-focused real estate investment trust (TUFF). "
            "Your task is to read a news article and produce a concise, technical, 5-point summary. "
            "Focus on details relevant to federal grants, research funding, innovation ecosystems, "
            "semiconductors, AI policy, and economic development affecting universities. "
            "Each point should be a distinct, informative bullet."
        )
        
        user_prompt = f"Please create a 5-point bulleted summary for the following article:\n\n---\n\n{article_content}"

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=300,
            )
            summary = response.choices[0].message.content.strip()
            # Clean up the response to ensure it's just the bullet points
            summary_lines = [line.strip() for line in summary.split('\n') if line.strip()]
            return "\n".join(summary_lines)

        except APIError as e:
            print(f"❌ OpenAI API error during summarization: {e}")
            return "Failed to generate summary due to an API error."
        except Exception as e:
            print(f"❌ An unexpected error occurred during summarization: {e}")
            return "An unexpected error occurred."

