import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error("YOUTUBE_API_KEY is missing from environment variables.");
    return NextResponse.json({ error: "YouTube API Key is not configured on the server." }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
        q
      )}&type=video&videoCategoryId=10&key=${apiKey}` // categoryId 10 is Music
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("YouTube API Error:", errorData);
      throw new Error("YouTube API request failed");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("YouTube search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
