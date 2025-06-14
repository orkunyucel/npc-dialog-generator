from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json
import uuid

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Get API key securely
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR API KEY HERE")

def call_gemini_api(user_prompt, npc_character="", style="mixed", emotion="", include_actions=True, include_names=True, length="medium", dialog_context=None):
    # Style-specific instructions
    style_instructions = {
        "medieval": "Use medieval/fantasy language style with words like 'thee', 'thou', 'milord', etc.",
        "modern": "Use contemporary, modern language and expressions.",
        "scifi": "Use futuristic, technological language with sci-fi terminology.",
        "horror": "Use dark, ominous language that creates tension and fear.",
        "comedy": "Use humorous, lighthearted language with jokes and puns.",
        "mixed": "Use varied language styles appropriate to the scene."
    }
    
    length_instructions = {
        "short": "Keep each dialogue very brief, 1-2 sentences maximum.",
        "medium": "Make dialogues medium length, 2-3 sentences.",
        "long": "Create longer, more detailed dialogues, 3-5 sentences."
    }
    
    emotion_instruction = f"\nALL dialogues must express {emotion} emotion strongly." if emotion else ""
    action_instruction = "\nInclude physical actions in asterisks like *walks away*, *sighs deeply*, etc." if include_actions else "\nDo NOT include any physical actions or stage directions."
    names_instruction = "\nSometimes address the player as 'Stranger', 'Friend', 'Traveler', etc." if include_names else "\nDo NOT use any addressing terms."
    
    # NPC character context
    npc_context = ""
    if npc_character:
        npc_context = f"""
VERY IMPORTANT - NPC CHARACTER:
The NPC speaking these dialogues is: {npc_character}

You MUST:
1. Understand the relationship between "{npc_character}" and the characters/elements in the scene
2. Make the dialogue appropriate for who this NPC is
3. If "{npc_character}" is mentioned in the scene (like "his mom", "the girl", "the merchant"), understand that the NPC IS that character
4. Use appropriate language, tone, and emotional responses based on who the NPC is

Examples:
- If scene mentions "a girl running from dragon" and NPC is "her mother", dialogues should show maternal concern
- If scene mentions "merchant selling goods" and NPC is "the merchant", dialogues should be from the merchant's perspective
- If scene mentions "scared villagers" and NPC is "village elder", dialogues should show leadership/authority
"""
    
    # If this is a dialog response
    if dialog_context:
        system_prompt = f"""You are an NPC dialog generator for game developers creating INTERACTIVE CONVERSATIONS.

Previous Dialog Context:
{dialog_context}

Current Scene: {user_prompt}
{npc_context}

STYLE: {style_instructions.get(style, style_instructions['mixed'])}
LENGTH: {length_instructions.get(length, length_instructions['medium'])}
{emotion_instruction}
{action_instruction}
{names_instruction}

Generate ONLY ONE natural dialogue response that:
1. Directly responds to what was just said
2. Continues the conversation naturally
3. Stays in character for the NPC
4. Maintains the specified style and emotion
5. Moves the conversation forward

Provide ONLY the dialogue line, nothing else."""
    else:
        # Original system prompt for multiple dialogues
        system_prompt = f"""You are an NPC dialog generator for game developers.
    
Scene: {user_prompt}
{npc_context}

STYLE: {style_instructions.get(style, style_instructions['mixed'])}
LENGTH: {length_instructions.get(length, length_instructions['medium'])}
{emotion_instruction}
{action_instruction}
{names_instruction}

VERY IMPORTANT: Read the scenario CAREFULLY and consider every detail.
Generate 10 different NPC dialogues that PERFECTLY match this scenario and requirements.

RULES:
- Each dialogue must be completely unique
- Follow the specified style, length, and emotion requirements
- NEVER use real person names
- Make each NPC feel like a different character
- Use varied speech patterns and vocabulary
- The NPC perspective and relationship to the scene is CRITICAL

List only the dialogues with numbers."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{
                "text": system_prompt
            }]
        }],
        "generationConfig": {
            "temperature": 1.2 if not dialog_context else 0.9,
            "topK": 50,
            "topP": 0.95,
            "maxOutputTokens": 1024 if not dialog_context else 256,
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        
        if "candidates" in data and len(data["candidates"]) > 0:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            if dialog_context:
                # For dialog mode, return the single response
                return text.strip()
            else:
                # Original parsing for multiple dialogues
                lines = text.strip().split("\n")
                dialogs = []
                
                for line in lines:
                    cleaned = line.strip()
                    if cleaned:
                        import re
                        cleaned = re.sub(r'^[\d\.\-\*\)]+\s*', '', cleaned)
                        if cleaned:
                            dialogs.append(cleaned)
                
                return dialogs[:10] if dialogs else ["Could not get valid response from API."]
        else:
            return [f"API response was unexpected: {data}"] if not dialog_context else "Could not generate response."
            
    except requests.exceptions.RequestException as e:
        return [f"API request failed: {str(e)}"] if not dialog_context else f"API request failed: {str(e)}"
    except Exception as e:
        return [f"Unexpected error: {str(e)}"] if not dialog_context else f"Unexpected error: {str(e)}"

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.json
        prompt = data.get("prompt", "")
        npc_character = data.get("npcCharacter", "")
        style = data.get("style", "mixed")
        emotion = data.get("emotion", "")
        include_actions = data.get("includeActions", True)
        include_names = data.get("includeNames", True)
        length = data.get("length", "medium")
        
        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400
            
        result = call_gemini_api(prompt, npc_character, style, emotion, include_actions, include_names, length)
        return jsonify({"dialogs": result, "npcCharacter": npc_character})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate-single", methods=["POST"])
def generate_single():
    try:
        data = request.json
        prompt = data.get("prompt", "")
        npc_character = data.get("npcCharacter", "")
        style = data.get("style", "mixed")
        
        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400
            
        # Generate single dialog
        result = call_gemini_api(prompt, npc_character, style)
        if result and len(result) > 0:
            return jsonify({"dialog": result[0], "npcCharacter": npc_character})
        else:
            return jsonify({"error": "Could not generate dialog"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate-image", methods=["POST"])
def generate_image():
    try:
        prompt = request.json.get("prompt", "")
        if not prompt:
            return jsonify({"error": "Prompt cannot be empty"}), 400
        
        # Enhanced prompt for better quality
        enhanced_prompt = f"{prompt}, fantasy game art style, detailed environment, dramatic lighting, high quality digital art, concept art, 4k, artstation"
        
        # URL encode prompt
        import urllib.parse
        encoded_prompt = urllib.parse.quote(enhanced_prompt)
        
        # Pollinations.ai API
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        
        return jsonify({
            "image_url": image_url,
            "prompt_used": enhanced_prompt
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# New endpoints for dialog mode
@app.route("/start-dialog", methods=["POST"])
def start_dialog():
    try:
        data = request.json
        initial_dialog = data.get("initialDialog", "")
        scene = data.get("scene", "")
        npc1 = data.get("npc1", "")
        style = data.get("style", "mixed")
        
        # Generate unique dialog session ID
        dialog_id = str(uuid.uuid4())
        
        # Store dialog context in session
        if 'dialogs' not in session:
            session['dialogs'] = {}
        
        session['dialogs'][dialog_id] = {
            'scene': scene,
            'style': style,
            'history': [
                {'character': npc1, 'text': initial_dialog}
            ]
        }
        session.modified = True
        
        return jsonify({
            "dialogId": dialog_id,
            "history": session['dialogs'][dialog_id]['history']
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/continue-dialog", methods=["POST"])
def continue_dialog():
    try:
        data = request.json
        dialog_id = data.get("dialogId")
        npc_character = data.get("npcCharacter", "")
        emotion = data.get("emotion", "")
        include_actions = data.get("includeActions", True)
        include_names = data.get("includeNames", True)
        scene_update = data.get("sceneUpdate")  # Yeni parametre
        
        if not dialog_id or 'dialogs' not in session or dialog_id not in session['dialogs']:
            return jsonify({"error": "Invalid dialog session"}), 400
        
        dialog_data = session['dialogs'][dialog_id]
        
        # Sahne güncellemesi varsa
        if scene_update:
            dialog_data['scene'] = scene_update
            # Scene update'i history'ye ekle
            dialog_data['history'].append({
                'character': '📍 Scene Update',
                'text': scene_update
            })
        
        # Build dialog context from history
        dialog_context = "\n".join([
            f"{turn['character']}: {turn['text']}" 
            for turn in dialog_data['history'][-5:]  # Last 5 turns for context
        ])
        
        # Generate response with updated scene
        response = call_gemini_api(
            dialog_data['scene'],  # Güncellenmiş sahne kullanılıyor
            npc_character,
            dialog_data['style'],
            emotion,
            include_actions,
            include_names,
            "medium",
            dialog_context
        )
        
        # Add to history
        dialog_data['history'].append({
            'character': npc_character,
            'text': response
        })
        session.modified = True
        
        return jsonify({
            "response": response,
            "history": dialog_data['history']
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/export-dialog", methods=["POST"])
def export_dialog():
    try:
        data = request.json
        dialog_id = data.get("dialogId")
        format_type = data.get("format", "text")
        
        if not dialog_id or 'dialogs' not in session or dialog_id not in session['dialogs']:
            return jsonify({"error": "Invalid dialog session"}), 400
        
        dialog_data = session['dialogs'][dialog_id]
        
        if format_type == "json":
            return jsonify({
                "scene": dialog_data['scene'],
                "style": dialog_data['style'],
                "dialog": dialog_data['history']
            })
        else:
            # Text format
            text = f"Scene: {dialog_data['scene']}\n\n"
            text += "\n\n".join([
                f"{turn['character']}: {turn['text']}"
                for turn in dialog_data['history']
            ])
            return jsonify({"text": text})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)