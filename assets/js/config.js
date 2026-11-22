/* HelpDai Production Config — Connect Node+SQLite Backend or Supabase/Formspree. */
window.HELPDAI_CONFIG = {
  // 1. HelpDai Backend API Base URL (e.g. 'https://helpdai-api.onrender.com')
  // When empty '', automatically uses same-origin '/api' when running via `npm start`.
  apiBase: '',

  // 2. Optional external Suggestion Box Endpoint (e.g. Formspree) when no backend is used
  suggestionEndpoint: '',

  // 3. Optional Supabase Cloud Database Sync
  supabaseUrl: '',
  supabaseAnonKey: ''
};
