import selenium.webdriver as webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver import Remote
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection
from os import environ
from bs4 import BeautifulSoup

AUTH = environ.get('AUTH', default='brd-customer-hl_37ebd5f9-zone-ai_scraper:t7l779xs39fd')
SBR_WEBDRIVER = f'https://{AUTH}@brd.superproxy.io:9515'

def scrape_website(website):
    print("Launching chrome browser...")

    connection = Connection(SBR_WEBDRIVER, 'goog', 'chrome')
    driver = Remote(connection, options=Options())
    try:
        driver.get(website)
        print("Waiting for captcha to solve...")
        result = driver.execute('executeCdpCommand', {
            'cmd': 'Captcha.waitForSolve',
            'params': {'detectTimeout': 10000},
        })
        status = result['value']['status']
        print(f'Captcha status: {status}')
        html = driver.page_source
        return html
    finally:
        driver.quit()

def extract_body_content(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    body_content = soup.body
    if body_content:
        return str(body_content)
    return ""

def clean_body_content(body_content):
    soup = BeautifulSoup(body_content, 'html.parser')

    for script_or_style in soup(['script', 'style']):
        script_or_style.extract()

    cleaned_content = soup.get_text(separator="\n")
    cleaned_content = "\n".join(line.strip() for line in cleaned_content.splitlines() if line.strip())
    return cleaned_content

def split_dom_content(dom_content, max_length=6000):
    return [dom_content[i:i + max_length] for i in range(0, len(dom_content), max_length)]


