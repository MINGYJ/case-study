const express = require('express');
const cors = require('cors');
const { getAIMessage, getChatHistory, clearChatHistory } = require('./src/api/api');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/message', async (req, res) => {
  const { query, sessionId } = req.body;
  const message = await getAIMessage(query, sessionId);
  res.json(message);
});

app.get('/api/history', (req, res) => {
  const { sessionId } = req.query;
  const history = getChatHistory(sessionId);
  res.json(history);
});

app.delete('/api/history', (req, res) => {
  const { sessionId } = req.body;
  clearChatHistory(sessionId);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});