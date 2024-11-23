import { http, models, postgresql} from "@hypermode/modus-sdk-as";
import {OpenAIChatModel, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"
import { collections } from "@hypermode/modus-sdk-as";
import { EmbeddingsModel } from "@hypermode/modus-sdk-as/models/experimental/embeddings";
import { JSON } from "json-as";
import { fetch } from "@hypermode/modus-sdk-as/assembly/http";

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
export function deleteBookFromSupabase(title: string): string {
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


@json
class Book {
  title!: string;
  author!: string;
  publishYear!: number;
  cover!: string;
  description!: string;
  key!: string;  // Add the key field to store the OpenLibrary key
  isbn!: string; // ISBN number
}

// Define a class for the structure of each doc in the OpenLibrary response
@json
class OpenLibraryDoc {
  title!: string;
  author_name!: string[];
  first_publish_year!: number;
  cover_i!: number;
  description!: string;
  key!: string;  // Include the key from OpenLibrary response
  isbn!: string[]; // Array of ISBNs from OpenLibrary
}

// Define the response format from OpenLibrary
@json
class OpenLibraryResponse {
  docs!: OpenLibraryDoc[];
}

export function fetchOpenBook(searchTerm: string): Book[] {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=10`;
  const request = new http.Request(url);
  const response = http.fetch(request);

  if (response.ok) {
    // Parse the JSON response
    const data = response.json<OpenLibraryResponse>();

    // Initialize an array to hold Book objects
    const books = new Array<Book>();

    // Iterate over the results
    for (let i = 0; i < data.docs.length; i++) {
      const bookData = data.docs[i];

      const book = new Book();
      book.title = bookData.title || "Unknown Title";
      book.author = bookData.author_name && bookData.author_name.length > 0 ? bookData.author_name[0] : "Unknown Author";
      book.publishYear = bookData.first_publish_year || 0; // Defaults to 0 if not available
      book.description = fetchBookDescription(bookData.key).description;
      book.key = bookData.key || "No Key Available";  // Map the OpenLibrary key
      book.isbn = bookData.isbn[0] || "No ISBN Available"; // Fetch the first ISBN if available
      book.cover = `https://covers.openlibrary.org/b/isbn/${bookData.isbn[0]}-L.jpg`
      books.push(book);
    }

    // Check if any books were added
    if (books.length === 0) {
      throw new Error("No books returned from the API.");
    }

    // Return the array of books
    return books;
  } else {
    throw new Error(`Failed to fetch book details: ${response.status} ${response.statusText}`);
  }
}


// Define a class for detailed book information
@json
class DetailedBook {
  title!: string;
  description!: string;
}

// Function to fetch book details by key
export function fetchBookDescription(key: string): DetailedBook {
  const url = `https://openlibrary.org${key}.json`; // Using the key to fetch detailed info
  const request = new http.Request(url);
  const response = http.fetch(request);

  if (response.ok) {
    // Parse the JSON response
    const data = response.json<DetailedBook>();

    // Return the detailed book object
    return data.description ? data : { title: "No Title", description: "No Description" };
  } else {
    throw new Error(`Failed to fetch book details: ${response.status} ${response.statusText}`);
  }
}

