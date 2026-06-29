"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Song, Room } from "@/lib/types";
import YouTube from "react-youtube";
import { SkipForward, Users, Music, Trash2, Search, Loader2, Plus, GripVertical, Copy, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function HostPlayer({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const songs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Song));
      setQueue(songs);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeQueue();
    };
  }, [roomId]);

  // Derived sorted queue based on orderedIds
  const sortedQueue = [...queue].sort((a, b) => {
    if (room?.orderedIds && room.orderedIds.length > 0) {
      const indexA = room.orderedIds.indexOf(a.id!);
      const indexB = room.orderedIds.indexOf(b.id!);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    return 0; 
  });

  const playNextSong = async () => {
    if (sortedQueue.length === 0) {
      await updateDoc(doc(db, "rooms", roomId), { currentSong: null });
      return;
    }

    const nextSong = sortedQueue[0];
    
    // Set as current song
    await updateDoc(doc(db, "rooms", roomId), {
      currentSong: nextSong,
    });
    
    // Remove from queue
    if (nextSong.id) {
      await deleteDoc(doc(db, "rooms", roomId, "queue", nextSong.id));
      
      // Cleanup orderedIds if it exists
      if (room?.orderedIds) {
        const newOrderedIds = room.orderedIds.filter(id => id !== nextSong.id);
        await updateDoc(doc(db, "rooms", roomId), { orderedIds: newOrderedIds });
      }
    }
  };

  const handleEnd = () => playNextSong();

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
      const docRef = await addDoc(collection(db, "rooms", roomId, "queue"), {
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        requestedBy: { guestId: "host", name: "Host" },
        upvotes: 1,
        upvotedBy: ["host"],
        createdAt: serverTimestamp(),
      });

      // If the host has manually ordered before, we should append the new song to orderedIds
      if (room?.orderedIds && room.orderedIds.length > 0) {
        await updateDoc(doc(db, "rooms", roomId), {
          orderedIds: [...room.orderedIds, docRef.id]
        });
      }

      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Error adding to queue", err);
    }
  };

  const deleteSong = async (songId: string) => {
    await deleteDoc(doc(db, "rooms", roomId, "queue", songId));
    if (room?.orderedIds) {
      await updateDoc(doc(db, "rooms", roomId), {
        orderedIds: room.orderedIds.filter(id => id !== songId)
      });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newOrder = Array.from(sortedQueue);
    const [movedItem] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(destinationIndex, 0, movedItem);

    const orderedIds = newOrder.map(song => song.id!);
    
    // Save to Firestore
    await updateDoc(doc(db, "rooms", roomId), { orderedIds });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-background)] text-white overflow-hidden">
      {/* Main Player Section */}
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="text-[var(--color-primary)]" /> Office Music
          </h1>
          <div className="bg-[var(--color-card)] px-4 py-2 rounded-full border border-[var(--color-border)] text-sm font-mono shadow-md w-full sm:w-auto text-center">
            Room Code: {roomId}
          </div>
        </header>

        <div className="flex-1 min-h-[300px] md:min-h-0 rounded-2xl overflow-hidden bg-black shadow-2xl relative border border-[var(--color-border)] group shrink-0">
          {room?.currentSong ? (
            <YouTube
              videoId={room.currentSong.videoId}
              opts={{ width: "100%", height: "100%", playerVars: { autoplay: 1 } }}
              className="absolute inset-0 w-full h-full pointer-events-none"
              onEnd={handleEnd}
              onError={handleEnd}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Music className="w-16 h-16 md:w-20 md:h-20 mb-4 opacity-20" />
              <p className="text-lg md:text-xl font-medium">Waiting for songs...</p>
              {sortedQueue.length > 0 && (
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
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-[var(--color-card)] p-4 sm:p-6 rounded-2xl border border-[var(--color-border)] shadow-xl shrink-0 gap-4">
            <div className="flex items-center gap-4 sm:gap-6 w-full">
              <img src={room.currentSong.thumbnail} alt="Thumbnail" className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover shadow-lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold line-clamp-1">{room.currentSong.title}</h2>
                <p className="text-sm sm:text-base text-slate-400 mt-1 sm:mt-2 flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4" /> Requested by {room.currentSong.requestedBy.name}
                </p>
              </div>
            </div>
            <button
              onClick={playNextSong}
              className="w-full sm:w-auto p-4 flex justify-center rounded-xl sm:rounded-full bg-[var(--color-background)] hover:bg-slate-800 transition border border-[var(--color-border)] group/btn shadow-md"
              title="Skip Song"
            >
              <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover/btn:text-white" />
            </button>
          </div>
        )}

        {/* Host Search Section */}
        <div className="mt-8 space-y-4 shrink-0 pb-8 md:pb-0">
          <h3 className="font-bold text-lg">Add Songs (Host)</h3>
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search YouTube..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-24 py-3 sm:py-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] shadow-inner transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute inset-y-1.5 sm:inset-y-2 right-1.5 sm:right-2 px-4 sm:px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-lg sm:rounded-xl transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-2 shadow-xl animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center p-3 sm:p-4 border-b border-[var(--color-border)]">
                <h3 className="font-bold">Search Results</h3>
                <button onClick={() => setSearchResults([])} className="text-sm text-slate-400 hover:text-white">Clear</button>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                {searchResults.map((video) => (
                  <div key={video.id.videoId} className="flex gap-4 p-2 rounded-xl hover:bg-[var(--color-background)] transition items-center">
                    <img src={video.snippet.thumbnails.default.url} alt="thumb" className="w-16 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-1">{video.snippet.title}</p>
                      <p className="text-xs text-slate-400 truncate">{video.snippet.channelTitle}</p>
                    </div>
                    <button
                      onClick={() => addToQueue(video)}
                      className="p-2 sm:p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg sm:rounded-xl transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Section */}
      <div className="w-full md:w-96 bg-[var(--color-card)] md:border-l border-t md:border-t-0 border-[var(--color-border)] flex flex-col shadow-2xl z-10">
        <div className="p-6 md:p-8 border-b border-[var(--color-border)] flex flex-col text-center bg-gradient-to-b from-[var(--color-card)] to-[var(--color-background)]/50">
          <p className="text-sm text-[var(--color-primary)] mb-4 uppercase tracking-widest font-bold">Invite Guests</p>
          <div className="flex items-center gap-2">
            <input 
              readOnly 
              value={joinUrl} 
              className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-text truncate"
              onClick={(e) => e.currentTarget.select()}
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg transition-colors shrink-0"
              title="Copy Link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-[300px]">
          <h3 className="font-bold text-lg mb-4 md:mb-6 flex items-center justify-between">
            Up Next
            <span className="text-xs font-bold text-white bg-[var(--color-primary)] px-3 py-1 rounded-full">{sortedQueue.length}</span>
          </h3>
          
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 md:space-y-4 pb-12">
                  {sortedQueue.map((song, index) => (
                    <Draggable key={song.id} draggableId={song.id!} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex gap-3 md:gap-4 p-2 md:p-3 rounded-xl transition border group 
                            ${snapshot.isDragging ? "bg-slate-800 border-[var(--color-primary)] shadow-2xl scale-[1.02] z-50" : "bg-[var(--color-card)] border-transparent hover:border-[var(--color-border)]"}`}
                        >
                          <div 
                            {...provided.dragHandleProps} 
                            className="w-6 md:w-8 flex items-center justify-center text-slate-500 hover:text-white cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          
                          <img src={song.thumbnail} alt="thumb" className="w-12 h-10 md:w-16 md:h-12 rounded-lg object-cover shadow-sm pointer-events-none" />
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="font-semibold text-xs md:text-sm line-clamp-1">{song.title}</p>
                            <p className="text-[10px] md:text-xs text-slate-400 truncate mt-1">By {song.requestedBy.name}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[var(--color-primary)] font-bold text-xs md:text-sm bg-primary/10 px-2 py-1 rounded-md">
                              👍 {song.upvotes}
                            </div>
                            <button
                              onClick={() => deleteSong(song.id!)}
                              className="p-1.5 md:p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                              title="Remove song"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {sortedQueue.length === 0 && (
                    <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                      <Music className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">Queue is empty</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
