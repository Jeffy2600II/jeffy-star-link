import { NextRequest, NextResponse } from 'next/server';

// สร้าง Interface กำหนดโครงสร้างข้อมูลจาก GitHub API
interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  url: string;
}

interface ExtractedFile {
  path: string;
  name: string;
  url: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'กรุณาระบุ owner และ repo' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Nextjs-GitHub-File-Extractor-TS'
        },
        next: { revalidate: 60 }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'ไม่สามารถดึงข้อมูลได้' }, { status: response.status });
    }

    // กำหนด Type ให้ item ตอนกรองข้อมูล
    const files: ExtractedFile[] = data.tree
      .filter((item: GitHubTreeItem) => item.type === 'blob')
      .map((item: GitHubTreeItem) => ({
        path: item.path,
        name: item.path.split('/').pop() || item.path,
        url: `https://github.com/${owner}/${repo}/blob/main/${item.path}`
      }));

    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบหลังบ้าน' }, { status: 500 });
  }
}
