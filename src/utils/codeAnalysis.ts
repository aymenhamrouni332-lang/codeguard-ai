export interface Suggestion {
  type: "improvement" | "security" | "performance" | "style" | "bug";
  line?: number;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestion: string;
}

export interface AnalysisResult {
  summary: string;
  suggestions: Suggestion[];
  score: number;
  complexity: "low" | "medium" | "high";
  language: string;
}

function detectLanguage(code: string): string {
  if (/^\s*(import|export|const|let|var|function|class|=>|console)/m.test(code) && 
      /[{}]/.test(code) && /[;]/.test(code)) {
    if (/<(div|span|h1|p|button|React|useState|useEffect)/.test(code)) return "React/JSX";
    if (/import\s+.*\s+from/.test(code) || /require\(/.test(code)) {
      if (/\.tsx?/.test(code) || /:\s*\w+/.test(code)) return "TypeScript";
      return "JavaScript (ES6+)";
    }
    return "JavaScript";
  }
  if (/^\s*(def|class|import|from|print|if __name__)/m.test(code)) return "Python";
  if (/^\s*(fn|pub|let|mut|impl|use|enum|struct)/m.test(code)) return "Rust";
  if (/^\s*(package|func|var |type |interface|import\s+\()/m.test(code)) return "Go";
  if (/^\s*(#include|int main|std::|template|class\s+\w+\s*\{)/m.test(code)) return "C++";
  if (/^\s*(public\s+class|private|protected|import java|System\.out)/m.test(code)) return "Java";
  if (/^\s*(<!DOCTYPE|<html|<div|<body)/im.test(code)) return "HTML";
  if (/^\s*(\{|"|\$variable|array\()/m.test(code)) return "PHP";
  return "Unknown";
}

function analyzeComplexity(code: string): "low" | "medium" | "high" {
  const lines = code.split("\n").length;
  const hasLoops = /(for|while|do\s*\{)/.test(code);
  const hasNestedLoops = /(?:for|while)[^{}]*\{(?:[^{}]*\{[^{}]*\})/.test(code);
  // Recursion detection - check if function name appears in its own body
const hasRecursion = false; // Simple heuristic disabled due to regex limitations; function-level analysis would be more precise
  const conditions = (code.match(/if|else if|switch|case/g) || []).length;

  if (lines > 200 || hasNestedLoops || hasRecursion || conditions > 15) return "high";
  if (lines > 50 || hasLoops || conditions > 5) return "medium";
  return "low";
}

function calculateScore(suggestions: Suggestion[]): number {
  let score = 100;
  for (const s of suggestions) {
    if (s.severity === "critical") score -= 20;
    else if (s.severity === "high") score -= 10;
    else if (s.severity === "medium") score -= 5;
    else score -= 2;
  }
  return Math.max(0, score);
}

export function analyzeCode(code: string): AnalysisResult {
  const suggestions: Suggestion[] = [];
  const language = detectLanguage(code);
  const lines = code.split("\n");
  const complexity = analyzeComplexity(code);

  // Security checks
  if (/eval\s*\(/.test(code)) {
    suggestions.push({
      type: "security",
      message: "Use of eval() detected",
      severity: "critical",
      suggestion: "Avoid eval() as it executes arbitrary code. Use JSON.parse() for JSON, or safer alternatives for dynamic execution.",
    });
  }

  if (/innerHTML\s*=/.test(code)) {
    suggestions.push({
      type: "security",
      message: "Direct innerHTML assignment can lead to XSS",
      severity: "high",
      suggestion: "Use textContent or DOM methods like createElement(). If you must use innerHTML, sanitize the input first.",
    });
  }

  if (/document\.write\s*\(/.test(code)) {
    suggestions.push({
      type: "security",
      message: "Use of document.write()",
      severity: "high",
      suggestion: "Avoid document.write(). Use DOM manipulation methods like createElement() or innerHTML with sanitization.",
    });
  }

  if (/(localStorage|sessionStorage)\.(getItem|setItem)/.test(code) && !/encrypt|hash/.test(code)) {
    suggestions.push({
      type: "security",
      message: "Sensitive data in browser storage without encryption",
      severity: "medium",
      suggestion: "Avoid storing sensitive data (passwords, tokens) in localStorage/sessionStorage. Consider using httpOnly cookies or encrypt before storing.",
    });
  }

  if (/new\s+Function\s*\(/.test(code)) {
    suggestions.push({
      type: "security",
      message: "Dynamic Function constructor can execute arbitrary code",
      severity: "critical",
      suggestion: "Avoid using the Function constructor. Use predefined functions or safer patterns.",
    });
  }

  if (/setTimeout\s*\(\s*["']/.test(code) || /setInterval\s*\(\s*["']/.test(code)) {
    suggestions.push({
      type: "security",
      message: "String argument to setTimeout/setInterval",
      severity: "high",
      suggestion: "Pass a function reference instead of a string. String arguments are eval'd similarly to eval().",
    });
  }

  if (/\.env|API_KEY|secret|password|token|credential/i.test(code) && !/process\.env/i.test(code)) {
    suggestions.push({
      type: "security",
      message: "Possible hardcoded credentials or secrets",
      severity: "critical",
      suggestion: "Never hardcode secrets, API keys, or passwords. Use environment variables and a .env file.",
    });
  }

  if (/new\s+Worker\s*\(/.test(code) && code.includes("blob:")) {
    suggestions.push({
      type: "security",
      message: "Worker from blob URL may bypass CSP",
      severity: "medium",
      suggestion: "Use a separate file for workers rather than creating them from blobs.",
    });
  }

  // Code improvement checks
  if (code.includes("var ")) {
    suggestions.push({
      type: "improvement",
      message: "Usage of var instead of let or const",
      severity: "medium",
      suggestion: "Replace 'var' with 'const' for values that don't change, or 'let' for mutable variables. This prevents hoisting issues and improves scope safety.",
    });
  }

  if (/==\s/.test(code) && !/===\s/.test(code)) {
    suggestions.push({
      type: "improvement",
      message: "Use of loose equality (==) instead of strict equality (===)",
      severity: "medium",
      suggestion: "Use === (strict equality) to avoid type coercion issues. == can lead to unexpected bugs like 0 == '0' being true.",
    });
  }

  if (/console\.log/.test(code)) {
    suggestions.push({
      type: "improvement",
      message: "Console.log left in production code",
      severity: "low",
      suggestion: "Remove console.log statements before deploying to production. Consider using a proper logging library for debugging.",
    });
  }

  if (/for\s*\(\s*(let|var)\s+\w+\s*=\s*0/.test(code)) {
    suggestions.push({
      type: "performance",
      message: "Traditional for loop could use array methods",
      severity: "low",
      suggestion: "Consider using forEach(), map(), filter(), or reduce() for more readable and functional code.",
    });
  }

  if (/\{\s*\w+\s*\}\s*\.length/.test(code) || /\b\d+\b/.test(lines.slice(-1).join(" "))) {
    // Check for magic numbers
  }

  // Check for magic numbers
  let magicNumberCount = 0;
  const commonConstants = [0, 1, -1, 100, 200, 404, 500];
  for (const line of lines) {
    const numbers = line.match(/\b\d{2,}\b/g);
    if (numbers) {
      for (const num of numbers) {
        const n = parseInt(num);
        if (!commonConstants.includes(n) && magicNumberCount < 3) {
          magicNumberCount++;
        }
      }
    }
  }

  if (magicNumberCount >= 2) {
    suggestions.push({
      type: "improvement",
      message: "Magic numbers found in code",
      severity: "low",
      suggestion: "Extract magic numbers into named constants for better maintainability and readability.",
    });
  }

  // Check for nested callbacks (callback hell)
  const callbackDepth = (code.match(/\bfunction\s*\([^)]*\)\s*\{[^}]*\bfunction\s*\(/g) || []).length;
  if (callbackDepth > 1) {
    suggestions.push({
      type: "improvement",
      message: "Deeply nested callbacks (callback hell)",
      severity: "medium",
      suggestion: "Use async/await or Promises to flatten nested callbacks and improve code readability.",
    });
  }

  // Check for long functions
  const functionRegex = /(?:function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const startPos = match.index;
    const funcName = match[1] || match[0].split(/\s|\(/).filter(Boolean)[1] || "anonymous";
    let braceCount = 0;
    let funcEnd = startPos;
    let started = false;
    for (let i = startPos; i < code.length; i++) {
      if (code[i] === "{") { braceCount++; started = true; }
      else if (code[i] === "}") { braceCount--; }
      if (started && braceCount === 0) { funcEnd = i; break; }
    }
    const funcCode = code.substring(startPos, funcEnd + 1);
    const funcLines = funcCode.split("\n").length;
    if (funcLines > 30 && funcName !== "anonymous") {
      suggestions.push({
        type: "improvement",
        message: `Function '${funcName}' is too long (${funcLines} lines)`,
        severity: "medium",
        suggestion: "Consider breaking this function into smaller, single-responsibility functions for better testability and readability.",
      });
      break; // Only report once
    }
  }

  // Performance checks
  if (/\.querySelector(All)?\s*\(/g.test(code) && /\.(addEventListener|onclick|onchange)/.test(code)) {
    // Already handled - DOM queries are okay
  }

  // ES5 patterns
  if (code.includes(".bind(this)")) {
    suggestions.push({
      type: "improvement",
      message: "Usage of .bind(this) for context binding",
      severity: "low",
      suggestion: "Use arrow functions for automatic lexical scoping instead of .bind(this) for cleaner code.",
    });
  }

  // Empty catch blocks
  const emptyCatch = code.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
  if (emptyCatch) {
    suggestions.push({
      type: "improvement",
      message: "Empty catch block - errors are being silently ignored",
      severity: "high",
      suggestion: "Always handle errors in catch blocks. At minimum, log the error with console.error(). Better yet, implement proper error recovery.",
    });
  }

  // Style checks
  if (/\bany\b/.test(code)) {
    suggestions.push({
      type: "style",
      message: "Usage of 'any' type in TypeScript",
      severity: "medium",
      suggestion: "Avoid 'any' type as it defeats TypeScript's purpose. Use 'unknown' if the type is truly unknown, or better type definitions.",
    });
  }

  if (/@ts-ignore/.test(code)) {
    suggestions.push({
      type: "style",
      message: "Usage of @ts-ignore directive",
      severity: "medium",
      suggestion: "Use @ts-expect-error instead of @ts-ignore, as it will warn you when the error is no longer present. Better yet, fix the underlying type issue.",
    });
  }

  // Check for mutation of function parameters
  if (/\w+\s*\([^)]*\w+[^)]*\)\s*\{[^}]*=(?!=)/.test(code)) {
    // Parameter mutation is complex to detect, so we do a simpler check
    const params = code.match(/(?:function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:async\s*)?\(|\(?)\s*(\w+(?:\s*,\s*\w+)*)\s*(?=\)|:)/);
    if (params && params[1]) {
      const paramNames = params[1].split(",").map((p: string) => p.trim().split(":")[0].split("=")[0].trim()).filter(Boolean);
      for (const p of paramNames) {
        if (p && p.length > 1 && new RegExp(`${p}\\s*=`).test(code) && !new RegExp(`${p}\\s*=\\s*${p}\\s*\\+`).test(code)) {
          suggestions.push({
            type: "improvement",
            message: `Parameter '${p}' is being mutated`,
            severity: "low",
            suggestion: "Avoid mutating function parameters. Create a local copy instead for better predictability.",
          });
          break;
        }
      }
    }
  }

  // DOM performance
  if (/\.innerHTML\s*\+=/.test(code)) {
    suggestions.push({
      type: "performance",
      message: "Repeated innerHTML concatenation in a loop or frequent operation",
      severity: "medium",
      suggestion: "Use document.createDocumentFragment() or build the HTML string first, then assign it once to minimize DOM reflows.",
    });
  }

  // Global variables
  if (/^\s*\w+\s*=\s*(?!function|class)/m.test(code) && !/^\s*(let|const|var|export|import)/m.test(code)) {
    suggestions.push({
      type: "improvement",
      message: "Possible global variable declaration",
      severity: "high",
      suggestion: "Always use let, const, or var to declare variables. Implicit globals can cause hard-to-find bugs and pollute the global namespace.",
    });
  }

  // Check for missing semicolons (for languages that use them)
  if (language.includes("JavaScript") || language.includes("TypeScript")) {
    // Only flag if inconsistent
    const semicolonLines = lines.filter(l => /;$/.test(l.trim())).length;
    const noSemicolonLines = lines.filter(l => 
      /^\s*\w+/.test(l) && 
      !/[{};]\s*$/.test(l) && 
      !/^\s*(if|for|while|switch|catch|function|class|import|export|const|let|var)\s/.test(l) &&
      !/^\s*\/\//.test(l) &&
      !/^\s*\(/.test(l) &&
      !/^\s*```/.test(l)
    ).length;
    if (noSemicolonLines > 3 && semicolonLines > 3) {
      suggestions.push({
        type: "style",
        message: "Inconsistent use of semicolons",
        severity: "low",
        suggestion: "Choose either semicolons or no semicolons and be consistent. Use a linter like ESLint with semi rule to enforce this.",
      });
    }
  }

  // Check for unused variables (simple heuristic)
  const varDeclarations = code.match(/(?:const|let|var)\s+(\w+)\s*=/g);
  if (varDeclarations) {
    for (const decl of varDeclarations) {
      const varName = decl.replace(/(?:const|let|var)\s+/, "").replace(/\s*=/, "");
      if (varName && varName !== "_" && code.indexOf(varName) === decl.indexOf(varName)) {
        const occurrences = (code.match(new RegExp(`\\b${varName}\\b`, "g")) || []).length;
        if (occurrences === 1) {
          suggestions.push({
            type: "improvement",
            message: `Variable '${varName}' appears to be unused`,
            severity: "low",
            suggestion: `Remove unused variable '${varName}' or use it where intended.`,
          });
        }
      }
    }
  }

  const score = calculateScore(suggestions);

  // Generate summary
  const securityIssues = suggestions.filter(s => s.type === "security").length;
  const improvements = suggestions.filter(s => s.type === "improvement").length;
  const perfIssues = suggestions.filter(s => s.type === "performance").length;
  const styleIssues = suggestions.filter(s => s.type === "style").length;

  let summary = "";
  if (suggestions.length === 0) {
    summary = "Your code looks clean! No issues detected. Keep up the great work!";
  } else {
    const parts: string[] = [];
    if (securityIssues) parts.push(`${securityIssues} security ${securityIssues === 1 ? "issue" : "issues"}`);
    if (improvements) parts.push(`${improvements} improvement ${improvements === 1 ? "suggestion" : "suggestions"}`);
    if (perfIssues) parts.push(`${perfIssues} performance ${perfIssues === 1 ? "concern" : "concerns"}`);
    if (styleIssues) parts.push(`${styleIssues} style ${styleIssues === 1 ? "issue" : "issues"}`);
    summary = `Found ${suggestions.length} ${suggestions.length === 1 ? "issue" : "issues"}: ${parts.join(", ")}.`;
  }

  return {
    summary,
    suggestions,
    score,
    complexity,
    language,
  };
}
