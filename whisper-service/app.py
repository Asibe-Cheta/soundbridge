# SoundBridge Whisper Transcription Service (Python)
# Ultra-lightweight using faster-whisper

from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import os
import requests
import tempfile
import subprocess

app = Flask(__name__)

# Initialize model (loaded once at startup)
MODEL_SIZE = os.getenv('WHISPER_MODEL', 'base')
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@app.route('/', methods=['GET'])
def info():
    return jsonify({
        'service': 'SoundBridge Whisper Transcription',
        'status': 'online',
        'version': '2.0.0',
        'model': MODEL_SIZE,
        'engine': 'faster-whisper'
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_url = data.get('audioUrl')

        if not audio_url:
            return jsonify({'success': False, 'error': 'audioUrl is required'}), 400

        # Download audio
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            tmp.write(response.content)
            audio_path = tmp.name

        # Extract sample if needed
        sample_only = data.get('sampleOnly', True)
        max_duration = data.get('maxDuration', 120)

        if sample_only and max_duration > 0:
            sample_path = tempfile.mktemp(suffix='.mp3')
            subprocess.run([
                'ffmpeg', '-i', audio_path,
                '-t', str(max_duration),
                '-c', 'copy',
                sample_path,
                '-y', '-loglevel', 'error'
            ], check=False)

            if os.path.exists(sample_path):
                os.unlink(audio_path)
                audio_path = sample_path

        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            language=data.get('language', 'en'),
            beam_size=5
        )

        # Combine segments
        transcription = ' '.join([segment.text for segment in segments])

        # Cleanup
        os.unlink(audio_path)

        return jsonify({
            'success': True,
            'transcription': transcription,
            'metadata': {
                'model': MODEL_SIZE,
                'language': info.language,
                'duration': info.duration,
                'characterCount': len(transcription)
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    print(f'🎙️  SoundBridge Whisper Service (Python)')
    print(f'✅ Running on port {port}')
    print(f'📊 Model: {MODEL_SIZE}')
    app.run(host='0.0.0.0', port=port)
