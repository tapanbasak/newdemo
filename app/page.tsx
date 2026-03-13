import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function HomePage() {
  return (
    <>
      <AppHeader
        title="Config Console"
        subtitle="Choose a configuration console"
        showHomeLink={false}
      />
      <main className="app-main">
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>Configuration Consoles</h2>
            <p className="panel-subtitle">
              Select a console to manage your service configuration.
            </p>
          </div>
          <div className="service-grid" style={{ marginTop: "16px" }}>
            <Link href="/app-rule-config" className="service-card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="service-card-header">
                <h3>App Rule Service Config</h3>
              </div>
              <p className="service-card-body">
                Submit and manage application configuration scoped by environment, country, business, channel, and optional application ID.
              </p>
            </Link>
            <Link href="/psg" className="service-card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="service-card-header">
                <h3>PSG Domain Whitelisting</h3>
              </div>
              <p className="service-card-body">
                Self-service portal to whitelist application domains for the Platform Security Gateway (PSG).
              </p>
            </Link>
          </div>
        </section>
      </main>
      <footer className="app-footer" />
    </>
  );
}
