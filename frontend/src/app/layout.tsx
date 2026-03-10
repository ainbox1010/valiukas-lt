import "./globals.css";
import { Link, ViewTransitions } from "next-view-transitions";
import FloatingAskAiMe from "./FloatingAskAiMe";
import AccordionCloseFix from "./AccordionCloseFix";

export const metadata = {
  title: "Tomas Valiukas — AI & IT Projects",
  description:
    "Personal website for Tomas Valiukas: services, projects, and an AI agent grounded in trusted sources.",
  icons: {
    icon: "/valiukas_favicon_32.png",
    apple: "/valiukas_favicon_32.png",
  },
};

const navLinks = [
  { href: "/ai", label: "AI Me" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body>
        <header className="site-header">
          <div className="container nav">
            <Link href="/">
              <strong>Tomas Valiukas</strong>
            </Link>
            <nav className="nav-links">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <AccordionCloseFix />
        <FloatingAskAiMe />
        <footer className="footer">
          <div className="container footer-inner">
            <div>AI that works. <Link href="/ai">Ask instead of browsing.</Link></div>
            <div className="footer-copyright">
              © 2026 Tomas Valiukas
              <br />
              All rights reserved.
            </div>
          </div>
        </footer>
        </body>
      </html>
    </ViewTransitions>
  );
}
