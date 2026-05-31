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

export default function Home() {
  const [owner, setOwner] = useState<string>('');
  const [repo, setRepo] = useState<string>('');
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // State ใหม่สำหรับระบบบันทึกและพับฟอร์ม
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true); // เปิดไว้ตอนแรกเพื่อให้กรอก

  // ดึงข้อมูลโปรเจกต์ที่เคยเซฟไว้ใน Browser ออกมาตอนเปิดเว็บ
  useEffect(() => {
    const localData = localStorage.getItem('gv_saved_projects');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setSavedProjects(parsed);
        // ถ้ามีโปรเจกต์เก่าอยู่แล้ว ให้พับฟอร์มลงเพื่อประหยัดพื้นที่ทันที
        if (parsed.length > 0) {
          setIsFormOpen(false);
          // เอาโปรเจกต์ล่าสุดมาใส่ในฟิลด์รอไว้ก่อน
          setOwner(parsed[0].owner);
          setRepo(parsed[0].repo);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // ฟังก์ชันดึงรายชื่อไฟล์
  const fetchFiles = async (currentOwner = owner, currentRepo = repo) => {
    if (!currentOwner || !currentRepo) return;
    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFiles([]);
    
    try {
      const res = await fetch(`/api/github?owner=${currentOwner}&repo=${currentRepo}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files);
        // พับฟอร์มเก็บทันทีเมื่อดึงไฟล์สำเร็จ หน้าจอจะได้โล่ง ๆ
        setIsFormOpen(false);
        // บันทึกโปรเจกต์นี้ลง localStorage
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

  // ฟังก์ชันบันทึกโปรเจกต์ลง LocalStorage (ไม่ให้ซ้ำเดิม)
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

  // ฟังก์ชันลบโปรเจกต์ที่บันทึกไว้
  const deleteProject = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation(); // ไม่ให้ไปกดเลือกโปรเจกต์ซ้ำ
    const updated = savedProjects.filter((_, i) => i !== indexToDelete);
    setSavedProjects(updated);
    localStorage.setItem('gv_saved_projects', JSON.stringify(updated));
  };

  // ฟังก์ชันเมื่อกดเลือกโปรเจกต์เก่าจากลิสต์
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
    <main className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans selection:bg-emerald-500 selection:text-white pb-28">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header สั้นกระชับ */}
        <header className="flex justify-between items-center py-2 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold text-emerald-400">Git Linker</h1>
            {files.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                กำลังดู: {owner}/{repo}
              </p>
            )}
          </div>
          {/* ปุ่มเปิด-ปิด ฟิลด์กรอกข้อมูล */}
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isFormOpen ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400'}`}
          >
            {isFormOpen ? '✕ ปิดตัวกรอก' : '＋ สลับโปรเจกต์'}
          </button>
        </header>

        {/* ฟิลด์กรอกข้อมูลแบบพับเก็บได้ (จะไม่มาเบียดหน้าจอเมื่อไม่ได้ใช้) */}
        {isFormOpen && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* รายชื่อโปรเจกต์เก่าที่เซฟไว้ */}
            {savedProjects.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">โปรเจกต์ล่าสุดของคุณ</label>
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
                        className="text-gray-500 hover:text-red-400 font-bold text-[10px] w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ฟอร์มกรอกใหม่ */}
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
                  <label className="block text-[11px] font-semibold tracking-wider text-gray-400 mb-1">Repository Name</label>
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
                {loading ? 'กำลังโหลด...' : 'ดึงและบันทึกไฟล์'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-xs text-center">
            {error}
          </div>
        )}

        {/* รายการไฟล์ (ตอนนี้จะแสดงผลได้เต็มที่ ไม่โดนฟิลด์ด้านบนเบียดบังแล้ว) */}
        {files.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col max-h-[70vh]">
            <div className="p-3.5 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 sticky top-0 rounded-t-xl">
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
                    className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors active:bg-gray-750 ${isSelected ? 'bg-emerald-950/30' : 'hover:bg-gray-750'}`}
                  >
                    <div className="mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 bg-gray-900 border-gray-600 focus:ring-emerald-500"
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
              {copied ? '✓ คัดลอกแล้ว!' : 'คัดลอกรายชื่อลิงก์'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
