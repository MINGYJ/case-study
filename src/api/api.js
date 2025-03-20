const OpenAI = require('openai');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const DEEPSEEK_API_URL = 'https://api.deepseek.com';
const API_KEY = 'sk-a48f7327889940288c3951dac7ad6ae1';

const PROMPT = `You are a helpful assistant for PartSelect, an online retailer specializing in genuine OEM appliance parts. Your primary role is to assist customers with order, help or finding the right parts for their appliances, providing detailed product information, and guiding them through the ordering process. You should also offer troubleshooting advice and support for common appliance issues. Ensure that your responses are clear, concise, and focused on the customer's needs. 
If the user's problem is not related with PartSelect or OEM appliance parts, you must reject the request. Here are some example inquiries to guide your responses:
If there is anything related with order and the user have provided their email and order number, you should return https://www.partselect.com/user/self-service/?emailAdd=[email]&orderID=[order id], if not already provided, you could ask for email and order id. 
Else, if the user is asking about any policies, always include link and information from https://www.partselect.com/Help/
Whenever you feel there is a part number included in the chart, you should always provide the part number and the part name by accessing the website:https://www.partselect.com/api/search/?searchterm=[part/model number]
Every information you answered should be related with the web page you got from https://www.partselect.com/api/search/?searchterm=[part/model number] and the information should be accurate and helpful, most importantly, only quote information from partselect resources provided. A link to the website should be provided at the end of the conversation for more information.
For example, if a customer asks about a part/model number, you should provide the part/model number and the part name, which could only be found on the partsslect.com website.
Also, at the end, you could provided the website(finalUrl) provided in the Search Results for more information. The url from search result is how the information is gathered and answered. 
To access the PartSelect API, use the following endpoint: https://www.partselect.com/api/search/?searchterm=[number]. For example, to search for part number PS11752778, you would use https://www.partselect.com/api/search/?searchterm=PS11752778. Ensure that you handle the API responses appropriately and provide accurate information to the users. You should always access the website for information is there is parts number or parts name available.
Remember to always provide accurate and helpful information, and guide customers to the appropriate resources on the PartSelect website when necessary.`;

const openai = new OpenAI({
  baseURL: DEEPSEEK_API_URL,
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true
});

const chatHistory = {};

const brands = [
  "Admiral", "Amana", "Ariens", "Bosch", "Briggs and Stratton", "Caloric", "Crosley", "Dacor", "Echo", "Electrolux", 
  "Estate", "Frigidaire", "General Electric", "Gibson", "Haier", "Hardwick", "Hoover", "Hotpoint", "Husqvarna", 
  "Inglis", "Jenn-Air", "Kawasaki", "Kelvinator", "Kenmore", "KitchenAid", "Kohler", "LG", "Lawn Boy", "MTD", 
  "Magic Chef", "Maytag", "Murray", "Norge", "Poulan", "RCA", "Roper", "Ryobi", "Samsung", "Sharp", "Shindaiwa", 
  "Snapper", "Speed Queen", "Tappan", "Tecumseh", "Toro", "Troy-Bilt", "Weed Eater", "Whirlpool", "White-Westinghouse"
];

const getAIMessage = async (userQuery, sessionId) => {
  userQuery = String(userQuery).trim(); // Ensure userQuery is a string and trim it

  try {
    // Step 1: Ask the AI to extract the part number, product name, or brand name from the user input
    const extractionPrompt = `Extract the part number, product name, or brand name from the following user query: "${userQuery}". If it's a part number or product name, respond with "part: [extracted text]". If it's a brand name, respond with "brand: [extracted text]". If not available, respond with an empty string. The brand names are: ${brands.join(", ")}`;  
    const extractionResponse = await openai.chat.completions.create({
      messages: [
        { role: "system", content: extractionPrompt }
      ],
      model: "deepseek-chat",
      max_tokens: 50,
      temperature: 0.5,
    });
    
    const extractedText = extractionResponse.choices[0].message.content.trim();
    console.log('Extracted Text:', extractedText);
    
    let searchResults = [];
    let answerResponse = {};

    if (extractedText.startsWith("part:")) {
      const partText = extractedText.replace("part:", "").trim();
      if (partText.length >= 9 || partText.length <= 12) {
        try {
          const browser = await puppeteer.launch({ headless: false });
          const page = await browser.newPage();
          const searchUrl = `https://www.partselect.com/api/search/?searchterm=${encodeURIComponent(partText)}`;
          await page.goto(searchUrl, { waitUntil: 'networkidle2' });
          const finalUrl = page.url();
          const content = await page.content();
          
          // Parse the HTML content using cheerio
          const $ = cheerio.load(content);
          let textContent = $('body').text().trim();
          
          // Remove new lines and empty lines
          textContent = textContent.replace(/\n+/g, ' ').replace(/\s\s+/g, ' ').trim();
          
          // Extract video links
          const videoLinks = [];
          $('div.yt-video').each((index, element) => {
            const videoLink = $(element).html();
            if (videoLink) {
              videoLinks.push(videoLink);
            }
          });
          
          await browser.close();

          searchResults.push({ finalUrl,textContent, videoLinks });
        } catch (error) {
          console.error('Error querying PartSelect API:', error);
        }
        console.log('Search Results:', searchResults);
        // Step 3: Answer the user's question based on the search results
        const answerPrompt = `Based on the following search results, answer the user's question: "${userQuery}"\n\nSearch Results: ${JSON.stringify(searchResults)}`;
        answerResponse = await openai.chat.completions.create({
          messages: [
            { role: "system", content: PROMPT },
            ...(chatHistory[sessionId] || []),
            { role: "user", content: userQuery },
            { role: "assistant", content: answerPrompt }
          ],
          model: "deepseek-chat",
        });
      }
    } else if (extractedText.startsWith("brand:")) {
      const brandText = extractedText.replace("brand:", "").trim();
      try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        const brandUrl = `https://www.partselect.com/${brandText.replace(/\s+/g, '-')}-Parts.htm`;
        await page.goto(brandUrl, { waitUntil: 'networkidle2' });
        const finalUrl = page.url();
        const content = await page.content();
        
        // Parse the HTML content using cheerio
        const $ = cheerio.load(content);
        let textContent = $('body').text().trim();
        
        // Remove new lines and empty lines
        textContent = textContent.replace(/\n+/g, ' ').replace(/\s\s+/g, ' ').trim();
        
        // Extract video links
        const videoLinks = [];
        $('div.yt-video').each((index, element) => {
          const videoLink = $(element).html();
          if (videoLink) {
            videoLinks.push(videoLink);
          }
        });
        
        await browser.close();

        searchResults.push({finalUrl,textContent, videoLinks });
      } catch (error) {
        console.error('Error querying PartSelect API:', error);
      }
      console.log('Search Results:', searchResults);
      // Step 3: Answer the user's question based on the brand results
      const answerPrompt = `Based on the following brand results, answer the user's question: "${userQuery}"\n\nBrand Results: ${JSON.stringify(searchResults)}`;
      answerResponse = await openai.chat.completions.create({
        messages: [
          { role: "system", content: PROMPT },
          ...(chatHistory[sessionId] || []),
          { role: "user", content: userQuery },
          { role: "assistant", content: answerPrompt }
        ],
        model: "deepseek-chat",
      });
    } else {
      const answerPrompt = `Based on the following search results, answer the user's question: "${userQuery}"\n\n}`;
      answerResponse = await openai.chat.completions.create({
        messages: [
          { role: "system", content: PROMPT },
          ...(chatHistory[sessionId] || []),
          { role: "user", content: userQuery },
          { role: "assistant", content: answerPrompt }
        ],
        model: "deepseek-chat",
      });
    }

    const message = {
      role: "assistant",
      content: answerResponse.choices[0].message.content
    };

    // Store the message in chat history
    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }
    chatHistory[sessionId].push({ role: "user", content: userQuery });
    chatHistory[sessionId].push(message);

    return message;
  } catch (error) {
    console.error('Error querying DeepSeek API:', error);
    return {
      role: "assistant",
      content: 'Sorry, there was an error processing your request.'
    };
  }
};

const getChatHistory = (sessionId) => {
  return chatHistory[sessionId] || [];
};

const clearChatHistory = (sessionId) => {
  delete chatHistory[sessionId];
};

module.exports = { getAIMessage, getChatHistory, clearChatHistory };