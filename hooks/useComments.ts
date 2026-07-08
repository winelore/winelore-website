/* eslint-disable no-console */
'use client';

import { useState, useEffect, useRef } from 'react';
import { parse } from 'graphql';
import { fetchGraphQL } from '@/lib/apiClient';
import {
  GetEvaluationCommentsDocument,
  SubmitEvaluationForCommentsDocument,
  UpdateEvaluationCommentsDocument,
  type EvaluationCommentInput,
  type CommissionReplicaCandidateStatus,
  type SubmitEvaluationForCommentsMutationVariables,
  type UpdateEvaluationCommentsMutationVariables,
} from '@/src/gql/graphql';

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
  audioStorageUrl?: string | null;
  audioDuration?: number | null;
  author: CommentAuthor;
  createdAt: string;
}

const CLOSED_EVALUATION_MESSAGE = 'Етап оцінювання для цього кандидата вже закритий. Коментарі можна додавати лише у статусі PENDING.';
const EVALUATION_NOT_FOUND_MESSAGE = 'Evaluation with requested id not found';
const EVALUATION_SYNC_MESSAGE = 'Не вдалося знайти попереднє оцінювання для цього кандидата. Оновіть сторінку або поверніть кандидата у статус PENDING і спробуйте ще раз.';
const LOCAL_AUDIO_URL_PREFIX = 'local-audio://';
const LOCAL_AUDIO_STORAGE_PREFIX = 'comment_audio_';

const GET_EVALUATIONS_FOR_COMMENTS = parse(`
  query GetEvaluationsForComments($candidateId: ID!) {
    evaluationsByReplicaCandidate(replicaCandidateId: $candidateId, limit: 20) {
      items {
        id
        evaluatorAuid
        status
        comments {
          id
          propertyId
          text
          voiceUrl
          sortOrder
          createdAt
        }
      }
    }
  }
`);

function logUndefinedFields(value: unknown, path = 'variables') {
  if (!value || typeof value !== 'object') return;

  Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
    const fieldPath = `${path}.${key}`;

    if (nestedValue === undefined) {
      console.warn(`[useComments] ${fieldPath} is undefined`);
      return;
    }

    if (Array.isArray(nestedValue)) {
      nestedValue.forEach((item, index) => logUndefinedFields(item, `${fieldPath}[${index}]`));
      return;
    }

    logUndefinedFields(nestedValue, fieldPath);
  });
}

function mapEvaluationCommentsToComments(
  evaluationComments: any[] | null | undefined,
  entityId: string,
  entityType: string,
  audioDurationsByUrl = new Map<string, number>()
): Comment[] {
  const mappedComments: Comment[] = (evaluationComments || []).map((c: any) => {
    const localAudio = getLocalAudio(c.voiceUrl);

    return {
      id: c.id,
      entityId,
      entityType,
      content: c.text,
      audioUrl: localAudio?.dataUrl || c.voiceUrl,
      audioStorageUrl: c.voiceUrl,
      audioDuration: c.voiceUrl
        ? audioDurationsByUrl.get(c.voiceUrl) ?? localAudio?.duration ?? null
        : null,
      author: {
        id: 'expert',
        name: 'Expert',
        avatarUrl: null,
      },
      createdAt: c.createdAt || new Date().toISOString(),
    };
  });

  mappedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return mappedComments;
}

function getCurrentActorAuid() {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('auid='));
  const auid = cookie ? Number(decodeURIComponent(cookie.split('=')[1])) : NaN;

  return Number.isFinite(auid) ? auid : null;
}

function getLocalAudioStorageKey(storageUrl: string | null | undefined) {
  if (!storageUrl?.startsWith(LOCAL_AUDIO_URL_PREFIX)) return null;

  return `${LOCAL_AUDIO_STORAGE_PREFIX}${storageUrl.slice(LOCAL_AUDIO_URL_PREFIX.length)}`;
}

function getLocalAudio(storageUrl: string | null | undefined) {
  if (typeof window === 'undefined') return null;

  const storageKey = getLocalAudioStorageKey(storageUrl);
  if (!storageKey) return null;

  try {
    const storedAudio = window.localStorage.getItem(storageKey);
    if (!storedAudio) return null;

    const parsed = JSON.parse(storedAudio) as { dataUrl?: string; duration?: number };
    if (!parsed.dataUrl) return null;

    return {
      dataUrl: parsed.dataUrl,
      duration: typeof parsed.duration === 'number' && Number.isFinite(parsed.duration) ? parsed.duration : null,
    };
  } catch (error) {
    console.warn('Не вдалося прочитати локальний аудіокоментар:', error);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Не вдалося підготувати аудіо для локального збереження'));
    };

    reader.onerror = () => reject(new Error('Не вдалося прочитати аудіофайл'));
    reader.readAsDataURL(blob);
  });
}

function isCurrentActorEvaluation(evaluation: any, currentActorAuid: number | null) {
  if (currentActorAuid === null) return false;

  const evaluatorAuid = evaluation?.evaluatorAuid;

  if (Array.isArray(evaluatorAuid)) {
    return evaluatorAuid.includes(currentActorAuid);
  }

  return evaluatorAuid === currentActorAuid;
}

function isEvaluationNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  return message.toLowerCase().includes(EVALUATION_NOT_FOUND_MESSAGE.toLowerCase());
}

function isCandidateNotPendingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  return message.toLowerCase().includes('status is not pending');
}

export function useComments(
  entityId: string,
  entityType: string,
  candidateStatus?: CommissionReplicaCandidateStatus | null
) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);

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
  const localCommentsKey = `comments_${entityType}_${entityId}`;
  const canAddComment = candidateStatus === 'PENDING';

  // Завантаження коментарів
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const candidateId = entityId?.trim();

      if (!candidateId) {
        throw new Error('Не вдалося завантажити коментарі: candidateId порожній або undefined');
      }

      const variables = { candidateId };
      console.log('🔍 Fetching comments with variables:', variables);
      logUndefinedFields(variables);

      const result = await fetchGraphQL(GetEvaluationCommentsDocument, variables);
      let evaluation = result?.evaluationByReplicaCandidateAndEvaluator;

      if (!evaluation) {
        const evaluationsResult: any = await fetchGraphQL(GET_EVALUATIONS_FOR_COMMENTS as any, variables);
        const evaluations = evaluationsResult?.evaluationsByReplicaCandidate?.items || [];
        evaluation = evaluations.find((item: any) => isCurrentActorEvaluation(item, getCurrentActorAuid())) || null;
      }

      if (evaluation) {
        setEvaluationId(evaluation.id);
        setComments(mapEvaluationCommentsToComments(evaluation.comments, entityId, entityType));
      } else {
        setEvaluationId(null);
        const savedComments = window.localStorage.getItem(localCommentsKey);
        setComments(savedComments ? JSON.parse(savedComments) : []);
      }
    } catch (e: any) {
      console.error('Помилка завантаження коментарів:', e);
      setError(e.message || 'Не вдалося завантажити коментарі з сервера');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    return () => {
      stopRecordingAndCleanup();
    };
  }, [entityId, entityType, candidateStatus]);

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

  // Підготовка локально відновлюваного URL для голосового коментаря
  const prepareAudioUrl = async (blob: Blob, duration: number): Promise<string> => {
    setIsUploading(true);
    try {
      const localAudioId = `${entityType}_${entityId}_${Date.now()}`;
      const storageUrl = `${LOCAL_AUDIO_URL_PREFIX}${localAudioId}`;
      const dataUrl = await blobToDataUrl(blob);

      window.localStorage.setItem(
        `${LOCAL_AUDIO_STORAGE_PREFIX}${localAudioId}`,
        JSON.stringify({ dataUrl, duration })
      );

      return storageUrl;
    } finally {
      setIsUploading(false);
    }
  };

  // Додавання нового коментаря (текстового або голосового)
  const addComment = async (content?: string, audioDuration?: number) => {
    setError(null);
    try {
      if (!canAddComment) {
        setError(CLOSED_EVALUATION_MESSAGE);
        return false;
      }

      let finalAudioUrl: string | undefined = undefined;
      const normalizedAudioDuration = audioBlob
        ? Math.max(1, Math.round(audioDuration || recordingTime || 0))
        : null;

      if (audioBlob) {
        finalAudioUrl = await prepareAudioUrl(audioBlob, normalizedAudioDuration || 1);
      }

      const candidateId = entityId?.trim();

      if (!candidateId) {
        throw new Error('Не вдалося зберегти коментар: candidateId порожній або undefined');
      }

      const newCommentInput: EvaluationCommentInput = {
        propertyId: null,
        text: content || null,
        voiceUrl: finalAudioUrl || null,
        sortOrder: comments.length + 1
      };

      const existingCommentsInput: EvaluationCommentInput[] = comments.map((c, index) => ({
        propertyId: null,
        text: c.content || null,
        voiceUrl: c.audioStorageUrl || c.audioUrl || null,
        sortOrder: index + 1
      }));

      const allCommentsInput: EvaluationCommentInput[] = [...existingCommentsInput, newCommentInput];
      let updatedComments: any[] = [];

      const submitEvaluationWithComments = async () => {
        const variables: SubmitEvaluationForCommentsMutationVariables = {
          input: {
            candidateId,
            scores: [],
            comments: allCommentsInput
          }
        };

        console.log('📤 SubmitEvaluationForComments variables:', variables);
        logUndefinedFields(variables);

        const result = await fetchGraphQL(SubmitEvaluationForCommentsDocument, variables);
        setEvaluationId(result.submitEvaluation.id);
        return result.submitEvaluation.comments || [];
      };

      console.log('📤 Sending comment mutation variables:', {
        evaluationId,
        candidateId,
        allCommentsInput
      });

      if (evaluationId?.trim()) {
        // Оновлюємо коментарі для існуючої оцінки
        const variables: UpdateEvaluationCommentsMutationVariables = {
          input: {
            id: evaluationId.trim(),
            comments: allCommentsInput
          }
        };

        console.log('📤 UpdateEvaluationComments variables:', variables);
        logUndefinedFields(variables);

        try {
          const result = await fetchGraphQL(UpdateEvaluationCommentsDocument, variables);
          updatedComments = result.updateEvaluationComments.comments || [];
        } catch (updateError: any) {
          if (!isEvaluationNotFoundError(updateError)) {
            throw updateError;
          }

          setEvaluationId(null);
          try {
            updatedComments = await submitEvaluationWithComments();
          } catch (submitAfterMissingEvaluationError) {
            if (isCandidateNotPendingError(submitAfterMissingEvaluationError)) {
              throw new Error(CLOSED_EVALUATION_MESSAGE);
            }

            if (isEvaluationNotFoundError(submitAfterMissingEvaluationError)) {
              throw new Error(EVALUATION_SYNC_MESSAGE);
            }

            throw submitAfterMissingEvaluationError;
          }
        }
      } else {
        // Створюємо оцінку з коментарями
        try {
          updatedComments = await submitEvaluationWithComments();
        } catch (submitError: any) {
          if (isCandidateNotPendingError(submitError)) {
            throw new Error(CLOSED_EVALUATION_MESSAGE);
          }

          if (isEvaluationNotFoundError(submitError)) {
            setEvaluationId(null);
            throw new Error(EVALUATION_SYNC_MESSAGE);
          }

          throw submitError;
        }
      }

      const audioDurationsByUrl = new Map<string, number>();

      if (finalAudioUrl && normalizedAudioDuration) {
        audioDurationsByUrl.set(finalAudioUrl, normalizedAudioDuration);
      }

      setComments(mapEvaluationCommentsToComments(updatedComments, entityId, entityType, audioDurationsByUrl));

      // Очищення аудіо після успішної відправки
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

      return true;
    } catch (err: any) {
      console.error('Помилка збереження коментаря:', err);
      if (isCandidateNotPendingError(err)) {
        setError(CLOSED_EVALUATION_MESSAGE);
        return false;
      }

      if (isEvaluationNotFoundError(err)) {
        setEvaluationId(null);
        setError(EVALUATION_SYNC_MESSAGE);
        return false;
      }

      setError(err.message || 'Не вдалося зберегти коментар на сервері');
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
    canAddComment,
    closedEvaluationMessage: CLOSED_EVALUATION_MESSAGE,
    refreshComments: fetchComments,
  };
}
