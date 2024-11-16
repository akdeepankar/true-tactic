import {http, models, postgresql} from "@hypermode/modus-sdk-as";
import {OpenAIChatModel, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"
import { GeminiGenerateModel, UserTextContent} from "@hypermode/modus-sdk-as/models/gemini/generate";
import { Content, Headers } from "@hypermode/modus-sdk-as/assembly/http";
import { JSON } from "json-as";



// the name of the PostgreSQL connection, as specified in the modus.json manifest
//const connection = "my-database"
const connection ="library-database"


// Function to add a book to the Supabase database
@json
class Book {
  title!: string;
  author!: string;
  category!: string;

}

export function addBookToSupabase(
  title: string,
  author: string,
  category: string,
): string {
  
  const query = 'INSERT INTO "Books" (title, author, category) VALUES ($1, $2, $3)';


  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(title);
  params.push(author);
  params.push(category);


  // Execute the SQL query to insert the new book
  const response = postgresql.execute(connection, query, params);

  // Return a success message
  return "Book added successfully!";
}





@json
class Person {
  name!: string
  age!: i32
}

export function getPerson(name: string): Person {
  const query = "select * from persons where name = $1"

  const params = new postgresql.Params()
  params.push(name)

  const response = postgresql.query<Person>(connection, query, params)
  return response.rows[0]
}

// Function to add a new person to the database
export function addPerson(name: string, age: i32): string {
  // SQL statement for inserting a new person
  const query = "INSERT INTO persons (name, age) VALUES ($1, $2)"
  
  // Create a Params object to hold query parameters
  const params = new postgresql.Params()
  params.push(name)
  params.push(age)

  // Execute the insert statement
  const response = postgresql.execute(connection, query, params)

  return "Person added successfully"
}



export function generateText2(instruction: string, prompt: string): string {

  const model = models.getModel<OpenAIChatModel>("text-generator2");

  const input = model.createInput([
    new UserMessage(prompt),
    new SystemMessage(instruction)
  ]
  );

  input.temperature = 0.7;
  const output = model.invoke(input);
  return output.choices[0].message.content.trim();

}


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

@json
class Color {
  name!: string;
  hex!: string;
  requestedHex!: string;
}

@json
class ColorResponse {
  colors!: Color[];
}

export function fetchColorNames(hexCodes: string[]): string[] {
  const url = `https://api.color.pizza/v1/?values=${hexCodes.join(",")}`;
  const request = new http.Request(url);
  const response = http.fetch(request);

  if (response.ok) {
    const data = response.json<ColorResponse>();

    // Initialize an empty array for color names
    const colorNames = new Array<string>();

    // Use a for loop to iterate over the colors array
    for (let i = 0; i < data.colors.length; i++) {
      const color = data.colors[i];
      colorNames.push(color.name);
    }

    // Check if the array is empty
    if (colorNames.length === 0) {
      throw new Error("No colors returned from the API.");
    }

    // Return only the color names array
    return colorNames;
  } else {
    throw new Error(`Failed to fetch color names: ${response.status} ${response.statusText}`);
  }
}
