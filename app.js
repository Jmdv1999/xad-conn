// coordenadas
const { Ballena } = require("./coordenadas/Ballena.js");
const { Casco_Central_Uno } = require("./coordenadas/Casco_Central_Uno.js");
const { Casitas_Cementerio } = require("./coordenadas/Casitas_Cementerio.js");
const { Excepciones } = require("./coordenadas/Excepciones.js");
const { Guarico } = require("./coordenadas/Guarico.js");
const { Nueva_Miranda } = require("./coordenadas/Nueva_Miranda.js");
const { Salinas } = require("./coordenadas/Salinas.js");
const { San_Crispulo } = require("./coordenadas/San_Crispulo.js");

// app.<r>
const express = require("express");
const axios = require("axios");
const db = require("./database");

const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get(
  "/14f539d73aa2411175ef606eb879f7c57b618dc98611ac348e22075ca47dfd9f",
  (req, res) => {
    db.all("SELECT * FROM dispositivos", (err, rows) => {
      if (err) {
        throw err;
      }
      res.render("index", {
        dispositivos: JSON.stringify(rows),
        Ballena: JSON.stringify(Ballena),
        Casco_Central_Uno: JSON.stringify(Casco_Central_Uno),
        Casitas_Cementerio: JSON.stringify(Casitas_Cementerio),
        Excepciones: JSON.stringify(Excepciones),
        Guarico: JSON.stringify(Guarico),
        Nueva_Miranda: JSON.stringify(Nueva_Miranda),
        Salinas: JSON.stringify(Salinas),
        San_Crispulo: JSON.stringify(San_Crispulo),
      });
    });
  }
);

app.get("/", (req, res) => {
  db.all("SELECT * FROM dispositivos", (err, rows) => {
    if (err) {
      throw err;
    }
    res.render("seguimiento", {
      dispositivos: JSON.stringify(rows),
      Ballena: JSON.stringify(Ballena),
      Casco_Central_Uno: JSON.stringify(Casco_Central_Uno),
      Casitas_Cementerio: JSON.stringify(Casitas_Cementerio),
      Excepciones: JSON.stringify(Excepciones),
      Guarico: JSON.stringify(Guarico),
      Nueva_Miranda: JSON.stringify(Nueva_Miranda),
      Salinas: JSON.stringify(Salinas),
      San_Crispulo: JSON.stringify(San_Crispulo),
    });
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
// Ruta para verificar la zona del dispositivo
app.get("/verificar-zona/:dispositivo_tecnico_id", (req, res) => {
  const dispositivo_tecnico_id = req.params.dispositivo_tecnico_id;

  // Consulta para obtener los IDs de las zonas asociadas al dispositivo técnico
  const sql = `SELECT zona_id FROM zona_dispositivo_tecnico WHERE dispositivo_tecnico_id = ?`;
  db.all(sql, [dispositivo_tecnico_id], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al consultar la base de datos");
    } else if (rows && rows.length > 0) {
      const zonaIDs = rows.map((row) => row.zona_id);

      // Consulta para obtener los nombres de las zonas
      const sql_zonas = `SELECT nombre FROM zonas WHERE id IN (${zonaIDs.join(
        ","
      )})`;
      db.all(sql_zonas, (err_zonas, rows_zonas) => {
        if (err_zonas) {
          console.error(err_zonas);
          res.status(500).send("Error al consultar la base de datos");
        } else if (rows_zonas && rows_zonas.length > 0) {
          const nombres_zonas = rows_zonas.map((row_zona) => row_zona.nombre);
          res.json({ zonas_asignadas: nombres_zonas });
        } else {
          res.json({ zonas_asignadas: [] });
        }
      });
    } else {
      res.json({ zonas_asignadas: [] });
    }
  });
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

//Tecnico

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
