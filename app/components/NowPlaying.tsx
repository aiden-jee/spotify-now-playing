"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface SpotifyTrack {
    isPlaying: boolean;
    title: string;
    artist: string;
    album: string;
    albumImageUrl: string;
    songUrl: string;
    progressMs: number;
    durationMs: number;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function EqualiserBars() {
    return (
        <div className="flex items-end gap-[3px] h-4">
            {[1, 2, 3, 4].map((i) => (
                <span
                    key={i}
                    className="w-[3px] rounded-full bg-[#1DB954]"
                    style={{
                        animation: `equaliser 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
                    }}
                />
            ))}
        </div>
    );
}

function SpotifyLogo({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    );
}

export default function NowPlaying() {
    const [track, setTrack] = useState<SpotifyTrack | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);
    const lastFetchTime = useRef<number>(Date.now());

    const fetchNowPlaying = useCallback(async () => {
        try {
            const res = await fetch("/api/now-playing");
            const data = await res.json();

            if (data.isPlaying !== undefined && data.title) {
                setTrack(data);
                setProgress(data.progressMs);
                lastFetchTime.current = Date.now();
            } else {
                setTrack(null);
            }
        } catch (err) {
            console.error("Failed to fetch now playing:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Poll every 5 seconds
    useEffect(() => {
        fetchNowPlaying();
        const interval = setInterval(fetchNowPlaying, 5000);
        return () => clearInterval(interval);
    }, [fetchNowPlaying]);

    // Smoothly tick the progress bar between fetches
    useEffect(() => {
        if (progressInterval.current) {
            clearInterval(progressInterval.current);
        }

        if (track?.isPlaying) {
            progressInterval.current = setInterval(() => {
                setProgress((prev) => {
                    const elapsed = Date.now() - lastFetchTime.current;
                    const newProgress = track.progressMs + elapsed;
                    return Math.min(newProgress, track.durationMs);
                });
            }, 500);
        }

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [track]);

    const progressPercent =
        track && track.durationMs > 0 ? (progress / track.durationMs) * 100 : 0;

    // ── Loading State ──────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="now-playing-card flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <SpotifyLogo className="w-12 h-12 text-[#1DB954] animate-pulse" />
                    <p className="text-white/50 text-sm font-medium">Connecting to Spotify...</p>
                </div>
            </div>
        );
    }

    // ── Idle State ─────────────────────────────────────────────────
    if (!track) {
        return (
            <div className="now-playing-card flex flex-col items-center justify-center gap-6 py-16">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <SpotifyLogo className="w-10 h-10 text-white/20" />
                    </div>
                    <div className="absolute inset-0 rounded-full animate-ping-slow bg-white/[0.02]" />
                </div>
                <div className="text-center">
                    <p className="text-white/40 text-base font-medium">Nothing playing right now</p>
                    <p className="text-white/20 text-sm mt-1">Play something on Spotify to see it here</p>
                </div>
            </div>
        );
    }

    // ── Playing State ──────────────────────────────────────────────
    return (
        <div className="now-playing-card">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <SpotifyLogo className="w-5 h-5 text-[#1DB954]" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                        {track.isPlaying ? "Now Playing" : "Paused"}
                    </span>
                </div>
                {track.isPlaying && <EqualiserBars />}
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Album Art */}
                <a
                    href={track.songUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group shrink-0"
                >
                    <div className="album-glow">
                        <Image
                            src={track.albumImageUrl}
                            alt={`${track.album} album art`}
                            width={160}
                            height={160}
                            className="rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
                            unoptimized
                        />
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                        <svg
                            className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                    </div>
                </a>

                {/* Track Info */}
                <div className="flex flex-col justify-between min-w-0 flex-1 py-1">
                    <div>
                        <h2 className="text-xl font-bold text-white truncate leading-tight">
                            {track.title}
                        </h2>
                        <p className="text-white/60 text-sm font-medium mt-1.5 truncate">
                            {track.artist}
                        </p>
                        <p className="text-white/30 text-xs mt-1 truncate">{track.album}</p>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="progress-track">
                            <div
                                className="progress-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[11px] text-white/30 font-mono tabular-nums">
                                {formatTime(progress)}
                            </span>
                            <span className="text-[11px] text-white/30 font-mono tabular-nums">
                                {formatTime(track.durationMs)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
