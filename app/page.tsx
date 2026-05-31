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
            <div key={item.path} style={{ paddingLeft: `${depth * 8}px` }} className="w-full">
              {isFolder ? (
                // โฟลเดอร์ดีไซน์ใหม่: ใหญ่ขึ้น คลีนขึ้น หลวมขึ้น
                <div 
                  onClick={() => toggleFolder(item.path)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-800/60 active:bg-gray-800 text-gray-200 font-medium text-sm cursor-pointer select-none transition-all ${isExpanded ? 'bg-gray-800/30' : ''}`}
                >
                  <span className="text-gray-500 text-xs transition-transform duration-200 inline-block w-4 text-center">
                    {isExpanded ? '⊙' : '⊕'}
                  </span>
                  <span className="text-lg">📁</span>
                  <span className="truncate tracking-wide">{item.name}</span>
                </div>
              ) : (
                // ไฟล์ดีไซน์ใหม่: ใหญ่ขึ้น จิ้มง่าย สีสันชัดเจน
                <div 
                  onClick={() => item.url && toggleSelect(item.url)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${isFileSelected ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'hover:bg-gray-800/40 text-gray-300 border border-transparent'}`}
                >
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={isFileSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded-md text-emerald-600 bg-gray-950 border-gray-700 focus:ring-emerald-500 focus:ring-offset-gray-900 transition-all"
                    />
                  </div>
                  <span className="text-lg">📄</span>
                  <span className="text-sm font-mono truncate tracking-wide">{item.name}</span>
                </div>
              )}

              {isFolder && isExpanded && (
                <div className="w-full border-l border-gray-800/80 ml-6 my-1 pl-1">
                  <RenderTree node={item} depth={0} />
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
    <main className="min-h-screen bg-[#0b0f17] text-gray-100 p-5 font-sans selection:bg-emerald-500 selection:text-white pb-32">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header สวยเฉียบสไตล์โมเดิร์น */}
        <header className="flex justify-between items-center py-4 border-b border-gray-800/60">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Git Linker</h1>
            {files.length > 0 && (
              <p className="text-xs font-medium text-gray-400 mt-1 truncate max-w-[200px]">
                Repository: <span className="text-gray-300 font-mono">{repo}</span>
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`text-xs font-bold tracking-wide uppercase px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${isFormOpen ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5'}`}
          >
            {isFormOpen ? '✕ ปิดแผง' : '⚡ สลับคลัง'}
          </button>
        </header>

        {isFormOpen && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {savedProjects.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">คลังที่บันทึกไว้</label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
                  {savedProjects.map((proj, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectSaved(proj)}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl pl-4 pr-2.5 py-2 text-xs font-medium cursor-pointer text-gray-300 transition-all active:scale-95"
                    >
                      <span className="truncate max-w-[140px] font-mono">{proj.owner}/{proj.repo}</span>
                      <button 
                        onClick={(e) => deleteProject(e, idx)}
                        className="text-gray-500 hover:text-red-400 font-bold text-sm w-5 h-5 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ฟอร์มกรอกข้อมูลดีไซน์โมเดิร์น: ใหญ่ เต็มตา */}
            <form onSubmit={handleSubmit} className="bg-gray-900/50 p-5 rounded-2xl shadow-xl space-y-4 border border-gray-800/80 backdrop-blur-sm">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">GitHub Owner</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove" 
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">Repository Name</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove-page" 
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-gray-600"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide shadow-lg shadow-emerald-600/10 transition-all active:scale-[0.98]"
              >
                {loading ? 'กำลังดึงโครงสร้าง...' : 'เชื่อมต่อคลังไฟล์'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-4 rounded-xl text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* แผงแสดงผล Folder Tree แบบมี Space สวยงาม */}
        {files.length > 0 && (
          <div className="bg-gray-900/30 rounded-2xl shadow-xl border border-gray-800/60 flex flex-col max-h-[68vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800/60 flex justify-between items-center bg-gray-900/80 sticky top-0 rounded-t-2xl z-10 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">โครงสร้างโปรเจกต์ ({files.length})</span>
              <button 
                onClick={() => setSelectedFiles([])}
                className="text-xs font-bold text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
              >
                ล้างทั้งหมด
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              <RenderTree node={fileTree} depth={0} />
            </div>
          </div>
        )}

        {/* แถบแจ้งเตือนด้านล่าง ดีไซน์กระจกใส (Glassmorphism) สวยลอยเด่น */}
        {selectedFiles.length > 0 && (
          <div className="fixed bottom-6 left-5 right-5 max-w-md mx-auto bg-gray-900/80 border border-gray-700/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-5 z-50 backdrop-blur-lg animate-in slide-in-from-bottom-6 duration-300">
            <div className="text-sm font-medium pl-1">
              เลือกไว้ <span className="font-black text-emerald-400 text-base">{selectedFiles.length}</span> ไฟล์
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex-1 font-bold py-3.5 px-4 rounded-xl text-sm text-center tracking-wide transition-all active:scale-[0.97] shadow-lg ${copied ? 'bg-gray-800 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/10'}`}
            >
              {copied ? '✓ คัดลอกลิงก์แล้ว!' : 'คัดลอกลิสต์ลิงก์'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
