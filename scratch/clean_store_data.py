import sqlite3

for db_path in ['backend/nexaerp.db', 'nexaerp.db']:
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        print(f"\nCleaning store data in {db_path}...")
        
        # Disable foreign keys temporarily for clean deletion
        c.execute("PRAGMA foreign_keys = OFF;")
        
        # Clear dummy transaction data
        c.execute("DELETE FROM sales_order_items;")
        c.execute("DELETE FROM sales_orders;")
        c.execute("DELETE FROM stock_movements;")
        c.execute("DELETE FROM products;")
        c.execute("DELETE FROM expenses;")
        c.execute("DELETE FROM customers WHERE email LIKE '%@example.com' OR name IN ('Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Rahul Verma', 'Sneha Reddy');")
        
        # Ensure default Walk-in Customer exists
        c.execute("SELECT id FROM customers WHERE name = 'Walk-in Customer'")
        if not c.fetchone():
            c.execute("INSERT INTO customers (name, phone, email, address, total_spend) VALUES ('Walk-in Customer', '0000000000', 'walkin@store.local', 'Retail Counter', 0.0);")
            
        c.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        
        # Verify counts
        c.execute("SELECT COUNT(*) FROM products")
        p_cnt = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM sales_orders")
        s_cnt = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM stock_movements")
        m_cnt = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM customers")
        c_cnt = c.fetchone()[0]
        print(f"  Products remaining: {p_cnt}")
        print(f"  Sales Orders remaining: {s_cnt}")
        print(f"  Stock Movements remaining: {m_cnt}")
        print(f"  Customers remaining: {c_cnt}")
        conn.close()
    except Exception as e:
        print(f"Error cleaning {db_path}: {e}")
