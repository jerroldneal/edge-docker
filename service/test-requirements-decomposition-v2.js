// test-requirements-decomposition-v2.js - Advanced AI-powered requirements decomposition
// Industry best practices: Level-by-level processing with context-aware optimization
// Based on: DDD, SOLID principles, BDD/TDD patterns, and dependency analysis

const axios = require('axios');
const readline = require('readline');
const fs = require('fs');

// Configuration
const DOCKER_AI_URL = process.env.DOCKER_AI_URL || 'http://localhost:12434/engines/v1/chat/completions';
const MODEL = 'ai/phi4:latest';
const MAX_DEPTH = process.env.MAX_DEPTH ? parseInt(process.env.MAX_DEPTH) : 20;
const ENABLE_OPTIMIZATION = process.env.ENABLE_OPTIMIZATION !== 'false'; // Default: enabled

/**
 * Requirement Node with enhanced metadata
 */
class RequirementNode {
  constructor(id, expectation, tddExpectation = null, parent = null) {
    this.id = id;
    this.expectation = expectation;
    this.tddExpectation = tddExpectation;
    this.parent = parent;
    this.children = [];
    this.isLeaf = false;
    this.depth = parent ? parent.depth + 1 : 0;

    // Enhanced metadata for optimization
    this.dependencies = []; // IDs of nodes this depends on
    this.sharedConcerns = []; // Common concerns with siblings
    this.optimizationNotes = []; // Notes from optimization passes
    this.version = 1; // Track if node was rewritten
  }

  addChild(child) {
    this.children.push(child);
  }

  isAtomic() {
    return this.isLeaf || this.children.length === 0;
  }

  getSiblings() {
    if (!this.parent) return [];
    return this.parent.children.filter(c => c.id !== this.id);
  }

  getAllNodesAtDepth(targetDepth) {
    const nodes = [];
    if (this.depth === targetDepth) {
      nodes.push(this);
    }
    this.children.forEach(child => {
      nodes.push(...child.getAllNodesAtDepth(targetDepth));
    });
    return nodes;
  }

  print(indent = 0) {
    const prefix = '  '.repeat(indent);
    const marker = this.isLeaf ? '🍃' : '📦';
    const versionTag = this.version > 1 ? ` (v${this.version})` : '';
    const depsTag = this.dependencies.length > 0 ? ` [deps: ${this.dependencies.join(', ')}]` : '';

    console.log(`${prefix}${marker} [${this.id}]${versionTag} ${this.expectation}${depsTag}`);
    if (this.tddExpectation) {
      console.log(`${prefix}   ✓ TDD: ${this.tddExpectation}`);
    }
    if (this.sharedConcerns.length > 0) {
      console.log(`${prefix}   🔗 Shared: ${this.sharedConcerns.join(', ')}`);
    }
    if (this.optimizationNotes.length > 0) {
      console.log(`${prefix}   💡 ${this.optimizationNotes[this.optimizationNotes.length - 1]}`);
    }
    this.children.forEach(child => child.print(indent + 1));
  }

  toJSON() {
    return {
      id: this.id,
      expectation: this.expectation,
      tddExpectation: this.tddExpectation,
      isLeaf: this.isLeaf,
      depth: this.depth,
      dependencies: this.dependencies,
      sharedConcerns: this.sharedConcerns,
      optimizationNotes: this.optimizationNotes,
      version: this.version,
      children: this.children.map(c => c.toJSON())
    };
  }
}

/**
 * Call Docker AI with retry logic and better error handling
 */
async function callDockerAI(prompt, options = {}) {
  const {
    maxTokens = 1500,
    temperature = 0.3,
    maxRetries = 3
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(DOCKER_AI_URL, {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      }, {
        timeout: 0 // No timeout
      });

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content.trim();
      }

      throw new Error('Invalid response structure from Docker AI');
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   ⚠️  Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Docker AI failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(content) {
  let jsonContent = content;

  // Try to extract from markdown code block
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}\nContent: ${content.substring(0, 200)}`);
  }
}

/**
 * Decompose a single requirement (atomic check)
 */
async function decomposeRequirement(expectation, nodeId) {
  const prompt = `Analyze this software requirement using SOLID principles and single responsibility principle.

Requirement: "${expectation}"

A requirement is ATOMIC if it satisfies ALL criteria:
1. Single Responsibility: Has ONE well-defined, cohesive responsibility
2. Implementable: Can be implemented by a small AI model (< 500 lines of code)
3. Testable: A focused TDD test can fully verify the implementation
4. Independent: Minimal coupling to other modules (low dependencies)
5. Clear Boundaries: Has well-defined inputs, outputs, and behavior

Respond with JSON ONLY:

ATOMIC requirement (all criteria met):
{
  "isAtomic": true,
  "tddExpectation": "Specific BDD/TDD test description (Given/When/Then format preferred)",
  "estimatedComplexity": "low|medium|high",
  "dependencies": ["list", "of", "expected", "dependencies"]
}

DECOMPOSABLE requirement (needs breakdown):
{
  "isAtomic": false,
  "subExpectations": [
    {
      "name": "Module name (verb + noun)",
      "expectation": "Clear, actionable description",
      "tddExpectation": "BDD/TDD test description",
      "rationale": "Why this is a separate module"
    }
  ],
  "sharedConcerns": ["list", "of", "cross-cutting", "concerns"]
}

Guidelines:
- Apply Domain-Driven Design (DDD) bounded contexts
- Identify cross-cutting concerns (auth, logging, validation)
- Limit to 3-5 sub-modules (optimal for maintainability)
- Use BDD Given/When/Then format for tests when applicable
- Consider dependency direction (depend on abstractions)`;

  console.log(`\n🤖 [${nodeId}] Analyzing: "${expectation.substring(0, 60)}${expectation.length > 60 ? '...' : ''}"`);

  const content = await callDockerAI(prompt, { maxTokens: 1500 });
  const result = extractJSON(content);

  if (result.isAtomic) {
    console.log(`   ✓ ATOMIC (complexity: ${result.estimatedComplexity || 'unknown'})`);
  } else {
    console.log(`   ✓ DECOMPOSED into ${result.subExpectations?.length || 0} modules`);
    if (result.sharedConcerns?.length > 0) {
      console.log(`   🔗 Shared concerns: ${result.sharedConcerns.join(', ')}`);
    }
  }

  return result;
}

/**
 * Optimize a level of nodes by analyzing context and relationships
 */
async function optimizeLevel(nodes, levelDepth) {
  if (!ENABLE_OPTIMIZATION || nodes.length === 0) {
    return nodes;
  }

  console.log(`\n🔧 Optimizing level ${levelDepth} (${nodes.length} nodes)...`);

  // Build context of all nodes at this level
  const nodeDescriptions = nodes.map(n => `[${n.id}] ${n.expectation}`).join('\n');

  const prompt = `Analyze these sibling requirements for optimization opportunities:

${nodeDescriptions}

Identify:
1. DEPENDENCIES: Which requirements depend on others? (execution order matters)
2. DUPLICATIONS: Are there overlapping responsibilities that should be merged?
3. SHARED CONCERNS: What cross-cutting concerns span multiple modules?
4. MISSING MODULES: Are there implied requirements not explicitly listed?
5. REFACTORING: Should any modules be split, merged, or rewritten for clarity?

Respond with JSON ONLY:
{
  "dependencies": [
    {"from": "A.1", "to": "A.2", "reason": "Why A.1 depends on A.2"}
  ],
  "duplications": [
    {"nodes": ["A.1", "A.3"], "suggestion": "How to merge or clarify"}
  ],
  "sharedConcerns": [
    {"concern": "Authentication", "affectedNodes": ["A.1", "A.2"]}
  ],
  "missingModules": [
    {"name": "Module name", "expectation": "What it should do", "rationale": "Why it's needed"}
  ],
  "rewrites": [
    {"nodeId": "A.1", "newExpectation": "Clearer description", "newTddExpectation": "Updated test", "reason": "Why rewrite"}
  ],
  "optimizationSummary": "Brief summary of changes"
}

If no optimization needed, return: {"dependencies": [], "duplications": [], "sharedConcerns": [], "missingModules": [], "rewrites": [], "optimizationSummary": "No optimization needed"}`;

  try {
    const content = await callDockerAI(prompt, { maxTokens: 2000 });
    const optimization = extractJSON(content);

    console.log(`   💡 ${optimization.optimizationSummary}`);

    // Apply dependencies
    if (optimization.dependencies?.length > 0) {
      optimization.dependencies.forEach(dep => {
        const fromNode = nodes.find(n => n.id === dep.from);
        if (fromNode && !fromNode.dependencies.includes(dep.to)) {
          fromNode.dependencies.push(dep.to);
          console.log(`   🔗 ${dep.from} → ${dep.to}: ${dep.reason}`);
        }
      });
    }

    // Apply shared concerns
    if (optimization.sharedConcerns?.length > 0) {
      optimization.sharedConcerns.forEach(concern => {
        concern.affectedNodes?.forEach(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          if (node && !node.sharedConcerns.includes(concern.concern)) {
            node.sharedConcerns.push(concern.concern);
          }
        });
        console.log(`   🔗 Shared: ${concern.concern} (${concern.affectedNodes?.join(', ')})`);
      });
    }

    // Apply rewrites
    if (optimization.rewrites?.length > 0) {
      optimization.rewrites.forEach(rewrite => {
        const node = nodes.find(n => n.id === rewrite.nodeId);
        if (node) {
          node.expectation = rewrite.newExpectation;
          node.tddExpectation = rewrite.newTddExpectation;
          node.version++;
          node.optimizationNotes.push(rewrite.reason);
          console.log(`   ✏️  Rewrote [${rewrite.nodeId}]: ${rewrite.reason}`);
        }
      });
    }

    // Log missing modules (for user awareness - not auto-added)
    if (optimization.missingModules?.length > 0) {
      console.log(`   ⚠️  Potential missing modules:`);
      optimization.missingModules.forEach(missing => {
        console.log(`      - ${missing.name}: ${missing.rationale}`);
      });
    }

    return optimization;

  } catch (error) {
    console.error(`   ⚠️  Optimization failed: ${error.message}`);
    return { optimizationSummary: 'Optimization skipped due to error' };
  }
}

/**
 * Build requirements tree level-by-level with optimization
 */
async function buildRequirementsTreeOptimized(expectation) {
  console.log('\n📐 Building requirements tree (level-by-level with optimization)...');

  // Create root node
  const root = new RequirementNode('A', expectation, null, null);
  const allNodes = [root];

  // Process level by level
  for (let currentDepth = 0; currentDepth < MAX_DEPTH; currentDepth++) {
    // Get all nodes at current depth that need decomposition
    const nodesAtDepth = allNodes.filter(n => n.depth === currentDepth && !n.isLeaf);

    if (nodesAtDepth.length === 0) {
      console.log(`\n✓ No more nodes to decompose at depth ${currentDepth}`);
      break;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 Level ${currentDepth}: Processing ${nodesAtDepth.length} node(s)`);
    console.log(`${'═'.repeat(60)}`);

    // Step 1: Decompose each node at this level
    for (const node of nodesAtDepth) {
      try {
        const decomposition = await decomposeRequirement(node.expectation, node.id);

        if (decomposition.isAtomic) {
          node.isLeaf = true;
          node.tddExpectation = decomposition.tddExpectation || 'Implement and test this requirement';
          if (decomposition.dependencies) {
            node.dependencies = decomposition.dependencies;
          }
        } else if (decomposition.subExpectations?.length > 0) {
          node.tddExpectation = `Integration test: Verify ${decomposition.subExpectations.length} sub-modules integrate correctly`;

          // Create child nodes
          decomposition.subExpectations.forEach((subExp, index) => {
            const childId = `${node.id}.${index + 1}`;
            const childNode = new RequirementNode(childId, subExp.expectation, subExp.tddExpectation, node);
            node.addChild(childNode);
            allNodes.push(childNode);

            console.log(`   ↳ [${childId}] ${subExp.name}`);
          });

          // Store shared concerns at parent level
          if (decomposition.sharedConcerns?.length > 0) {
            node.sharedConcerns = decomposition.sharedConcerns;
          }
        } else {
          // No valid decomposition, treat as atomic
          node.isLeaf = true;
          node.tddExpectation = 'Implement and test this requirement';
        }

      } catch (error) {
        console.error(`   ❌ Error decomposing [${node.id}]: ${error.message}`);
        node.isLeaf = true;
        node.tddExpectation = `Implement and test (decomposition failed: ${error.message})`;
      }
    }

    // Step 2: Optimize the newly created children
    const newChildren = [];
    nodesAtDepth.forEach(node => {
      if (!node.isLeaf) {
        newChildren.push(...node.children);
      }
    });

    if (newChildren.length > 1 && ENABLE_OPTIMIZATION) {
      await optimizeLevel(newChildren, currentDepth + 1);
    }

    // Save intermediate progress
    const progressFile = `C:\\temp\\requirements-progress-depth${currentDepth}.json`;
    fs.writeFileSync(progressFile, JSON.stringify(root.toJSON(), null, 2));
    console.log(`\n💾 Progress saved: ${progressFile}`);
  }

  return root;
}

/**
 * Count nodes
 */
function countNodes(node) {
  let count = 1;
  node.children.forEach(child => count += countNodes(child));
  return count;
}

/**
 * Count leaf nodes
 */
function countLeafNodes(node) {
  if (node.isAtomic()) return 1;
  let count = 0;
  node.children.forEach(child => count += countLeafNodes(child));
  return count;
}

/**
 * Get max depth
 */
function getMaxDepth(node) {
  if (node.isAtomic()) return node.depth;
  let maxDepth = node.depth;
  node.children.forEach(child => {
    maxDepth = Math.max(maxDepth, getMaxDepth(child));
  });
  return maxDepth;
}

/**
 * Prompt for expectation
 */
async function promptForExpectation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n💭 Enter your high-level expectation/requirement:\n   ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main test function
 */
async function main() {
  console.log('\n🧪 Requirements Decomposition v2.0 - Industry Best Practices');
  console.log('━'.repeat(60));
  console.log('Features:');
  console.log('  • Level-by-level processing with context awareness');
  console.log('  • Dependency and duplication analysis');
  console.log('  • SOLID principles + DDD bounded contexts');
  console.log('  • BDD/TDD test patterns');
  console.log('  • Automatic optimization and refactoring');
  console.log('━'.repeat(60));
  console.log(`Max Depth: ${MAX_DEPTH} | Optimization: ${ENABLE_OPTIMIZATION ? 'ON' : 'OFF'}`);
  console.log('━'.repeat(60));

  try {
    // Verify Docker AI
    console.log('\n🔍 Checking Docker AI availability...');
    try {
      await axios.post(DOCKER_AI_URL, {
        model: MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      }, { timeout: 10000 });
      console.log('✅ Docker AI is available');
    } catch (error) {
      console.error('❌ Docker AI not available!');
      console.error(`   Expected at: ${DOCKER_AI_URL}`);
      process.exit(1);
    }

    // Get expectation
    const expectation = await promptForExpectation();
    if (!expectation) {
      console.error('\n❌ No expectation provided. Exiting.\n');
      process.exit(1);
    }

    console.log(`\n📋 Processing: "${expectation}"`);

    // Build tree with optimization
    const startTime = Date.now();
    const tree = await buildRequirementsTreeOptimized(expectation);
    const duration = Date.now() - startTime;

    // Display results
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 Final Requirements Tree');
    console.log('═'.repeat(60));
    console.log('');
    tree.print();

    // Statistics
    const totalNodes = countNodes(tree);
    const leafNodes = countLeafNodes(tree);
    const maxDepth = getMaxDepth(tree);

    console.log('\n' + '═'.repeat(60));
    console.log('📈 Statistics');
    console.log('═'.repeat(60));
    console.log(`Total Nodes:       ${totalNodes}`);
    console.log(`Leaf Nodes:        ${leafNodes} (atomic requirements)`);
    console.log(`Branch Nodes:      ${totalNodes - leafNodes}`);
    console.log(`Max Depth:         ${maxDepth}`);
    console.log(`Processing Time:   ${(duration / 1000).toFixed(1)}s (${(duration / totalNodes).toFixed(0)}ms per node avg)`);
    console.log(`Optimization:      ${ENABLE_OPTIMIZATION ? 'Enabled' : 'Disabled'}`);
    console.log('═'.repeat(60));

    // Export final JSON
    const outputFile = `C:\\temp\\requirements-final-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(tree.toJSON(), null, 2));
    console.log(`\n💾 Final tree saved to: ${outputFile}`);

    console.log('\n✅ Requirements decomposition completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
