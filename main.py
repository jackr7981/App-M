import streamlit as st
from scrape import (scrape_website,
                    split_dom_content,
                    clean_body_content,
                    extract_body_content)
from parse import parse_with_ollama

st.title("Ai Web Scraper")
url = st.text_input("Enter the URL")

if st.button("Scrape"):
    st.write("Scraping the website...")
    result = scrape_website(url)
    
    body_content = extract_body_content(result)
    clean_content = clean_body_content(body_content)
    
    st.session_state.dom_content = clean_content

    with st.expander("Scraped Content"):
        st.text_area("Content", clean_content, height=300)

if "dom_content" in st.session_state:
    parse_description = st.text_area("Describe what you want to parse?")

    if st.button("Parse Content"):
        if parse_description:
            st.button("Parsing the content...")

            dom_chunks = split_dom_content(st.session_state.dom_content)
            result = parse_with_ollama(dom_chunks, parse_description)
            st.write(result)
            

