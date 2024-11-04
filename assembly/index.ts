import {http, models} from "@hypermode/modus-sdk-as";
import {OpenAIChatModel, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"
import { GeminiGenerateModel, UserTextContent} from "@hypermode/modus-sdk-as/models/gemini/generate";





export function generateTextWithGemini( prompt: string): string {
  // Retrieve the Gemini Generate model
  const model = models.getModel<GeminiGenerateModel>("gemini-1-5-pro");

  // Create the user text content
  const userContent = new UserTextContent(prompt);

  // Prepare the input for the model
  const input = model.createInput([userContent]);

  // Invoke the model and get the output
  const output = model.invoke(input);

  // Check if the output has candidates and extract response content
  if (output && output.candidates.length > 0) {
    const firstCandidate = output.candidates[0];
    const responseContent = firstCandidate.content; // Assuming content is an object with parts

    // Check if responseContent is valid and has parts
    if (responseContent && responseContent.parts.length > 0) {
      return responseContent.parts[0].text.trim(); // Return the first part's text
    } else {
      throw new Error("No response content available.");
    }
  } else {
    throw new Error("No candidates available.");
  }

  // Default return statement; this should not be reached due to the above logic
  return "No output generated.";
}





export function generateText(instruction: string, prompt: string): string {

  const model = models.getModel<OpenAIChatModel>("text-generator");

  const input = model.createInput([
    new UserMessage(prompt),
    new SystemMessage(instruction)
  ]
  );

  input.temperature = 0.7;
  const output = model.invoke(input);
  return output.choices[0].message.content.trim();

}

@json
class Quote {

  @alias("q")
  quote!: string;

  @alias("a")
  author!: string;
}

export function getRandomQuote(): Quote {
  const request = new http.Request("https://zenquotes.io/api/random");

  const response = http.fetch(request);
  if (response.ok) {
    return response.json<Quote[]>()[0];
  } else {
    throw new Error(`Failed to fetch random quote: ${response.status} ${response.statusText}`);
  }
  }

export function sayHello(name: string | null = null): string {
  return `Hello, ${name || "World"}!`;
}
