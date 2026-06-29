"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Song, Room } from "@/lib/types";
import { Search, ThumbsUp, Plus, Loader2, Music } from "lucide-react";

export default function GuestView({ roomId, guestId, name }: { roomId: string; guestId: string; name: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
    });

    const queueRef = collection(db, "rooms", roomId, "queue");
    const q = query(queueRef, orderBy("upvotes", "desc"), orderBy("createdAt", "asc"));
    const unsubscribeQueue = onSnapshot(q, (snapshot) => {
      const songs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Song));
      setQueue(songs);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeQueue();
    };
  }, [roomId]);

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

  const activeSongsCount = queue.filter((song) => song.requestedBy.guestId === guestId).length;
  const limitReached = activeSongsCount >= 2;

  const addToQueue = async (video: any) => {
    if (limitReached) {
      alert("You already have 2 songs in the queue. Wait for one to play before adding another!");
      return;
    }

    const existingSong = queue.find((s) => s.videoId === video.id.videoId);
    if (existingSong) {
      alert("This song is already in the queue. Upvote it instead!");
      return;
    }

    try {
      await addDoc(collection(db, "rooms", roomId, "queue"), {
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        requestedBy: { guestId, name },
        upvotes: 1,
        upvotedBy: [guestId],
        createdAt: serverTimestamp(),
      });
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Error adding to queue", err);
    }
  };

  const upvote = async (songId: string, currentUpvotedBy: string[]) => {
    if (currentUpvotedBy.includes(guestId)) return;
    
    await updateDoc(doc(db, "rooms", roomId, "queue", songId), {
      upvotes: increment(1),
      upvotedBy: arrayUnion(guestId),
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)] text-white">
      {/* Header */}
      <header className="p-6 bg-[var(--color-card)] border-b border-[var(--color-border)] sticky top-0 z-10 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Music className="text-[var(--color-primary)] w-5 h-5" /> Office Music
          </h1>
          <p className="text-xs text-slate-400 mt-1">Playing as <span className="font-semibold text-slate-200">{name}</span></p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-3xl w-full mx-auto pb-32">
        {/* Current Song */}
        {room?.currentSong && (
          <div className="bg-gradient-to-r from-[var(--color-card)] to-slate-800 p-4 rounded-2xl border border-[var(--color-border)] shadow-xl flex items-center gap-4">
            <div className="relative">
              <img src={room.currentSong.thumbnail} alt="Now playing" className="w-16 h-16 rounded-lg object-cover shadow-md" />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-primary)] font-bold tracking-wider uppercase mb-1">Now Playing</p>
              <h2 className="font-bold truncate text-lg">{room.currentSong.title}</h2>
              <p className="text-sm text-slate-400 truncate">Requested by {room.currentSong.requestedBy.name}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search YouTube for a song..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-24 py-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] shadow-inner transition-all"
            />
              <button
                type="submit"
                disabled={searching}
                className="absolute inset-y-2 right-2 px-4 sm:px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-2 shadow-xl animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                <h3 className="font-bold">Search Results</h3>
                <button onClick={() => setSearchResults([])} className="text-sm text-slate-400 hover:text-white">Clear</button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                {searchResults.map((video) => (
                  <div key={video.id.videoId} className="flex gap-4 p-2 rounded-xl hover:bg-[var(--color-background)] transition group items-center">
                    <img src={video.snippet.thumbnails.default.url} alt="thumb" className="w-16 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-1">{video.snippet.title}</p>
                      <p className="text-xs text-slate-400 truncate">{video.snippet.channelTitle}</p>
                    </div>
                    <button
                      onClick={() => addToQueue(video)}
                      disabled={limitReached}
                      className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={limitReached ? "Queue limit reached" : "Add to queue"}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Queue */}
        <div>
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            Up Next <span className="bg-[var(--color-card)] text-sm px-3 py-1 rounded-full border border-[var(--color-border)]">{queue.length}</span>
          </h3>
          <div className="space-y-3">
            {[...queue]
              .sort((a, b) => {
                if (room?.orderedIds && room.orderedIds.length > 0) {
                  const indexA = room.orderedIds.indexOf(a.id!);
                  const indexB = room.orderedIds.indexOf(b.id!);
                  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;
                }
                return 0; // Default to Firestore's sorting
              })
              .map((song) => {
                const hasVoted = song.upvotedBy.includes(guestId);
                const isMine = song.requestedBy.guestId === guestId;

                return (
                <div key={song.id} className="flex gap-4 p-4 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] items-center shadow-sm hover:shadow-md transition">
                  <img src={song.thumbnail} alt="thumb" className="w-16 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1">{song.title}</p>
                    <p className="text-xs text-slate-400 truncate mt-1">Added by {isMine ? "You" : song.requestedBy.name}</p>
                  </div>
                  <button
                    onClick={() => upvote(song.id!, song.upvotedBy)}
                    disabled={hasVoted}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition font-bold text-sm ${
                      hasVoted 
                        ? "bg-slate-800 text-[var(--color-primary)] border border-[var(--color-primary)]/30 cursor-default" 
                        : "bg-[var(--color-background)] hover:bg-slate-800 text-slate-300 hover:text-white border border-[var(--color-border)]"
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${hasVoted ? "fill-current" : ""}`} />
                    {song.upvotes}
                  </button>
                </div>
              );
            })}
            {queue.length === 0 && (
              <div className="text-center p-12 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] border-dashed">
                <Music className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">The queue is empty.</p>
                <p className="text-sm text-slate-500 mt-1">Search for a song to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
