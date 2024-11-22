import {http, models, postgresql} from "@hypermode/modus-sdk-as";
import {OpenAIChatModel, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"
import { GeminiGenerateModel, UserTextContent} from "@hypermode/modus-sdk-as/models/gemini/generate";
import {
  ClassificationModel,
  ClassifierResult,
} from "@hypermode/modus-sdk-as/models/experimental/classification"
import { Content, Headers } from "@hypermode/modus-sdk-as/assembly/http";
import { JSON } from "json-as";

import { collections } from "@hypermode/modus-sdk-as";
import { EmbeddingsModel } from "@hypermode/modus-sdk-as/models/experimental/embeddings";

const bookCollection = "bookNames";
const authorCollection = "authorNames";
const aboutCollection = "bookDetails";
const searchMethod = "searchMethod1";
const embeddingModelName = "minilm";


export function upsertBook(
  id: string,
  title: string[],
  about: string
): string {
  // Upsert title in bookCollection
  let result = collections.upsert(bookCollection, id, about, title);
  if (!result.isSuccessful) {
    return `Error upserting title: ${result.error}`;
  }

  // Upsert author in authorCollection
  //result = collections.upsert(authorCollection, id, author);
  //if (!result.isSuccessful) {
  //  return `Error upserting author: ${result.error}`;
  //}

  // Upsert about in aboutCollection
 // result = collections.upsert(aboutCollection, id, about);
 // if (!result.isSuccessful) {
 //   return `Error upserting about: ${result.error}`;
 // }

  return id; // Return the id if all operations succeed
}



export function removeBook(id: string): string {
  // Remove title from bookCollection
  let result = collections.remove(bookCollection, id);
  if (!result.isSuccessful) {
    return `Error removing title: ${result.error}`;
  }

  return "success"; // Return success if all operations are successful
}


export function searchBooks(query: string): collections.CollectionSearchResult {
  // Perform the search operation in the bookCollection
  const searchResults = collections.search(
    bookCollection, // Collection to search in
    searchMethod,   // Search method to use
    query,          // Query string
    10,             // Limit results to 10
    true            // Enable fuzzy matching
  );

  // Check if the search operation was successful
  if (!searchResults.isSuccessful) {
    return searchResults; // Return the unsuccessful result for debugging
  }

  return searchResults; // Return the search results
}









export function miniLMEmbed(texts: string[]): f32[][] {
  const model = models.getModel<EmbeddingsModel>(embeddingModelName);
  const input = model.createInput(texts);
  const output = model.invoke(input);
  return output.predictions;
}





// this model name should match the one defined in the modus.json manifest file
const modelName: string = "roberta-base"

// this function takes input text and a probability threshold, and returns the
// classification label determined by the model, if the confidence is above the
// threshold; otherwise, it returns an empty string
export function classifyText(text: string, threshold: f32): string {
  const model = models.getModel<ClassificationModel>(modelName)
  const input = model.createInput([text])
  const output = model.invoke(input)

  const prediction = output.predictions[0]
  if (prediction.confidence >= threshold) {
    return prediction.label
  }

  return ""
}

// the name of the PostgreSQL connection, as specified in the modus.json manifest
//const connection = "my-database"
const connection ="library-database"


export function fetchTotalBooks(): i8 {
  const query = 'SELECT * FROM "Books"';

  // Create Params object (if necessary)
  const params = new postgresql.Params();

  // Execute the query to fetch all books
  const response = postgresql.query<Book>(connection, query, params);

  // Return the count of fetched books
  return response.rows.length as i8;
}


export function fetchTotalIssuedBooks(): i8 {
  const query = 'SELECT * FROM "Books" WHERE "issuedTo" IS NOT NULL';

  // Create Params object (if necessary)
  const params = new postgresql.Params();

  // Execute the query to fetch all issued books
  const response = postgresql.query<Book>(connection, query, params);

  // Return the count of issued books
  return response.rows.length as i8;
}



export function fetchTotalAvailableBooks(): i8 {
  const query = 'SELECT * FROM "Books" WHERE "issuedTo" IS NULL';

  // Create Params object (if necessary)
  const params = new postgresql.Params();

  // Execute the query to fetch all available books
  const response = postgresql.query<Book>(connection, query, params);

  // Return the count of available books
  return response.rows.length as i8;
}


export function fetchTotalStudents(): i8 {
  const query = 'SELECT * FROM "Students"';

  // Create Params object (if necessary)
  const params = new postgresql.Params();

  // Execute the query to fetch all students
  const response = postgresql.query<StudentInfo>(connection, query, params);

  // Return the count of students
  return response.rows.length as i8;
}



export function addBookToSupabase(
  title: string,
  author: string,
  isbn: string,

): string {
  
  const query = 'INSERT INTO "Books" (title, author, about, category, cover, isbn) VALUES ($1, $2, $3, $4, $5, $6)';
  
  const aboutdata = generateText("A Paragraph Description about this book. No Markup. Straightforward.", `${title} by ${author}`);
  const categorydata = generateText("Reply only in a word. Which book category is the following mentioned book.", `${title} by ${author}`);
  const coverdata = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`

  upsertBook(isbn, [title], aboutdata);

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(title);
  params.push(author);
  params.push(aboutdata);
  params.push(categorydata);
  params.push(coverdata);
  params.push(isbn);

  // Execute the SQL query to insert the new book
  const response = postgresql.execute(connection, query, params);

  // Return a success message
  return "Book added successfully!";
}


export function deleteBookFromSupabase(isbn: string): string {
    // Define the SQL query to delete the book based on the ISBN
    const query = 'DELETE FROM "Books" WHERE isbn = $1';

    // Create Params object to hold the ISBN as a query parameter
    const params = new postgresql.Params();
    params.push(isbn);

    // Execute the SQL query to delete the book
    const response = postgresql.execute(connection, query, params);

    // Return success message
    return "Book deleted successfully!";
}




// Function to delete a book from the database by title
export function deleteBookFromSupabase2(title: string): string {
  const query = 'DELETE FROM "Books" WHERE title = $1';

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(title);

  removeBook(title);

  

  // Execute the SQL query to delete the book
  const response = postgresql.execute(connection, query, params);

  // Return a success message
  return "Book deleted successfully!";
}


@json
class Book {
  title!: string;
  category!: string;

}

// query a book's name and category by title
export function queryBookByTitle(title: string): string {
  const query = 'SELECT title, category FROM "Books" WHERE title = $1';

  const params = new postgresql.Params();
  params.push(title);

  const response = postgresql.query<Book>(connection, query, params);

  return response.rows[0].title + " is in the " + response.rows[0].category + " category.";
}


export function addStudentToSupabase(
  name: string,
  roll: string,
  className: string,
  section: string
): string {
  const query = 'INSERT INTO "Students" (name, roll, class, section) VALUES ($1, $2, $3, $4)';

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(name);
  params.push(roll);
  params.push(className);
  params.push(section);

  // Execute the SQL query to insert the new student
  const response = postgresql.execute(connection, query, params);

  // Return a success message
  return "Student added successfully!";
}


export function deleteStudentFromSupabase(studentId: i8): string {
  const query = 'DELETE FROM "Students" WHERE id = $1';

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(studentId);

  // Execute the SQL query to delete the student
  const response = postgresql.execute(connection, query, params);

  // Return a success message
  return "Student deleted successfully!";
}


@json
class StudentInfo {
  id!: number;
  name!: string;
  roll!: string;
  class!: string;
  section!: string;
}

export function fetchStudents(page: i8, pageSize: i8): StudentInfo[] {
  const offset = (page - 1) * pageSize;
  const query = `
    SELECT id, name, roll, class, section
    FROM "Students"
    ORDER BY id
    LIMIT $1 OFFSET $2
  `;

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(pageSize);
  params.push(offset);

  // Query the database
  const response = postgresql.query<StudentInfo>(connection, query, params);

  return response.rows;
}


export function fetchStudentsWithSearch(page: i8, pageSize: i8, searchQuery: string = ""): StudentInfo[] {
  const offset = (page - 1) * pageSize;

  let query = `
    SELECT id, name, roll, class, section
    FROM "Students"
  `;

  // Add search condition if a searchQuery is provided
  if (searchQuery.length > 0) {
    query += ` WHERE name ILIKE $3 `;
  }

  query += `
    ORDER BY id
    LIMIT $1 OFFSET $2
  `;

  // Create a Params object to hold query parameters
  const params = new postgresql.Params();
  params.push(pageSize);
  params.push(offset);

  if (searchQuery.length > 0) {
    params.push(`%${searchQuery}%`); // Add search query for name
  }

  // Query the database
  const response = postgresql.query<StudentInfo>(connection, query, params);

  // Return fetched rows
  return response.rows;
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
