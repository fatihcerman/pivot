console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY starts with:', process.env.GEMINI_API_KEY.substring(0, 5));
}
if (process.env.CRON_SECRET) {
    console.log('CRON_SECRET starts with:', process.env.CRON_SECRET.substring(0, 3));
}
