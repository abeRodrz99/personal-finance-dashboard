import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/primitives/Card';
import { Dialog } from '../components/primitives/Dialog';
import { NoteForm } from '../components/forms/NoteForm';
import { listNotes } from '../lib/repository';
import type { Note } from '../lib/types';
import './Notes.css';

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dialogNote, setDialogNote] = useState<Note | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setNotes(await listNotes());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function close() {
    setDialogNote(null);
    load();
  }

  return (
    <Shell title="Notes" showBack>
      <Card
        title="Budget notes"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogNote('new')}>
            + Add
          </button>
        }
      >
        {loading && <p className="cardEmpty">Loading…</p>}
        {!loading && notes.length === 0 && (
          <p className="cardEmpty">No notes yet. Jot down budget plans, reminders, or anything else here.</p>
        )}
      </Card>

      {!loading && notes.length > 0 && (
        <div className="notesGrid">
          {notes.map((note) => (
            <button key={note.id} type="button" className="noteCard" onClick={() => setDialogNote(note)}>
              <span className="noteCardTitle">{note.title}</span>
              <span className="noteCardBody">{note.content || 'No content yet.'}</span>
              <span className="noteCardDate">{new Date(note.updated_at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogNote !== null} onClose={close} title={dialogNote === 'new' ? 'Add note' : 'Edit note'}>
        {dialogNote && <NoteForm note={dialogNote === 'new' ? undefined : dialogNote} onDone={close} />}
      </Dialog>
    </Shell>
  );
}
