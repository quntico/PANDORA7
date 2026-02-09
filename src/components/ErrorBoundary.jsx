import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Algo salió mal 😔</h1>
                    <p className="text-lg mb-4">La aplicación ha encontrado un error inesperado.</p>
                    <div className="bg-gray-800 p-4 rounded-lg overflow-auto max-w-full max-h-[50vh] mb-4 border border-gray-700">
                        <p className="font-mono text-red-400 break-words whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        {this.state.errorInfo && (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-gray-400 hover:text-white">Ver detalles técnicos</summary>
                                <pre className="mt-2 text-xs text-gray-500 overflow-auto">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
