// app.js
const express = require("express");
const axios = require("axios");
const db = require("./database");
const fs = require("fs");

const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  db.all("SELECT * FROM dispositivos", (err, rows) => {
    if (err) {
      throw err;
    }
    res.render("index", { dispositivos: JSON.stringify(rows) });
  });
});

app.get("/api/dispositivo/:id", async (req, res) => {
  const id = req.params.id;
  const apiUrl = `https://appapi.xadgps.com/openapiv4.asmx/GetTracking?DeviceID=${id}&TimeZone=-4&MapType=Google&Language=sp`;

  try {
    const response = await axios.get(apiUrl);

    const regex = /(?<=<string.*?>)(.*?)(?=<\/string>)/s;
    const resultado = response.data.match(regex);
    res.json(resultado[0].trim());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Ruta para verificar la zona del dispositivo técnico
app.get("/verificar-zona/:dispositivo_tecnico_id", (req, res) => {
  const dispositivo_tecnico_id = req.params.dispositivo_tecnico_id;

  // Consulta para obtener el ID de la zona asociada al dispositivo técnico
  const sql = `SELECT zona_id FROM zona_dispositivo_tecnico WHERE dispositivo_tecnico_id = ?`;
  db.get(sql, [dispositivo_tecnico_id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al consultar la base de datos");
    } else if (row) {
      const zona_id = row.zona_id;

      // Consulta para obtener el nombre de la zona
      const sql_zona = `SELECT nombre FROM zonas WHERE id = ?`;
      db.get(sql_zona, [zona_id], (err_zona, row_zona) => {
        if (err_zona) {
          console.error(err_zona);
          res.status(500).send("Error al consultar la base de datos");
        } else if (row_zona) {
          const nombre_zona = row_zona.nombre;

          res.json({ zona: `${nombre_zona.replace(/\s+/g, "_")}` });
        } else {
          res.json({ zona: `no hay informacion de la zona` });
        }
      });
    } else {
      res.json({
        zona: `null`,
      });
    }
  });
});
// Ruta para renderizar la vista de asignación
app.get("/asignar", (req, res) => {
  db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.all(`SELECT * FROM tecnicos`, (err, tecnicos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.render("asignar", { dispositivos, tecnicos });
    });
  });
});

// Asignar técnico a dispositivo
app.post("/asignar-tecnico", (req, res) => {
  const { dispositivo_id, tecnico_id } = req.body;
  db.run(
    `INSERT INTO dispositivo_tecnico (dispositivo_id, tecnico_id, asignado) VALUES (?, ?, 1)`,
    [dispositivo_id, tecnico_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Desasignar técnico de dispositivo
app.post("/desasignar-tecnico", (req, res) => {
  const { dispositivo_id, tecnico_id } = req.body;
  db.run(
    `UPDATE dispositivo_tecnico SET asignado = 0 WHERE dispositivo_id = ? AND tecnico_id = ?`,
    [dispositivo_id, tecnico_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Técnico desasignado" });
    }
  );
});

// Obtener técnicos asignados a un dispositivo
app.get("/tecnicos-asignados/:dispositivo_id", (req, res) => {
  const { dispositivo_id } = req.params;
  db.all(
    `SELECT * FROM dispositivo_tecnico WHERE dispositivo_id = ? AND asignado = 1`,
    [dispositivo_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

//dispositivos
app.get("/crear-dispositivo", (req, res) => {
  res.render("crear-dispositivo");
});

app.post("/crear-dispositivo", (req, res) => {
  const { imei, id_dispositivo, telefono, vehiculo } = req.body;
  db.run(
    `INSERT INTO dispositivos (imei, id_dispositivo, telefono, vehiculo) VALUES (?, ?, ?, ?)`,
    [imei, id_dispositivo, telefono, vehiculo],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.redirect("/crear-dispositivo");
    }
  );
});

//tecnicos

// Ruta para renderizar la vista de creación de técnicos
app.get("/crear-tecnico", (req, res) => {
  res.render("crear-tecnico");
});
// Ruta para manejar la creación de técnicos
app.post("/crear-tecnico", (req, res) => {
  const { nombre } = req.body;
  db.run(`INSERT INTO tecnicos (nombre) VALUES (?)`, [nombre], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.redirect("/crear-tecnico");
  });
});

// Ruta para renderizar la vista de asignación de dispositivos a zonas
app.get("/asignar-dispositivo", (req, res) => {
  db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.all(`SELECT * FROM zonas`, (err, zonas) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.render("asignar-dispositivo", { dispositivos, zonas });
    });
  });
});

// Ruta para manejar la asignación de dispositivos a zonas
app.post("/asignar-dispositivo", (req, res) => {
  const { zona_id, dispositivo_id } = req.body;
  db.run(
    `INSERT INTO zona_dispositivo_tecnico (zona_id, dispositivo_tecnico_id) VALUES (?, ?)`,
    [zona_id, dispositivo_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.redirect("/asignar-dispositivo");
    }
  );
});
// Ruta para renderizar la vista de eliminar la asignación de zona
app.get("/eliminar-asignacion", async (req, res) => {
  db.all(
    `
  SELECT zdt.id, d.id_dispositivo, d.imei, d.vehiculo, z.nombre AS nombre_zona
  FROM zona_dispositivo_tecnico AS zdt
  INNER JOIN dispositivos AS d ON zdt.dispositivo_tecnico_id = d.id_dispositivo
  INNER JOIN zonas AS z ON zdt.zona_id = z.id`,

    (err, dispositivos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.render("eliminar-asignacion", { dispositivos });
    }
  );
});

app.post("/eliminar-asignacion", (req, res) => {
  const { asignacion_id } = req.body;
  db.run(
    `DELETE FROM zona_dispositivo_tecnico WHERE id = ?`,
    [asignacion_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Zona desasignada" });
    }
  );
});
// Ruta para renderizar la vista de creación de zonas
app.get("/crear-zona", (req, res) => {
  res.render("crear-zona");
});

// Ruta para manejar la creación de zonas
app.post("/crear-zona", (req, res) => {
  const { nombre } = req.body;
  db.run(`INSERT INTO zonas (nombre) VALUES (?)`, [nombre], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.redirect("/crear-zona");
  });
});
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
