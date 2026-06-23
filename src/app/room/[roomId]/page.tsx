"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import HostPlayer from "@/components/HostPlayer";
import GuestView from "@/components/GuestView";
import { Loader2 } from "lucide-react";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [isHost, setIsHost] = useState(false);
  const [guestId, setGuestId] = useState("");
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [inputName, setInputName] = useState("");

  useEffect(() => {
    // Check host status
    const hostData = JSON.parse(localStorage.getItem("office_music_hosts") || "{}");
    if (hostData[roomId]) {
      setIsHost(true);
      setInitialized(true);
      return;
    }

    // Check guest status
    const savedGuestId = localStorage.getItem(`guestId_${roomId}`);
    const savedName = localStorage.getItem(`name_${roomId}`);

    if (savedGuestId && savedName) {
      setGuestId(savedGuestId);
      setName(savedName);
    }
    setInitialized(true);
  }, [roomId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    
    const newGuestId = uuidv4();
    localStorage.setItem(`guestId_${roomId}`, newGuestId);
    localStorage.setItem(`name_${roomId}`, inputName.trim());
    
    setGuestId(newGuestId);
    setName(inputName.trim());
  };

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (isHost) {
    return <HostPlayer roomId={roomId} />;
  }

  if (!guestId || !name) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-background)] h-screen">
        <div className="max-w-md w-full space-y-6 p-8 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Join Room</h2>
            <p className="text-slate-400 mt-2">Enter your name to add songs</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              required
              placeholder="Your display name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] text-white"
            />
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-fuchsia-500 hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Join Queue
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <GuestView roomId={roomId} guestId={guestId} name={name} />;
}
