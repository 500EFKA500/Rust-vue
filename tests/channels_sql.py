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
assert db.execute('SELECT user_id FROM channel_members WHERE channel_id=?', (channel,)).fetchone() == (1,)
db.execute('INSERT INTO channel_members(channel_id,user_id) VALUES(?,2)', (channel,))
assert db.execute('SELECT count(*) FROM channel_members WHERE channel_id=?', (channel,)).fetchone()[0] == 2
db.execute('DELETE FROM channel_members WHERE channel_id=? AND user_id=2', (channel,))
for user, expected in ((1, 1), (2, 0)):
    result = db.execute('INSERT INTO messages(author,body,channel_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM channels c JOIN channel_members m ON m.channel_id=c.id WHERE c.id=? AND c.owner_id=? AND m.user_id=?)', ('test','guarded',channel,channel,user,user))
    assert result.rowcount == expected
print('PASS: owner auto-subscription, join/leave and guarded owner-only publication')
