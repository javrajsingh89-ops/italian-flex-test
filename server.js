const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./database.sqlite');

// Crea tabella se non esiste
db.run(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Inizializza il contatore se vuoto (con numero casuale tra 500 e 2000)
db.get("SELECT COUNT(*) as count FROM visitors", (err, row) => {
  if (err) {
    console.error('❌ Errore database:', err);
    return;
  }
  if (row.count === 0) {
    const initialCount = Math.floor(Math.random() * 1500) + 500;
    db.run("INSERT INTO visitors (count) VALUES (?)", [initialCount]);
    console.log(`✅ Contatore inizializzato a ${initialCount} visite`);
  } else {
    console.log('✅ Database già esistente');
  }
});

// ============ API ROUTES ============

// 1. GET - Legge il contatore attuale
app.get('/api/visitors', (req, res) => {
  db.get("SELECT count FROM visitors LIMIT 1", (err, row) => {
    if (err) {
      console.error('Errore lettura:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row ? row.count : 0 });
  });
});

// 2. POST - Incrementa il contatore (1 visita)
app.post('/api/visitors/increment', (req, res) => {
  db.run(`
    UPDATE visitors 
    SET count = count + 1, 
        last_updated = CURRENT_TIMESTAMP 
    WHERE id = (SELECT id FROM visitors LIMIT 1)
  `, function(err) {
    if (err) {
      console.error('Errore incremento:', err);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    // Leggi il nuovo valore
    db.get("SELECT count FROM visitors LIMIT 1", (err, row) => {
      if (err) {
        console.error('Errore lettura post-update:', err);
        return res.status(500).json({ error: 'Read failed' });
      }
      res.json({ 
        success: true, 
        count: row.count,
        message: 'Visita registrata!'
      });
    });
  });
});

// 3. (Opzionale) RESET - Solo per admin (proteggi con chiave)
app.post('/api/visitors/reset', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== 'ItalianFlexAdmin2026') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  db.run("UPDATE visitors SET count = 0", (err) => {
    if (err) {
      console.error('Errore reset:', err);
      return res.status(500).json({ error: 'Reset failed' });
    }
    res.json({ success: true, message: 'Contatore resettato' });
  });
});

// ============ SERVIRE IL FRONTEND ============

// Rotta per la home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Per qualsiasi altra rotta, restituisci index.html (per supportare routing frontend)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ AVVIA IL SERVER ============
app.listen(PORT, () => {
  console.log(`\n🚀 Server avviato con successo!`);
  console.log(`📍 URL locale: http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/visitors`);
  console.log(`👁️  Contatore visite attivo\n`);
});