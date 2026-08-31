import { useState, type FormEvent } from 'react';
import type { Note } from '../../lib/types';
import { deleteNote, insertNote, updateNote } from '../../lib/repository';
import { useConfirm } from '../../contexts/ConfirmContext';

interface NoteFormProps {
  note?: Note;
  onDone: () => void;
}

export function NoteForm({ note, onDone }: NoteFormProps) {
  const confirmDialog = useConfirm();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const input = { title: title || 'Untitled', content };
      if (note) {
        await updateNote(note.id, input);
      } else {
        await insertNote(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    if (!(await confirmDialog('Delete this note?'))) return;
    setPending(true);
    try {
      await deleteNote(note.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="note-title">Title</label>
        <input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
      </div>
      <div className="field">
        <label htmlFor="note-content">Note</label>
        <textarea
          id="note-content"
          className="noteTextarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Write your budget notes here…"
        />
      </div>
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {note ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {note ? 'Save' : 'Add note'}
        </button>
      </div>
    </form>
  );
}
