import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-8 py-4 border-b border-gray-200">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
