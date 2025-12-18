// SoundBridge Whisper Transcription Service
// Self-hosted audio transcription using OpenAI's Whisper model

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const fetch = require('node-fetch');
const cors = require('cors');

const execAsync = promisify(exec);
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'SoundBridge Whisper Transcription',
    status: 'online',
    version: '1.0.0',
    model: process.env.WHISPER_MODEL || 'base'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Transcription endpoint
app.post('/transcribe', async (req, res) => {
  console.log('📝 Transcription request received');

  try {
    const {
      audioUrl,
      model = process.env.WHISPER_MODEL || 'base',
      sampleOnly = true,
      maxDuration = 120,
      language = 'en'
    } = req.body;

    // Validate input
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'audioUrl is required'
      });
    }

    console.log(`🎵 Processing: ${audioUrl.substring(0, 50)}...`);
    console.log(`📊 Model: ${model}, Sample: ${sampleOnly}, Max: ${maxDuration}s`);

    // Download audio file
    console.log('⬇️  Downloading audio file...');
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.buffer();
    const tempPath = `/tmp/${Date.now()}.mp3`;

    fs.writeFileSync(tempPath, audioBuffer);
    console.log(`✅ Downloaded: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Extract sample if requested
    let processPath = tempPath;
    if (sampleOnly && maxDuration > 0) {
      console.log(`✂️  Extracting first ${maxDuration} seconds...`);
      const samplePath = `/tmp/sample-${Date.now()}.mp3`;

      try {
        await execAsync(
          `ffmpeg -i "${tempPath}" -t ${maxDuration} -c copy "${samplePath}" -y -loglevel error`,
          { maxBuffer: 10 * 1024 * 1024 }
        );
        processPath = samplePath;
        console.log('✅ Sample extracted');
      } catch (ffmpegError) {
        console.warn('⚠️  Sample extraction failed, using full file');
        // Continue with full file if extraction fails
      }
    }

    // Run Whisper transcription
    console.log('🔄 Running Whisper transcription...');
    const startTime = Date.now();

    const whisperCommand = `whisper "${processPath}" --model ${model} --language ${language} --output_format txt --output_dir /tmp --fp16 False`;

    try {
      await execAsync(whisperCommand, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000 // 5 minutes timeout
      });
    } catch (whisperError) {
      console.error('❌ Whisper error:', whisperError.message);
      throw new Error('Transcription failed: ' + whisperError.message);
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Transcription completed in ${processingTime}s`);

    // Read transcription result
    const outputFile = processPath.replace(/\.[^.]+$/, '.txt').replace(/.*\//, '/tmp/');
    let transcription = '';

    if (fs.existsSync(outputFile)) {
      transcription = fs.readFileSync(outputFile, 'utf-8').trim();
      console.log(`📄 Transcription length: ${transcription.length} characters`);

      // Clean up output file
      fs.unlinkSync(outputFile);
    } else {
      console.warn('⚠️  No transcription output file found');
    }

    // Clean up temp files
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    if (sampleOnly && processPath !== tempPath && fs.existsSync(processPath)) {
      fs.unlinkSync(processPath);
    }

    console.log('🧹 Cleanup completed');

    // Return result
    res.json({
      success: true,
      transcription,
      metadata: {
        model,
        language,
        sampleOnly,
        maxDuration: sampleOnly ? maxDuration : null,
        processingTime: parseFloat(processingTime),
        characterCount: transcription.length
      }
    });

  } catch (error) {
    console.error('❌ Transcription error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('🎙️  SoundBridge Whisper Service');
  console.log('================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Model: ${process.env.WHISPER_MODEL || 'base'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /        - Service info`);
  console.log(`  GET  /health  - Health check`);
  console.log(`  POST /transcribe - Transcribe audio`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
