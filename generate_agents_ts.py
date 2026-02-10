#!/usr/bin/env python3
"""Parse the agents_ocr.txt and generate a TypeScript ManningAgent[] array."""

import re
import json

def parse_agents(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    entry_pattern = re.compile(r'(MLA\s*-?\s*\d+)', re.MULTILINE)
    parts = entry_pattern.split(text)

    agents = []
    agent_id = 1

    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            break

        # Clean license number
        license_raw = parts[i].replace('\n', '').replace(' ', '')
        if 'MLA-' not in license_raw:
            license_raw = license_raw.replace('MLA', 'MLA-')

        content = parts[i + 1].strip()
        # Remove page markers
        content = re.sub(r'==.*?==', '', content)
        content = content.strip()

        lines = [l.strip() for l in content.split('\n') if l.strip()]
        if not lines:
            continue

        company_name = lines[0]

        # Extract structured data
        address_parts = []
        phones = []
        emails = []
        websites = []
        owner_parts = []
        validity = ''

        # Determine status
        status = 'Active'
        full_text_lower = content.lower()
        if 'suspended' in full_text_lower:
            status = 'Suspended'
        elif 'expired' in full_text_lower:
            status = 'Expired'

        # Determine city
        cities = []
        if any(x in content.lower() for x in ['dhaka', 'dkaka']):
            cities.append('Dhaka')
        if any(x in content.lower() for x in ['chittagong', 'chattogram', 'chattogra', 'chattagram', 'ctg']):
            cities.append('Chittagong')
        if 'khulna' in content.lower():
            cities.append('Khulna')
        if not cities:
            # Try to infer from address
            cities.append('Other')

        # Parse lines for contact info
        in_contact = False
        for j, line in enumerate(lines[1:], 1):
            line_lower = line.lower()

            # Check for email
            email_match = re.findall(r'[\w\.\-\+]+@[\w\.\-]+\.\w+', line)
            if email_match:
                emails.extend(email_match)
                continue

            # Check for website
            web_match = re.findall(r'(?:www\.[\w\.\-]+\.\w+|https?://[\w\.\-]+\.\w+)', line, re.IGNORECASE)
            if web_match:
                websites.extend(web_match)
                # Could also have other info on same line
                if line_lower.startswith('web'):
                    continue

            # Check for phone/tel/fax
            if any(x in line_lower for x in ['tel', 'phone', 'ph.', 'ph:', 'ph ', 'fax', 'call', 'cell', 'mob']):
                phones.append(line)
                in_contact = True
                continue

            # If line starts with "E-mail" or "Email"
            if line_lower.startswith('e-mail') or line_lower.startswith('email'):
                email_match2 = re.findall(r'[\w\.\-\+]+@[\w\.\-]+\.\w+', line)
                if email_match2:
                    emails.extend(email_match2)
                continue

            # If line starts with Web/Website
            if line_lower.startswith('web'):
                web_match2 = re.findall(r'(?:www\.[\w\.\-]+\.\w+)', line, re.IGNORECASE)
                if web_match2:
                    websites.extend(web_match2)
                continue

            # Address or owner?
            if not in_contact:
                # Before contact info = address
                address_parts.append(line)
            else:
                # After contact info = could be owner or validity
                pass

        # Extract validity from end of content
        validity_match = re.search(r'(\d{1,2}[\.\-\s]+(?:\w+|\d{1,2})[\.\-\s]+\d{4})', content)
        if validity_match:
            validity = validity_match.group(1).strip()

        address = ', '.join(address_parts) if address_parts else ''
        # Clean address: remove "Address:" prefix
        address = re.sub(r'^(?:Permanent\s*(?:&|and)\s*Present\s*)?Address:\s*', '', address, flags=re.IGNORECASE).strip()

        # Get first phone
        phone_str = phones[0] if phones else ''
        # Clean phone string
        phone_str = re.sub(r'^(?:Tel|Phone|Ph|Fax|Call|Cell|Mob)\s*[\.\:\-\s]*', '', phone_str, flags=re.IGNORECASE).strip()

        # Get first email
        email_str = emails[0] if emails else ''

        # Get first website
        website_str = websites[0] if websites else ''

        agent = {
            'id': str(agent_id),
            'licenseNumber': license_raw,
            'name': company_name,
            'address': address if address else 'Bangladesh',
            'phone': phone_str if phone_str else 'N/A',
            'email': email_str if email_str else 'N/A',
            'website': website_str if website_str else None,
            'status': status,
            'cities': cities if cities != ['Other'] else None,
        }
        agents.append(agent)
        agent_id += 1

    return agents


def to_ts_array(agents):
    lines = []
    lines.append("// Auto-generated from Department of Shipping Approved Agents List")
    lines.append("// Source: Agents List.pdf")
    lines.append("import { ManningAgent } from '../types';")
    lines.append("")
    lines.append("export const APPROVED_AGENTS: ManningAgent[] = [")

    for a in agents:
        cities_str = json.dumps(a['cities']) if a['cities'] else 'undefined'
        website_str = f"'{a['website']}'" if a['website'] else 'undefined'
        lines.append("  {")
        lines.append(f"    id: '{a['id']}',")
        lines.append(f"    licenseNumber: '{_escape(a['licenseNumber'])}',")
        lines.append(f"    name: '{_escape(a['name'])}',")
        lines.append(f"    address: '{_escape(a['address'])}',")
        lines.append(f"    phone: '{_escape(a['phone'])}',")
        lines.append(f"    email: '{_escape(a['email'])}',")
        lines.append(f"    website: {website_str},")
        lines.append(f"    status: '{a['status']}',")
        if a['cities']:
            lines.append(f"    cities: {json.dumps(a['cities'])},")
        lines.append("  },")

    lines.append("];")
    return '\n'.join(lines)


def _escape(s):
    return s.replace("'", "\\'").replace('\n', ' ')


if __name__ == '__main__':
    agents = parse_agents('/Users/rafsun/Documents/Antigravity/M-hub1/agents_ocr.txt')
    print(f"Parsed {len(agents)} agents")

    ts_code = to_ts_array(agents)
    out_path = '/Users/rafsun/Documents/Antigravity/M-hub1/components/agentsData.ts'
    with open(out_path, 'w') as f:
        f.write(ts_code)
    print(f"Written to {out_path}")
