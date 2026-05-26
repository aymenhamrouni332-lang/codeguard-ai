import { useState, useRef, useCallback } from "react";
import { analyzeCode, type AnalysisResult, type Suggestion } from "./utils/codeAnalysis";

const defaultCode = `function fetchData(url) {
  var data = [];
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status == 200) {
      data = JSON.parse(xhr.responseText);
    }
  };
  xhr.send();
  return data;
}

function processItems(items) {
  var results = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.active == true) {
      var processed = transform(item);
      results.push(processed);
    }
  }
  return results;
}

function evilEval(input) {
  var result = eval(input);
  document.getElementById('output').innerHTML = result;
  return result;
}`;

const presetSamples = [
  { name: "JavaScript (ES5)", code: defaultCode },
  { name: "React Component", code: `import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  var [user, setUser] = useState<User | null>(null);
  var [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/' + userId)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        setUser(data);
        setLoading(false);
        console.log("User loaded:", data);
      })
      .catch(function(error) {
        console.log(error);
      });
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile" onClick={handleClick}>
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
    </div>
  );
};

export default UserProfile;` },
  { name: "Security Issues", code: `// This code contains security vulnerabilities
const express = require('express');
const app = express();

const SECRET_KEY = "sk-1234567890abcdef";
const dbPassword = "admin123";

app.get('/user/:id', (req, res) => {
  const id = req.params.id;
  const query = "SELECT * FROM users WHERE id = " + id;
  db.query(query, (err, results) => {
    if (err) throw err;
    res.send(results);
  });
});

app.post('/render', (req, res) => {
  const template = req.body.template;
  var html = eval('"' + template + '"');
  res.send(html);
});

app.get('/config', (req, res) => {
  res.json({
    apiKey: SECRET_KEY,
    dbPassword: dbPassword
  });
});

app.listen(3000);` },
];

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    case "high": return "bg-orange-100 text-orange-700 border-orange-200";
    case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "low": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "security": return "🛡️";
    case "improvement": return "💡";
    case "performance": return "⚡";
    case "style": return "🎨";
    case "bug": return "🐛";
    default: return "📝";
  }
}

function getComplexityColor(complexity: string): string {
  switch (complexity) {
    case "low": return "text-green-600 bg-green-50 border-green-200";
    case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "high": return "text-red-600 bg-red-50 border-red-200";
    default: return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

function getScoreRing(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-yellow-500";
  return "stroke-red-500";
}

export default function App() {
  const [code, setCode] = useState(defaultCode);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "results">("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = useCallback(() => {
    if (!code.trim()) return;
    setAnalyzing(true);
    // Simulate analysis with a short delay for UX
    setTimeout(() => {
      const analysis = analyzeCode(code);
      setResult(analysis);
      setAnalyzing(false);
      setActiveTab("results");
    }, 400);
  }, [code]);

  const loadSample = useCallback((sampleCode: string) => {
    setCode(sampleCode);
    setResult(null);
    setActiveTab("editor");
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const clearCode = useCallback(() => {
    setCode("");
    setResult(null);
    setActiveTab("editor");
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  }, [handleAnalyze]);

  const lineCount = code.split("\n").length;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Animated grid background */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/80" />
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CodeReview AI</h1>
              <p className="text-[11px] text-slate-400">AI-Powered Code Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 sm:inline-block">
              Ctrl+Enter
            </kbd>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Sample selector */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Try a sample:</span>
          {presetSamples.map((sample) => (
            <button
              key={sample.name}
              onClick={() => loadSample(sample.code)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300 active:scale-95"
            >
              {sample.name}
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Editor Panel */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{lineCount} lines</span>
                  <button
                    onClick={copyCode}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={clearCode}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {/* Code editor */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (activeTab === "results") setActiveTab("editor");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste or type your code here..."
                  className="font-mono relative w-full resize-none border-0 bg-transparent p-4 text-sm leading-relaxed text-slate-100 placeholder-slate-600 outline-none focus:ring-0"
                  style={{ minHeight: "400px" }}
                  spellCheck={false}
                />
                {/* Line numbers overlay */}
                <div className="pointer-events-none absolute left-0 top-0 select-none p-4 font-mono text-sm leading-relaxed text-slate-600 opacity-0" aria-hidden="true">
                  {code.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!code.trim() || analyzing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Analyze Code
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2" ref={resultRef}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm">
              {/* Results header */}
              <div className="border-b border-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Analysis Results</h2>
                  {result && (
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                      {result.language}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                {!result && !analyzing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20">
                      <svg className="h-8 w-8 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-300">No analysis yet</p>
                    <p className="mt-1 text-xs text-slate-500">Paste some code and click Analyze</p>
                  </div>
                )}

                {analyzing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">Analyzing your code...</p>
                    <p className="mt-1 text-xs text-slate-500">Checking for improvements, security issues &amp; bugs</p>
                  </div>
                )}

                {result && !analyzing && (
                  <div className="space-y-4">
                    {/* Score */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                          <circle
                            cx="18" cy="18" r="15.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                            strokeDasharray={`${(result.score / 100) * 97.4} 97.4`}
                            className={getScoreRing(result.score)}
                          />
                        </svg>
                        <span className={`absolute text-lg font-bold ${getScoreColor(result.score)}`}>
                          {result.score}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Code Quality Score</p>
                        <p className="mt-0.5 text-xs text-slate-400">{result.summary}</p>
                      </div>
                    </div>

                    {/* Complexity badge */}
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${getComplexityColor(result.complexity)}`}>
                        {result.complexity.charAt(0).toUpperCase() + result.complexity.slice(1)} Complexity
                      </span>
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {result.suggestions.length} {result.suggestions.length === 1 ? "issue" : "issues"} found
                      </span>
                    </div>

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Issues Found</h3>
                        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                          {result.suggestions.map((suggestion, i) => (
                            <SuggestionCard key={i} suggestion={suggestion} />
                          ))}
                        </div>
                      </div>
                    )}

                    {result.suggestions.length === 0 && (
                      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                        <div className="mb-2 text-2xl">🎉</div>
                        <p className="text-sm font-medium text-green-400">Clean code detected!</p>
                        <p className="mt-1 text-xs text-green-400/60">No issues, security bugs, or improvements found.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all hover:border-white/20 hover:bg-white/[0.06]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
          {getTypeIcon(suggestion.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-medium text-slate-200">
              {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
            </p>
            {suggestion.line && (
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                L{suggestion.line}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{suggestion.message}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${getSeverityBadgeColor(suggestion.severity)}`}>
            {suggestion.severity}
          </span>
          <svg
            className={`h-3.5 w-3.5 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2">
          <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-3">
            <p className="text-xs font-medium text-violet-300">💡 Suggestion</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{suggestion.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
