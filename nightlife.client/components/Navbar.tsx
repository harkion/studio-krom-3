'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NightLightBrand from './NightLightBrand';

export default function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const desktopNavItems = [
        { name: 'Home', href: '/' },
        { name: 'Street View', href: '/street-view' },
        { name: 'Share your story', href: '/ShareStory' },
    ];

    const navItems = [
        { name: 'Street View', href: '/street-view' },
        { name: 'Share your story', href: '/ShareStory' },
    ];

    useEffect(() => {
        if (!menuOpen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [menuOpen]);

    return (
        <header className="relative z-20 h-[78px] border-b border-[#35434f] bg-[#17212b] px-8 flex items-center justify-between">
            <NightLightBrand />

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-xs font-medium text-[#c1cdd7] md:flex">
                {desktopNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`transition pb-1 ${
                                isActive
                                    ? 'text-[#e6edf3] font-bold border-b-2 border-[#7ee0d1]'
                                    : 'hover:text-[#7ee0d1]'
                            }`}
                        >
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <button
                type="button"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                aria-controls="site-navigation"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex md:hidden h-11 w-11 items-center justify-center rounded-lg border border-[#35434f] text-[#e6edf3] transition hover:border-[#7ee0d1] hover:text-[#7ee0d1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ee0d1]"
            >
                <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {menuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            <nav
                id="site-navigation"
                aria-label="Main navigation"
                hidden={!menuOpen}
                className="absolute right-4 top-[calc(100%+0.5rem)] min-w-56 rounded-xl border border-[#35434f] bg-[#17212b] p-2 text-sm font-medium text-[#c1cdd7] shadow-xl md:hidden"
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setMenuOpen(false)}
                            className={`block rounded-lg px-4 py-3 transition ${
                                isActive
                                    ? 'bg-[#253541] text-[#7ee0d1]'
                                    : 'hover:bg-[#253541] hover:text-[#7ee0d1]'
                            }`}
                        >
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
