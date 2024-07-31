const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS dispositivos (imei TEXT PRIMARY KEY,id_dispositivo TEXT,telefono TEXT,vehiculo TEXT)"
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS tecnicos (id INTEGER PRIMARY KEY, nombre TEXT)`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS zonas (id INTEGER PRIMARY KEY, nombre TEXT)`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dispositivo_tecnico (id INTEGER PRIMARY KEY, dispositivo_id INTEGER, tecnico_id INTEGER, asignado BOOLEAN DEFAULT 0, FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id_dispositivo), FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id))`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS zona_dispositivo_tecnico (id INTEGER PRIMARY KEY, zona_id INTEGER, dispositivo_tecnico_id INTEGER, FOREIGN KEY (zona_id) REFERENCES zonas(id), FOREIGN KEY (dispositivo_tecnico_id) REFERENCES dispositivo_tecnico(id))`
  );
});

module.exports = db;
