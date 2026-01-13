const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Check and create table
const initDb = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS maps (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// API Endpoints

// List maps
app.get('/api/maps', async (req, res) => {
    try {
        const result = await db.query('SELECT id, title, updated_at FROM maps ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get a map
app.get('/api/maps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM maps WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Map not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Save a map (Create or Update)
// If id is provided, update; otherwise create
app.post('/api/maps', async (req, res) => {
    try {
        const { id, title, content } = req.body;
        let result;

        if (id) {
            // Update
            result = await db.query(
                'UPDATE maps SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [title, content, id]
            );
        } else {
            // Create
            result = await db.query(
                'INSERT INTO maps (title, content) VALUES ($1, $2) RETURNING *',
                [title, content]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a map
app.delete('/api/maps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM maps WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
