"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Music, Plus } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Save host status
      const hostData = JSON.parse(localStorage.getItem("office_music_hosts") || "{}");
      hostData[roomId] = true;
      localStorage.setItem("office_music_hosts", JSON.stringify(hostData));

      // Create room in Firestore
      await setDoc(doc(db, "rooms", roomId), {
        createdAt: serverTimestamp(),
        currentSong: null,
      });

      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please check your Firebase configuration.");
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[var(--color-background)] to-[var(--color-card)] h-screen">
      <div className="max-w-md w-full text-center space-y-8 p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)]">
            <Music className="h-12 w-12 text-[var(--color-primary)]" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Office Music
          </h1>
          <p className="text-lg text-slate-400">
            Collaborative, real-time music queue for your team.
          </p>
        </div>

        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-fuchsia-500 hover:from-[var(--color-primary-hover)] hover:to-fuchsia-600 rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">Creating...</span>
          ) : (
            <>
              <Plus className="mr-2 h-6 w-6" />
              Create Room
            </>
          )}
        </button>
      </div>
    </main>
  );
}
