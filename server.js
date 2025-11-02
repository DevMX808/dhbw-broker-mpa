const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8000;

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'account.html'));
});

app.get('/account', (req, res) => {
  res.sendFile(path.join(__dirname, 'account.html'));
});

app.get('/market', (req, res) => {
  res.sendFile(path.join(__dirname, 'market.html'));
});

app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'portfolio.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

app.listen(PORT, () => {
  console.log(`MPA Server running on port ${PORT}`);
});