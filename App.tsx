
import React, { useState, useCallback, useRef } from 'react';
import { MindMapNodeData } from './types';
import { MindMapDisplay, MindMapDisplayHandle } from './components/MindMapDisplay';
import { generateMindMap } from './services/geminiService';
import { Loader2, Zap, XCircle, Download } from 'lucide-react'; // Using lucide-react for icons

const App: React.FC = () => {
  const [centralIdea, setCentralIdea] = useState<string>('');
  const [mindMapData, setMindMapData] = useState<MindMapNodeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mindMapDisplayRef = useRef<MindMapDisplayHandle>(null);

  const handleGenerateMindMap = useCallback(async () => {
    if (!centralIdea.trim()) {
      setError('Please enter a central idea.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMindMapData(null); 
    try {
      const data = await generateMindMap(centralIdea);
      setMindMapData(data);
    } catch (err) {
      console.error('Failed to generate mind map:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Check console for details.');
      setMindMapData(null);
    } finally {
      setIsLoading(false);
    }
  }, [centralIdea]);

  const handleClear = useCallback(() => {
    setCentralIdea('');
    setMindMapData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleExportSVG = useCallback(() => {
    if (mindMapDisplayRef.current) {
      mindMapDisplayRef.current.exportSVG();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          Mind Map Generator
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Visualize your ideas with AI-powered mind maps. Click nodes to expand/collapse.
        </p>
      </header>

      <div className="w-full max-w-2xl bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            value={centralIdea}
            onChange={(e) => setCentralIdea(e.target.value)}
            placeholder="Enter central idea (e.g., 'Future of AI')"
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-slate-500"
            disabled={isLoading}
            aria-label="Central Idea Input"
          />
          <button
            onClick={handleGenerateMindMap}
            disabled={isLoading || !centralIdea.trim()}
            className="flex items-center justify-center p-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            aria-label="Generate Mind Map"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
            ) : (
              <Zap className="mr-2 h-5 w-5" />
            )}
            Generate Map
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
              onClick={handleClear}
              disabled={isLoading && !mindMapData} // Keep disabled logic as is or refine if needed
              className="flex-grow sm:flex-grow-0 p-3 bg-slate-600 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors disabled:opacity-50"
              aria-label="Clear Input and Map"
            >
            Clear
          </button>
          {mindMapData && (
            <button
              onClick={handleExportSVG}
              disabled={isLoading}
              className="flex-grow sm:flex-grow-0 flex items-center justify-center p-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              aria-label="Export Mind Map as SVG"
            >
              <Download className="mr-2 h-5 w-5" />
              Export SVG
            </button>
          )}
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="mt-4 p-3 bg-red-700/50 border border-red-600 text-red-200 rounded-lg flex items-center">
            <XCircle className="h-5 w-5 mr-2 text-red-300" />
            <span>{error}</span>
          </div>
        )}
      </div>
      
      <div className="w-full flex-grow flex items-center justify-center p-4 bg-slate-800/50 rounded-xl shadow-xl overflow-auto min-h-[500px]">
        {isLoading && !mindMapData && (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-slate-400">
            <Loader2 className="animate-spin h-12 w-12 mb-4" />
            <p className="text-xl">Generating your mind map...</p>
            <p>This might take a moment.</p>
          </div>
        )}
        {!isLoading && !mindMapData && !error && (
           <div className="text-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit mx-auto mb-4"><path d="M12 5a3 3 0 1 0-5.993 1.003c.005-.002.01-.003.015-.003H12V5Z"/><path d="M12 19a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/><path d="M12 13a3 3 0 1 0 5.993-1.003C17.995 12.002 17.99 12 17.985 12H12v1Z"/><path d="M6 12a3 3 0 1 0-5.993-1.003C.005 11.002.01 11 .015 11H6v1Z"/><path d="M5 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/><path d="M19 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/><path d="M12 5V2"/><path d="M12 19v3"/><path d="M19 12h3"/><path d="M2 12H5"/><path d="M12 13v-1h5.975"/><path d="M12 5V6H6.015"/><path d="M18.076 10.322a3 3 0 0 0-2.149-2.149"/><path d="M5.924 13.678a3 3 0 0 1 2.149 2.149"/><path d="M5.924 10.322a3 3 0 0 0-2.149 2.149"/><path d="M18.076 13.678a3 3 0 0 1 2.149-2.149"/></svg>
            <p className="text-xl">Your mind map will appear here.</p>
            <p>Enter an idea above and click "Generate Map".</p>
          </div>
        )}
        {mindMapData && <MindMapDisplay ref={mindMapDisplayRef} data={mindMapData} width={1200} height={800} />}
      </div>
       <footer className="w-full max-w-4xl mt-8 text-center text-slate-500 text-sm">
        <p>© 2025 Mind Map. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;