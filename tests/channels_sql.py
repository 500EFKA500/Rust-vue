"""Offline SQLite migration tests. Does not launch Tauri or modify a user DB."""
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for migration in sorted((root / 'src-tauri/migrations').glob('*.sql')):
    if migration.name.startswith('0003'):
        db.execute("INSERT INTO messages(author,body) VALUES('Олег','old history')")
        db.commit()
    db.executescript(migration.read_text(encoding='utf-8'))
assert db.execute('SELECT body,channel_id FROM messages').fetchone() == ('old history', 1)
db.execute("INSERT INTO channels(name,owner_id) VALUES('Учёба',1)")
channel = db.execute('SELECT last_insert_rowid()').fetchone()[0]
db.execute('INSERT INTO messages(author,body,channel_id) VALUES(?,?,?)', ('Олег', 'new', channel))
assert db.execute('SELECT count(*) FROM messages WHERE channel_id=1').fetchone()[0] == 1
assert db.execute('SELECT count(*) FROM messages WHERE channel_id=?', (channel,)).fetchone()[0] == 1
for name in ('Учёба', '   ', 'x'*61):
    try:
        db.execute('INSERT INTO channels(name) VALUES(?)', (name,))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('Invalid/duplicate name accepted')
print('PASS: migrations, old history preservation, channel isolation, invalid/duplicate names')
