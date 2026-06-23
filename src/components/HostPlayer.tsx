"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Song, Room } from "@/lib/types";
import YouTube from "react-youtube";
import { QRCodeSVG } from "qrcode.react";
import { SkipForward, Users, Music, Search, Loader2, Plus } from "lucide-react";

export default function HostPlayer({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (err) {
      console.error(err);
      alert("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const addToQueue = async (video: any) => {
    try {
      await addDoc(collection(db, "rooms", roomId, "queue"), {
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        requestedBy: { guestId: "HOST", name: "Host" },
        upvotes: 1,
        upvotedBy: ["HOST"],
        createdAt: serverTimestamp(),
      });
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Error adding to queue", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setJoinUrl(`${window.location.origin}/room/${roomId}`);
    }

    const roomRef = doc(db, "rooms", roomId);
    const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
      }
    });

    const queueRef = collection(db, "rooms", roomId, "queue");
    const q = query(queueRef, orderBy("upvotes", "desc"), orderBy("createdAt", "asc"));
    const unsubscribeQueue = onSnapshot(q, (snapshot) => {
      const songs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Song));
      setQueue(songs);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeQueue();
    };
  }, [roomId]);

  const playNextSong = async () => {
    if (queue.length === 0) {
      await updateDoc(doc(db, "rooms", roomId), { currentSong: null });
      return;
    }

    const nextSong = queue[0];
    // Set as current song
    await updateDoc(doc(db, "rooms", roomId), {
      currentSong: nextSong,
    });
    // Remove from queue
    if (nextSong.id) {
      await deleteDoc(doc(db, "rooms", roomId, "queue", nextSong.id));
    }
  };

  const handleEnd = () => {
    playNextSong();
  };

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-white overflow-hidden">
      {/* Main Player Section */}
      <div className="flex-1 flex flex-col p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="text-[var(--color-primary)]" /> Office Music Queue
          </h1>
          <div className="bg-[var(--color-card)] px-4 py-2 rounded-full border border-[var(--color-border)] text-sm font-mono shadow-md">
            Room Code: {roomId}
          </div>
        </header>

        <div className="flex-1 rounded-2xl overflow-hidden bg-black shadow-2xl relative border border-[var(--color-border)] group">
          {room?.currentSong ? (
            <YouTube
              videoId={room.currentSong.videoId}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: { 
                  autoplay: 1,
                  controls: 1 
                },
              }}
              className="absolute inset-0 w-full h-full"
              onEnd={handleEnd}
              onError={handleEnd}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Music className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-xl font-medium">Waiting for songs...</p>
              {queue.length > 0 && (
                <button
                  onClick={playNextSong}
                  className="mt-6 px-8 py-3 bg-gradient-to-r from-[var(--color-primary)] to-fuchsia-500 text-white font-semibold rounded-full hover:opacity-90 transition shadow-lg"
                >
                  Start Playing
                </button>
              )}
            </div>
          )}
        </div>

        {room?.currentSong && (
          <div className="mt-8 flex items-center justify-between bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-xl">
            <div className="flex items-center gap-6">
              <img
                src={room.currentSong.thumbnail}
                alt="Thumbnail"
                className="w-24 h-24 rounded-xl object-cover shadow-lg"
              />
              <div>
                <h2 className="text-2xl font-bold line-clamp-1">{room.currentSong.title}</h2>
                <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4" /> Requested by {room.currentSong.requestedBy.name}
                </p>
              </div>
            </div>
            <button
              onClick={playNextSong}
              className="p-4 rounded-full bg-[var(--color-background)] hover:bg-slate-800 transition border border-[var(--color-border)] group/btn shadow-md"
              title="Skip Song"
            >
              <SkipForward className="w-8 h-8 text-slate-400 group-hover/btn:text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Section */}
      <div className="w-96 bg-[var(--color-card)] border-l border-[var(--color-border)] flex flex-col shadow-2xl z-10">
        <div className="p-8 border-b border-[var(--color-border)] flex flex-col items-center justify-center text-center bg-gradient-to-b from-[var(--color-card)] to-[var(--color-background)]/50">
          <p className="text-sm text-[var(--color-primary)] mb-4 uppercase tracking-widest font-bold">Join the Room</p>
          <div className="bg-white p-4 rounded-2xl shadow-xl shadow-primary/10">
            {joinUrl && <QRCodeSVG value={joinUrl} size={160} />}
          </div>
          {joinUrl && (
            <div className="mt-4 w-full flex flex-col items-center">
              <div className="flex w-full items-center gap-2 bg-black/20 p-2 rounded-lg border border-[var(--color-border)]">
                <input 
                  type="text" 
                  readOnly 
                  value={joinUrl} 
                  className="bg-transparent text-xs text-slate-300 w-full outline-none text-center" 
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(joinUrl);
                  }}
                  title="Click to copy"
                />
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-400 max-w-[200px]">Scan or share link to add songs</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Host Search */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Add song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-16 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-primary)] text-sm"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2 top-2 px-3 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl max-h-60 overflow-y-auto p-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-xs font-semibold text-slate-400">Results</span>
                  <button onClick={() => setSearchResults([])} className="text-xs text-slate-500 hover:text-white transition-colors">Clear</button>
                </div>
                {searchResults.map((video) => (
                  <div key={video.id.videoId} className="flex gap-3 p-2 hover:bg-[var(--color-card)] rounded-lg items-center text-sm transition-colors border border-transparent hover:border-[var(--color-border)]">
                    <img src={video.snippet.thumbnails.default.url} alt="thumb" className="w-12 h-9 rounded object-cover shadow-sm" />
                    <p className="flex-1 truncate text-xs font-medium text-slate-200">{video.snippet.title}</p>
                    <button
                      onClick={() => addToQueue(video)}
                      className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                      title="Add to queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className="font-bold text-lg mb-6 flex items-center justify-between">
            Up Next
            <span className="text-xs font-bold text-white bg-[var(--color-primary)] px-3 py-1 rounded-full">{queue.length}</span>
          </h3>
          <div className="space-y-4">
            {queue.map((song, idx) => (
              <div key={song.id} className="flex gap-4 p-3 rounded-xl hover:bg-[var(--color-background)] transition group border border-transparent hover:border-[var(--color-border)] cursor-default">
                <div className="w-6 flex items-center justify-center font-mono text-slate-500 font-bold text-sm">
                  {idx + 1}
                </div>
                <img src={song.thumbnail} alt="thumb" className="w-16 h-12 rounded-lg object-cover shadow-sm" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-semibold text-sm line-clamp-1">{song.title}</p>
                  <p className="text-xs text-slate-400 truncate mt-1">By {song.requestedBy.name}</p>
                </div>
                <div className="flex items-center gap-1 text-[var(--color-primary)] font-bold text-sm bg-primary/10 px-2 py-1 rounded-md">
                  👍 {song.upvotes}
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                <Music className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Queue is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
