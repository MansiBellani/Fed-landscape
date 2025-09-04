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
origins = ["http://localhost", "http://localhost:5173", "https://fed-landscape-tcwb.vercel.app", "https://fed-landscape-tcwb.vercel.app/"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ProcessRequest(BaseModel):
    recipient_email: str
    selected_keywords: List[str] = []
    date_filter: str = "w"

# REVERTED: The endpoint now handles the entire process and returns the report content
@app.post("/api/process")
async def process_request_endpoint(request: ProcessRequest):
    try:
        print("🚀 Request received: Searching for articles...")
        articles = await searcher.run_fed_landscape_search(request.selected_keywords, request.date_filter)
        
        if not articles:
            return {"status": "success", "articles": [], "report_content": "", "message": "No recent articles found."}

        relevance_context = (
            "A relevant article discusses federal activities like new grants, programs, or policy "
            f"affecting universities and innovation ecosystems related to {', '.join(request.selected_keywords)}."
        )

        for article in articles:
            article['relevance_score'] = classifier.evaluate_relevance(
                article.get('full_content', ''), relevance_context
            )

        sorted_articles = sorted(articles, key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        print("🤖 Generating final intelligence report...")
        report_title = "TUFF Fed Landscape Report"
        report_content = f"# {report_title}\n\nThis report summarizes recent federal activities.\n\n---\n\n"
        
        for article in sorted_articles[:7]:
            full_summary = report_generator.generate_full_summary(article.get('full_content', ''))
            paragraph = full_summary.get('paragraph', 'Summary not available.')
            points = full_summary.get('points', 'Key points not available.')
            
            report_content += f"## {article.get('title', 'No Title')}\n"
            report_content += f"**Source:** {article.get('source', 'N/A')}\n"
            report_content += f"**Relevance:** {int(article.get('relevance_score', 0) * 100)}%\n\n"
            report_content += f"{paragraph}\n\n**Key Points:**\n{points}\n\n"
            report_content += f"[Read Full Article]({article.get('link', '#')})\n\n---\n\n"

        print("✉️ Creating Google Doc and sending email...")
        subject = "Your TUFF Fed Landscape Report is Ready"
        doc_url = tools.add_content_to_gdoc(report_content, f"{report_title} - {datetime.now().strftime('%Y-%m-%d')}")
        tools.send_email(doc_url, subject, request.recipient_email)
        print("✅ Process completed successfully!")

        return {
            "status": "success",
            "articles": sorted_articles,
            "report_content": report_content,
            "message": f"Success! Report generated from {len(sorted_articles)} articles and sent."
        }

    except Exception as e:
        print(f"❌ An error occurred during the process: {e}")
        return {"status": "error", "message": "An unexpected error occurred on the server.", "articles": [], "report_content": ""}
