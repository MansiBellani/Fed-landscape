import os
import httpx
from dotenv import load_dotenv
import trafilatura
import asyncio
from typing import List

load_dotenv()

class TechArticleSearch:
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
        """Performs a search and scrape operation for a single query."""
        print(f"🔎 Running search query: '{query}' for date range '{date_filter}'")
        api_url = "https://google.serper.dev/news"
        
        # This correctly constructs the payload for the Serper API
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
        """
        Runs a multi-pass dynamic search query based on user-selected keywords.
        This runs multiple targeted searches in parallel for better accuracy.
        """
        if not selected_keywords:
            return []

        # --- THIS ENTIRE BLOCK OF UNUSED CODE HAS BEEN REMOVED ---
        # The 'date_param_mapping', old 'search_query', and 'params' dictionary
        # were leftovers from a different implementation and caused a bug.
        # The correct logic is handled within the loop below.

        # --- Create a list of highly-focused search queries ---
        search_queries = []
        for keyword in selected_keywords:
            # Each query is now more specific and targeted
            query = (
                f'"{keyword}" AND '
                f'("university research funding" OR "federal grant" OR "innovation ecosystem" OR "R&D policy") AND '
                f'(site:.gov OR site:.edu OR site:.org) -jobs -admissions -curriculum'
            )
            search_queries.append(query)
        
        # --- Run all searches in parallel ---
        # The date_filter ('w', 'm', 'y') is correctly passed to the single query function
        tasks = [self._search_and_scrape_single_query(q, date_filter) for q in search_queries]
        results_from_all_searches = await asyncio.gather(*tasks)

        # --- Combine and de-duplicate the results ---
        combined_articles = {}
        for result_list in results_from_all_searches:
            for article in result_list:
                # Use the article link as a unique key to avoid duplicates
                if article.get('link') and article['link'] not in combined_articles:
                    combined_articles[article['link']] = article
        
        unique_articles = list(combined_articles.values())
        print(f"Found {len(unique_articles)} unique articles across all searches.")
        
        # --- Scrape content for the unique articles ---
        if not unique_articles:
            return []

        scraping_tasks = [self._scrape_content(article) for article in unique_articles]
        full_articles = await asyncio.gather(*scraping_tasks)
        
        valid_articles = [art for art in full_articles if art.get('full_content')]
        print(f"✅ Scraped content from {len(valid_articles)} valid articles.")
        return valid_articles
