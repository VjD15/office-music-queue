# Office Music Queue

A collaborative, real-time music queue for your team. Office Music Queue allows anyone to join a room via a link or QR code, search for YouTube videos, and add them to a shared playlist. It features a host player that plays the music on a central device, and a guest view that lets participants upvote songs.

## 🚀 About This Project

This project was built with:
- **Next.js**: React framework for the frontend and API routes.
- **Firebase Firestore**: For real-time database synchronization of the music queue.
- **YouTube Data API v3**: For searching songs.
- **react-youtube**: For embedding the host player.

The goal is to solve the problem of arguing over what music to play in the office or during a party. Everyone gets a fair chance to add their favorite tracks and upvote the ones they want to hear sooner.

## ⚙️ How to Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
YOUTUBE_API_KEY=your_youtube_data_api_key
```

### 3. Firestore Rules Setup
Make sure your Firestore Database rules allow read/write access for the `rooms` collection:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
      match /queue/{songId} {
        allow read, write: if true;
      }
    }
  }
}
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🦁 Important Note for Brave Browser Users

If you are using the **Brave Browser** to host the player, you may encounter issues with the YouTube embed failing to load or autoplaying correctly. 

Brave's built-in "Shields" block trackers and cross-site cookies, which can interfere with the `react-youtube` embedded player and Firebase database connection.

**How to fix:**
1. Open the Office Music Queue in Brave.
2. Click the **Lion icon (Brave Shields)** in the right side of the address bar.
3. Toggle the Shields switch to **Down** (disable shields for this site).
4. Refresh the page. The YouTube player should now start playing the queue automatically without getting blocked.
