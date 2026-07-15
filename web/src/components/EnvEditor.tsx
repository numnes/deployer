'use client';

import {
  envVarsToDotenv,
  envVarsToRows,
  isValidEnvKey,
  parseDotenv,
  rowsToEnvVars,
  type EnvVarsMap,
} from '@/lib/env-vars';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

type Mode = 'text' | 'table';

type Props = {
  value: EnvVarsMap;
  onChange: (next: EnvVarsMap) => void;
  disabled?: boolean;
  /** Texto curto sob o título (opcional). */
  hint?: string;
};

export function EnvEditor({ value, onChange, disabled, hint }: Props) {
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('table');
  const [text, setText] = useState(() => envVarsToDotenv(value));
  const [rows, setRows] = useState(() => {
    const sorted = envVarsToRows(value);
    return sorted.length ? sorted : [{ key: '', value: '' }];
  });
  const skipSync = useRef(false);

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setText(envVarsToDotenv(value));
    const sorted = envVarsToRows(value);
    setRows(sorted.length ? sorted : [{ key: '', value: '' }]);
  }, [value]);

  const commitMap = useCallback(
    (next: EnvVarsMap) => {
      skipSync.current = true;
      onChange(next);
    },
    [onChange],
  );

  const applyText = (raw: string) => {
    setText(raw);
    commitMap(parseDotenv(raw));
  };

  const applyRows = (nextRows: Array<{ key: string; value: string }>) => {
    setRows(nextRows);
    commitMap(rowsToEnvVars(nextRows));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-[#3d4048] p-0.5">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs ${
              mode === 'table'
                ? 'bg-white/10 text-[#e8eaed]'
                : 'text-[#8b919a] hover:text-[#e8eaed]'
            }`}
            disabled={disabled}
            onClick={() => setMode('table')}
          >
            Table
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs ${
              mode === 'text'
                ? 'bg-white/10 text-[#e8eaed]'
                : 'text-[#8b919a] hover:text-[#e8eaed]'
            }`}
            disabled={disabled}
            onClick={() => {
              setText(envVarsToDotenv(rowsToEnvVars(rows)));
              setMode('text');
            }}
          >
            Plain text
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            id={fileInputId}
            type="file"
            accept=".env,text/plain,*/*"
            className="hidden"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const raw = await file.text();
              applyText(raw);
              setMode('text');
            }}
          />
          <button
            type="button"
            className="btn text-xs"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            Load .env file
          </button>
        </div>
      </div>

      {hint ? <p className="text-xs text-[#8b919a]">{hint}</p> : null}

      {mode === 'text' ? (
        <textarea
          className="input min-h-[160px] font-mono text-xs leading-relaxed"
          disabled={disabled}
          spellCheck={false}
          value={text}
          placeholder={'KEY=value\nANOTHER_KEY="value with spaces"'}
          onChange={(e) => applyText(e.target.value)}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#3d4048]">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#3d4048] text-xs text-[#8b919a]">
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const keyInvalid = row.key.trim() !== '' && !isValidEnvKey(row.key.trim());
                return (
                  <tr key={idx} className="border-b border-[#3d4048]/last:border-0">
                    <td className="px-2 py-1.5 align-top">
                      <input
                        className={`input font-mono text-xs ${
                          keyInvalid ? 'border-rose-400/50' : ''
                        }`}
                        disabled={disabled}
                        value={row.key}
                        placeholder="KEY"
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], key: e.target.value };
                          applyRows(next);
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <input
                        className="input font-mono text-xs"
                        disabled={disabled}
                        value={row.value}
                        placeholder="value"
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], value: e.target.value };
                          applyRows(next);
                        }}
                      />
                    </td>
                    <td className="px-1 py-1.5 align-top">
                      <button
                        type="button"
                        className="btn px-2 text-xs text-rose-200/80"
                        disabled={disabled || rows.length <= 1}
                        title="Remove row"
                        onClick={() => {
                          const next = rows.filter((_, i) => i !== idx);
                          applyRows(next.length ? next : [{ key: '', value: '' }]);
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-[#3d4048] px-2 py-2">
            <button
              type="button"
              className="btn text-xs"
              disabled={disabled}
              onClick={() => applyRows([...rows, { key: '', value: '' }])}
            >
              Add variable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
