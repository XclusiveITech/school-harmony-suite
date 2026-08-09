# Local MySQL API bridge (no Django)

A browser cannot connect to MySQL directly — MySQL speaks a TCP protocol that
only a server process can use. This tiny Node server is the smallest possible
replacement for Django: it reads the same `brainstar` MySQL database and serves
the same endpoints the frontend already calls.

## Run it

```bash
cd local-api
npm install

# point it at your local MySQL (defaults: 127.0.0.1:3306, root, no password, db "brainstar")
# Windows PowerShell:  $env:DB_PASSWORD="yourpass"
# macOS/Linux:         export DB_PASSWORD=yourpass

npm start
```

It listens on `http://localhost:8000`, so the frontend's existing
`VITE_API_URL=http://localhost:8000` needs no change.

## Environment variables

| Name          | Default     |
| ------------- | ----------- |
| `PORT`        | `8000`      |
| `DB_HOST`     | `127.0.0.1` |
| `DB_PORT`     | `3306`      |
| `DB_USER`     | `root`      |
| `DB_PASSWORD` | *(empty)*   |
| `DB_NAME`     | `brainstar` |
| `JWT_SECRET`  | dev default |

## Login

Import `brainstar_mysql_with_superadmin.sql` first, then sign in at
`http://localhost:8080/login` with **admin@gmail.com / admin123**.
Passwords are verified against Django's PBKDF2-SHA256 hashes already in the DB.

## Notes

- This must run on your machine (Node + MySQL local). The Lovable HTTPS preview
  cannot reach `http://localhost`, so test with `npm run dev` locally.
- Only auth endpoints are implemented. Add more routes here as you wire up
  other modules, or go back to the Django backend for full coverage.
