import { http } from "@hypermode/modus-sdk-as";
import { getRandomQuote } from "./index";
import { JSON } from "json-as";

// Handler function for the HTTP endpoint
export function quoteHandler(request: http.Request): {
  body: http.Content;
  headers: http.Headers;
  status: i32;
} {
  try {
    // Get the random quote as an object
    const quote = getRandomQuote();

    // Convert the quote object to JSON content
    const jsonContent = http.Content.from(JSON.stringify(quote));

    // Set headers to specify JSON response
    const headers = http.Headers.from([
      ["Content-Type", "application/json"]
    ]);

    // Return an object with body, headers, and status
    return {
      body: jsonContent,
      headers: headers,
      status: 200,  // HTTP OK
    };
  } catch (error) {
    // Prepare error response content and headers
    const errorContent = http.Content.from(JSON.stringify({ error: (error as Error).message }));
    const headers = http.Headers.from([
      ["Content-Type", "application/json"]
    ]);

    // Return error response structure
    return {
      body: errorContent,
      headers: headers,
      status: 500,  // Internal Server Error
    };
  }
}
