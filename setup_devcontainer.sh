#!/bin/bash

# Quick DevContainer Setup Script for Backbone Development
# Usage: bash setup-devcontainer.sh [project_name]

set -e

PROJECT_NAME=${1:-"my_project"}

echo "🚀 Setting up DevContainer environment for project: $PROJECT_NAME"
echo "=================================================="

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p .devcontainer
mkdir -p {src,tests,docs,scripts,config,migrations}
mkdir -p {src/{api,models,services,utils},tests/{unit,integration}}

# Create devcontainer.json - WORKING VERSION (NO HARDCODED CREDENTIALS)
echo "⚙️  Creating devcontainer.json..."
cat > .devcontainer/devcontainer.json << 'EOF'
{
  "name": "Backbone Development Environment",
  "image": "mcr.microsoft.com/devcontainers/python:1-3.12-bullseye",
  
  "runArgs": [
    "--init",
    "--env-file",
    "${localWorkspaceFolder}/.env"
  ],

  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "nodeGypDependencies": true,
      "version": "lts"
    },
    "ghcr.io/devcontainers/features/git:1": {
      "ppa": true,
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/github-cli:1": {
      "installDirectlyFromGitHubRelease": true,
      "version": "latest"
    }
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.black-formatter",
        "ms-python.isort",
        "ms-python.flake8",
        "ms-vscode.vscode-typescript-next",
        "ms-vscode.vscode-eslint",
        "esbenp.prettier-vscode",
        "ckolkman.vscode-postgres",
        "mtxr.sqltools",
        "mtxr.sqltools-driver-pg",
        "ms-vscode.vscode-json",
        "redhat.vscode-yaml",
        "eamodio.gitlens"
      ],
      
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "python.linting.enabled": true,
        "python.linting.flake8Enabled": true,
        "[python]": {
          "editor.defaultFormatter": "ms-python.black-formatter",
          "editor.formatOnSave": true,
          "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
          }
        },
        "[javascript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
          "editor.formatOnSave": true
        },
        "[typescript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
          "editor.formatOnSave": true
        },
        "editor.rulers": [88, 120],
        "files.trimTrailingWhitespace": true,
        "files.insertFinalNewline": true,
        "terminal.integrated.defaultProfile.linux": "bash",
        "sqltools.connections": [
          {
            "name": "Backbone Development DB",
            "driver": "PostgreSQL",
            "server": "${env:DATABASE_HOST}",
            "port": "${env:DATABASE_PORT}",
            "database": "${env:DATABASE_NAME}",
            "username": "${env:DATABASE_USER}",
            "password": "${env:DATABASE_PASSWORD}",
            "connectionTimeout": 30
          }
        ]
      }
    }
  },

  "forwardPorts": [3000, 5000, 8000, 8080],
  
  "portsAttributes": {
    "3000": {
      "label": "Frontend Dev Server",
      "onAutoForward": "notify"
    },
    "5000": {
      "label": "Python/Flask App", 
      "onAutoForward": "notify"
    },
    "8000": {
      "label": "Python/Django App",
      "onAutoForward": "notify"  
    },
    "8080": {
      "label": "Alternative Web Server",
      "onAutoForward": "notify"
    }
  },

  "remoteUser": "vscode",
  "containerUser": "vscode",
  "shutdownAction": "stopContainer",
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/${localWorkspaceFolderBasename},type=bind,consistency=cached",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}"
}
EOF

# Create .env.template for reference
echo "📝 Creating .env.template..."
cat > .env.template << EOF
# Database Configuration
POSTGRES_DB=your_database_name
POSTGRES_USER=your_database_user
POSTGRES_PASSWORD=your_database_password
POSTGRES_PORT=5433

# DevContainer Database Connection
DATABASE_HOST=host.docker.internal
DATABASE_PORT=5433
DATABASE_NAME=your_database_name
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password

# Project Configuration
PROJECT_SCHEMA=$PROJECT_NAME
NODE_ENV=development
PYTHONPATH=/workspaces
EOF

# Create database test file (reads from environment)
echo "📄 Creating database test..."
cat > test_db.py << 'EOF'
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
EOF

# Create requirements.txt
echo "📄 Creating requirements.txt..."
cat > requirements.txt << 'EOF'
# Core web framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-dotenv>=1.0.0

# Database
sqlalchemy>=2.0.0
alembic>=1.13.0
psycopg2-binary>=2.9.0
asyncpg>=0.29.0

# HTTP client
httpx>=0.25.0
requests>=2.31.0

# Development dependencies
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-asyncio>=0.21.0
black>=23.9.0
isort>=5.12.0
flake8>=6.1.0
mypy>=1.7.0
pre-commit>=3.5.0

# Data processing
pandas>=2.1.0
python-multipart>=0.0.6
EOF

# Create package.json
echo "📄 Creating package.json..."
cat > package.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "Backbone development project: $PROJECT_NAME",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.9.0",
    "typescript": "^5.2.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.3.0"
  }
}
EOF

# Create .gitignore
echo "📄 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
__pycache__/
*.py[cod]
*$py.class

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.db
*.sqlite

# Coverage reports
htmlcov/
.coverage
.pytest_cache/

# Jupyter Notebook
.ipynb_checkpoints

# Cache
.cache/
.mypy_cache/
.pytest_cache/
EOF

echo ""
echo "🎉 DevContainer setup completed successfully!"
echo ""
echo "📁 Created structure for project: $PROJECT_NAME"
echo "📋 Files created:"
echo "   • .devcontainer/devcontainer.json (secure configuration)"
echo "   • .env.template (template for environment variables)"
echo "   • test_db.py (database connection tester)"
echo "   • requirements.txt (Python dependencies)"
echo "   • package.json (Node.js dependencies)"
echo "   • .gitignore (includes .env to prevent credential leaks)"
echo ""
echo "📝 Next steps:"
echo "   1. ⚠️  COPY .env.template to .env: cp .env.template .env"
echo "   2. ⚠️  EDIT .env file with your actual database credentials"
echo "   3. Open this folder in VS Code: code ."
echo "   4. Press Ctrl+Shift+P → 'Dev Containers: Reopen in Container'"
echo "   5. Wait for setup to complete"
echo "   6. Test connection: python3 test_db.py"
echo ""
echo "🔒 Security improvements:"
echo "   • No hardcoded credentials anywhere"
echo "   • No .env file created - you must create it manually"
echo "   • .env file added to .gitignore to prevent credential leaks"
echo "   • VS Code SQL extension uses environment variables"
echo ""
echo "⚠️  REMEMBER: Create .env from template and add your credentials!"
echo "🚀 This version is completely secure - no credentials included!"
