import Nav from '../components/Nav';

export const metadata = {
  title: {
    default: '长春师范大学就业运营工作台',
    template: '%s',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/css/style.css`} />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
