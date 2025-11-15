// audio.js - Audio playback utilities

const { exec } = require('child_process');

/**
 * Play MP3 audio file using PowerShell MediaPlayer
 * @param {string} filePath - Path to the MP3 file
 * @returns {Promise<void>} Resolves when playback completes
 */
async function playAudio(filePath) {
  return new Promise((resolve) => {
    // Use MediaPlayer from PresentationCore assembly - built-in Windows component
    const escapedPath = filePath.replace(/\\/g, '\\\\');
    const psCommand = `powershell -Command "Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Play(); Start-Sleep -Milliseconds 500; while($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; $duration = [math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds); Start-Sleep -Seconds $duration"`;

    exec(psCommand, (error) => {
      if (error) {
        console.warn(`[Audio Playback Warning]: ${error.message}`);
      }
      // Resolve after playback completes
      resolve();
    });
  });
}

module.exports = {
  playAudio
};
