# Threadline Chat App

A beautiful, modern, and highly responsive real-time chat application featuring a natural, human-made aesthetic inspired by modern platforms like WhatsApp Web, Snapchat, and iMessage.

## 🚀 Features
- **Real-time Messaging**: Instant, sub-second message delivery using WebSockets (Socket.io).
- **Rich File Sharing**: Upload and send images/files seamlessly. Previews render instantly within chat bubbles.
- **Dynamic Themes**: Instantly switch between "WhatsApp Dark", "Snapchat Light", and "iMessage" aesthetics via the sidebar dropdown.
- **Natural UI/UX**: Features authentic message tails, integrated timestamps, read receipts, smooth hover states, and a modern floating input pill.
- **Typing Indicators**: See when the other person is typing in real-time.
- **Authentication**: Secure JWT-based login, registration, and session management.

## 🎥 App Demo
Here is a live recording of the app in action, showing messaging and dynamic theme switching:
![App Demo](./public/demo.webp)

## 🔑 Demo Accounts
The database is pre-seeded with a few test accounts. You can use these to test the app without registering:
- **Alice**: `alice@example.com` | Password: `password123`
- **Bob**: `bob@example.com` | Password: `password123`
- **Carol**: `carol@example.com` | Password: `password123`

## 💻 Setup Instructions

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. The app will run on `http://localhost:5173`

### Backend
1. Navigate to the `backend` directory.
2. Ensure you have a `.env` file configured with `JWT_SECRET`, `PORT`, and `CORS_ORIGIN`.
3. Install dependencies: `npm install`
4. Start the server: `npm run dev`
5. The backend API runs on `http://localhost:4000`

## ☁️ Pushing to GitHub
This project has already been initialized as a Git repository and your initial commit is ready. To push it to your GitHub profile, create an empty repository on GitHub and run the following commands:
```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```
