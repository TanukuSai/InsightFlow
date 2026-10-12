import sqlite3

conn = sqlite3.connect('insightflow.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables:", tables)

for t in tables:
    try:
        c.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = c.fetchone()[0]
        print(f"{t}: {cnt} rows")
    except Exception as e:
        print(f"{t}: error {e}")

c.execute("SELECT id, name, row_count, unique_feedback_count, repeat_feedback_count, status FROM datasets")
for row in c.fetchall():
    print("Dataset:", row)
