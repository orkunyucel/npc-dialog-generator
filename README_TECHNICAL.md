# NPC Dialog Generator - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [API Reference](#api-reference)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Architecture](#frontend-architecture)
7. [Security Implementation](#security-implementation)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling](#error-handling)
10. [Known Issues & Bugs](#known-issues--bugs)
11. [Development Guide](#development-guide)
12. [Deployment](#deployment)
13. [Testing](#testing)
14. [Contributing](#contributing)

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client (Browser)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  HTML5 + CSS3 + Vanilla JavaScript              │   │
│  │  - DOM Manipulation                             │   │
│  │  - Fetch API for AJAX                          │   │
│  │  - LocalStorage for persistence                │   │
│  └────────────────────┬────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │ HTTP/HTTPS
┌───────────────────────┼─────────────────────────────────┐
│                       │     Flask Server                 │
│  ┌────────────────────┴────────────────────────────┐   │
│  │              Flask Application                   │   │
│  │  - Route handlers                               │   │
│  │  - CORS middleware                             │   │
│  │  - Session management                          │   │
│  │  - Request validation                          │   │
│  └────────────────────┬────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────┐
│                       │  External APIs                   │
│  ┌────────────────────┴────────────────────────────┐   │
│  │   Google Gemini API    │   Pollinations.ai API  │   │
│  │   (Dialog Generation)  │   (Image Generation)   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client Request** → Flask Route Handler
2. **Validation** → Input sanitization and validation
3. **API Call** → External service integration
4. **Response Processing** → Data formatting
5. **Client Response** → JSON response with appropriate status

## Technical Stack

### Backend Dependencies

```python
Flask==2.3.3          # Web framework
flask-cors==4.0.0     # Cross-origin resource sharing
requests==2.31.0      # HTTP library for API calls
python-dotenv==1.0.0  # Environment variable management
Werkzeug==2.3.7       # WSGI utilities
```

### Frontend Technologies

- **HTML5**: Semantic markup, form validation
- **CSS3**: Flexbox, Grid, CSS animations, CSS variables
- **JavaScript ES6+**: Async/await, Fetch API, Event delegation
- **No frameworks**: Vanilla JavaScript for minimal overhead

### External Services

1. **Google Gemini API**
   - Model: `gemini-1.5-flash`
   - Temperature: 1.2 (normal), 0.9 (dialog mode)
   - Max tokens: 1024 (normal), 256 (dialog)

2. **Pollinations.ai**
   - Endpoint: `https://image.pollinations.ai/prompt/{encoded_prompt}`
   - No authentication required
   - Auto-enhanced prompts for better quality

## Project Structure

```
npc-dialog-generator/
│
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── .env                   # Environment variables (not in repo)
├── .gitignore            # Git ignore file
├── README.md             # User documentation
├── README_TECHNICAL.md   # This file
│
├── templates/
│   └── index.html        # Single page application
│
├── static/
│   └── style.css         # All styling
│
└── logs/                 # Application logs (created at runtime)
    └── app.log
```

## API Reference

### Internal Endpoints

#### 1. Generate Multiple Dialogues
```python
@app.route("/generate", methods=["POST"])
def generate():
    """
    Generate 10 NPC dialogues based on scene context
    
    Request Body:
    {
        "prompt": str,          # Scene description (required)
        "npcCharacter": str,    # NPC identity (optional)
        "style": str,           # Dialog style
        "emotion": str,         # Emotional tone
        "includeActions": bool, # Include action tags
        "includeNames": bool,   # Include addressing
        "length": str          # Dialog length
    }
    
    Returns:
    {
        "dialogs": List[str],   # 10 generated dialogues
        "npcCharacter": str     # NPC character used
    }
    """
```

#### 2. Generate Single Dialogue
```python
@app.route("/generate-single", methods=["POST"])
def generate_single():
    """
    Generate one dialogue for regeneration feature
    
    Request Body:
    {
        "prompt": str,
        "npcCharacter": str,
        "style": str
    }
    
    Returns:
    {
        "dialog": str,
        "npcCharacter": str
    }
    """
```

#### 3. Generate Scene Image
```python
@app.route("/generate-image", methods=["POST"])
def generate_image():
    """
    Generate AI image of the scene
    
    Request Body:
    {
        "prompt": str  # Scene description
    }
    
    Returns:
    {
        "image_url": str,
        "prompt_used": str  # Enhanced prompt
    }
    """
```

#### 4. Start Dialog Session
```python
@app.route("/start-dialog", methods=["POST"])
def start_dialog():
    """
    Initialize interactive dialog session
    
    Request Body:
    {
        "initialDialog": str,
        "scene": str,
        "npc1": str,
        "style": str
    }
    
    Returns:
    {
        "dialogId": str,  # UUID session identifier
        "history": List[Dict]
    }
    """
```

#### 5. Continue Dialog
```python
@app.route("/continue-dialog", methods=["POST"])
def continue_dialog():
    """
    Generate next response in conversation
    
    Request Body:
    {
        "dialogId": str,
        "npcCharacter": str,
        "emotion": str,
        "includeActions": bool,
        "includeNames": bool,
        "sceneUpdate": str  # Optional scene change
    }
    
    Returns:
    {
        "response": str,
        "history": List[Dict]
    }
    """
```

#### 6. Export Dialog
```python
@app.route("/export-dialog", methods=["POST"])
def export_dialog():
    """
    Export dialog session
    
    Request Body:
    {
        "dialogId": str,
        "format": str  # "text" or "json"
    }
    
    Returns:
    JSON format: Full session data
    Text format: {"text": str}
    """
```

## Backend Implementation

### Core Function: call_gemini_api

```python
def call_gemini_api(user_prompt, npc_character="", style="mixed", 
                   emotion="", include_actions=True, include_names=True, 
                   length="medium", dialog_context=None):
    """
    Core AI integration function
    
    Parameters:
    - user_prompt: Scene description
    - npc_character: Character identity
    - style: Language style
    - emotion: Emotional tone
    - include_actions: Add physical actions
    - include_names: Add addressing terms
    - length: Response length
    - dialog_context: Previous conversation (for dialog mode)
    
    Returns:
    - List[str] for normal mode (10 dialogues)
    - str for dialog mode (single response)
    """
```

### Session Management

Sessions are stored in Flask's server-side session storage:

```python
session['dialogs'][dialog_id] = {
    'scene': str,
    'style': str,
    'history': List[Dict[str, str]]
}
```

### Error Handling Strategy

```python
try:
    # API call
    response = requests.post(url, json=payload)
    response.raise_for_status()
except requests.exceptions.RequestException as e:
    # Network/API errors
    return jsonify({"error": str(e)}), 500
except Exception as e:
    # Unexpected errors
    return jsonify({"error": str(e)}), 500
```

## Frontend Architecture

### State Management

```javascript
// Global state
window.generatedDialogs = [];      // Current dialogues
window.currentNpcCharacter = '';   // Current NPC
let currentDialogId = null;        // Active dialog session
let dialogHistory = [];            // Conversation history
let currentScene = '';             // Scene context
let dialogImages = [];             // Generated images
```

### Event Handling

1. **Form Submission**: Prevented default, async handling
2. **Click Delegation**: Dynamic button handling
3. **Input Validation**: Character counting, limit enforcement
4. **Toast Notifications**: Non-blocking user feedback

### Local Storage Schema

```javascript
// Saved scenes
{
    description: string,
    npcCharacter: string,
    style: string,
    dialogs: string[],
    imageUrl: string,
    timestamp: ISO8601
}

// Favorites
[{
    text: string,
    scene: string,
    npcCharacter: string,
    style: string,
    timestamp: ISO8601
}]
```

## Security Implementation

### Current Security Measures

1. **Input Validation**
   - Length limits on all text inputs
   - HTML escaping in templates
   - JSON validation

2. **Session Security**
   - Server-side session storage
   - Secure session cookies
   - Session timeout

3. **API Security**
   - Environment variable for API keys
   - HTTPS recommended for production
   - CORS configuration

### Security Best Practices

```python
# Environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Session configuration
app.secret_key = os.environ.get('SECRET_KEY', 'fallback-dev-key')

# CORS configuration
CORS(app)  # Restrict in production
```

## Performance Optimization

### Current Optimizations

1. **Frontend**
   - Debounced input handlers
   - Lazy loading for images
   - CSS animations on GPU
   - Minimal DOM manipulation

2. **Backend**
   - Connection pooling for API calls
   - Efficient prompt construction
   - Minimal data in sessions

### Recommended Improvements

1. **Caching Layer**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_gemini_call(prompt_hash):
    # Cache frequently used prompts
    pass
```

2. **Request Queuing**
```python
from queue import Queue
import threading

request_queue = Queue()
# Implement worker threads
```

## Error Handling

### Frontend Error Handling

```javascript
try {
    const res = await fetch('/generate', options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
} catch (err) {
    showToast('Error: ' + err.message, 'error');
    console.error('Generation failed:', err);
}
```

### Backend Error Categories

1. **API Errors**: External service failures
2. **Validation Errors**: Invalid input data
3. **Session Errors**: Invalid or expired sessions
4. **Server Errors**: Internal failures

## Known Issues & Bugs

### Current Issues

1. **Issue #001: Session Memory Leak**
   - **Description**: Sessions not properly cleaned up
   - **Impact**: Memory usage increases over time
   - **Workaround**: Restart server periodically
   - **Fix**: Implement session cleanup scheduler

2. **Issue #002: Race Condition in Dialog Mode**
   - **Description**: Rapid clicks can cause duplicate responses
   - **Impact**: Duplicate messages in conversation
   - **Workaround**: Disable button during generation
   - **Fix**: Implement request debouncing

3. **Issue #003: Image Generation Timeout**
   - **Description**: No timeout on image generation
   - **Impact**: UI can hang on slow connections
   - **Fix**: Add 30-second timeout

### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full support | Recommended |
| Firefox | 88+ | ✅ Full support | Good |
| Safari | 14+ | ⚠️ Partial | LocalStorage issues |
| Edge | 90+ | ✅ Full support | Good |
| IE | All | ❌ Not supported | Use Edge |

## Development Guide

### Setting Up Development Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Development mode
export FLASK_ENV=development
export FLASK_DEBUG=True
python app.py
```

### Code Style Guidelines

1. **Python**: Follow PEP 8
2. **JavaScript**: Use consistent ES6+ syntax
3. **CSS**: BEM methodology for class names
4. **Comments**: JSDoc for functions, clear inline comments

### Adding New Features

1. **New Dialog Style**
```python
# In call_gemini_api()
style_instructions = {
    "yournewstyle": "Description of the style",
    # ...
}
```

2. **New Export Format**
```javascript
function exportAsNewFormat() {
    // Implementation
    downloadFile(content, 'filename.ext', 'mime/type');
}
```

## Deployment

### Production Deployment with Gunicorn

```bash
# Install Gunicorn
pip install gunicorn

# Run with 4 workers
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# With logging
gunicorn -w 4 -b 0.0.0.0:5000 \
  --access-logfile access.log \
  --error-logfile error.log \
  app:app
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static {
        alias /path/to/app/static;
        expires 1d;
    }
}
```

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## Testing

### Unit Tests (Example)

```python
import unittest
from app import app, call_gemini_api

class TestDialogGeneration(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        
    def test_generate_endpoint(self):
        response = self.app.post('/generate', 
            json={'prompt': 'Test scene'})
        self.assertEqual(response.status_code, 200)
        
    def test_invalid_prompt(self):
        response = self.app.post('/generate', 
            json={'prompt': ''})
        self.assertEqual(response.status_code, 400)
```

### Integration Tests

```python
def test_full_dialog_flow():
    # 1. Start dialog
    # 2. Continue dialog
    # 3. Export dialog
    # Verify entire flow
    pass
```

### Performance Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:5000/generate

# Using locust
locust -f locustfile.py --host=http://localhost:5000
```

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes following code standards
4. Write/update tests
5. Run tests: `pytest`
6. Commit: `git commit -m "Add: feature description"`
7. Push: `git push origin feature/new-feature`
8. Create Pull Request

### Commit Message Convention

```
Type: Brief description

Longer explanation if needed.

Fixes: #123
```

Types: `Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Doc`

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No sensitive data exposed
- [ ] Error handling implemented
- [ ] Performance impact considered

---

**For user-facing documentation, see [README.md](README.md)**
