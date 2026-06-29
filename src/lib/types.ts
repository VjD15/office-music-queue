import { Timestamp } from "firebase/firestore";

export interface Room {
  id: string;
  createdAt: Timestamp | number;
  currentSong: Song | null;
  orderedIds?: string[];
}

export interface Song {
  id?: string;
  videoId: string;
  title: string;
  thumbnail: string;
  requestedBy: {
    guestId: string;
    name: string;
  };
  upvotes: number;
  upvotedBy: string[];
  createdAt: Timestamp | number;
}
