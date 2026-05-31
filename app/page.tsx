'use client';
import { useState, FormEvent } from 'react';

interface GitHubFile {
  path: string;
  name: string;
  url: string;
}

export default function Home() {
  const [owner, setOwner] = useState < string > ('');
  const [repo, setRepo] = useState < string > ('');
  const [files, setFiles] = useState < GitHubFile[] > ([]);
  const [selectedFiles, setSelectedFiles] = useState < string[] > ([]);
  const [loading, setLoading] = useState < boolean > (false);
  const [error, setError] = useState < string > ('');
  const [copied, setCopied] = useState < boolean > (false);
  
  const fetchFiles = async (e: FormEvent) => {
    e.preventDefault();
    if (!owner || !repo) return;
    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFiles([]);
    
    try {
      const res = await fetch(`/api/github?owner=${owner}&repo=${repo}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files);
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    finaly {
      setLoading(false);
    }
  };
  
  const toggleSelect = (url: string) => {
    if (selectedFiles.includes(url)) {
      setSelectedFiles(selectedFiles.filter(item => item !== url));
    } else {
      setSelectedFiles([...selectedFiles, url]);
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.url));
    }
  };
  
  const copyToClipboard = () => {
    if (selectedFiles.length === 0) return;
    const textToCopy = selectedFiles.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold text-emerald-400">GitHub URL Extractor (TS)</h1>
          <p className="text-sm text-gray-400 mt-1">เครื่องมือลิสต์และรวมลิงก์ไฟล์สำหรับส่งให้ AI</p>
        </header>

        <form onSubmit={fetchFiles} className="bg-gray-800 p-4 rounded-xl shadow-lg space-y-4 border border-gray-700">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">GitHub Owner</label>
            <input 
              type="text" 
              placeholder="เช่น fantrove" 
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Repository Name</label>
            <input 
              type="text" 
              placeholder="เช่น fantrove-page" 
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-semibold p-3 rounded-lg text-sm transition-colors active:scale-[0.98]"
          >
            {loading ? 'กำลังดึงข้อมูล...' : 'ดึงรายชื่อไฟล์'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {files.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col max-h-[50vh]">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 sticky top-0 rounded-t-xl">
              <span className="text-xs text-gray-400 font-medium">พบทั้งหมด {files.length} ไฟล์</span>
              <button 
                onClick={toggleSelectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded"
              >
                {selectedFiles.length === files.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>

            <div className="divide-y divide-gray-700 overflow-y-auto flex-1">
              {files.map((file) => {
                const isSelected = selectedFiles.includes(file.url);
                return (
                  <div 
                    key={file.url} 
                    onClick={() => toggleSelect(file.url)}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors active:bg-gray-750 ${isSelected ? 'bg-emerald-950/30' : 'hover:bg-gray-750'}`}
                  >
                    <div className="mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 bg-gray-900 border-gray-600 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 break-all">{file.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{file.path}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-semibold text-emerald-400">{selectedFiles.length}</span> ไฟล์ถูกเลือก
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex-1 font-semibold p-3 rounded-lg text-sm text-center transition-all active:scale-[0.98] ${copied ? 'bg-gray-700 text-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
            >
              {copied ? '✓ คัดลอกลิงก์แล้ว!' : 'คัดลอกรายชื่อลิงก์'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}