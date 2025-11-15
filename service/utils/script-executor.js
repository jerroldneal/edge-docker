// script-executor.js - Core script execution functionality
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { generateCode } = require('./code-generator');
const { speak } = require('./speech');
const { summarizeText, interpretText } = require('./docker-ai');

/**
 * Execute a script (bash or PowerShell) and capture output
 * @param {object} scriptObj - Script object with type, path/content, params
 * @param {string} tempDir - Temporary directory for output files
 * @returns {object} Execution result with stdout/stderr file paths
 */
async function executeScript(scriptObj, tempDir) {
  let { type, path: scriptPath, content, params = [] } = scriptObj;
  const timestamp = Date.now();

  // Handle type=speak: speak text verbatim
  if (type === 'speak') {
    if (!content && !scriptObj.text) {
      throw new Error('Either content or text must be provided for type=speak');
    }

    const textToSpeak = scriptObj.text || content;
    console.log(`[Speak] Speaking verbatim: "${textToSpeak.substring(0, 60)}${textToSpeak.length > 60 ? '...' : ''}"`);

    try {
      const result = await speak(textToSpeak, scriptObj.options || {});
      console.log(`[Speak] ✅ Spoken successfully (${result.length} chars)`);

      return {
        success: true,
        type: 'speak',
        spokenText: textToSpeak,
        audioFile: result.audioFile,
        voice: result.voice,
        length: result.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Speech failed: ${error.message}`);
    }
  }

  // Handle type=speak-interpret: AI interpretation then speak
  if (type === 'speak-interpret') {
    if (!content && !scriptObj.text) {
      throw new Error('Either content or text must be provided for type=speak-interpret');
    }

    const textToInterpret = scriptObj.text || content;
    console.log(`[Speak-Interpret] Interpreting: "${textToInterpret.substring(0, 60)}${textToInterpret.length > 60 ? '...' : ''}"`);

    try {
      const interpretation = await interpretText(textToInterpret, scriptObj.aiOptions || {});
      console.log(`[Speak-Interpret] ✅ Interpretation: "${interpretation.substring(0, 100)}${interpretation.length > 100 ? '...' : ''}"`);

      const result = await speak(interpretation, scriptObj.speechOptions || {});
      console.log(`[Speak-Interpret] ✅ Spoken interpretation (${result.length} chars)`);

      return {
        success: true,
        type: 'speak-interpret',
        originalText: textToInterpret,
        interpretation: interpretation,
        spokenText: interpretation,
        audioFile: result.audioFile,
        voice: result.voice,
        originalLength: textToInterpret.length,
        interpretationLength: interpretation.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Interpretation/speech failed: ${error.message}`);
    }
  }

  // Handle type=speak-summary: AI summarization then speak
  if (type === 'speak-summary') {
    if (!content && !scriptObj.text) {
      throw new Error('Either content or text must be provided for type=speak-summary');
    }

    const textToSummarize = scriptObj.text || content;
    console.log(`[Speak-Summary] Summarizing: "${textToSummarize.substring(0, 60)}${textToSummarize.length > 60 ? '...' : ''}"`);

    try {
      const summary = await summarizeText(textToSummarize, scriptObj.aiOptions || {});
      console.log(`[Speak-Summary] ✅ Summary: "${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}"`);

      const result = await speak(summary, scriptObj.speechOptions || {});
      console.log(`[Speak-Summary] ✅ Spoken summary (${result.length} chars)`);

      return {
        success: true,
        type: 'speak-summary',
        originalText: textToSummarize,
        summary: summary,
        spokenText: summary,
        audioFile: result.audioFile,
        voice: result.voice,
        originalLength: textToSummarize.length,
        summaryLength: summary.length,
        compression: Math.round((1 - summary.length / textToSummarize.length) * 100),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Summarization/speech failed: ${error.message}`);
    }
  }

  // Handle type=code: generate code from expectation using AI
  if (type === 'code') {
    if (!scriptObj.expectation && !content) {
      throw new Error('Either expectation or content must be provided for type=code');
    }

    const expectation = scriptObj.expectation || content;
    const targetType = scriptObj.targetType || 'pws'; // Default to PowerShell

    console.log(`[Code Gen] Generating ${targetType} code for: "${expectation.substring(0, 60)}${expectation.length > 60 ? '...' : ''}"`);

    try {
      const generatedCode = await generateCode(expectation, targetType);
      console.log(`[Code Gen] ✅ Generated code (${generatedCode.length} chars)`);
      console.log(`[Code Gen] Code preview:\n${generatedCode.substring(0, 200)}${generatedCode.length > 200 ? '\n...' : ''}`);

      // Replace content with generated code and update type
      content = generatedCode;
      type = targetType;

      // Save generated code for reference
      const codeFile = path.join(tempDir, `generated-code-${timestamp}.${targetType === 'bash' ? 'sh' : 'ps1'}`);
      await fs.writeFile(codeFile, generatedCode, 'utf8');
      console.log(`[Code Gen] Saved to: ${codeFile}`);
    } catch (error) {
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }
  const originalTimestamp = timestamp;

  // Determine shell and command
  let shellCommand;
  let shellArgs = [];
  let scriptToExecute;

  if (type === 'bash') {
    shellCommand = 'bash';

    if (scriptPath) {
      // Check if file exists
      try {
        await fs.access(scriptPath);
        scriptToExecute = scriptPath;
      } catch (err) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
    } else if (content) {
      // Write content to temp file
      const tempScript = path.join(tempDir, `script-${timestamp}.sh`);
      await fs.writeFile(tempScript, content, 'utf8');
      scriptToExecute = tempScript;
    } else {
      throw new Error('Either path or content must be provided');
    }

    shellArgs = [scriptToExecute, ...params];
  } else if (type === 'pws' || type === 'powershell') {
    shellCommand = 'powershell';
    shellArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];

    if (scriptPath) {
      // Check if file exists
      try {
        await fs.access(scriptPath);
        scriptToExecute = scriptPath;
      } catch (err) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
      shellArgs.push('-File', scriptToExecute, ...params);
    } else if (content) {
      // Execute content directly via -Command
      shellArgs.push('-Command', content);
    } else {
      throw new Error('Either path or content must be provided');
    }
  } else {
    throw new Error(`Unsupported script type: ${type}. Use 'bash' or 'pws'`);
  }

  // Create output file paths
  const stdoutFile = path.join(tempDir, `stdout-${timestamp}.txt`);
  const stderrFile = path.join(tempDir, `stderr-${timestamp}.txt`);

  // Execute script and capture output
  return new Promise((resolve, reject) => {
    const process = spawn(shellCommand, shellArgs);

    let stdoutData = '';
    let stderrData = '';

    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    process.on('close', async (exitCode) => {
      try {
        // Write output files
        await fs.writeFile(stdoutFile, stdoutData, 'utf8');
        await fs.writeFile(stderrFile, stderrData, 'utf8');

        // Clean up temp script if it was created
        if (content && type === 'bash') {
          try {
            await fs.unlink(scriptToExecute);
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        resolve({
          success: exitCode === 0,
          exitCode: exitCode,
          stdoutFile: stdoutFile,
          stderrFile: stderrFile,
          stdoutLength: stdoutData.length,
          stderrLength: stderrData.length,
          timestamp: new Date().toISOString(),
          generatedCode: scriptObj.type === 'code' ? content : undefined,
          codeFile: scriptObj.type === 'code' ? path.join(tempDir, `generated-code-${originalTimestamp}.${type === 'bash' ? 'sh' : 'ps1'}`) : undefined
        });
      } catch (err) {
        reject(new Error(`Failed to write output files: ${err.message}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to execute script: ${err.message}`));
    });
  });
}

/**
 * Execute multiple scripts in sequence
 * @param {array} scripts - Array of script objects
 * @param {string} tempDir - Temporary directory for output files
 * @param {object} stats - Statistics tracker
 * @returns {array} Array of execution results
 */
async function executeScripts(scripts, tempDir, stats) {
  const results = [];

  for (const script of scripts) {
    try {
      const result = await executeScript(script, tempDir);
      results.push(result);
      stats.incrementExecuted();
    } catch (err) {
      stats.incrementErrors();
      results.push({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  stats.updateLastExecuted();
  return results;
}

module.exports = {
  executeScript,
  executeScripts
};
