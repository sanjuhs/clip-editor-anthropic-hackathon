"use client";

/**
 * Split large audio files into smaller chunks for transcription.
 * Groq has a file size limit (~25MB), so we chunk larger files.
 */

export interface AudioChunk {
  blob: Blob;
  chunkIndex: number;
  startTime: number;
  duration: number;
}

/**
 * Get audio duration from a File
 */
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio metadata"));
    });

    audio.src = url;
  });
}

/**
 * Split audio file into chunks of specified duration.
 * Uses Web Audio API for precise chunking.
 * Dynamically calculates chunk duration based on file size to ensure chunks stay under limit.
 */
export async function splitAudioIntoChunks(
  file: File,
  maxChunkSizeMB: number = 20 // 20MB to be safe (Groq free tier is 25MB)
): Promise<AudioChunk[]> {
  const duration = await getAudioDuration(file);
  const fileSizeMB = file.size / (1024 * 1024);

  console.log(
    `[Audio Chunker] File: ${file.name}, Size: ${fileSizeMB.toFixed(
      2
    )}MB, Duration: ${duration.toFixed(2)}s`
  );

  // Calculate the bitrate (MB per second)
  const bitrateMBPerSecond = fileSizeMB / duration;
  console.log(`[Audio Chunker] Bitrate: ${bitrateMBPerSecond.toFixed(3)}MB/s`);

  // Calculate safe chunk duration to stay under size limit
  // Use 80% of the limit to have some buffer for WAV encoding overhead
  const safeChunkDuration = Math.floor(
    (maxChunkSizeMB * 0.8) / bitrateMBPerSecond
  );
  console.log(`[Audio Chunker] Safe chunk duration: ${safeChunkDuration}s`);

  // Minimum chunk duration of 60 seconds, maximum of 180 seconds (3 minutes)
  const chunkDurationSeconds = Math.max(60, Math.min(safeChunkDuration, 180));
  console.log(`[Audio Chunker] Using chunk duration: ${chunkDurationSeconds}s`);

  // If file is small enough, return as single chunk
  const maxFileSize = maxChunkSizeMB * 1024 * 1024;
  if (file.size < maxFileSize) {
    console.log(
      `[Audio Chunker] File is small enough, returning as single chunk`
    );
    return [
      {
        blob: file,
        chunkIndex: 0,
        startTime: 0,
        duration: duration,
      },
    ];
  }

  // Create audio context
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  // Load and decode audio
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const totalDuration = audioBuffer.duration;

  const chunks: AudioChunk[] = [];
  let currentTime = 0;
  let chunkIndex = 0;

  while (currentTime < totalDuration) {
    const chunkDuration = Math.min(
      chunkDurationSeconds,
      totalDuration - currentTime
    );
    const startSample = Math.floor(currentTime * sampleRate);
    const endSample = Math.floor((currentTime + chunkDuration) * sampleRate);
    const chunkLength = endSample - startSample;

    // Create a new buffer for this chunk
    const chunkBuffer = audioContext.createBuffer(
      numberOfChannels,
      chunkLength,
      sampleRate
    );

    // Copy audio data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const chunkData = chunkBuffer.getChannelData(channel);

      for (let i = 0; i < chunkLength; i++) {
        chunkData[i] = sourceData[startSample + i];
      }
    }

    // Convert buffer to WAV blob
    const blob = await audioBufferToWav(chunkBuffer);
    const chunkSizeMB = blob.size / (1024 * 1024);

    console.log(
      `[Audio Chunker] Chunk ${chunkIndex}: ${chunkSizeMB.toFixed(
        2
      )}MB, duration: ${chunkDuration.toFixed(2)}s`
    );

    // Safety check: if chunk is too large, warn
    if (chunkSizeMB > maxChunkSizeMB) {
      console.warn(
        `[Audio Chunker] WARNING: Chunk ${chunkIndex} is ${chunkSizeMB.toFixed(
          2
        )}MB, exceeds limit of ${maxChunkSizeMB}MB!`
      );
    }

    chunks.push({
      blob,
      chunkIndex,
      startTime: currentTime,
      duration: chunkDuration,
    });

    currentTime += chunkDuration;
    chunkIndex++;
  }

  audioContext.close();
  console.log(`[Audio Chunker] Created ${chunks.length} chunks total`);
  return chunks;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  let offset = 0;

  // "RIFF" chunk descriptor
  writeString(view, offset, "RIFF");
  offset += 4;
  view.setUint32(offset, bufferLength - 8, true);
  offset += 4;
  writeString(view, offset, "WAVE");
  offset += 4;

  // "fmt " sub-chunk
  writeString(view, offset, "fmt ");
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4; // Sub-chunk size
  view.setUint16(offset, format, true);
  offset += 2; // Audio format
  view.setUint16(offset, numberOfChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4; // Byte rate
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;

  // "data" sub-chunk
  writeString(view, offset, "data");
  offset += 4;
  view.setUint32(offset, dataLength, true);
  offset += 4;

  // Write audio data
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let index = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(
        index,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      index += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
