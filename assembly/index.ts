import {http} from "@hypermode/modus-sdk-as";

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
