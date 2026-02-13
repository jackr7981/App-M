#!/usr/bin/env python3
"""
MariAid Job Scraper
Scrapes maritime job listings from mariaid.com/careers-at-sea
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
from datetime import datetime
import os
import sys

# Constants
URL = "https://mariaid.com/careers-at-sea"
JOBS_DIR = "jobs"
LATEST_FILE = os.path.join(JOBS_DIR, "latest_jobs.json")
HISTORY_FILE = os.path.join(JOBS_DIR, "jobs_history.json")


def scrape_jobs():
    """Scrape job listings from MariAid careers page"""
    print(f"🔍 Scraping jobs from {URL}...")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(URL, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        jobs = []

        # Find all job cards/listings
        # Adjust selectors based on actual HTML structure
        job_elements = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and ('job' in x.lower() or 'career' in x.lower() or 'position' in x.lower()))

        # If no specific job class found, try finding by common patterns
        if not job_elements:
            # Look for repeated structures with job titles
            job_elements = soup.find_all('h4')

        for idx, element in enumerate(job_elements):
            try:
                # Extract job details
                job_data = extract_job_details(element)
                if job_data:
                    jobs.append(job_data)
            except Exception as e:
                print(f"⚠️  Error parsing job {idx + 1}: {e}")
                continue

        print(f"✅ Found {len(jobs)} job listings")
        return jobs

    except requests.RequestException as e:
        print(f"❌ Error fetching page: {e}")
        sys.exit(1)


def extract_job_details(element):
    """Extract job details from HTML element"""
    job = {}

    # Get the parent container that likely holds all job info
    container = element.find_parent(['div', 'article', 'section'])
    if not container:
        container = element

    # Extract title (h4, h3, or strong tag)
    title_elem = container.find(['h4', 'h3', 'strong'])
    if title_elem:
        job['title'] = title_elem.get_text(strip=True)
    else:
        job['title'] = element.get_text(strip=True) if element.name in ['h4', 'h3'] else "Unknown"

    # Skip if title is empty or generic
    if not job['title'] or len(job['title']) < 3:
        return None

    # Extract all text content
    text_content = container.get_text(separator=' | ', strip=True)

    # Parse common fields
    job['raw_text'] = text_content
    job['scraped_at'] = datetime.utcnow().isoformat()

    # Try to extract structured data
    if 'POSITIONS' in text_content.upper() or 'POSITION' in text_content.upper():
        # Extract number of positions
        import re
        positions_match = re.search(r'(\d+)\s*POSITIONS?', text_content, re.IGNORECASE)
        if positions_match:
            job['positions'] = int(positions_match.group(1))

    # Extract salary if present
    if '$' in text_content:
        import re
        salary_match = re.search(r'\$[\d,]+-?\$?[\d,]*', text_content)
        if salary_match:
            job['salary'] = salary_match.group(0)

    # Extract contract length
    import re
    contract_match = re.search(r'(\d+)M\s*\(\+\d+\)', text_content)
    if contract_match:
        job['contract'] = contract_match.group(0)

    # Look for "Apply Now" or "View Details" links
    apply_link = container.find('a', href=True, string=lambda t: t and 'apply' in t.lower())
    if apply_link:
        job['apply_url'] = apply_link['href']
        if not job['apply_url'].startswith('http'):
            job['apply_url'] = f"https://mariaid.com{job['apply_url']}"

    return job


def save_jobs(jobs):
    """Save jobs to JSON and CSV files"""
    timestamp = datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')

    # Ensure jobs directory exists
    os.makedirs(JOBS_DIR, exist_ok=True)

    # Save latest jobs as JSON
    with open(LATEST_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'scraped_at': datetime.utcnow().isoformat(),
            'total_jobs': len(jobs),
            'jobs': jobs
        }, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {LATEST_FILE}")

    # Save timestamped JSON
    timestamped_file = os.path.join(JOBS_DIR, f"jobs_{timestamp}.json")
    with open(timestamped_file, 'w', encoding='utf-8') as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {timestamped_file}")

    # Save as CSV
    csv_file = os.path.join(JOBS_DIR, f"jobs_{timestamp}.csv")
    if jobs:
        # Collect all unique keys from all jobs
        all_keys = set()
        for job in jobs:
            all_keys.update(job.keys())
        all_keys = sorted(list(all_keys))

        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(jobs)
        print(f"💾 Saved to {csv_file}")

    # Update history
    update_history(jobs)


def update_history(new_jobs):
    """Update jobs history and detect changes"""
    history = []

    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)

    # Add new entry
    history.append({
        'date': datetime.utcnow().isoformat(),
        'job_count': len(new_jobs),
        'jobs': new_jobs
    })

    # Keep only last 30 days
    history = history[-30:]

    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

    # Detect new jobs
    if len(history) > 1:
        previous_jobs = history[-2]['jobs']
        previous_titles = {job['title'] for job in previous_jobs}
        new_titles = {job['title'] for job in new_jobs if job['title'] not in previous_titles}

        if new_titles:
            print(f"\n🆕 NEW JOBS DETECTED ({len(new_titles)}):")
            for title in new_titles:
                print(f"   - {title}")
        else:
            print(f"\n✅ No new jobs since last scrape")


def main():
    """Main function"""
    print("=" * 60)
    print("MariAid Maritime Jobs Scraper")
    print("=" * 60)

    jobs = scrape_jobs()

    if jobs:
        save_jobs(jobs)
        print(f"\n✅ Successfully scraped {len(jobs)} jobs!")
    else:
        print("\n⚠️  No jobs found. Please check the scraper logic.")
        sys.exit(1)


if __name__ == "__main__":
    main()
