/**
 * Spec10x - useInterviews Hook
 *
 * Drives the dynamic interviews library page, including fetch, selection,
 * upload, sample data bootstrapping, and bulk actions.
 */

'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { useAuth } from './useAuth';
import {
  api,
  InterviewBulkResultResponse,
  InterviewLibraryDisplayStatus,
  InterviewLibraryQuery,
  InterviewLibraryResponse,
  InterviewResponse,
  InterviewLibrarySort,
} from '@/lib/api';

const FILE_TYPE_BY_EXTENSION = {
  txt: 'text/plain',
  md: 'text/markdown',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
} as const;

export const INTERVIEW_UPLOAD_ACCEPT = Object.keys(FILE_TYPE_BY_EXTENSION)
  .map((ext) => `.${ext}`)
  .join(',');

type SupportedInterviewFileType = keyof typeof FILE_TYPE_BY_EXTENSION;

type MutationKind = 'upload' | 'reanalyze' | 'delete' | 'sample' | null;

interface UseInterviewsOptions {
  q?: string;
  sort?: InterviewLibrarySort;
  status?: InterviewLibraryDisplayStatus | null;
  source?: string | null;
}

interface UploadOutcome {
  createdIds: string[];
  failedFiles: Array<{ name: string; error: string }>;
}

interface UseInterviewsReturn {
  library: InterviewLibraryResponse | null;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  mutationKind: MutationKind;
  sampleDataLoading: boolean;
  uploading: boolean;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  selectAllVisible: () => void;
  refetch: () => Promise<void>;
  uploadFiles: (files: File[]) => Promise<UploadOutcome>;
  reanalyzeInterview: (id: string) => Promise<InterviewResponse>;
  bulkReanalyze: () => Promise<InterviewBulkResultResponse>;
  bulkDelete: () => Promise<InterviewBulkResultResponse>;
  loadSampleData: () => Promise<void>;
}

function buildRequestKey(filters: UseInterviewsOptions): string {
  return JSON.stringify({
    q: filters.q ?? '',
    sort: filters.sort ?? 'recent',
    status: filters.status ?? null,
    source: filters.source ?? null,
  });
}

function parseRequestKey(key: string): InterviewLibraryQuery {
  return JSON.parse(key) as InterviewLibraryQuery;
}

function getFileExtension(filename: string): SupportedInterviewFileType | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  if (extension in FILE_TYPE_BY_EXTENSION) {
    return extension as SupportedInterviewFileType;
  }
  return null;
}

function buildUploadContentType(file: File, extension: SupportedInterviewFileType): string {
  return file.type || FILE_TYPE_BY_EXTENSION[extension];
}

async function uploadFileToSignedUrl(uploadUrl: string, file: File, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${file.name}`);
  }
}

export function useInterviews(filters: UseInterviewsOptions): UseInterviewsReturn {
  const { token } = useAuth();
  const [library, setLibrary] = useState<InterviewLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mutationKind, setMutationKind] = useState<MutationKind>(null);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);

  const requestKey = buildRequestKey(filters);

  const fetchLibrary = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextLibrary = await api.getInterviewLibrary(token, parseRequestKey(requestKey));
      setLibrary(nextLibrary);
      setSelectedIds((prev) => {
        const visibleIds = new Set(nextLibrary.items.map((item) => item.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (visibleIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, [requestKey, token]);

  useEffect(() => {
    if (!token) return;
    void fetchLibrary();
  }, [fetchLibrary, token]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(library?.items.map((item) => item.id) ?? []));
  }, [library]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!token) {
        throw new Error('You must be signed in to upload interviews');
      }

      const createdIds: string[] = [];
      const failedFiles: Array<{ name: string; error: string }> = [];

      setMutationKind('upload');
      try {
        for (const file of files) {
          const extension = getFileExtension(file.name);
          if (!extension) {
            failedFiles.push({
              name: file.name,
              error: 'Unsupported file type',
            });
            continue;
          }

          try {
            const contentType = buildUploadContentType(file, extension);
            const uploadUrl = await api.getUploadUrl(token, {
              filename: file.name,
              content_type: contentType,
              file_size_bytes: file.size,
            });

            await uploadFileToSignedUrl(uploadUrl.upload_url, file, contentType);

            const interview = await api.createInterview(token, {
              filename: file.name,
              file_type: extension,
              file_size_bytes: file.size,
              storage_path: uploadUrl.storage_path,
            });
            createdIds.push(interview.id);
          } catch (err) {
            failedFiles.push({
              name: file.name,
              error: err instanceof Error ? err.message : 'Upload failed',
            });
          }
        }

        await fetchLibrary();
        return { createdIds, failedFiles };
      } finally {
        setMutationKind(null);
      }
    },
    [fetchLibrary, token]
  );

  const reanalyzeInterview = useCallback(
    async (id: string) => {
      if (!token) {
        throw new Error('You must be signed in to re-analyze interviews');
      }

      setMutationKind('reanalyze');
      try {
        const result = await api.reanalyzeInterview(token, id);
        await fetchLibrary();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return result;
      } finally {
        setMutationKind(null);
      }
    },
    [fetchLibrary, token]
  );

  const bulkReanalyze = useCallback(async () => {
    if (!token) {
      throw new Error('You must be signed in to re-analyze interviews');
    }
    const ids = Array.from(selectedIds);
    setMutationKind('reanalyze');
    try {
      const result = await api.bulkReanalyzeInterviews(token, ids);
      await fetchLibrary();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        result.succeeded_ids.forEach((id) => next.delete(id));
        return next;
      });
      return result;
    } finally {
      setMutationKind(null);
    }
  }, [fetchLibrary, selectedIds, token]);

  const bulkDelete = useCallback(async () => {
    if (!token) {
      throw new Error('You must be signed in to delete interviews');
    }
    const ids = Array.from(selectedIds);
    setMutationKind('delete');
    try {
      const result = await api.bulkDeleteInterviews(token, ids);
      await fetchLibrary();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        result.succeeded_ids.forEach((id) => next.delete(id));
        return next;
      });
      return result;
    } finally {
      setMutationKind(null);
    }
  }, [fetchLibrary, selectedIds, token]);

  const loadSampleData = useCallback(async () => {
    if (!token) {
      throw new Error('You must be signed in to load sample data');
    }

    setSampleDataLoading(true);
    setMutationKind('sample');
    try {
      await api.loadSampleData(token);
      await fetchLibrary();
    } finally {
      setSampleDataLoading(false);
      setMutationKind(null);
    }
  }, [fetchLibrary, token]);

  return {
    library,
    loading,
    error,
    selectedIds,
    mutationKind,
    sampleDataLoading,
    uploading: mutationKind === 'upload',
    setSelectedIds,
    clearSelection,
    toggleSelection,
    selectAllVisible,
    refetch: fetchLibrary,
    uploadFiles,
    reanalyzeInterview,
    bulkReanalyze,
    bulkDelete,
    loadSampleData,
  };
}
