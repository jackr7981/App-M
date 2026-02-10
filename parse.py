import re
import json

def parse_agents(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Split by "MLA -" or "MLA" to find entries
    # The OCR text has "MLA -" or "MLA" followed by a number as the start of an entry
    
    # We'll use a regex to find the start of each entry
    # Pattern: MLA followed by space, hyphen, space, and a number
    entry_pattern = re.compile(r'(MLA\s*-?\s*\d+)', re.MULTILINE)
    
    parts = entry_pattern.split(text)
    
    agents = []
    
    # parts[0] is preamble
    # parts[1] is MLA-002, parts[2] is content for MLA-002
    # parts[3] is MLA-003, parts[4] is content for MLA-003
    
    if len(parts) < 2:
        print("No entries found")
        return

    for i in range(1, len(parts), 2):
        license_no = re.sub(r'\s+', '', parts[i]).replace('MLA', 'MLA-') # Start with MLA-002 format cleanup
        # The split might leave MLA in parts[i], let's just clean it.
        # Actually parts[i] is 'MLA  \n 002'
        # We want 'MLA-002'
        license_no = parts[i].replace('\n', '').replace(' ', '')
        if 'MLA-' not in license_no:
            license_no = license_no.replace('MLA', 'MLA-')
        content = parts[i+1].strip()
        
        # remove page headers/footers if matched inside
        content = re.sub(r'==.*?==', '', content)
        content = re.sub(r'2/10/26, 10:11 PM about:blank', '', content)
        content = re.sub(r'about:blank \d+/\d+', '', content)
        
        lines = [l.strip() for l in content.split('\n') if l.strip()]
        
        # Heuristic extraction
        # Name is usually the first line
        company_name = lines[0] if lines else ""
        
        # Address usually follows until keywords like "Tel", "Phone", "Email", "Web"
        address_lines = []
        contact_lines = []
        owner_part = []
        validity = ""
        
        # Extract validity (date at the end)
        # Pattern: dd-mm-yyyy or similar at end
        validity_match = re.search(r'(\d{1,2}[\.\-\s]\d{1,2}[\.\-\s]\d{2,4})', content.split('\n')[-1])
        if validity_match:
             validity = validity_match.group(1)
        
        # Re-process lines to separate address, contact, owner
        # This is tricky without strict structure.
        # We can try to identify phone/email lines.
        
        is_contact_section = False
        is_owner_section = False
        
        for line in lines[1:]:
            if any(x in line.lower() for x in ['tel', 'phone', 'fax', 'mob', 'cell', 'mail', 'web', 'www']):
                is_contact_section = True
            
            # If we hit a very short line or a name-like line at the end, might be owner
            # But the OCR sometimes puts Owner Name in a separate column visually, which might interleave or appear at end.
            # In the text provided:
            # "Capt. A.T.M\nAnwarul Haque\n26 May\n2026"
            
            if is_contact_section and not is_owner_section:
                # Check if we moved passed contact info to owner info
                # Owner info often doesn't have contact keywords
                if not any(x in line.lower() for x in ['tel', 'phone', 'fax', 'mail', 'web', 'www']):
                     # Could be address continuation or owner?
                     # If it looks like a name and is near end?
                     pass
            
            contact_lines.append(line) # Dump everything else in contact/raw for now
            
        
        # Let's clean up the "raw" approach.
        # Everything between Name and Validity is "Details"
        # We will save: License, Name, RawText (to be parsed manually or shown as is), Validity
        
        agents.append({
            "license": license_no,
            "name": company_name,
            "raw_text": content, 
            "validity": validity
        })

    return agents

def generate_sql(agents):
    sql = """
-- Create agencies table
CREATE TABLE IF NOT EXISTS public.manning_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    license_number text NOT NULL,
    company_name text NOT NULL,
    address text,
    contact_details text,
    owner_name text,
    validity_date text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.manning_agents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.manning_agents FOR SELECT USING (true);

-- Clear existing data (optional, maybe we want to upsert)
TRUNCATE TABLE public.manning_agents;

INSERT INTO public.manning_agents (license_number, company_name, contact_details, validity_date) VALUES
"""
    values = []
    for a in agents:
        # Escape single quotes
        name = a['name'].replace("'", "''")
        license = a['license'].replace("'", "''")
        raw = a['raw_text'].replace("'", "''")
        validity = a['validity'].replace("'", "''")
        
        values.append(f"('{license}', '{name}', '{raw}', '{validity}')")
    
    sql += ",\n".join(values) + ";"
    return sql

if __name__ == "__main__":
    data = parse_agents('/Users/rafsun/Documents/Antigravity/M-hub1/agents_ocr.txt')
    if data:
        print(f"Parsed {len(data)} agents.")
        sql_script = generate_sql(data)
        with open('/Users/rafsun/Documents/Antigravity/M-hub1/insert_agents.sql', 'w') as f:
            f.write(sql_script)
        print("SQL script generated: insert_agents.sql")
