import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-white dark:bg-[#1a242d] px-8 py-4 border-b border-[#f0f2f4] dark:border-slate-800">
      <h2 className="text-xl font-bold text-[#111418] dark:text-white">{title}</h2>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
