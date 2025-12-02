const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route: send the index.html file from public
app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});