'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, MessageSquare, AudioLines, Clock, Lock } from 'lucide-react';
import { useComments, Comment } from '@/hooks/useComments';
import type { CommissionReplicaCandidateStatus } from '@/src/gql/graphql';
import { CommentForm } from './CommentForm';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentSectionProps {
  entityId: string;
  entityType: string;
  candidateStatus?: CommissionReplicaCandidateStatus | null;
}

// Допоміжний компонент для гарного відображення аудіо-плеєра
function AudioPlayer({ src, duration: initialDuration }: { src: string; duration?: number | null }) {
  const initialDurationValue =
    typeof initialDuration === 'number' && Number.isFinite(initialDuration) && initialDuration > 0
      ? initialDuration
      : 0;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDurationValue);
  const [hasAudioError, setHasAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof initialDuration === 'number' && Number.isFinite(initialDuration) && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  const handlePlayPause = () => {
    if (!audioRef.current || hasAudioError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setHasAudioError(true));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && Number.isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !initialDuration && Number.isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = () => {
    setHasAudioError(true);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time <= 0) return '0:00';

    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20 max-w-md w-full my-2">
      <button
        onClick={handlePlayPause}
        disabled={hasAudioError}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Прогрес бар */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="h-1.5 w-full bg-amber-200 dark:bg-neutral-800 rounded-full cursor-pointer relative overflow-hidden group"
        >
          <div
            className="h-full bg-amber-600 dark:bg-amber-500 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Час та іконка аудіо */}
        <div className="flex items-center justify-between mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <AudioLines className="h-3.5 w-3.5 text-amber-500/70" />
            <span>{hasAudioError ? 'Аудіо недоступне після перезавантаження' : 'Голосовий відгук'}</span>
          </div>
          <span className="tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />
    </div>
  );
}

// Рендер окремого коментаря
function CommentItem({ comment }: { comment: Comment }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Нещодавно';
    }
  };

  return (
    <div className="flex gap-4 p-4 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50/40 dark:hover:bg-neutral-900/10 transition-colors">
      <Avatar className="h-10 w-10 border border-neutral-100 dark:border-neutral-800">
        {comment.author.avatarUrl && <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />}
        <AvatarFallback className="bg-amber-600/10 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 font-semibold text-xs">
          {getInitials(comment.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {comment.author.name}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatDate(comment.createdAt)}
          </span>
        </div>

        {/* Текст коментаря */}
        {comment.content && (
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed break-words whitespace-pre-line">
            {comment.content}
          </p>
        )}

        {/* Голосовий плеєр */}
        {comment.audioUrl && (
          <AudioPlayer src={comment.audioUrl} duration={comment.audioDuration} />
        )}
      </div>
    </div>
  );
}

export function CommentSection({ entityId, entityType, candidateStatus }: CommentSectionProps) {
  const {
    comments,
    loading,
    error,
    canAddComment,
    closedEvaluationMessage,
    isRecording,
    audioUrl,
    recordingTime,
    isUploading,
    startRecording,
    stopRecording,
    cancelRecording,
    addComment,
  } = useComments(entityId, entityType, candidateStatus);

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden max-w-3xl mx-auto bg-white dark:bg-black">
      {/* Шапка секції */}
      <div className="px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-600" />
          Відгуки та обговорення
          <span className="ml-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
            {comments.length}
          </span>
        </h3>
      </div>

      <CardContent className="p-0 space-y-6">
        {/* Форма створення коментаря */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/20 dark:bg-neutral-900/5">
          {!canAddComment && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">{closedEvaluationMessage}</p>
            </div>
          )}
          <CommentForm
            onSubmit={addComment}
            disabled={!canAddComment}
            disabledMessage={closedEvaluationMessage}
            isRecording={isRecording}
            audioUrl={audioUrl}
            recordingTime={recordingTime}
            isUploading={isUploading}
            startRecording={startRecording}
            stopRecording={stopRecording}
            cancelRecording={cancelRecording}
          />
          {error && (
            <p className="mt-3 text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-md">
              {error}
            </p>
          )}
        </div>

        {/* Список коментарів */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {loading ? (
            // Skeleton Loader
            <div className="p-6 space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            // Пустий стан
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Ще немає жодного коментаря
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Будьте першим, хто поділиться своєю думкою!
              </p>
            </div>
          ) : (
            // Коментарі
            <div className="max-h-[500px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
