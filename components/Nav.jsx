'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { withBasePath } from '../lib/base-path';

export default function Nav() {
  const pathname = usePathname();
  const [trackingLabel, setTrackingLabel] = useState('实习就业数据跟踪');

  useEffect(() => {
    let cancelled = false;
    fetch(withBasePath('/api/tracking-configs'), { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const list = Array.isArray(data.configs) ? data.configs : [];
        if (!list.length) return;
        const types = new Set(list.map((c) => (c.type === '就业' ? '就业' : '实习')));
        if (list.length === 1 && list[0].title) {
          setTrackingLabel(list[0].title);
        } else if (types.has('实习') && types.has('就业')) {
          setTrackingLabel('实习就业数据跟踪');
        } else if (list[0] && list[0].title) {
          setTrackingLabel(list[0].title);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const links = [
    { href: '/', label: '面试问题登记' },
    { href: '/dashboard', label: '面试问题看板' },
    { href: '/student-info', label: trackingLabel },
  ];

  return (
    <nav className="nav">
      <div className="nav-brand">长春师范大学就业运营工作台</div>
      <div className="nav-links">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
