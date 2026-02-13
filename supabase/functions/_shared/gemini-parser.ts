export async function parseJobText(text: string, apiKey: string) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are an expert at parsing maritime job postings from Telegram/WhatsApp groups into the SHIPPED format.

Extract the following 8 required fields from this job posting text:

1. RANK - The position/role on vessel (e.g., Chief Engineer, Master, 2nd Officer, Able Seaman)
2. SALARY - Compensation details with currency (e.g., $8000-$9000, USD 5000/month)
3. JOINING_DATE - Start date or embarkation date (e.g., 15 March 2026, Urgent, ASAP, mid-June)
4. AGENCY - Recruiting agency or company name
5. MLA_NUMBER - Manning License Agreement number or reference number (e.g., MLA/2024/12345)
6. ADDRESS - Agency physical address (street, city, country)
7. MOBILE - Agency contact phone number with country code (e.g., +65-1234-5678)
8. EMAIL - Agency email address

Job Posting Text:
"""
${text}
"""

IMPORTANT RULES:
- Extract EXACTLY what is in the text, don't invent information
- If a field is clearly missing, return "N/A" for that field
- For RANK: Look for position titles, officer ranks, ratings
- For SALARY: Include currency symbol and range if provided
- For JOINING_DATE: Keep original format (Urgent, ASAP, dates, etc.)
- For MLA_NUMBER: Look for "MLA", "License", "Ref", "Reference" numbers
- For ADDRESS: Full physical location of the agency
- For MOBILE: Phone numbers with + or country codes
- For EMAIL: Email addresses only (not phone numbers)
- Preserve all phone number formats exactly as written

Return ONLY a valid JSON object with these exact keys: rank, salary, joining_date, agency, mla_number, address, mobile, email

JSON Response:`
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json",
                },
            }),
        }
    );

    const data = await response.json();

    // Check for API errors
    if (data.error) {
        console.error("Gemini API Error:", JSON.stringify(data.error));
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    if (!response.ok) {
        console.error("Gemini HTTP Error:", response.status, JSON.stringify(data));
        throw new Error(`Gemini API request failed: ${response.status}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
        console.error("Gemini Response Error:", JSON.stringify(data));
        throw new Error("No response from Gemini");
    }

    const resultText = data.candidates[0].content.parts[0].text;

    // Clean up markdown code blocks if present
    const cleanText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const parsed = JSON.parse(cleanText);

        // Validate that all required fields exist
        const requiredFields = ['rank', 'salary', 'joining_date', 'agency', 'mla_number', 'address', 'mobile', 'email'];
        const missingFields = requiredFields.filter(field => !(field in parsed));

        if (missingFields.length > 0) {
            console.warn(`Missing fields in parsed response: ${missingFields.join(', ')}`);
            // Fill in missing fields with N/A
            missingFields.forEach(field => {
                parsed[field] = 'N/A';
            });
        }

        return parsed;
    } catch (e) {
        console.error("Failed to parse Gemini response:", resultText);
        throw new Error("Failed to parse AI response as JSON");
    }
}
