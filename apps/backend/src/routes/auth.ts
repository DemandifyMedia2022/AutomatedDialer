import { Router } from 'express';
import { setupSuperadmin, login } from '../controllers/authController';

const router = Router();

router.post('/setup', setupSuperadmin);
router.post('/login', login);

router.get('/setup-form', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Initialize Superadmin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:520px;margin:40px auto;padding:0 16px}
          form{display:flex;flex-direction:column;gap:12px}
          input,button{padding:10px;font-size:16px}
          .card{border:1px solid #ddd;border-radius:8px;padding:20px}
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Initialize Superadmin</h2>
          <form method="post" action="/api/auth/setup">
            <input name="username" placeholder="Username" required />
            <input type="email" name="usermail" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password (min 6)" minlength="6" required />
            <button type="submit">Create Superadmin</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

router.get('/login-form', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:520px;margin:40px auto;padding:0 16px}
          form{display:flex;flex-direction:column;gap:12px}
          input,button{padding:10px;font-size:16px}
          .card{border:1px solid #ddd;border-radius:8px;padding:20px}
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Login</h2>
          <form method="post" action="/api/auth/login">
            <input type="email" name="usermail" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

export default router;
