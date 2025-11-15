// test-requirements-decomposition.js - Test AI-powered requirements decomposition
// Decomposes high-level expectations into hierarchical atomic sub-expectations with TDD expectations

const axios = require('axios');
const readline = require('readline');

// Configuration
const DOCKER_AI_URL = process.env.DOCKER_AI_URL || 'http://localhost:12434/engines/v1/chat/completions';
const MODEL = 'ai/phi4:latest';
const MAX_DEPTH = process.env.MAX_DEPTH ? parseInt(process.env.MAX_DEPTH) : 20; // Maximum recursion depth to prevent infinite loops

/**
 * Create a tree node for requirements
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
  }

  addChild(child) {
    this.children.push(child);
  }

  isAtomic() {
    return this.isLeaf || this.children.length === 0;
  }

  print(indent = 0) {
    const prefix = '  '.repeat(indent);
    const marker = this.isLeaf ? '🍃' : '📦';
    console.log(`${prefix}${marker} [${this.id}] ${this.expectation}`);
    if (this.tddExpectation) {
      console.log(`${prefix}   ✓ TDD: ${this.tddExpectation}`);
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
      children: this.children.map(c => c.toJSON())
    };
  }
}

/**
 * Call Docker AI to decompose an expectation
 */
async function decomposeExpectation(expectation, nodeId) {
  const prompt = `Analyze this software requirement and determine if it is ATOMIC based on single responsibility principle.

Requirement: "${expectation}"

A requirement is ATOMIC if:
1. It has a SINGLE, well-defined responsibility
2. It can be completed satisfactorily with a small AI model
3. A TDD test can fully cover the implemented expectation
4. It represents one cohesive unit of functionality

If this requirement is ATOMIC (single responsibility, testable, implementable by small model), respond with:
{
  "isAtomic": true,
  "tddExpectation": "A clear TDD test description that can verify this atomic requirement"
}

If this requirement should be DECOMPOSED into smaller single-responsibility modules, respond with:
{
  "isAtomic": false,
  "subExpectations": [
    {
      "name": "Module name",
      "expectation": "Clear description of what this module should do",
      "tddExpectation": "TDD test description for this module"
    }
  ]
}

Rules:
- Apply single responsibility principle strictly
- Each sub-expectation must be independently testable
- Limit to 3-5 sub-expectations maximum
- TDD expectations should describe WHAT to test, not HOW to implement
- Use JSON format only, no explanations

Your response:`;

  try {
    console.log(`\n🤖 [${nodeId}] Analyzing: "${expectation.substring(0, 60)}${expectation.length > 60 ? '...' : ''}"`);

    const response = await axios.post(DOCKER_AI_URL, {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3 // Lower temperature for more consistent JSON
    }, {
      timeout: 0 // No timeout - allow long-running decomposition
    });

    if (response.data?.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content.trim();

      // Extract JSON from markdown code blocks if present
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      try {
        const result = JSON.parse(jsonContent);
        console.log(`   ✓ ${result.isAtomic ? 'Atomic (leaf node)' : `Decomposed into ${result.subExpectations?.length || 0} sub-expectations`}`);
        return result;
      } catch (parseError) {
        console.error(`   ⚠️  Failed to parse AI response as JSON, treating as atomic`);
        console.error(`   Raw response: ${content.substring(0, 200)}`);
        return {
          isAtomic: true,
          tddExpectation: 'Implement and test this requirement'
        };
      }
    }

    throw new Error('Invalid response from Docker AI');
  } catch (error) {
    console.error(`   ❌ Error calling Docker AI: ${error.message}`);
    throw error;
  }
}

/**
 * Recursively decompose requirements into a tree
 */
async function buildRequirementsTree(expectation, nodeId = 'A', parent = null) {
  // Check depth limit
  const depth = parent ? parent.depth + 1 : 0;
  if (depth >= MAX_DEPTH) {
    console.log(`   ⚠️  Max depth (${MAX_DEPTH}) reached, treating as atomic`);
    const node = new RequirementNode(nodeId, expectation, 'Test at maximum depth', parent);
    node.isLeaf = true;
    return node;
  }

  // Create node
  const node = new RequirementNode(nodeId, expectation, null, parent);

  try {
    // Ask AI to decompose
    const decomposition = await decomposeExpectation(expectation, nodeId);

    if (decomposition.isAtomic) {
      // This is a leaf node
      node.isLeaf = true;
      node.tddExpectation = decomposition.tddExpectation || 'Implement and test this requirement';
      return node;
    }

    // This node has sub-expectations
    if (decomposition.subExpectations && decomposition.subExpectations.length > 0) {
      node.tddExpectation = `Integration test: Verify all ${decomposition.subExpectations.length} sub-modules work together`;

      // Recursively process each sub-expectation
      for (let i = 0; i < decomposition.subExpectations.length; i++) {
        const subExp = decomposition.subExpectations[i];
        const childId = `${nodeId}.${i + 1}`;

        console.log(`\n   ↳ Processing sub-expectation [${childId}]: ${subExp.name}`);

        const childNode = await buildRequirementsTree(
          subExp.expectation,
          childId,
          node
        );

        // Override TDD expectation if provided at this level
        if (subExp.tddExpectation) {
          childNode.tddExpectation = subExp.tddExpectation;
        }

        node.addChild(childNode);
      }
    } else {
      // No valid sub-expectations, treat as atomic
      node.isLeaf = true;
      node.tddExpectation = 'Implement and test this requirement';
    }

    return node;

  } catch (error) {
    console.error(`   ❌ Error processing node ${nodeId}: ${error.message}`);
    // On error, treat as atomic leaf node
    node.isLeaf = true;
    node.tddExpectation = 'Implement and test this requirement (decomposition failed)';
    return node;
  }
}

/**
 * Count nodes in tree
 */
function countNodes(node) {
  let count = 1; // This node
  node.children.forEach(child => {
    count += countNodes(child);
  });
  return count;
}

/**
 * Count leaf nodes in tree
 */
function countLeafNodes(node) {
  if (node.isAtomic()) {
    return 1;
  }
  let count = 0;
  node.children.forEach(child => {
    count += countLeafNodes(child);
  });
  return count;
}

/**
 * Get maximum depth of tree
 */
function getMaxDepth(node) {
  if (node.isAtomic()) {
    return node.depth;
  }
  let maxDepth = node.depth;
  node.children.forEach(child => {
    maxDepth = Math.max(maxDepth, getMaxDepth(child));
  });
  return maxDepth;
}

/**
 * Prompt user for expectation
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
async function testRequirementsDecomposition() {
  console.log('\n🧪 Test: AI-Powered Requirements Decomposition');
  console.log('━'.repeat(60));
  console.log('This tool decomposes high-level requirements into atomic');
  console.log('sub-expectations with TDD test descriptions.');
  console.log('━'.repeat(60));

  try {
    // Step 1: Verify Docker AI is available
    console.log('\n🔍 Checking Docker AI availability...');
    try {
      await axios.post(DOCKER_AI_URL, {
        model: MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      }, { timeout: 10000 });
      console.log('✅ Docker AI is available\n');
    } catch (error) {
      console.error('❌ Docker AI is not available!');
      console.error(`   Expected at: ${DOCKER_AI_URL}`);
      console.error('\n💡 Ensure:');
      console.error('   - Docker Desktop is running');
      console.error('   - Model Runner is enabled');
      console.error('   - Host TCP support is enabled');
      console.error('   - Port 12434 is accessible');
      process.exit(1);
    }

    // Step 2: Get expectation from user
    const expectation = await promptForExpectation();

    if (!expectation) {
      console.error('\n❌ No expectation provided. Exiting.\n');
      process.exit(1);
    }

    console.log(`\n📋 Processing: "${expectation}"`);
    console.log('━'.repeat(60));

    // Step 3: Build requirements tree
    const startTime = Date.now();
    const tree = await buildRequirementsTree(expectation);
    const duration = Date.now() - startTime;

    // Step 4: Display results
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 Requirements Tree');
    console.log('═'.repeat(60));
    console.log('');
    tree.print();

    // Step 5: Statistics
    const totalNodes = countNodes(tree);
    const leafNodes = countLeafNodes(tree);
    const maxDepth = getMaxDepth(tree);

    console.log('\n' + '═'.repeat(60));
    console.log('📈 Statistics');
    console.log('═'.repeat(60));
    console.log(`Total Nodes:      ${totalNodes}`);
    console.log(`Leaf Nodes:       ${leafNodes} (atomic requirements)`);
    console.log(`Branch Nodes:     ${totalNodes - leafNodes}`);
    console.log(`Max Depth:        ${maxDepth}`);
    console.log(`Processing Time:  ${(duration / 1000).toFixed(1)}s`);
    console.log('═'.repeat(60));

    // Step 6: Export JSON
    const jsonOutput = tree.toJSON();
    const fs = require('fs');
    const outputFile = `C:\\temp\\requirements-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
    console.log(`\n💾 Requirements tree saved to: ${outputFile}`);

    console.log('\n✅ Requirements decomposition completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testRequirementsDecomposition();
