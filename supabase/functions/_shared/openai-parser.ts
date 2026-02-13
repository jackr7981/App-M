export async function parseJobText(text: string, apiKey: string) {
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert at parsing maritime job postings. Extract information and return ONLY valid JSON, no markdown formatting.",
                },
                {
                    role: "user",
                    content: `Extract the following 8 required fields from this job posting text:

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

Return ONLY a valid JSON object with these exact keys: rank, salary, joining_date, agency, mla_number, address, mobile, email`,
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", JSON.stringify(errorData));
        throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
        console.error("OpenAI Response Error:", JSON.stringify(data));
        throw new Error("No response from OpenAI");
    }

    const resultText = data.choices[0].message.content;

    try {
        const parsed = JSON.parse(resultText);

        // Validate that all required fields exist
        const requiredFields = [
            "rank",
            "salary",
            "joining_date",
            "agency",
            "mla_number",
            "address",
            "mobile",
            "email",
        ];
        const missingFields = requiredFields.filter((field) => !(field in parsed));

        if (missingFields.length > 0) {
            console.warn(`Missing fields in parsed response: ${missingFields.join(", ")}`);
            // Fill in missing fields with N/A
            missingFields.forEach((field) => {
                parsed[field] = "N/A";
            });
        }

        return parsed;
    } catch (e) {
        console.error("Failed to parse OpenAI response:", resultText);
        throw new Error("Failed to parse AI response as JSON");
    }
}
