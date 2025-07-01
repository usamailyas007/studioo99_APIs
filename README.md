# Minimal Node.js + MongoDB + Vercel Starter

## Features

- Node.js + Express project structure
- MongoDB (Mongoose) integration
- Vercel-ready (for easy deployment)
- Only `User` model (name, phone)
- Skeleton controllers & routes

---

## 1. Local Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Copy `.env.example` to `.env` and add your MongoDB URI:**

   ```env
   MONGODB_URI=your_mongodb_uri_here
   ```

3. **Start server:**

   ```bash
   npm start
   ```

---

## 2. Deploying to Vercel

1. **Push this project to GitHub** (or any Git provider).
2. **Go to [Vercel](https://vercel.com/)** and import your repo.
3. **Add your environment variable in Vercel Dashboard:**

   - Key: `MONGODB_URI`
   - Value: _your MongoDB Atlas connection string_

4. **Deploy!**

---

## 3. Where to Write Code

- Define your API logic in `controllers/userController.js` and add routes in `routes/userRoutes.js`.

---

## 4. What to Replace

- **MongoDB:** Set your own connection string in `.env` and in Vercel's project environment variables.
- **Vercel:** No changes needed unless you use custom build settings.

---

**That's it!**
