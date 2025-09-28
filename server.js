const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

// Import API routes
const apiRoutes = require('./routes/api');

console.log('__dirname:', __dirname);
console.log('Public path:', path.join(__dirname, 'public'));
console.log('Index path:', path.join(__dirname, 'public', 'index.html'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Use API routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
