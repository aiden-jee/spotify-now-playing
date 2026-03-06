import { NextResponse } from "next/server";
import { getNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const track = await getNowPlaying();

        if (!track) {
            return NextResponse.json({ isPlaying: false });
        }

        return NextResponse.json(track, {
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "CDN-Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Spotify API error:", error);
        return NextResponse.json(
            { isPlaying: false, error: "Failed to fetch playback state" },
            { status: 500 }
        );
    }
}
