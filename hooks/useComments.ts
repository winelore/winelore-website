/* eslint-disable no-console */
'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchGraphQL } from '@/lib/apiClient';

// Типи для системи коментарів
export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Comment {
  id: string;
  entityId: string;
  entityType: string;
  content?: string | null;
  audioUrl?: string | null;
  audioDuration?: number | null;
  author: CommentAuthor;
  createdAt: string;
}

// Чернетки запитів для майбутнього використання (codegen відключений для цих рядків,
// оскільки поля ще не додані на бекенд).
// Після оновлення бекенду, ці gql-рядки слід перенести у файли, що скануються codegen.
/*
const GET_COMMENTS_QUERY = gql(`
  query GetComments($entityId: String!, $entityType: String!) {
    comments(entityId: $entityId, entityType: $entityType) {
      id
      entityId
      entityType
      content
      audioUrl
      audioDuration
      author {
        id
        name
        avatarUrl
      }
      createdAt
    }
  }
`);

const CREATE_COMMENT_MUTATION = gql(`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      entityId
      entityType
      content
      audioUrl
      audioDuration
      author {
        id
        name
        avatarUrl
      }
      createdAt
    }
  }
`);

const GET_PRESIGNED_URL_MUTATION = gql(`
  mutation GetPresignedAudioUploadUrl($fileName: String!, $contentType: String!) {
    getPresignedAudioUploadUrl(fileName: $fileName, contentType: $contentType) {
      uploadUrl
      fileUrl
    }
  }
`);
*/

export function useComments(entityId: string, entityType: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Стан для запису аудіо
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Демонстраційні (mock) дані на випадок, якщо бекенд ще не готовий
  const mockCommentsKey = `mock_comments_${entityType}_${entityId}`;

  // Завантаження коментарів
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Спроба отримати з API
      // Оскільки ми передаємо рядком, використовуємо альтернативний fetch
      const result = await fetchGraphQL(
        // Тимчасово приводимо тип до TypedDocumentNode для сумісності з fetchGraphQL
        { kind: 'Document', definitions: [] } as any,
        { entityId, entityType }
      ).catch(() => {
        // У разі помилки відсутньої схеми - кидаємо помилку для переходу на mock
        throw new Error('API Schema not ready');
      });

      if (result && 'comments' in result) {
        setComments(result.comments as Comment[]);
      } else {
        throw new Error('No data');
      }
    } catch (e) {
      console.warn('Використовуються локальні mock-коментарі (бекенд ще не підтримує запит comments):', e);
      // Завантаження з localStorage для демонстрації
      const saved = localStorage.getItem(mockCommentsKey);
      if (saved) {
        setComments(JSON.parse(saved));
      } else {
        // Дефолтні mock коментарі
        const defaultMocks: Comment[] = [
          {
            id: 'mock-1',
            entityId,
            entityType,
            content: 'Дуже гарне вино! Відчуваються нотки вишні та дуба.',
            author: { id: 'user-1', name: 'Олексій Коваленко', avatarUrl: null },
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'mock-2',
            entityId,
            entityType,
            content: 'Спробував це вино на дегустації. Додаю свій аудіовідгук:',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            audioDuration: 12.5,
            author: { id: 'user-2', name: 'Марія Петренко', avatarUrl: null },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ];
        localStorage.setItem(mockCommentsKey, JSON.stringify(defaultMocks));
        setComments(defaultMocks);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    return () => {
      stopRecordingAndCleanup();
    };
  }, [entityId, entityType]);

  const stopRecordingAndCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Початок запису аудіо
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Зупиняємо всі треки стріму
        stream.getTracks().forEach(track => track.stop());
      };

      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(200); // збір даних кожні 200мс
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('Помилка доступу до мікрофона:', err);
      alert('Не вдалося отримати доступ до мікрофона. Перевірте дозволи.');
    }
  };

  // Зупинка запису
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Скасування запису
  const cancelRecording = () => {
    stopRecordingAndCleanup();
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // Завантаження аудіо на S3
  const uploadAudioToS3 = async (blob: Blob): Promise<string> => {
    setIsUploading(true);
    try {
      const fileName = `comment_${entityType}_${entityId}_${Date.now()}.webm`;
      const contentType = blob.type;

      // 1. Отримуємо presigned URL з бекенду
      let uploadUrl = '';
      let fileUrl = '';

      try {
        const response: any = await fetchGraphQL(
          // Тимчасово приводимо тип для сумісності з fetchGraphQL
          { kind: 'Document', definitions: [] } as any, 
          { fileName, contentType }
        );
        uploadUrl = response.getPresignedAudioUploadUrl.uploadUrl;
        fileUrl = response.getPresignedAudioUploadUrl.fileUrl;
      } catch (err) {
        console.warn('Не вдалося отримати presigned URL з API, використовуємо локальний mock-завантажувач:', err);
        // Симуляція завантаження
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return URL.createObjectURL(blob); // Повертаємо локальний URL для демонстрації
      }

      // 2. Робимо PUT запит безпосередньо до S3 сховища
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Помилка завантаження файлу на S3');
      }

      return fileUrl;
    } finally {
      setIsUploading(false);
    }
  };

  // Додавання нового коментаря (текстового або голосового)
  const addComment = async (content?: string, audioDuration?: number) => {
    setError(null);
    try {
      let finalAudioUrl: string | undefined = undefined;

      if (audioBlob) {
        // Якщо є записаний аудіофайл, завантажуємо його на S3
        finalAudioUrl = await uploadAudioToS3(audioBlob);
      }

      const input = {
        entityId,
        entityType,
        content: content || null,
        audioUrl: finalAudioUrl || null,
        audioDuration: audioDuration || (audioBlob ? recordingTime : null),
      };

      let newComment: Comment;

      try {
        const result: any = await fetchGraphQL(
          // Тимчасово приводимо тип для сумісності з fetchGraphQL
          { kind: 'Document', definitions: [] } as any,
          { input }
        );
        newComment = result.createComment;
      } catch (err) {
        console.warn('Не вдалося створити коментар через API, додаємо локально (mock mode):', err);
        // Локальний mock-коментар
        newComment = {
          id: `mock-${Date.now()}`,
          entityId,
          entityType,
          content: input.content,
          audioUrl: input.audioUrl,
          audioDuration: input.audioDuration,
          author: {
            id: 'current-user',
            name: 'Ви (Гість WineLore)',
            avatarUrl: null,
          },
          createdAt: new Date().toISOString(),
        };
      }

      const updated = [newComment, ...comments];
      setComments(updated);

      // Оновлюємо mock у localStorage
      localStorage.setItem(mockCommentsKey, JSON.stringify(updated));

      // Очищення аудіо після успішної відправки
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

      return true;
    } catch (err: any) {
      setError(err.message || 'Не вдалося додати коментар');
      return false;
    }
  };

  return {
    comments,
    loading,
    error,
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    isUploading,
    startRecording,
    stopRecording,
    cancelRecording,
    addComment,
    refreshComments: fetchComments,
  };
}
