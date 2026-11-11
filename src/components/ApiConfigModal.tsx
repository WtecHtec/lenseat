/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Radio } from 'lucide-react';
import { useApiConfig, testServerConnection } from '../services/apiConfig';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose }) => {
  const { apiBaseUrl, setApiBaseUrl, isCustomConfigured } = useApiConfig();
  const [inputValue, setInputValue] = useState(apiBaseUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync state when modal opens or apiBaseUrl changes
  useEffect(() => {
    if (isOpen) {
      setInputValue(apiBaseUrl);
      setTestResult(null);
      setSaveSuccessNotice(false);
    }
  }, [isOpen, apiBaseUrl]);

  if (!isOpen) return null;

  const handleTestConnection = async (targetToTest = inputValue) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testServerConnection(targetToTest);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    setApiBaseUrl(trimmed);
    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
    }, 2500);
  };

  const handleResetToDefault = () => {
    setInputValue('');
    setApiBaseUrl('');
    setTestResult(null);
    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
    }, 2000);
  };

  const handleSetPreset = (presetUrl: string) => {
    setInputValue(presetUrl);
    setTestResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#0b0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C87D46]/15 border border-[#C87D46]/30 flex items-center justify-center text-[#E29B66]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white">
                服务端 API 配置
              </h2>
              <p className="text-[11px] text-neutral-400">
                支持独立运行前后端项目 & 跨域请求 (CORS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Current Status Pill */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/6 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>当前生效地址:</span>
              <span className="font-mono text-white font-medium">
                {apiBaseUrl ? apiBaseUrl : '同源 / 相对路径 (/api)'}
              </span>
            </div>
            {isCustomConfigured && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C87D46]/20 text-[#E29B66] border border-[#C87D46]/30 font-medium">
                自定义配置
              </span>
            )}
          </div>

          {/* Input & Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-300">
              后端服务 API 根地址 (API Base URL)
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setTestResult(null);
                }}
                placeholder="例如: http://localhost:3000 (留空为同源相对路径)"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-[#C87D46] focus:ring-1 focus:ring-[#C87D46] text-white placeholder-neutral-500 font-mono text-xs transition-colors outline-none"
              />
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              当单独运行前端（如 Vite <code className="text-[#E29B66]">http://localhost:5173</code>）时，请填写后端的实际访问地址。
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-neutral-500">快捷预设:</span>
              <button
                type="button"
                onClick={() => handleSetPreset('http://localhost:3204')}
                className="px-2.5 py-1 rounded-lg bg-[#C87D46]/20 hover:bg-[#C87D46]/30 border border-[#C87D46]/40 text-xs font-mono text-[#E29B66] hover:text-white transition-colors cursor-pointer"
              >
                http://localhost:3204 (PM2)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('http://localhost:3000')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                http://localhost:3000
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                清空 (使用同源 /api)
              </button>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTesting}
                onClick={() => handleTestConnection()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? '正在测试连接...' : '测试服务端连通性'}</span>
              </button>
              <span className="text-[11px] text-neutral-500">
                将请求 <code className="font-mono text-neutral-400">/api/health</code>
              </span>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                  testResult.ok
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/30 border-red-500/30 text-red-300'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-0.5">
                  <div className="font-medium">{testResult.message}</div>
                  {!testResult.ok && (
                    <div className="text-[11px] text-neutral-400">
                      提示：请先在终端运行 <code className="text-[#E29B66]">npm run dev:server</code> 启动后端服务。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Usage Instructions Box */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/6 space-y-2 text-xs">
            <div className="font-medium text-neutral-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#C87D46]" />
              <span>前后端独立执行操作指南</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-neutral-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-[#C87D46] font-mono shrink-0">1.</span>
                <span>
                  <strong>启动后端服务：</strong> 在终端运行 <code className="px-1 py-0.5 rounded bg-black/60 text-[#E29B66] font-mono">npm run dev:server</code>（默认端口 3000，已启用全域 CORS 跨域与 HLS 代理）。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C87D46] font-mono shrink-0">2.</span>
                <span>
                  <strong>启动前端开发：</strong> 在另一终端运行 <code className="px-1 py-0.5 rounded bg-black/60 text-[#E29B66] font-mono">npm run dev:client</code>（运行 Vite，默认端口 5173）。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#C87D46] font-mono shrink-0">3.</span>
                <span>
                  <strong>环境变量支持：</strong> 亦可在前端配置 <code className="px-1 py-0.5 rounded bg-black/60 text-white font-mono">.env.local</code> 的 <code className="text-[#E29B66]">VITE_API_BASE_URL=http://localhost:3000</code>。
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-white/[0.02]">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            重置为默认
          </button>

          <div className="flex items-center gap-2.5">
            {saveSuccessNotice && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已保存
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#C87D46] hover:bg-[#d68a52] text-neutral-950 font-medium text-xs transition-colors cursor-pointer shadow-lg shadow-[#C87D46]/20"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
