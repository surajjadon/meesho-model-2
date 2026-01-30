"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCcw, AlertTriangle, Home, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = () => {
    const text = `Error: ${this.state.error?.message}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden p-6 font-sans">
          
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="relative z-10 w-full max-w-lg bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Icon Header */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 shadow-sm">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Application Error</h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                  We encountered an unexpected issue. You can try reloading the page, or return home if the problem persists.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md active:scale-95 font-medium text-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-all font-medium text-sm"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {/* Technical Details Toggle */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mx-auto uppercase tracking-wider"
              >
                {this.state.showDetails ? "Hide Technical Details" : "Show Technical Details"}
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left relative group animate-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={this.handleCopyError}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
                    title="Copy Error Log"
                  >
                    {this.state.copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                  
                  <div className="pr-6">
                    <p className="text-xs font-mono text-red-600 font-bold mb-2 break-words">
                      {this.state.error?.toString()}
                    </p>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
                        {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;