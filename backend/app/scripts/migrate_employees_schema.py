import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'nexaerp.db')
print(f"Connecting to {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()
existing_cols = {col[1] for col in cur.execute('PRAGMA table_info(employees)').fetchall()}

new_columns = [
    ('gender', 'VARCHAR(20)'),
    ('date_of_birth', 'DATE'),
    ('marital_status', 'VARCHAR(20)'),
    ('current_address', 'TEXT'),
    ('permanent_address', 'TEXT'),
    ('emergency_contact_name', 'VARCHAR(100)'),
    ('emergency_contact_phone', 'VARCHAR(30)'),
    ('emergency_contact_relation', 'VARCHAR(50)'),
    ('employment_type', 'VARCHAR(50) DEFAULT "Full-Time"'),
    ('work_mode', 'VARCHAR(30) DEFAULT "In-Office"'),
    ('branch_location', 'VARCHAR(100)'),
    ('reporting_manager', 'VARCHAR(100)'),
    ('hra', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('conveyance_allowance', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('special_allowance', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('medical_allowance', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('variable_pay', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('pf_deduction', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('professional_tax', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('tds_tax', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('net_salary', 'NUMERIC(12, 2) DEFAULT 0.00'),
    ('bank_name', 'VARCHAR(100)'),
    ('account_holder_name', 'VARCHAR(100)'),
    ('account_type', 'VARCHAR(30) DEFAULT "Savings"'),
    ('aadhaar_id', 'VARCHAR(50)'),
    ('uan_number', 'VARCHAR(50)'),
    ('documents_json', 'TEXT'),
    ('notes', 'TEXT')
]

added = 0
for col_name, col_type in new_columns:
    if col_name not in existing_cols:
        cur.execute(f'ALTER TABLE employees ADD COLUMN {col_name} {col_type}')
        print(f'Added column: {col_name}')
        added += 1

conn.commit()
print(f"Migration completed. Added {added} columns. Total columns: {len(cur.execute('PRAGMA table_info(employees)').fetchall())}")
conn.close()
