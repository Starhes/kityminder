const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const ENABLE_REGISTRATION = process.env.ENABLE_REGISTRATION === 'true'; // Default false
const ENABLE_INVITE_ONLY = process.env.ENABLE_INVITE_ONLY === 'true'; // Default false

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Init DB
const initDb = async () => {
    try {
        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Invites table
        await db.query(`
            CREATE TABLE IF NOT EXISTS invites (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Maps table (updated with user_id)
        await db.query(`
            CREATE TABLE IF NOT EXISTS maps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if admin user exists, if not create one
        try {
            // Try valid connection
            const adminCheck = await db.query('SELECT * FROM users WHERE username = $1', ['admin']);
            if (adminCheck.rows.length === 0) {
                const adminPass = await bcrypt.hash('admin', 10);
                await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['admin', adminPass]);
                console.log('Default admin user created (admin/admin)');
            }
        } catch (e) {
            console.log('Error checking/creating admin user', e);
        }

        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Endpoints

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    if (!ENABLE_REGISTRATION) {
        return res.status(403).json({ error: 'Registration is disabled' });
    }

    const { username, password, inviteCode } = req.body;

    if (ENABLE_INVITE_ONLY) {
        if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });
        const inviteCheck = await db.query('SELECT * FROM invites WHERE code = $1 AND is_used = FALSE', [inviteCode]);
        if (inviteCheck.rows.length === 0) return res.status(400).json({ error: 'Invalid or used invite code' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        if (ENABLE_INVITE_ONLY && inviteCode) {
            await db.query('UPDATE invites SET is_used = TRUE WHERE code = $1', [inviteCode]);
        }

        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Generate Invite (Protected, ideally for Admin, but simpler here for now)
app.post('/api/auth/invite', async (req, res) => {
    // For simplicity, just allow it if we are in dev or add a simple secret key check
    // In production, this should be an admin-only endpoint
    const code = Math.random().toString(36).substring(2, 12);
    try {
        await db.query('INSERT INTO invites (code) VALUES ($1)', [code]);
        res.json({ code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Change Password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid old password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
});



// List maps (User specific)
app.get('/api/maps', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, title, updated_at FROM maps WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get a map
app.get('/api/maps/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM maps WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Map not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Save a map
app.post('/api/maps', authenticateToken, async (req, res) => {
    try {
        const { id, title, content } = req.body;
        let result;

        if (id) {
            // Update (Check ownership)
            result = await db.query(
                'UPDATE maps SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
                [title, content, id, req.user.id]
            );
            if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized or map not found' });
        } else {
            // Create
            result = await db.query(
                'INSERT INTO maps (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
                [req.user.id, title, content]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a map
app.delete('/api/maps/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM maps WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Registration Enabled: ${ENABLE_REGISTRATION}`);
    console.log(`Invite Only: ${ENABLE_INVITE_ONLY}`);
});
