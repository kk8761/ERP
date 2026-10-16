import sqlite3
import sys
sys.path.append('backend')
from app.auth.security import verify_password, hash_password

con = sqlite3.connect('nexaerp.db')
cursor = con.cursor()
row = cursor.execute("SELECT email, password_hash FROM users WHERE email='admin@nexaerp.internal'").fetchone()
print("Found admin:", row[0] if row else "None")
if row:
    print("Hash starts with:", row[1][:15])
    matches = verify_password("Admin@NexaERP2026!", row[1])
    print("Matches 'Admin@NexaERP2026!':", matches)
    if not matches:
        print("Re-hashing Admin@NexaERP2026! and updating DB...")
        new_hash = hash_password("Admin@NexaERP2026!")
        cursor.execute("UPDATE users SET password_hash = ? WHERE email = 'admin@nexaerp.internal'", (new_hash,))
        con.commit()
        print("Updated password hash for admin successfully.")

# Also ensure demo users have valid hashes
demo_passes = [
    ("cashier@nexaerp.internal", "Cashier@12345"),
    ("inventory@nexaerp.internal", "Inventory@12345"),
    ("accountant@nexaerp.internal", "Account@12345"),
    ("hr@nexaerp.internal", "Hr@12345")
]
for em, pw in demo_passes:
    r = cursor.execute("SELECT password_hash FROM users WHERE email=?", (em,)).fetchone()
    if r:
        if not verify_password(pw, r[0]):
            cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hash_password(pw), em))
            con.commit()
            print(f"Updated password for {em}")

con.close()
