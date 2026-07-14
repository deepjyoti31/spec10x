'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { api, CollectionDetailResponse, InterviewResponse } from '@/lib/api';

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [collection, setCollection] = useState<CollectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allInterviews, setAllInterviews] = useState<InterviewResponse[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getCollection(token, params.id);
      setCollection(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => {
    if (authLoading) return;
    void fetchCollection();
  }, [authLoading, fetchCollection]);

  async function openPicker() {
    if (!token) return;
    setShowPicker(true);
    try {
      const rows = await api.listInterviews(token);
      setAllInterviews(rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load interviews', 'error');
    }
  }

  async function handleAdd(interviewId: string) {
    if (!token) return;
    setBusyId(interviewId);
    try {
      const detail = await api.addCollectionInterviews(token, params.id, [interviewId]);
      setCollection(detail);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add interview', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(interviewId: string) {
    if (!token) return;
    setBusyId(interviewId);
    try {
      await api.removeCollectionInterview(token, params.id, interviewId);
      await fetchCollection();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove interview', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteCollection() {
    if (!token || !collection) return;
    if (!window.confirm(`Delete the collection "${collection.name}"? Interviews themselves are not deleted.`)) {
      return;
    }
    try {
      await api.deleteCollection(token, params.id);
      router.push('/collections');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete collection', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-12" style={{ backgroundColor: '#111319' }}>
        <p className="text-sm" style={{ color: '#8c909f' }}>Loading collection...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex-1 p-12" style={{ backgroundColor: '#111319' }}>
        <p className="text-sm" style={{ color: '#ffb4ab' }}>{error ?? 'Collection not found'}</p>
        <Link href="/collections" className="mt-4 inline-block text-xs" style={{ color: '#afc6ff' }}>
          ← Back to collections
        </Link>
      </div>
    );
  }

  const memberIds = new Set(collection.interviews.map((interview) => interview.id));
  const pickerCandidates = allInterviews.filter((interview) => !memberIds.has(interview.id));

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-5xl space-y-8 px-12 pb-16 pt-10">
        <Link href="/collections" className="text-xs" style={{ color: '#8c909f' }}>
          ← Collections
        </Link>

        <section className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">{collection.name}</h1>
            <p className="text-sm" style={{ color: '#c2c6d6' }}>
              {collection.description || 'No description yet.'}
            </p>
          </div>
          <button
            type="button"
            className="flex-shrink-0 text-xs font-bold"
            style={{ color: '#ffb4ab' }}
            onClick={() => {
              void handleDeleteCollection();
            }}
          >
            Delete collection
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#c2c6d6' }}>
              Interviews ({collection.interviews.length})
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold"
              style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
              onClick={() => {
                void openPicker();
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                add
              </span>
              Add interviews
            </button>
          </div>

          {collection.interviews.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)', color: '#8c909f' }}
            >
              No interviews in this collection yet.
            </div>
          ) : (
            <div className="space-y-2">
              {collection.interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
                >
                  <Link
                    href={`/interview/${interview.id}`}
                    className="text-sm text-[#e2e2eb] hover:text-[#afc6ff]"
                  >
                    {interview.filename}
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === interview.id}
                    className="text-xs disabled:opacity-50"
                    style={{ color: '#8c909f' }}
                    onClick={() => {
                      void handleRemove(interview.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {showPicker ? (
          <section
            className="space-y-2 rounded-xl p-5"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#5A5C66' }}>
                Add an interview
              </h3>
              <button
                type="button"
                className="text-xs"
                style={{ color: '#8c909f' }}
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>
            {pickerCandidates.length === 0 ? (
              <p className="py-4 text-xs" style={{ color: '#8c909f' }}>
                Every interview is already in this collection.
              </p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {pickerCandidates.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between rounded px-3 py-2 text-xs"
                    style={{ backgroundColor: '#161820' }}
                  >
                    <span className="text-[#c8cad6]">{interview.filename}</span>
                    <button
                      type="button"
                      disabled={busyId === interview.id}
                      className="font-bold disabled:opacity-50"
                      style={{ color: '#afc6ff' }}
                      onClick={() => {
                        void handleAdd(interview.id);
                      }}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
