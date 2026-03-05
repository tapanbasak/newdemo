import Link from "next/link";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  showHomeLink?: boolean;
};

export default function AppHeader({ title, subtitle, showHomeLink = true }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-logo brand-logo-hidden">SC</span>
        <div className="brand-text">
          {showHomeLink ? (
            <h1>
              <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
                {title}
              </Link>
            </h1>
          ) : (
            <h1>{title}</h1>
          )}
          <p>{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
