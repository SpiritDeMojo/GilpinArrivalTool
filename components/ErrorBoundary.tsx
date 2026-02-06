import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-lg w-full bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 shadow-2xl border border-red-500/20 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <span className="text-3xl">⚠️</span>
                        </div>

                        <h2 className="text-xl font-black uppercase tracking-widest text-red-500 mb-2">
                            Something Went Wrong
                        </h2>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            An unexpected error occurred. Don't worry, your data is safe.
                        </p>

                        {this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600">
                                    Technical Details
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-100 dark:bg-stone-800 rounded-xl text-[10px] overflow-x-auto text-red-600 dark:text-red-400">
                                    {this.state.error.message}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-[#c5a065] text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#b89155] transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-slate-200 dark:bg-stone-700 text-slate-700 dark:text-slate-200 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-stone-600 transition-all"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
