#!/usr/bin/env python3
"""
MariAid Job Scraper with Direct REST API Integration
Scrapes maritime job listings from mariaid.com/careers-at-sea and uploads via REST API
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import sys
from datetime import datetime

# Constants
URL = "https://mariaid.com/careers-at-sea"
JOBS_DIR = "jobs"

# Supabase credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zlgfadgwlwreezwegpkx.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "sb_publishable_WLb8f8ArmmJm931BFjD0gQ_PjRuovGR")


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
        # Try multiple selectors to find job listings
        job_elements = soup.find_all(['div', 'article', 'section'],
            class_=lambda x: x and ('job' in x.lower() or 'career' in x.lower() or 'position' in x.lower()))

        # If no specific job class found, try finding by common patterns
        if not job_elements:
            # Look for repeated structures with job titles
            job_elements = soup.find_all('h4')
            if not job_elements:
                job_elements = soup.find_all('h3')

        print(f"📋 Found {len(job_elements)} potential job elements")

        for idx, element in enumerate(job_elements):
            try:
                job_data = extract_job_details(element)
                if job_data:
                    jobs.append(job_data)
                    print(f"   ✓ Job {idx + 1}: {job_data.get('title', 'Unknown')}")
            except Exception as e:
                print(f"   ⚠️  Error parsing job {idx + 1}: {e}")
                continue

        print(f"\n✅ Successfully extracted {len(jobs)} valid job listings")
        return jobs

    except requests.RequestException as e:
        print(f"❌ Error fetching page: {e}")
        return []


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
    job['raw_content'] = text_content

    # Parse common fields
    import re

    # Extract positions
    positions_match = re.search(r'(\d+)\s*POSITIONS?', text_content, re.IGNORECASE)
    if positions_match:
        job['positions'] = int(positions_match.group(1))

    # Extract salary
    salary_match = re.search(r'\$[\d,]+-?\$?[\d,]*', text_content)
    if salary_match:
        job['salary'] = salary_match.group(0)

    # Extract contract length
    contract_match = re.search(r'(\d+)M\s*\(\+\d+\)', text_content)
    if contract_match:
        job['contract'] = contract_match.group(0)

    # Extract rank from title
    job['rank'] = extract_rank(job['title'])

    # Extract ship type
    job['ship_type'] = extract_ship_type(text_content)

    # Look for "Apply Now" or "View Details" links
    apply_link = container.find('a', href=True, string=lambda t: t and 'apply' in t.lower())
    if apply_link:
        job['apply_url'] = apply_link['href']
        if not job['apply_url'].startswith('http'):
            job['apply_url'] = f"https://mariaid.com{job['apply_url']}"

    job['source'] = 'MariAid'
    job['mla_number'] = 'MLA-114'  # MariAid's MLA number
    job['agency'] = 'MariAid Limited'

    return job


def extract_rank(title):
    """Extract rank from job title"""
    title_upper = title.upper()

    # Common maritime ranks
    rank_mapping = {
        'MASTER': 'Master',
        'CAPTAIN': 'Master',
        'CHIEF OFFICER': 'Chief Officer',
        'C/O': 'Chief Officer',
        '2ND OFFICER': '2nd Officer',
        '2/O': '2nd Officer',
        '3RD OFFICER': '3rd Officer',
        '3/O': '3rd Officer',
        'CHIEF ENGINEER': 'Chief Engineer',
        'C/E': 'Chief Engineer',
        '2ND ENGINEER': '2nd Engineer',
        '2/E': '2nd Engineer',
        '3RD ENGINEER': '3rd Engineer',
        '3/E': '3rd Engineer',
        'ELECTRO TECHNICAL OFFICER': 'Electro Technical Officer',
        'ETO': 'Electro Technical Officer',
        'BOSUN': 'Bosun',
        'AB': 'Able Seaman',
        'ABLE SEAMAN': 'Able Seaman',
        'OILER': 'Oiler',
        'FITTER': 'Fitter',
        'COOK': 'Cook',
        'STEWARD': 'Steward',
    }

    for pattern, rank in rank_mapping.items():
        if pattern in title_upper:
            return rank

    return 'Other'


def extract_ship_type(text):
    """Extract ship type from text"""
    text_upper = text.upper()

    if any(word in text_upper for word in ['TANKER', 'VLCC', 'AFRAMAX', 'SUEZMAX']):
        return 'Oil Tanker'
    elif 'BULK' in text_upper or 'BULKER' in text_upper:
        return 'Bulk Carrier'
    elif 'CONTAINER' in text_upper:
        return 'Container'
    elif 'LNG' in text_upper:
        return 'LNG Carrier'
    elif 'LPG' in text_upper:
        return 'LPG Carrier'
    elif 'CHEMICAL' in text_upper:
        return 'Chemical Tanker'
    elif 'RO-RO' in text_upper or 'RORO' in text_upper:
        return 'RoRo'

    return 'Other'


def upload_to_supabase_rest(jobs):
    """Upload scraped jobs to Supabase using REST API"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️  Skipping database upload (credentials not set)")
        return 0

    print(f"\n📤 Uploading {len(jobs)} jobs to Supabase via REST API...")

    uploaded = 0
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    for job in jobs:
        try:
            # Prepare job data for Supabase
            job_data = {
                'raw_content': job.get('raw_content', ''),
                'source': job.get('source', 'MariAid'),
                'status': 'parsed',  # Mark as parsed since we extracted data
                'rank': job.get('rank', 'Other'),
                'salary': job.get('salary'),
                'joining_date': 'ASAP',  # Default joining date
                'mla_number': job.get('mla_number'),
                'agency': job.get('agency'),
                'parsed_content': {
                    'rank': job.get('rank'),
                    'shipType': job.get('ship_type', 'Other'),
                    'salary': job.get('salary'),
                    'wage': job.get('salary'),
                    'joining_date': 'ASAP',
                    'joiningDate': 'ASAP',
                    'description': job.get('raw_content', ''),
                    'company': job.get('agency'),
                    'companyName': job.get('agency'),
                    'mla_number': job.get('mla_number'),
                    'contact': job.get('apply_url', ''),
                    'contactInfo': job.get('apply_url', ''),
                }
            }

            # Check if job already exists (avoid duplicates by raw_content)
            check_url = f"{SUPABASE_URL}/rest/v1/job_postings?raw_content=eq.{requests.utils.quote(job.get('raw_content', '')[:100])}&select=id&limit=1"
            check_response = requests.get(check_url, headers=headers)

            if check_response.ok and check_response.json():
                print(f"   ⏭️  Skipped (duplicate): {job.get('title')}")
                continue

            # Insert job
            insert_url = f"{SUPABASE_URL}/rest/v1/job_postings"
            response = requests.post(insert_url, headers=headers, json=job_data)

            if response.ok:
                uploaded += 1
                print(f"   ✅ Uploaded: {job.get('title')}")
            else:
                print(f"   ❌ Failed ({response.status_code}): {job.get('title')} - {response.text[:100]}")

        except Exception as e:
            print(f"   ❌ Error uploading job: {e}")
            continue

    print(f"\n✅ Successfully uploaded {uploaded} new jobs to database!")
    return uploaded


def save_jobs_locally(jobs):
    """Save jobs to local JSON files for backup"""
    timestamp = datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')
    os.makedirs(JOBS_DIR, exist_ok=True)

    # Save latest jobs
    latest_file = os.path.join(JOBS_DIR, "latest_jobs.json")
    with open(latest_file, 'w', encoding='utf-8') as f:
        json.dump({
            'scraped_at': datetime.utcnow().isoformat(),
            'total_jobs': len(jobs),
            'jobs': jobs
        }, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {latest_file}")

    # Save timestamped backup
    timestamped_file = os.path.join(JOBS_DIR, f"jobs_{timestamp}.json")
    with open(timestamped_file, 'w', encoding='utf-8') as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {timestamped_file}")


def main():
    """Main function"""
    print("=" * 60)
    print("MariAid Maritime Jobs Scraper (REST API)")
    print("=" * 60)

    # Scrape jobs
    jobs = scrape_jobs()

    if jobs:
        # Save locally
        save_jobs_locally(jobs)

        # Upload to Supabase
        uploaded = upload_to_supabase_rest(jobs)
        print(f"\n🎉 Scraper completed: {len(jobs)} scraped, {uploaded} uploaded to database")
    else:
        print("\n⚠️  No jobs found. Please check the website structure.")
        sys.exit(1)


if __name__ == "__main__":
    main()
