import { defineConfig } from 'vite'
import fetch from 'node-fetch'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    middlewares: [
      {
        name: 'fetch-csv-middleware',
        apply: 'serve',
        async handle(req, res, next) {
          if (req.url === '/api/fetch-csv') {
            try {
              console.log('Fetching CSV from Google Sheets...');
              const response = await fetch(CSV_URL);

              if (!response.ok) {
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Failed to fetch CSV: ${response.statusText}` }));
                return;
              }

              const csvText = await response.text();
              res.writeHead(200, {
                'Content-Type': 'text/csv; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(csvText);
            } catch (error) {
              console.error('Error fetching CSV:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
            return;
          }
          next();
        }
      }
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
