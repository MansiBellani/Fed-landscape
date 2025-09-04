from fastapi import FastAPI, BackgroundTasks # Import BackgroundTasks
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
# (Instantiate your classes as before)
report_generator = ReportGenerator()
searcher = TechArticleSearch()
classifier = ContentClassifier()
# (CORSMiddleware setup remains the same)
origins = ["http://localhost", "http://localhost:5173", "https://fed-landscape-tcwb.vercel.app", "https://fed-landscape-tcwb.vercel.app/"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ProcessRequest(BaseModel):
    recipient_email: str
    selected_keywords: List[str] = []
    date_filter: str = "w"

# --- NEW: This function holds all the slow logic and will run in the background ---
async def generate_and_email_report(keywords: List[str], date_filter: str, email: str):
    try:
        print("🚀 Background task started: Searching for articles...")
        articles = await searcher.run_fed_landscape_search(keywords, date_filter)
        
        if not articles:
            print("⏹️ Background task finished: No articles found.")
            # Optional: send an email saying no articles were found
            return

        relevance_context = (
            "A relevant article discusses federal activities like new grants, programs, or policy "
            f"affecting universities and innovation ecosystems related to {', '.join(keywords)}."
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
        tools.send_email(doc_url, subject, email)
        print("✅ Background task completed successfully!")

    except Exception as e:
        print(f"❌ Error in background task: {e}")
        # Optional: send an error email to the user or admin
        tools.send_email("An error occurred during report generation. Please try again later.", "Report Generation Failed", email)


@app.post("/api/process")
async def process_request_endpoint(request: ProcessRequest, background_tasks: BackgroundTasks):
    # This endpoint is now very fast. It just adds the job and returns.
    background_tasks.add_task(
        generate_and_email_report,
        request.selected_keywords,
        request.date_filter,
        request.recipient_email
    )
    return {
        "status": "success",
        "message": "Report generation started! You will receive an email shortly."
    }
