/** 给绝对路径加上 Next.js basePath（本地为空，生产为 /interview） */
export function withBasePath(path) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!path) return base || '/';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
