'use client';
import { useState, useEffect, FormEvent, MouseEvent } from 'react';

interface GitHubFile {
  path: string;
  name: string;
  url: string;
}

interface SavedProject {
  owner: string;
  repo: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  url?: string;
  children: { [key: string]: TreeNode };
}

export default function Home() {
  const [owner, setOwner] = useState<string>('');
  const [repo, setRepo] = useState<string>('');
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  useEffect(() => {
    const localData = localStorage.getItem('gv_saved_projects');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setSavedProjects(parsed);
        if (parsed.length > 0) {
          setIsFormOpen(false);
          setOwner(parsed[0].owner);
          setRepo(parsed[0].repo);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchFiles = async (currentOwner = owner, currentRepo = repo) => {
    if (!currentOwner || !currentRepo) return;
    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFiles([]);
    setExpandedFolders([]);
    
    try {
      const res = await fetch(`/api/github?owner=${currentOwner}&repo=${currentRepo}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files);
        setIsFormOpen(false);
        saveProject(currentOwner, currentRepo);
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchFiles(owner, repo);
  };

  const saveProject = (newOwner: string, newRepo: string) => {
    const isExist = savedProjects.some(
      (p) => p.owner.toLowerCase() === newOwner.toLowerCase() && p.repo.toLowerCase() === newRepo.toLowerCase()
    );
    if (!isExist) {
      const updated = [{ owner: newOwner, repo: newRepo }, ...savedProjects];
      setSavedProjects(updated);
      localStorage.setItem('gv_saved_projects', JSON.stringify(updated));
    }
  };

  const deleteProject = (e: MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    const updated = savedProjects.filter((_, i) => i !== indexToDelete);
    setSavedProjects(updated);
    localStorage.setItem('gv_saved_projects', JSON.stringify(updated));
  };

  const handleSelectSaved = (proj: SavedProject) => {
    setOwner(proj.owner);
    setRepo(proj.repo);
    fetchFiles(proj.owner, proj.repo);
  };

  const toggleSelect = (url: string) => {
    if (selectedFiles.includes(url)) {
      setSelectedFiles(selectedFiles.filter(item => item !== url));
    } else {
      setSelectedFiles([...selectedFiles, url]);
    }
  };

  const toggleFolder = (folderPath: string) => {
    if (expandedFolders.includes(folderPath)) {
      setExpandedFolders(expandedFolders.filter(p => p !== folderPath));
    } else {
      setExpandedFolders([...expandedFolders, folderPath]);
    }
  };

  const copyToClipboard = () => {
    if (selectedFiles.length === 0) return;
    const textToCopy = selectedFiles.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildFileTree = (fileList: GitHubFile[]): TreeNode => {
    const root: TreeNode = { name: 'root', path: '', type: 'folder', children: {} };
    
    fileList.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'folder',
            url: isLast ? file.url : undefined,
            children: {}
          };
        }
        current = current.children[part];
      });
    });

    return root;
  };

  const RenderTree = ({ node, depth = 0 }: { node: TreeNode; depth: number }) => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const typeA = node.children[a].type;
      const typeB = node.children[b].type;
      if (typeA === typeB) return a.localeCompare(b);
      return typeA === 'folder' ? -1 : 1;
    });

    return (
      <div className="w-full space-y-1">
        {sortedKeys.map(key => {
          const item = node.children[key];
          const isFolder = item.type === 'folder';
          const isExpanded = expandedFolders.includes(item.path);
          const isFileSelected = item.url ? selectedFiles.includes(item.url) : false;

          return (
            <div key={item.path} className="w-full min-w-0">
              {isFolder ? (
                // แถบโฟลเดอร์ดีไซน์โค้งมนพิเศษ มิติใหม่
                <div 
                  onClick={() => toggleFolder(item.path)}
                  style={{ paddingLeft: `${Math.min(depth * 8, 24) + 12}px` }}
                  className={`flex items-center gap-3 py-3.5 pr-3 rounded-2xl hover:bg-gray-800/50 active:bg-gray-800 text-gray-200 font-semibold text-sm cursor-pointer select-none transition-all duration-200 min-w-0 ${isExpanded ? 'bg-gray-800/25 text-emerald-400' : ''}`}
                >
                  <span className="text-gray-500 text-[10px] transition-transform duration-200 inline-block w-3 text-center">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="text-lg flex-shrink-0">📁</span>
                  <span className="truncate tracking-wide pr-2">{item.name}</span>
                </div>
              ) : (
                // แถบไฟล์ดีไซน์มนกลม จิ้มง่าย ล็อกไม่ให้ดันขอบขวา
                <div 
                  onClick={() => item.url && toggleSelect(item.url)}
                  style={{ paddingLeft: `${Math.min(depth * 8, 24) + 12}px` }}
                  className={`flex items-center gap-3 py-3.5 pr-3 rounded-2xl cursor-pointer transition-all duration-150 border active:scale-[0.99] min-w-0 ${isFileSelected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'hover:bg-gray-800/30 text-gray-300 border-transparent'}`}
                >
                  <div className="flex items-center justify-center flex-shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isFileSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded-full text-emerald-600 bg-gray-950 border-gray-700 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <span className="text-lg flex-shrink-0">📄</span>
                  <span className="text-xs font-mono truncate tracking-wide pr-2">{item.name}</span>
                </div>
              )}

              {/* ส่วนควบคุมความลึก: ใช้เส้น Guide Lines บางๆ และจำกัดการเยื้องขวาไม่ให้ล้นจอ */}
              {isFolder && isExpanded && (
                <div className="w-full border-l border-gray-800/40 ml-4 my-0.5 min-w-0">
                  <RenderTree node={item} depth={depth + 1} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const fileTree = buildFileTree(files);

  return (
    // ครอบด้วยโอเวอร์โฟลว์แบบซ่อนแกน X ทั้งหน้าเว็บ ป้องกันจอดุ๊กดิ๊ก
    <main className="min-h-screen bg-[#070a0f] text-gray-100 p-5 font-sans selection:bg-emerald-500 selection:text-white pb-36 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6 overflow-x-hidden">
        
        {/* Header โค้งมน ทันสมัย */}
        <header className="flex justify-between items-center py-4 border-b border-gray-900">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Git Linker</h1>
            {files.length > 0 && (
              <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate max-w-[180px]">
                คลัง: <span className="text-gray-400 font-mono font-normal">{repo}</span>
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`text-xs font-bold tracking-wider uppercase px-4 py-3 rounded-2xl border transition-all active:scale-95 ${isFormOpen ? 'bg-gray-850 border-gray-750 text-gray-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-md'}`}
          >
            {isFormOpen ? '✕ ปิดแผง' : '⚡ สลับคลัง'}
          </button>
        </header>

        {isFormOpen && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200 overflow-x-hidden">
            {savedProjects.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">คลังล่าสุดของคุณ</label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-0.5">
                  {savedProjects.map((proj, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectSaved(proj)}
                      className="flex items-center gap-2 bg-gray-900/60 hover:bg-gray-850 border border-gray-850 rounded-2xl pl-4 pr-2 py-2.5 text-xs font-semibold cursor-pointer text-gray-300 transition-all active:scale-95"
                    >
                      <span className="truncate max-w-[140px] font-mono">{proj.owner}/{proj.repo}</span>
                      <button 
                        onClick={(e) => deleteProject(e, idx)}
                        className="text-gray-500 hover:text-red-400 font-bold text-sm w-5 h-5 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ฟอร์มกรอกข้อมูลแบบซูเปอร์มน (rounded-3xl) */}
            <form onSubmit={handleSubmit} className="bg-gray-900/40 p-6 rounded-3xl shadow-xl space-y-4 border border-gray-850 backdrop-blur-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">GitHub Owner</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove" 
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Repository Name</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove-page" 
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-700"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white font-bold py-4 rounded-2xl text-sm tracking-wide shadow-lg shadow-emerald-600/5 transition-all active:scale-[0.98]"
              >
                {loading ? 'กำลังดึงโครงสร้าง...' : 'เชื่อมต่อคลังไฟล์'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-500/20 text-red-300 p-4 rounded-2xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* แผงแสดงผลโครงสร้างไฟล์แบบมนโค้งพิเศษ (rounded-3xl) และล็อกแกน X */}
        {files.length > 0 && (
          <div className="bg-gray-900/20 rounded-3xl shadow-xl border border-gray-850 flex flex-col max-h-[65vh] overflow-hidden min-w-0">
            <div className="px-5 py-4 border-b border-gray-850 flex justify-between items-center bg-gray-900/90 sticky top-0 rounded-t-3xl z-10 backdrop-blur-md">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">โครงสร้างโปรเจกต์ ({files.length})</span>
              <button 
                onClick={() => setSelectedFiles([])}
                className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
              >
                ล้างทั้งหมด
              </button>
            </div>

            {/* กล่องบรรจุ Tree ด้านใน ปิดการเลื่อนซ้ายขวาร้อยเปอร์เซ็นต์ */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 p-3 space-y-1 bg-gray-950/20">
              <RenderTree node={fileTree} depth={0} />
            </div>
          </div>
        )}

        {/* แถบแจ้งเตือนด้านล่าง ดีไซน์แคปซูลมนโค้งมนสุดพรีเมียม */}
        {selectedFiles.length > 0 && (
          <div className="fixed bottom-6 left-5 right-5 max-w-sm mx-auto bg-gray-900/90 border border-gray-800 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4 z-50 backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-300 pl-2 flex-shrink-0">
              เลือกไว้ <span className="font-black text-emerald-400 text-base">{selectedFiles.length}</span> ไฟล์
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex-1 font-bold py-3.5 px-4 rounded-2xl text-xs text-center tracking-wider uppercase transition-all active:scale-[0.97] shadow-md ${copied ? 'bg-gray-850 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
            >
              {copied ? '✓ COPIED!' : 'COPY LINKS'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
