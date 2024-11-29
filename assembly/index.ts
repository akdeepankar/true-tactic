import { http, models, postgresql} from "@hypermode/modus-sdk-as";
import {AssistantMessage, OpenAIChatModel, SystemMessage, UserMessage, } from "@hypermode/modus-sdk-as/models/openai/chat"
import { GeminiGenerateInput, GeminiGenerateModel, UserTextContent } from "@hypermode/modus-sdk-as/models/gemini/generate";
import { collections } from "@hypermode/modus-sdk-as";
import { EmbeddingsModel } from "@hypermode/modus-sdk-as/models/experimental/embeddings";
import { JSON } from "json-as";
import { Content, fetch, Headers, Request, RequestOptions } from "@hypermode/modus-sdk-as/assembly/http";

const bookCollection = "books";
const searchMethod = "searchMethod1";
const embeddingModelName = "minilm";


export function scheduledTask(telegram: bool, discord: bool, content: string): string {
  // Validate inputs
  if (!content || content.length === 0) {
    return "Error: Invalid content provided.";
  }

  const discordWebhook = "https://discord.com/api/webhooks/1311396551360385056/ZJ790gzwAef6_D0qWe5pCpovtE6Bb563khD-1P0pRZyIwhzMjsJw53wF9N58xrtDQUYk";
  const botToken = "7314816989:AAHdryk--Gc4goFZsVz51038BE4OJ9IXKVM";
  const chatID = "-1002263848240";

  const aiContent = generateText("You are an Helpful Agent for a Library Book Club that Shares Book SUummaries, Interesting Facts, General Knowledge and many more Things, Make an Interesting Content for the Following in the prompt. Use Emoji and Better Format.", content);

  let results: string[] = [];

  if (discord) {
    const discordResult = sendMessageToDiscord(discordWebhook, aiContent);
    if (discordResult) {
      results.push("Discord: Success");
    } else {
      results.push("Discord: Failed");
    }
  }

  if (telegram) {
    const telegramResult = sendMessageToTelegram(botToken, chatID, aiContent);
    if (telegramResult) {
      results.push("Telegram: Success");
    } else {
      results.push("Telegram: Failed");
    }
  }

  // If no platform was selected
  if (!telegram && !discord) {
    return "Error: No platform selected for message delivery.";
  }

  // Return the status of the operation
  return results.join("; ");
}


export function sendEmail(
  from: string,
  to: string,
  subject: string,
  body: string
): string {
  // Validate inputs
  if (!from || from.trim() === "") {
    return "Error: Sender email is invalid or empty.";
  }
  if (!to || to.trim() === "") {
    return "Error: Recipient email is invalid or empty.";
  }
  if (!subject || subject.trim() === "") {
    return "Error: Subject is invalid or empty.";
  }
  if (!body || body.trim() === "") {
    return "Error: Email body is invalid or empty.";
  }

  const apiKey = "api-0087F3D106224ED8A5E9473E2BAD52E7"

  // Create the payload
  const payload = `
    {
      "api_key": "${apiKey}",
      "to": ["${to}"],
      "sender": "${from}",
      "subject": "${subject}",
      "text_body": "${body}"
    }
  `;

  // Define headers
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  // Define request options
  const options = new RequestOptions();
  options.method = "POST";
  options.headers = headers;
  options.body = Content.from(payload);

  // API endpoint for sending emails
  const url = "https://api.smtp2go.com/v3/email/send";

  // Create and send the HTTP request
  const request = new Request(url, options);
  const response = http.fetch(request);

  // Handle the response
  if (response.ok) {
    return "Email sent successfully!";
  } else {
    return `Error sending email: ${response.status.toString()} ${response.statusText}`;
  }
}

export function generatePaymentLink(
  description: string,
  customerName: string,
  customerEmail: string
): string {
  // Validate inputs
  if (!description || description.trim() === "") {
    return "Error: Description is invalid or empty.";
  }
  if (!customerName || customerName.trim() === "") {
    return "Error: Customer name is required.";
  }
  if (!customerEmail || customerEmail.trim() === "") {
    return "Error: Customer email is required.";
  }

  const apiKey = "rzp_test_zsKdkaX6Qk31ZO";
  const apiSecret = "94DDsae6f4oEhsFj4Nvmesk3";
  const amount = 10;
  const currency = "INR";

  // Base64 encode API key and secret
  const authHeader = toBase64(apiKey + ":" + apiSecret);

  // Create the payload
  let payload =
    '{ "amount": ' +
    (amount * 100).toString() + // Convert amount to paise
    ', "currency": "' +
    currency +
    '", "description": "' +
    description +
    '", "customer": { "name": "' +
    customerName +
    '", "email": "' +
    customerEmail +
    '" } }';

  // Define headers
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Authorization", "Basic " + authHeader);

  // Define request options
  const options = new RequestOptions();
  options.method = "POST";
  options.headers = headers;
  options.body = Content.from(payload);

  // Send the HTTP request
  const url = "https://api.razorpay.com/v1/payment_links";
  const request = new Request(url, options);
  const response = http.fetch(request);

  // Handle the response
  if (response.ok) {
    const responseData = response.text(); // Get response as plain text
    const shortUrlIndex = responseData.indexOf('"short_url":"');
    if (shortUrlIndex > -1) {
      const start = shortUrlIndex + 13;
      const end = responseData.indexOf('"', start);
      const shortUrl = responseData.substring(start, end);
      sendEmail("22f3000026@ds.study.iitm.ac.in", customerEmail, "HyperLibrary - Late Book Fee", `Dear ${customerName}, Here is Your Late Book Return Fee. ${currency} - ${amount}, Payment Link ${shortUrl}`);
      return "Payment link Sent Successfully.";

    } else {
      return "Error: Failed to retrieve payment link from response.";
    }
  } else {
    return "Error generating payment link: " + response.status.toString();
  }
}

export function fetchCapturedPaymentLinks(): string {
  // Validate inputs
  const apiKey = "rzp_test_zsKdkaX6Qk31ZO";
  const apiSecret = "94DDsae6f4oEhsFj4Nvmesk3";

  // Base64 encode API key and secret
  const authHeader = toBase64(apiKey + ":" + apiSecret);

  // Define headers
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Authorization", "Basic " + authHeader);

  // Define request options
  const options = new RequestOptions();
  options.method = "GET";
  options.headers = headers;

  // Define the Razorpay API endpoint for fetching payment links
  const url = "https://api.razorpay.com/v1/payment_links?status=captured";

  // Send the HTTP request
  const request = new Request(url, options);
  const response = http.fetch(request);

  // Handle the response
  if (response.ok) {
    const responseData = response.text(); // Get response as plain text
    return "Captured Payment Links: " + responseData;
  } else {
    return "Error fetching captured payment links: " + response.status.toString();
  }
}

export function sendMessageToTelegram(botToken: string, chatId: string, content: string): string {
  // Validate the bot token
  if (!botToken || botToken.trim() === "") {
    return "Error: Bot token is invalid or empty.";
  }

  // Validate the chat ID
  if (!chatId || chatId.trim() === "") {
    return "Error: Chat ID is invalid or empty.";
  }

  // Validate the message content
  if (!content || content.trim() === "") {
    return "Error: Message content is empty.";
  }

  // Construct the Telegram API URL
  const apiUrl = "https://api.telegram.org/bot" + botToken + "/sendMessage";

  // Create a manual JSON string for the payload
  const payload = '{ "chat_id": "' + chatId + '", "text": "' + content + '" }';

  // Define headers for the request
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  // Define request options
  const options = new RequestOptions();
  options.method = "POST";
  options.headers = headers;
  options.body = Content.from(payload); // Use the payload string directly

  // Create the HTTP request
  const request = new Request(apiUrl, options);

  // Send the HTTP request
  const response = http.fetch(request);

  // Handle the response
  if (response.ok) {
    return "Message sent successfully!";
  } else {
    return `Error sending message: ${response.status}`;
  }
}

export function sendMessageToDiscord(webhookUrl: string, content: string): string {
  // Validate the webhook URL
  if (!webhookUrl || webhookUrl.trim() === "") {
    return "Error: Webhook URL is invalid or empty.";
  }

  // Validate the message content
  if (!content || content.trim() === "") {
    return "Error: Message content is empty.";
  }

  // Create a manual JSON string for the payload (AssemblyScript does not support JSON.stringify)
  const payload = '{ "content": "' + content + '" }';

  // Define headers for the request
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  // Define request options
  const options = new RequestOptions();
  options.method = "POST";
  options.headers = headers;
  options.body = Content.from(payload); // Use the payload string directly

  // Create the HTTP request
  const request = new Request(webhookUrl, options);

  // Send the HTTP request
  const response = http.fetch(request);

  // Handle the response
  if (response.ok) {
    return "Message sent successfully!";
  } else {
    return `Error sending message: ${response.status}`;
  }
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
  const socialMessage = generateText("No fancy Intro. Just the Reply.",`A new book has been added to the library: ${title} by ${author}. Write a small Interesting announcment Message. Use Emojis too.`);

  upsertBook(title, about, title, author, coverdata);
  sendMessageToDiscord("https://discord.com/api/webhooks/1311396551360385056/ZJ790gzwAef6_D0qWe5pCpovtE6Bb563khD-1P0pRZyIwhzMjsJw53wF9N58xrtDQUYk", socialMessage);
  sendMessageToTelegram("7314816989:AAHdryk--Gc4goFZsVz51038BE4OJ9IXKVM", "-1002263848240", socialMessage);

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
    new SystemMessage(instruction),
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
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=14`;
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


function toBase64(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;

  while (i < input.length) {
    const c1 = input.charCodeAt(i++) & 0xff;
    if (i === input.length) {
      output += chars.charAt(c1 >> 2);
      output += chars.charAt((c1 & 0x3) << 4);
      output += "==";
      break;
    }
    const c2 = input.charCodeAt(i++);
    if (i === input.length) {
      output += chars.charAt(c1 >> 2);
      output += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      output += chars.charAt((c2 & 0xf) << 2);
      output += "=";
      break;
    }
    const c3 = input.charCodeAt(i++);
    output += chars.charAt(c1 >> 2);
    output += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    output += chars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    output += chars.charAt(c3 & 0x3f);
  }

  return output;
}

