export async function parseJobText(text: string, apiKey: string) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
                                text: `Extract the following details from this job posting text. Return ONLY a valid JSON object with keys: rank (string), vessel_type (string), salary (string), joining_date (string), company (string), contact (string, phone or email), remarks (string). If a field is missing, return null. 
                
                Text: "${text}"
                
                JSON Response:`
                            },
                        ],
                    },
                ],
            }),
        }
    );

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        console.error("Gemini Response Error:", JSON.stringify(data));
        throw new Error("No response from Gemini");
    }

    const resultText = data.candidates[0].content.parts[0].text;

    // Clean up markdown code blocks if present
    const cleanText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse Gemini response:", resultText);
        throw new Error("Failed to parse AI response as JSON");
    }
}
