'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
  Send,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';

// Схема валідації Zod
const commentFormSchema = z.object({
  content: z.string().max(1000, 'Максимальна довжина коментаря 1000 символів.').optional(),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

interface CommentFormProps {
  onSubmit: (content?: string, audioDuration?: number) => Promise<boolean>;
  disabled?: boolean;
  disabledMessage?: string;
  isRecording: boolean;
  audioUrl: string | null;
  recordingTime: number;
  isUploading: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export function CommentForm({
  onSubmit,
  disabled = false,
  disabledMessage,
  isRecording,
  audioUrl,
  recordingTime,
  isUploading,
  startRecording,
  stopRecording,
  cancelRecording,
}: CommentFormProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
    },
  });

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAudioPlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleFormSubmit = async (values: CommentFormValues) => {
    if (disabled) {
      form.setError('content', {
        type: 'manual',
        message: disabledMessage || 'Коментарі зараз недоступні.',
      });
      return;
    }

    // Валідація: хоча б один тип коментаря (текст або аудіо) має бути присутній
    if (!values.content?.trim() && !audioUrl) {
      form.setError('content', {
        type: 'manual',
        message: 'Будь ласка, введіть текст коментаря або запишіть голосове повідомлення.',
      });
      return;
    }

    setSubmitting(true);
    const success = await onSubmit(values.content, recordingTime);
    setSubmitting(false);

    if (success) {
      form.reset();
      setIsPlaying(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Поле введення тексту */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={disabled ? (disabledMessage || 'Коментарі зараз недоступні.') : 'Напишіть коментар...'}
                  className="min-h-[100px] resize-none border-neutral-200 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all dark:border-neutral-800"
                  disabled={disabled || submitting || isUploading || isRecording}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Секція голосового коментаря */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800/80 transition-all">
          <div className="flex items-center gap-3">
            {/* Кнопка старту/зупинки запису */}
            {!isRecording && !audioUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startRecording}
                disabled={disabled || submitting || isUploading}
                className="gap-2 text-neutral-600 hover:text-amber-600 dark:text-neutral-300 dark:hover:text-amber-500 hover:border-amber-300/50 transition-colors"
              >
                <Mic className="h-4 w-4" />
                Записати відгук
              </Button>
            ) : isRecording ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  disabled={disabled}
                  className="gap-2 bg-rose-600 hover:bg-rose-500 animate-pulse"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Зупинити
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={cancelRecording}
                  disabled={disabled}
                  className="h-8 w-8 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-rose-600 flex items-center gap-1.5 dark:text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-400 animate-ping" />
                  Запис: {formatTime(recordingTime)}
                </span>
              </div>
            ) : (
              // Панель прослуховування записаного аудіо
              <div className="flex items-center gap-2 w-full">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAudioPlayPause}
                  disabled={disabled}
                  className="gap-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Слухати відгук
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={cancelRecording}
                  disabled={disabled || submitting || isUploading}
                  className="h-8 w-8 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {formatTime(recordingTime)} сек
                </span>
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                )}
              </div>
            )}
          </div>

          {/* Кнопка відправки */}
          <Button
            type="submit"
            disabled={disabled || submitting || isUploading || isRecording}
            className="bg-amber-600 hover:bg-amber-500 text-white gap-2 transition-all self-end sm:self-auto font-medium"
          >
            {submitting || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Надсилання...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Надіслати
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
