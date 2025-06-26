
import { GoogleGenAI } from "@google/genai";
import { MindMapNodeData } from "../types";
import { GEMINI_MODEL_NAME } from "../constants";

// Ensure API_KEY is set in the environment variables
const apiKey = process.env.GEMINI_API_KEY;
//const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

export async function generateMindMap(centralIdea: string): Promise<MindMapNodeData> {
  const prompt = `
You are an AI assistant designed to generate a mind map structure as a single, perfectly valid JSON object.
The central idea for the mind map is: "${centralIdea}".

Your entire response MUST be ONLY the JSON object. No other text, explanations, or markdown fences (like \`\`\`json) are allowed.

The JSON structure MUST conform to this example:
{
  "name": "${centralIdea}", // Root node name MUST be the central idea.
  "children": [
    {
      "name": "First Main Topic", // A concise name for the first main topic.
      "children": [
        { "name": "Sub-topic 1.1" }, // A concise name for a sub-topic.
        { "name": "Sub-topic 1.2" }
        // Each main topic should have 2-3 sub-topics.
      ]
    },
    {
      "name": "Second Main Topic", // Another concise main topic.
      "children": [
        { "name": "Sub-topic 2.1" },
        { "name": "Sub-topic 2.2" }
      ]
    }
    // Include 3 to 5 main topics in total.
  ]
}

CRITICAL JSON FORMATTING RULES:
1.  The root "name" field's value MUST be exactly: "${centralIdea}".
2.  The only valid keys in any object are "name" and "children". All keys MUST be enclosed in double quotes (e.g., "name", "children").
3.  All string values (topic names) MUST be enclosed in double quotes.
4.  Properly escape any special characters within string values (e.g., a quote inside a name: "Topic with a \\"Quote\\"").
5.  Use commas correctly to separate elements in arrays and properties in objects.
6.  NO trailing commas after the last element in an array or the last property in an object.
7.  Ensure all brackets [] and braces {} are correctly paired and nested.
8.  NO comments (e.g., // or /* */) are allowed within the JSON.
9.  The example structure above uses illustrative text like "First Main Topic" for clarity. In your output, replace these with actual, concise, and relevant topic names based on the central idea. Do NOT output the illustrative text itself or any non-standard keys (like 'lookup:' or other made-up keys).

Generate ONLY the JSON object.
`;

  let jsonString: string = ""; // Define jsonString here to be accessible in catch block

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4, // Keep temperature low for structured output
      },
    });

    jsonString = response.text.trim();
    
    // Defensive check: sometimes models might still wrap, though responseMimeType should prevent it.
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonString.match(fenceRegex);
    if (match && match[1]) {
      jsonString = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonString) as MindMapNodeData;

    if (!parsedData.name || !Array.isArray(parsedData.children)) {
      console.error("Invalid mind map structure received from AI. Problematic JSON:", jsonString);
      throw new Error("Invalid mind map structure received from AI. Expected 'name' and 'children' array.");
    }
    
    // Ensure the root name matches the central idea, overriding if necessary.
    // This provides a layer of consistency even if the AI slightly deviates.
    if (parsedData.name !== centralIdea) {
        console.warn(`AI returned a central idea: "${parsedData.name}", but requested: "${centralIdea}". Forcing root name to requested central idea.`);
        parsedData.name = centralIdea;
    }


    return parsedData;

  } catch (error) {
    console.error("Error generating mind map from Gemini:", error);

    if (jsonString && error instanceof SyntaxError) {
        console.error("Problematic JSON string received from AI that caused parsing error:", jsonString);
        throw new Error(`Failed to parse AI response as JSON. The AI returned a malformed JSON object. Check the browser console for the problematic JSON. Original parser error: ${error.message}`);
    }
    
    throw new Error(`AI service failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
