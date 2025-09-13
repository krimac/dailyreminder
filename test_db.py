#!/usr/bin/env python3
import os
import sys

def install_psycopg2():
    try:
        import psycopg2
        return psycopg2
    except ImportError:
        print("📦 Installing psycopg2-binary...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "psycopg2-binary"])
        import psycopg2
        return psycopg2

def load_env():
    """Load environment variables from .env file if it exists"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        # dotenv not available, environment variables should be set by container
        pass

def test_database_connection():
    load_env()
    psycopg2 = install_psycopg2()
    
    # Try multiple host options
    host_options = [
        os.getenv('DATABASE_HOST', 'host.docker.internal'),
        'host.docker.internal'
    ]
    
    # Get gateway IP as fallback
    try:
        import subprocess
        result = subprocess.run(['ip', 'route', 'show', 'default'], capture_output=True, text=True)
        if result.returncode == 0:
            gateway_ip = result.stdout.split()[2]
            host_options.append(gateway_ip)
    except:
        host_options.extend(['172.17.0.1', '172.18.0.1', '172.24.0.1'])
    
    # Get database configuration from environment variables
    db_config_base = {
        'port': os.getenv('DATABASE_PORT', '5432'),
        'database': os.getenv('DATABASE_NAME', os.getenv('POSTGRES_DB', 'postgres')),
        'user': os.getenv('DATABASE_USER', os.getenv('POSTGRES_USER', 'postgres')),
        'password': os.getenv('DATABASE_PASSWORD', os.getenv('POSTGRES_PASSWORD', '')),
    }
    
    print("🧪 Backbone Development Database Test")
    print("=" * 50)
    print("🔍 Testing database connection...")
    print(f"   🔌 Port: {db_config_base['port']}")
    print(f"   🗄️  Database: {db_config_base['database']}")
    print(f"   👤 User: {db_config_base['user']}")
    print(f"   🔑 Password: {'*' * len(db_config_base['password']) if db_config_base['password'] else 'Not set'}")
    print()
    
    if not db_config_base['password']:
        print("⚠️  Warning: No password found in environment variables")
        print("   Make sure your .env file is properly configured")
        print()
    
    for host in host_options:
        print(f"📡 Trying host: {host}")
        db_config = {**db_config_base, 'host': host}
        
        try:
            conn = psycopg2.connect(**db_config)
            cursor = conn.cursor()
            
            print("✅ Connection successful!")
            
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"📊 PostgreSQL Version:")
            print(f"   {version[0]}")
            
            cursor.execute("SELECT current_database(), current_user;")
            db_info = cursor.fetchone()
            print(f"🗄️  Database Information:")
            print(f"   Database: {db_info[0]}")
            print(f"   User: {db_info[1]}")
            
            cursor.close()
            conn.close()
            
            print(f"\n🎉 Database connection successful!")
            print(f"💡 Working host: {host}")
            return True
            
        except Exception as e:
            print(f"❌ Failed: {str(e)[:50]}...")
            continue
    
    print("❌ All connection attempts failed")
    print("\n🔧 Troubleshooting:")
    print("   1. Check if your database container is running")
    print("   2. Verify your .env file has correct credentials")
    print("   3. Ensure the database is accessible from the container")
    return False

if __name__ == "__main__":
    test_database_connection()
