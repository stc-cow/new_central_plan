import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <main className="mx-auto max-w-4xl text-center py-24">
        <h1 className="text-4xl font-extrabold mb-4">ACES MSD Fuel</h1>
        <p className="text-muted-foreground mb-8">
          Fleet fueling operations simplified — dispatch, drivers, and logs in
          one modern workspace.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/mobile/driver-design"
            className="rounded-lg bg-primary px-5 py-3 text-primary-foreground font-semibold"
          >
            View Driver Mobile Preview
          </Link>
          <Link
            to="/driver"
            className="rounded-lg border border-border px-5 py-3 text-foreground"
          >
            Open Driver App (Demo)
          </Link>
        </div>

        <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg border p-4 bg-card">
            <h3 className="font-semibold">Dispatch</h3>
            <p className="text-sm text-muted-foreground">
              Manage fuel tasks and assignments.
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <h3 className="font-semibold">Drivers</h3>
            <p className="text-sm text-muted-foreground">
              Mobile app for drivers to complete fueling jobs.
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <h3 className="font-semibold">Logs</h3>
            <p className="text-sm text-muted-foreground">
              Track fuel usage and exports.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
