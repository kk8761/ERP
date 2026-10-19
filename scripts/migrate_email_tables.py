import sqlite3
import os

db_paths = ['nexaerp.db', 'backend/nexaerp.db']

for db_path in db_paths:
    if not os.path.exists(db_path):
        continue
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    print('Checking/Migrating DB:', db_path)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS outgoing_email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_email VARCHAR(150) NOT NULL,
        recipient_name VARCHAR(150),
        document_type VARCHAR(50) NOT NULL,
        document_reference VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'SENT',
        sent_by_user_id INTEGER,
        is_external_party BOOLEAN DEFAULT 1,
        sender_email VARCHAR(150),
        sender_name VARCHAR(150),
        raw_headers TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS received_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_email VARCHAR(150) NOT NULL,
        sender_name VARCHAR(150),
        recipient_email VARCHAR(150) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_text TEXT NOT NULL,
        body_html TEXT,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT 0,
        is_starred BOOLEAN DEFAULT 0,
        category VARCHAR(50) DEFAULT 'GENERAL',
        status VARCHAR(30) DEFAULT 'RECEIVED',
        original_mail_id INTEGER,
        original_message_body TEXT,
        raw_headers TEXT,
        ai_summary TEXT,
        ai_intent VARCHAR(80),
        ai_urgency VARCHAR(30) DEFAULT 'NORMAL',
        ai_extracted_data TEXT,
        ai_suggested_reply TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS email_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recipient_email VARCHAR(255),
        recipient_name VARCHAR(150),
        cc_recipients TEXT,
        bcc_recipients TEXT,
        subject VARCHAR(255),
        body_text TEXT,
        body_html TEXT,
        attachments_data TEXT,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    for table, cols in [
        ('outgoing_email_logs', [
            ('raw_headers', 'TEXT'),
            ('sender_email', 'VARCHAR(150)'),
            ('sender_name', 'VARCHAR(150)'),
            ('cc_recipients', 'TEXT'),
            ('bcc_recipients', 'TEXT'),
            ('attachments_data', 'TEXT'),
            ('priority', "VARCHAR(20) DEFAULT 'NORMAL'")
        ]),
        ('received_emails', [
            ('original_mail_id', 'INTEGER'),
            ('original_message_body', 'TEXT'),
            ('raw_headers', 'TEXT'),
            ('cc_recipients', 'TEXT'),
            ('bcc_recipients', 'TEXT'),
            ('attachments_data', 'TEXT'),
            ('priority', "VARCHAR(20) DEFAULT 'NORMAL'"),
            ('is_trash', 'BOOLEAN DEFAULT 0'),
            ('is_archived', 'BOOLEAN DEFAULT 0')
        ])
    ]:
        for col, col_type in cols:
            try:
                cur.execute(f'ALTER TABLE {table} ADD COLUMN {col} {col_type}')
                print(f'  Added {col} to {table}')
            except Exception:
                pass

    conn.commit()
    conn.close()

print('Email tables migration completed.')
