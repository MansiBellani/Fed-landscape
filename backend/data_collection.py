import os
import httpx
from dotenv import load_dotenv
import trafilatura
import asyncio
from typing import List

load_dotenv()

class TechArticleSearch:
    # ... (the __init__ and _scrape_content methods remain the same) ...
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
        if not self.api_key:
            raise ValueError("SERPER_API_KEY not found.")
        self.headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}

    async def _scrape_content(self, article: dict) -> dict:
        """Asynchronously scrapes content from a single article URL."""
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            try:
                res = await client.get(article['link'])
                article['full_content'] = trafilatura.extract(res.text)
                return article
            except Exception:
                article['full_content'] = None
                return article

    async def _search_and_scrape_single_query(self, query: str, date_filter: str) -> list:
        # ... (this method remains the same) ...
        print(f"🔎 Running search query: '{query}' for date range '{date_filter}'")
        api_url = "https://google.serper.dev/news"
        payload = {"q": query, "tbs": f"qdr:{date_filter}"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(api_url, headers=self.headers, json=payload)
                response.raise_for_status()
            return response.json().get("news", [])
        except Exception as e:
            print(f"❌ API search for query '{query}' failed: {e}")
            return []

    async def run_fed_landscape_search(self, selected_keywords: List[str], date_filter: str = "w") -> list:
        if not selected_keywords:
            return []

        search_queries = []
        for keyword in selected_keywords:
            query = (
                f'"{keyword}" AND '
                f'("university research funding" OR "federal grant" OR "innovation ecosystem" OR "R&D policy") AND '
                f'(site:.gov OR site:.edu OR site:.org) -jobs -admissions -curriculum'
            )
            search_queries.append(query)
        
        tasks = [self._search_and_scrape_single_query(q, date_filter) for q in search_queries]
        results_from_all_searches = await asyncio.gather(*tasks)

        combined_articles = {}
        for result_list in results_from_all_searches:
            for article in result_list:
                if article.get('link') and article['link'] not in combined_articles:
                    combined_articles[article['link']] = article
        
        unique_articles = list(combined_articles.values())[:7] # Limit to 7 to be safe
        print(f"Found {len(unique_articles)} unique articles to scrape.")
        
        if not unique_articles:
            return []

        # --- CHANGE: Scrape articles sequentially instead of in parallel ---
        # This uses far less memory and prevents crashes on free hosting tiers.
        full_articles = []
        for article in unique_articles:
            scraped_article = await self._scrape_content(article)
            full_articles.append(scraped_article)
        
        valid_articles = [art for art in full_articles if art.get('full_content')]
        print(f"✅ Scraped content from {len(valid_articles)} valid articles.")
        return valid_articles
