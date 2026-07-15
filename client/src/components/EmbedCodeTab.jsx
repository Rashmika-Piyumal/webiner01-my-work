import { useState } from 'react';
import { buildEmbedSnippet } from '../lib/embedSnippet';

const DEMO_URL = 'http://localhost:5175';

export default function EmbedCodeTab({ bot }) {
  const [copied, setCopied] = useState(false);

  const snippet = buildEmbedSnippet(bot.embedKey);

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Embed Code</h2>

      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
        <code>{snippet}</code>
      </pre>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Copy Embed Code
          </button>
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white">
              Copied!
            </span>
          )}
        </div>
        <a
          href={DEMO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Test in widget →
        </a>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Paste this snippet inside the &lt;head&gt; tag of your website. The chat widget will
        appear on every page.
      </p>
    </div>
  );
}
