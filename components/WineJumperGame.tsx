"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import {
    JUMPER,
    JUMPER_TICK_MS,
    beginJump,
    jumperTick,
    newJumperGame,
    type JumperState,
} from '@winelore/core';
import { useTranslation } from "@/lib/i18n/context";

/**
 * Wine Jumper — the mini-game a commission can switch on to fill the wait
 * between candidates.
 *
 * The rules are `@winelore/core`'s `wineJumper`, shared with the app, so the
 * same play scores the same either way. This holds the field, the keyboard and
 * the menu; the phone's version holds a tappable field instead.
 */
export default function WineJumperGame({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation();
    const [game, setGame] = useState<JumperState>(newJumperGame);
    const [isPlaying, setIsPlaying] = useState(false);
    // Read by the loop and the key handler without re-binding either.
    const playing = useRef(false);

    useEffect(() => {
        playing.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) return;
        const timer = setInterval(() => {
            setGame((previous) => {
                const next = jumperTick(previous);
                if (next.isOver && !previous.isOver) {
                    playing.current = false;
                    setIsPlaying(false);
                }
                return next;
            });
        }, JUMPER_TICK_MS);
        return () => clearInterval(timer);
    }, [isPlaying]);

    const jump = useCallback(() => {
        if (!playing.current) return;
        setGame(beginJump);
    }, []);

    const startGame = useCallback(() => {
        setGame(newJumperGame());
        setIsPlaying(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            // Keep the page from scrolling under the player.
            e.preventDefault();
            jump();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump]);

    const showMenu = !isPlaying || game.isOver;

    return (
        <div
            className={`relative w-full h-64 overflow-hidden cursor-pointer ${
                embedded
                    ? "bg-slate-50 border border-slate-100 rounded-xl"
                    : "bg-slate-50 border-2 border-indigo-100 rounded-3xl shadow-inner"
            }`}
            onClick={jump}
        >
            <div className="absolute top-4 right-6 font-black text-2xl text-slate-300">
                {t("commission.wineJumperScore", { score: game.score })}
            </div>

            {showMenu && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    {game.isOver && <div className="text-4xl mb-2">💥</div>}
                    <h3 className="text-xl font-bold text-slate-800 mb-4 text-center px-4">
                        {game.isOver
                            ? t("commission.wineJumperOver", { score: game.score })
                            : t("commission.wineJumperTitle")}
                    </h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); startGame(); }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-indigo-700 transition active:scale-95 text-sm whitespace-nowrap"
                    >
                        <PlayCircle className="w-4 h-4 shrink-0" />
                        {game.isOver ? t("commission.wineJumperRetry") : t("commission.wineJumperPlayHint")}
                    </button>
                </div>
            )}

            {/* The grape: the player. */}
            <div
                className="absolute text-4xl transition-all duration-75"
                style={{ bottom: `${game.grapeY}px`, left: `${JUMPER.grapeX}%` }}
            >
                🍇
            </div>

            {/* The glass: the obstacle. */}
            <div className="absolute bottom-0 text-4xl" style={{ left: `${game.glassX}%` }}>
                🍷
            </div>

            <div className="absolute bottom-0 w-full h-1 bg-indigo-200"></div>
        </div>
    );
}
