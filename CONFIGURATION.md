# Environment configuration

This project ships both a web portal and the Capacitor-based Android/iOS wrapper that drivers install on their devices. To keep the mobile shell aligned with the portal backend, configure the shared Supabase project and Firebase Cloud Messaging (FCM) credentials before running the app.

## 1. Populate Supabase credentials

1. Create a `.env` file (or update the existing one) at the repository root with the Supabase project values:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   # Optional: keep Vite compatible variables in sync
   VITE_SUPABASE_URL=${SUPABASE_URL}
   VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
   ```
2. Generate platform specific config files by running:

   ```bash
   pnpm sync:supabase-config
   ```

   The script writes two files that are git-ignored:

   - `public/env.js` – exposes runtime variables for the Vite/React web client and Capacitor shell.
   - `Resources/SupabaseConfig.plist` – embeds the same credentials for the native Swift UI wrapper.

   The repository keeps a safe `public/env.example.js` and `Resources/SupabaseConfig.example.plist` so new contributors can see the expected structure without leaking secrets.

## 2. Keep tables in sync

The driver-facing features in the web portal and native shell rely on a shared Supabase schema. Make sure the following tables exist in your project:

- `drivers`
- `driver_tasks`
- `driver_task_entries`
- `driver_push_tokens`
- `driver_notifications`

The portal writes to these tables, while the native app reads assignments and listens for realtime updates from the same tables. Keeping a single Supabase project guarantees the driver experiences stay in sync across platforms.

## 3. Configure Firebase Cloud Messaging

1. Enable Firebase Cloud Messaging for the same project used by the mobile builds.
2. Set the legacy server key in the backend environment so the Express API can dispatch push notifications:

   ```env
   FCM_SERVER_KEY=your-firebase-server-key
   ```
3. When building the native shells, add the usual Firebase platform configuration files:

   - `android/app/google-services.json`
   - `ios/App/App/GoogleService-Info.plist`

   (These files are not tracked in git. Store them securely and add them locally before running `pnpm android` or `pnpm ios`.)

With Supabase and FCM aligned, any task entered through the main portal instantly appears in the mobile wrappers and drivers can receive real-time updates and notifications.
