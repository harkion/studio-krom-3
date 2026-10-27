'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Street View', href: '/street-view' },
        { name: 'Share your story', href: '/ShareStory' },
    ];

    return (
        <header className="h-[78px] border-b border-[#35434f] bg-[#17212b] px-8 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-[#35434f] flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7ee0d1]" />
                </div>
                <div>
                    <span className="text-sm font-bold tracking-widest text-[#e6edf3] uppercase block">
                        NIGHT / LIGHT
                    </span>
                    <small className="text-[9px] tracking-widest text-[#aab8c4] uppercase block">
                        EINDHOVEN
                    </small>
                </div>
            </div>

            {/* Dynamic Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#c1cdd7]">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`transition pb-1 ${isActive
                                    ? 'text-[#e6edf3] font-bold border-b-2 border-[#7ee0d1]'
                                    : 'hover:text-[#7ee0d1]'
                                }`}
                        >
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Safety Action */}
            <a
                href="#"
                className="border border-[#35434f] hover:border-[#7ee0d1] bg-[#17212b] text-[#e6edf3] hover:text-[#7ee0d1] px-4 py-2 rounded-full text-xs transition flex items-center gap-2"
            >
                <svg className="w-3.5 h-3.5 text-[#7ee0d1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Get home safely</span>
            </a>
        </header>
    );
}