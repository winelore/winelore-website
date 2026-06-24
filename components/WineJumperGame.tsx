"use client"
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle } from 'lucide-react';

export default function WineJumperGame() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);

    // Координати
    const [grapeY, setGrapeY] = useState(0);
    const [glassX, setGlassX] = useState(100);

    const grapeRef = useRef<HTMLDivElement>(null);
    const glassRef = useRef<HTMLDivElement>(null);

    // Фізика стрибка
    const [isJumping, setIsJumping] = useState(false);

    // Ігровий цикл
    useEffect(() => {
        let gameLoop: NodeJS.Timeout;
        if (isPlaying && !isGameOver) {
            gameLoop = setInterval(() => {
                // Рухаємо келих вліво
                setGlassX((prev) => {
                    if (prev <= -10) {
                        setScore(s => s + 1);
                        return 100; // Повертаємо келих направо
                    }
                    return prev - 2; // Швидкість (збільшуй для складності)
                });
            }, 50);
        }
        return () => clearInterval(gameLoop);
    }, [isPlaying, isGameOver]);

    // Гравітація виноградинки
    useEffect(() => {
        let gravity: NodeJS.Timeout;
        if (isPlaying && !isGameOver) {
            gravity = setInterval(() => {
                setGrapeY((prev) => {
                    if (prev > 0 && !isJumping) return prev - 5; // Падаємо вниз
                    return prev;
                });
            }, 30);
        }
        return () => clearInterval(gravity);
    }, [isPlaying, isGameOver, isJumping]);

    // Перевірка зіткнень (Колізія)
    useEffect(() => {
        const checkCollision = setInterval(() => {
            if (glassX > 10 && glassX < 20 && grapeY < 30) {
                setIsGameOver(true);
                setIsPlaying(false);
            }
        }, 50);
        return () => clearInterval(checkCollision);
    }, [glassX, grapeY]);

    const jump = () => {
        if (!isPlaying || isGameOver || isJumping || grapeY > 0) return;
        setIsJumping(true);
        let jumpHeight = 0;
        const jumpUp = setInterval(() => {
            if (jumpHeight >= 80) { // Висота стрибка
                clearInterval(jumpUp);
                setIsJumping(false);
            } else {
                jumpHeight += 10;
                setGrapeY(jumpHeight);
            }
        }, 30);
    };

    // Слухаємо пробіл для стрибка
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // щоб сторінка не скролилась
                jump();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isGameOver, isJumping, grapeY]);

    const startGame = () => {
        setIsPlaying(true);
        setIsGameOver(false);
        setScore(0);
        setGlassX(100);
        setGrapeY(0);
    };

    return (
        <div className="relative w-full h-64 bg-slate-50 border-2 border-indigo-100 rounded-3xl overflow-hidden cursor-pointer shadow-inner" onClick={jump}>
            {/* Рахунок */}
            <div className="absolute top-4 right-6 font-black text-2xl text-slate-300">
                Score: {score}
            </div>

            {/* Меню старту/програшу */}
            {(!isPlaying || isGameOver) && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    {isGameOver && <div className="text-4xl mb-2">💥 Упс!</div>}
                    <h3 className="text-xl font-bold text-slate-800 mb-4">
                        {isGameOver ? `Гра закінчена. Рахунок: ${score}` : "Wine Jumper"}
                    </h3>
                    <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-700 transition active:scale-95">
                        <PlayCircle className="w-5 h-5" />
                        {isGameOver ? "Спробувати ще раз" : "Грати (Тисни Пробіл)"}
                    </button>
                </div>
            )}

            {/* Виноградинка (Гравець) */}
            <div
                ref={grapeRef}
                className="absolute left-[15%] text-4xl transition-all duration-75"
                style={{ bottom: `${grapeY}px` }}
            >
                🍇
            </div>

            {/* Келих вина (Перешкода) */}
            <div
                ref={glassRef}
                className="absolute bottom-0 text-4xl"
                style={{ left: `${glassX}%` }}
            >
                🍷
            </div>

            {/* Земля */}
            <div className="absolute bottom-0 w-full h-1 bg-indigo-200"></div>
        </div>
    );
}