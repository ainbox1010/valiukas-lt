import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Tomas Valiukas — AI & IT Projects",
  description:
    "Personal website for Tomas Valiukas: services, projects, and an AI agent grounded in trusted sources.",
};

const navLinks = [
  { href: "/ai", label: "AI Me" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/timeline", label: "Timeline" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <footer className="footer">
          <div className="container">
            <div>Trust-first AI and IT projects. Built with privacy in mind.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
