/**
 * Minimal local API bridge: React frontend  ->  MySQL (no Django needed).
 *
 * Serves the same endpoints the frontend already calls:
 *   GET  /api/health/
 *   POST /api/auth/token/      { email | username, password } -> { access, refresh, user }
 *   POST /api/auth/refresh/    { refresh } -> { access }
 *   GET  /api/auth/me/         Bearer <access> -> user
 *
 * Passwords are verified against Django's PBKDF2-SHA256 hashes already stored
 * in the imported brainstar database, so admin@gmail.com / admin123 works.
 */
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 8000;
const SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-me';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'brainstar',
  waitForConnections: true,
  connectionLimit: 10,
});

/** Verify a Django password hash: pbkdf2_sha256$<iterations>$<salt>$<b64hash> */
function checkPassword(raw, encoded) {
  if (!encoded) return false;
  const [algo, iterations, salt, hash] = encoded.split('$');
  if (algo !== 'pbkdf2_sha256') return false;
  const derived = crypto
    .pbkdf2Sync(raw, salt, Number(iterations), 32, 'sha256')
    .toString('base64');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

async function findUser(identifier) {
  const [rows] = await pool.query(
    'SELECT * FROM core_user WHERE email = ? OR username = ? LIMIT 1',
    [identifier, identifier],
  );
  return rows[0] || null;
}

function shapeUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    is_staff: !!u.is_staff,
    is_superuser: !!u.is_superuser,
    must_change_password: !!u.must_change_password,
    is_locked: !!u.is_locked,
    branch: u.branch_id ?? null,
    role: u.is_superuser ? 'superadmin' : u.is_staff ? 'admin' : 'teacher',
  };
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health/', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/token/', async (req, res) => {
  const { email, username, password } = req.body || {};
  const identifier = (email || username || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ detail: 'Email and password are required.' });
  }
  try {
    const user = await findUser(identifier);
    if (!user || !checkPassword(password, user.password)) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }
    if (user.is_active === 0) return res.status(401).json({ detail: 'Account is inactive.' });
    if (user.is_locked) return res.status(401).json({ detail: 'Account is locked.' });

    const access = jwt.sign({ sub: user.id, type: 'access' }, SECRET, { expiresIn: '2h' });
    const refresh = jwt.sign({ sub: user.id, type: 'refresh' }, SECRET, { expiresIn: '7d' });
    res.json({ access, refresh, user: shapeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: `Database error: ${e.message}` });
  }
});

app.post('/api/auth/refresh/', (req, res) => {
  try {
    const payload = jwt.verify(req.body?.refresh || '', SECRET);
    if (payload.type !== 'refresh') throw new Error('bad token');
    res.json({ access: jwt.sign({ sub: payload.sub, type: 'access' }, SECRET, { expiresIn: '2h' }) });
  } catch {
    res.status(401).json({ detail: 'Invalid refresh token.' });
  }
});

app.get('/api/auth/me/', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, SECRET);
    const [rows] = await pool.query('SELECT * FROM core_user WHERE id = ? LIMIT 1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ detail: 'User not found.' });
    res.json(shapeUser(rows[0]));
  } catch {
    res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }
});

app.listen(PORT, () => console.log(`Local MySQL API bridge running on http://localhost:${PORT}`));
