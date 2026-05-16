const SUPABASE_URL = 'https://fcgqnupvnrcmioietklo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjZ3FudXB2bnJjbWlvaWV0a2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Mzg1NDgsImV4cCI6MjA5NDUxNDU0OH0.itVwAPg77LOJlwtcvp02AzuwpV3tjRqfICszPihhc0g';

// Inicializa o cliente do Supabase
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
