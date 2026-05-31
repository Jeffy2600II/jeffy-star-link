'use client';
import { useState, useEffect, FormEvent } from 'react';

interface GitHubFile {
  path: string;
  name: string;
  url: string;
}

interface SavedProject {
  owner: string;
  repo: string;
}

// Interface สำหรับโครงสร้าง Folder Tree
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
  
  // State สำหรับเก็บรายชื่อโฟลเดอร์ที่ถูกเปิดอยู่ (กางออก)
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
    setExpandedFolders([]); // ล้างโฟลเดอร์ที่เคยกางไว้
    
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

  const deleteProject = (e: React.MouseEvent, indexToDelete: number) => {
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

  // ฟังก์ชันสลับการ กาง/หุบ โฟลเดอร์
  const toggleFolder = (folderPath: string) => {
    if (expandedFolders.includes(folderPath)) {
      setExpandedFolders(expandedFolders.filter(p => p !== folderPath));
    } else {
      setExpandedFolders([...expandedFolders, folderPath]);
    }
  };

  //แปลงรายชื่อไฟล์ธรรมดา (Flat List) ให้กลายเป็นโครงสร้างต้นไม้ (Tree)
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

  // ฟังก์ชัน Component สำหรับวาดแต่ละชั้นของ Tree แบบ Recursive
  const RenderTree = ({ node, depth = 0 }: { node: TreeNode; depth: number }) => {
    // เรียงให้โฟลเดอร์ขึ้นก่อนไฟล์ เพื่อความสวยงามและหาโค้ดง่าย
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const typeA = node.children[a].type;
      const typeB = node.children[b].type;
      if (typeA === typeB) return a.localeCompare(b);
      return typeA === 'folder' ? -1 : 1;
    });

    return (
      <div className="w-full">
        {sortedKeys.map(key => {
          const item = node.children[key];
          const isFolder = item.type === 'folder';
          const isExpanded = expandedFolders.includes(item.path);
          const isFileSelected = item.url ? selectedFiles.includes(item.url) : false;

          return (
            <div key={item.path} style={{ paddingLeft: `${depth * 12}px` }} className="w-full">
              {isFolder ? (
                // แถวโฟลเดอร์
                <div 
                  onClick={() => toggleFolder(item.path)}
                  className="flex items-center gap-2 p-2.5 hover:bg-gray-750 active:bg-gray-700 text-gray-300 font-medium text-xs cursor-pointer select-none border-l-2 border-gray-700/50"
                >
                  <span className="text-gray-500 text-[10px] transform transition-transform duration-150 inline-block w-3 text-center">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="text-base">📁</span>
                  <span className="truncate">{item.name}</span>
                </div>
              ) : (
                // แถวไฟล์
                <div 
                  onClick={() => item.url && toggleSelect(item.url)}
                  className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors active:bg-gray-750 ${isFileSelected ? 'bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500' : 'hover:bg-gray-750 text-gray-300 border-l-2 border-transparent'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={isFileSelected}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-gray-900 border-gray-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">📄</span>
                  <span className="text-xs font-mono truncate">{item.name}</span>
                </div>
              )}

              {/* ถ้าเป็นโฟลเดอร์และถูกสั่งให้เปิดอยู่ ให้เรนเดอร์ลูก ๆ ของมันต่อ */}
              {isFolder && isExpanded && (
                <div className="w-full border-l border-gray-800/60 ml-3.5">
                  <RenderTree node={item} depth={0} /> {/* รีเซ็ต depth เป็น 0 เพราะใช้ paddingLeft แตกแขนงด้วย margin-left คลุมแทน */}
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
    <main className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans selection:bg-emerald-500 selection:text-white pb-28">
      <div className="max-w-md mx-auto space-y-4">
        
        <header className="flex justify-between items-center py-2 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold text-emerald-400">Git Linker</h1>
            {files.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                คลัง: {owner}/{repo}
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isFormOpen ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400'}`}
          >
            {isFormOpen ? '✕ ปิด' : '＋ สลับโปรเจกต์'}
          </button>
        </header>

        {isFormOpen && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {savedProjects.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">โปรเจกต์ล่าสุด</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                  {savedProjects.map((proj, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectSaved(proj)}
                      className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-full pl-3 pr-2 py-1 text-xs cursor-pointer text-gray-200 transition-colors"
                    >
                      <span className="truncate max-w-[120px]">{proj.owner}/{proj.repo}</span>
                      <button 
                        onClick={(e) => deleteProject(e, idx)}
                        className="text-gray-500 hover:text-red-400 font-bold text-[10px] w-4 h-4 flex items-center justify-center rounded-full"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-xl shadow-lg space-y-3 border border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-gray-400 mb-1">GitHub Owner</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove" 
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold tracking-wider text-gray-400 mb-1">Repository</label>
                  <input 
                    type="text" 
                    placeholder="เช่น fantrove-page" 
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-semibold p-2.5 rounded-lg text-xs transition-colors"
              >
                {loading ? 'กำลังดึงโครงสร้าง...' : 'ดึงและบันทึกไฟล์'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-xs text-center">
            {error}
          </div>
        )}

        {/* ส่วนแสดง Folder Tree โครงสร้างชัดเจนเหมือนในคอมพิวเตอร์ */}
        {files.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col max-h-[72vh]">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 sticky top-0 rounded-t-xl z-10">
              <span className="text-xs text-gray-400 font-medium">โครงสร้างไฟล์ ({files.length})</span>
              <button 
                onClick={() => setSelectedFiles([])}
                className="text-xs text-gray-400 hover:text-red-400 font-semibold px-2 py-1 rounded"
              >
                ล้างที่เลือกทั้งหมด
              </button>
            </div>

            {/* แผงโครงสร้างต้นไม้ที่เลื่อนหน้าจอได้ลื่นๆ */}
            <div className="overflow-y-auto flex-1 p-2 bg-gray-900/40">
              <RenderTree node={fileTree} depth={0} />
            </div>
          </div>
        )}

        {/* แถบล่างสำหรับกดคัดลอกเมื่อมีไฟล์ถูกเลือก */}
        {selectedFiles.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-4 duration-200">
            <div className="text-sm">
              <span className="font-semibold text-emerald-400">{selectedFiles.length}</span> ไฟล์ถูกเลือก
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex-1 font-semibold p-3 rounded-lg text-sm text-center transition-all active:scale-[0.98] ${copied ? 'bg-gray-700 text-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
            >
              {copied ? '✓ คัดลอกสำเร็จ!' : 'คัดลอกรายชื่อลิงก์'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
