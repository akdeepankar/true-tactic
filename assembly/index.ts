import {http, models} from "@hypermode/modus-sdk-as";
import {OpenAIChatModel, ResponseFormat, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"

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
