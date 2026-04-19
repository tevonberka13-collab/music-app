(function() {
  const config = window.MUSIC_APP_SUPABASE_CONFIG || {};
  const hasClientLibrary = window.supabase && typeof window.supabase.createClient === "function";
  const hasUrl =
    typeof config.url === "string" &&
    config.url.trim() !== "" &&
    config.url !== "PASTE_YOUR_SUPABASE_URL_HERE";
  const hasAnonKey =
    typeof config.anonKey === "string" &&
    config.anonKey.trim() !== "" &&
    config.anonKey !== "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

  if (!hasClientLibrary) {
    window.musicAppSupabase = null;
    console.warn("Supabase client library did not load.");
    return;
  }

  if (!hasUrl || !hasAnonKey) {
    window.musicAppSupabase = null;
    console.info("Supabase is not configured yet. Add your project URL and anon key in supabase-config.js.");
    return;
  }

  window.musicAppSupabase = window.supabase.createClient(config.url, config.anonKey);
})();
