from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_collection import TechArticleSearch
from classifier import ContentClassifier
from llm_generator import ReportGenerator 
from datetime import datetime
from typing import List
import tools

# --- App Setup ---
app = FastAPI()
report_generator = ReportGenerator()
searcher = TechArticleSearch()
classifier = ContentClassifier()

origins = [
    "http://localhost",
    "http://localhost:5173",
    "https://fed-landscape-tcwb.vercel.app",
    "https://fed-landscape-tcwb.vercel.app/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessRequest(BaseModel):
    recipient_email: str
    selected_keywords: List[str] = []
    date_filter: str = "w"

def is_article_recent(article_date: str) -> bool:
    date_str = article_date.lower()
    current_year = str(datetime.now().year)
    if any(term in date_str for term in ['hour', 'day', 'week', 'ago', 'minute']) or current_year in date_str:
        return True
    if any(year in date_str for year in ['2019', '2020', '2021', '2022', '2023']):
        return False
    return True

@app.post("/api/process")
async def process_request_endpoint(request: ProcessRequest):
    try:
        articles = await searcher.run_fed_landscape_search(request.selected_keywords, request.date_filter)
        
        recent_articles = [article for article in articles if is_article_recent(article.get('date', ''))]
        if not recent_articles:
            return {"status": "success", "articles": [], "report_content": "", "message": "No recent articles found."}

        relevance_context = (
            "A relevant article discusses federal activities like new grants, programs, or policy "
            f"affecting universities and innovation ecosystems related to {', '.join(request.selected_keywords)}."
        )

        for article in recent_articles:
            article['relevance_score'] = classifier.evaluate_relevance(
                article.get('full_content', ''), relevance_context
            )

        sorted_articles = sorted(recent_articles, key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        print("🤖 Generating final intelligence report using GPT-4o...")
        report_title = "TUFF Fed Landscape Report"
        report_content = f"# {report_title}\n\n"
        report_content += "This report summarizes recent federal activities affecting universities and innovation ecosystems.\n\n---\n\n"
        
        for article in sorted_articles[:7]:
            # --- CHANGE 1: Call the new method to get both summaries ---
            full_summary = report_generator.generate_full_summary(article.get('full_content', ''))
            paragraph_summary = full_summary.get('paragraph', 'Summary not available.')
            point_summary = full_summary.get('points', 'Key points not available.')
            
            # --- CHANGE 2: Add both summaries to the report content ---
            report_content += f"## {article.get('title', 'No Title')}\n"
            report_content += f"**Source:** {article.get('source', 'N/A')}\n"
            report_content += f"**Relevance:** {int(article.get('relevance_score', 0) * 100)}%\n\n"
            
            # Add the new 1-2 sentence paragraph summary here
            report_content += f"{paragraph_summary}\n\n" 
            
            # Add the 5-point summary below
            report_content += f"**Key Points:**\n{point_summary}\n\n"
            
            report_content += f"[Read Full Article]({article.get('link', '#')})\n\n---\n\n"

        try:
            subject = "Your Weekly TUFF Fed Landscape Report"
            doc_url = tools.add_content_to_gdoc(report_content, f"{report_title} - {datetime.now().strftime('%Y-%m-%d')}")
            tools.send_email(doc_url, subject, request.recipient_email)
        except Exception as e:
            print(f"Error in post-processing (GDoc/Email): {e}")

        return {
            "status": "success",
            "articles": sorted_articles,
            "report_content": report_content,
            "message": f"Success! Generated a report from {len(sorted_articles)} articles."
        }

    except Exception as e:
        return {"status": "error", "message": str(e), "articles": [], "report_content": ""}
