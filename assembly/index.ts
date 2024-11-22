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

const bookCollection = "books";
const searchMethod = "searchMethod1";
const embeddingModelName = "minilm";


export function upsertBook(
  id: string,
  about: string,
  title: string,
  author: string,
  cover: string
): string {
  // Upsert title in bookCollection
  let result = collections.upsert(bookCollection, id, about, [title, author, cover]);
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

// the name of the PostgreSQL connection, as specified in the modus.json manifest

const connection ="library-database"

export function addBookToSupabase(
  title: string,
  author: string,
  isbn: string,

): string {
  
  const query = 'INSERT INTO "Books" (title, author, about, category, cover, isbn) VALUES ($1, $2, $3, $4, $5, $6)';
  
  const aboutdata = generateText("A Paragraph Description about this book. No Markup. Straightforward.", `${title} by ${author}`);
  const categorydata = generateText("Reply only in a word. Which book category is the following mentioned book.", `${title} by ${author}`);
  const about = generateText("Reply only in two sentence about the genre of the book.", `${title} by ${author}`);
  const coverdata = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`

  upsertBook(title, about, title, author, coverdata);

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
