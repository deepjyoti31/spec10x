'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { useToast } from '@/components/ui/Toast';
import { useCollections } from '@/hooks/useCollections';

function CollectionCard({
  id,
  name,
  description,
  interviewCount,
}: {
  id: string;
  name: string;
  description?: string;
  interviewCount: number;
}) {
  return (
    <Link
      href={`/collections/${id}`}
      className="group block rounded-xl p-5 transition-colors"
      style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-[#e2e2eb] group-hover:text-[#afc6ff]">{name}</h3>
        <span
          className="flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(175,198,255,0.1)', color: '#afc6ff' }}
        >
          {interviewCount} {interviewCount === 1 ? 'interview' : 'interviews'}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs" style={{ color: '#8c909f' }}>
        {description || 'No description yet.'}
      </p>
    </Link>
  );
}

export default function CollectionsPage() {
  const { collections, loading, error, createCollection } = useCollections();
  const { showToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCollection(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create collection', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-6xl space-y-8 px-12 pb-16 pt-10">
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Collections</h1>
            <p className="text-sm" style={{ color: '#c2c6d6' }}>
              Group related interviews together — for a workstream, a segment, or a theme you&apos;re tracking.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
            onClick={() => setShowForm((current) => !current)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              add
            </span>
            New Collection
          </button>
        </section>

        {showForm ? (
          <section
            className="space-y-3 rounded-xl p-5"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
          >
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Collection name"
              className="w-full rounded bg-transparent px-3 py-2 text-sm text-[#e2e2eb] outline-none"
              style={{ border: '1px solid #1E2028' }}
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded bg-transparent px-3 py-2 text-sm text-[#e2e2eb] outline-none"
              style={{ border: '1px solid #1E2028' }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs font-bold"
                style={{ color: '#8c909f' }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                disabled={!name.trim() || creating}
                onClick={() => {
                  void handleCreate();
                }}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading collections...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : collections.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
          >
            <p className="text-sm" style={{ color: '#8c909f' }}>
              No collections yet. Group interviews around a workstream to keep them handy.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                id={collection.id}
                name={collection.name}
                description={collection.description}
                interviewCount={collection.interview_count}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
