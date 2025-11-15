// code-generator.js - AI-powered code generation for script execution

const { callDockerAI } = require('./docker-ai');

/**
 * Generate executable code from natural language expectation
 * @param {string} expectation - Natural language description of what the code should do
 * @param {string} scriptType - 'bash' or 'pws' (PowerShell)
 * @param {object} options - Generation options
 * @returns {Promise<string>} Generated code
 */
async function generateCode(expectation, scriptType, options = {}) {
  const {
    model = 'ai/phi4:latest',
    maxTokens = 1000
  } = options;

  // Determine the target language and create appropriate prompt
  let language, shellInfo, examples;

  if (scriptType === 'bash') {
    language = 'Bash';
    shellInfo = 'Bash shell script';
    examples = `Examples:
- "list all files in current directory" -> ls -la
- "find all .txt files" -> find . -name "*.txt"
- "show disk usage" -> df -h`;
  } else if (scriptType === 'pws' || scriptType === 'powershell') {
    language = 'PowerShell';
    shellInfo = 'PowerShell script';
    examples = `Examples:
- "list all files in C:\\" -> Get-ChildItem C:\\ | Format-Table Name, LastWriteTime
- "find all .txt files" -> Get-ChildItem -Recurse -Filter "*.txt"
- "show disk usage" -> Get-PSDrive -PSProvider FileSystem`;
  } else {
    throw new Error(`Unsupported script type: ${scriptType}. Use 'bash' or 'pws'`);
  }

  const prompt = `You are a code generation assistant. Generate ONLY the ${language} code to accomplish the following task. Do NOT include explanations, markdown formatting, or code blocks. Return ONLY the raw executable code.

Task: ${expectation}

${examples}

Requirements:
- Generate clean, executable ${shellInfo} code
- No explanations or comments (unless essential for the code)
- No markdown formatting or code fences
- Direct, working code only
- Ensure the code is safe and won't cause system damage

Generated ${language} code:`;

  try {
    console.log(`[Code Gen] Calling Docker AI (timeout: 60s)...`);
    const startTime = Date.now();

    const code = await callDockerAI(prompt, {
      model,
      maxTokens,
      temperature: 0.3 // Lower temperature for more deterministic code generation
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Code Gen] AI responded in ${duration}s`);

    // Clean up the response - remove any markdown code blocks if present
    let cleanedCode = code.trim();

    // Remove markdown code fences if they slipped through
    cleanedCode = cleanedCode.replace(/^```(?:bash|powershell|ps1|sh)?\n?/i, '');
    cleanedCode = cleanedCode.replace(/\n?```$/, '');

    // Remove common explanation prefixes
    cleanedCode = cleanedCode.replace(/^(?:Here's the code:|The code is:|Code:)\s*/i, '');

    return cleanedCode.trim();
  } catch (error) {
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

module.exports = {
  generateCode
};
