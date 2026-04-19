(function() {
  const config = window.MUSIC_APP_SUPABASE_CONFIG || {};
  const hasClientLibrary = window.supabase && typeof window.supabase.createClient === "function";
  const apiKey =
    typeof config.publishableKey === "string" && config.publishableKey.trim() !== ""
      ? config.publishableKey
      : config.anonKey;
  const hasUrl =
    typeof config.url === "string" &&
    config.url.trim() !== "" &&
    config.url !== "PASTE_YOUR_SUPABASE_URL_HERE";
  const hasApiKey =
    typeof apiKey === "string" &&
    apiKey.trim() !== "" &&
    apiKey !== "PASTE_YOUR_SUPABASE_ANON_KEY_HERE" &&
    apiKey !== "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

  if (!hasClientLibrary) {
    window.musicAppSupabase = null;
    console.warn("Supabase client library did not load.");
    return;
  }

  if (!hasUrl || !hasApiKey) {
    window.musicAppSupabase = null;
    console.info("Supabase is not configured yet. Add your project URL and anon key in supabase-config.js.");
    return;
  }

  window.musicAppSupabase = window.supabase.createClient(config.url, apiKey);
})();
