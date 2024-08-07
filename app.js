// coordenadas
const { Ballena } = require("./coordenadas/Ballena.js");
const { Casco_Central_Uno } = require("./coordenadas/Casco_Central_Uno.js");
const { Casitas_Cementerio } = require("./coordenadas/Casitas_Cementerio.js");
const { Excepciones } = require("./coordenadas/Excepciones.js");
const { Guarico } = require("./coordenadas/Guarico.js");
const { Nueva_Miranda } = require("./coordenadas/Nueva_Miranda.js");
const { Salinas } = require("./coordenadas/Salinas.js");
const { San_Crispulo } = require("./coordenadas/San_Crispulo.js");
const {Alto_Viento} = require("./coordenadas/Alto_Viento.js")
const {Los_Campos} = require("./coordenadas/Los_Campos.js")
const {Haticos} = require("./coordenadas/Haticos.js")
const {Punta_Leiva} = require("./coordenadas/Punta_Leiva.js")
const {Mata_Seca} = require ("./coordenadas/Mata_Seca.js");

// app.<r>
const express = require("express");
const axios = require("axios");
const db = require("./database");
const { Jobitos } = require("./coordenadas/Jobitos.js");

const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

/**
 * Renderizar la vista que estara monitoreando los dispositivos.
 * Utilizo un sha256 en la ruta, para evitar que alguien lo habra por accidente y empiece a monitorear multiples tiempos
 * TODO: tratar de hacerlo en el backend
 * !al trabajar con mapas, se me complico manejarlo en el backend, lo dejare hace por el momento
 */
app.get("/14f539d73aa2411175ef606eb879f7c57b618dc98611ac348e22075ca47dfd9f",
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
        Alto_Viento: JSON.stringify(Alto_Viento),
        Los_Campos: JSON.stringify(Los_Campos),
        Haticos: JSON.stringify(Haticos),
        Punta_Leiva: JSON.stringify(Punta_Leiva),
        Jobitos: JSON.stringify(Jobitos),
        Mata_Seca: JSON.stringify(Mata_Seca)
      });
    });
  }
);

/**
 * Renderizamos la vista donde se puede ver donde estan los dispositivos y las zonas que tienen asignaos
 */
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
      Alto_Viento: JSON.stringify(Alto_Viento),
      Los_Campos: JSON.stringify(Los_Campos),
      Haticos: JSON.stringify(Haticos),
      Punta_Leiva: JSON.stringify(Punta_Leiva),
      Jobitos: JSON.stringify(Jobitos),
      Mata_Seca: JSON.stringify(Mata_Seca)
    });
  });
});

/**
 * Esta ruta realiza una peticion al API de los dispositivos
 * @param  {[int]} id [identificador del dispositivo para enviarlo al API]
 */
app.get("/dispositivo/:id", async (req, res) => {
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

// Asignacion
//Renderizar la vista de asignacion y eliminacion de asignaciones
app.get("/asignacion", (req, res) => {
  // Obtener los dispositivos y las zonas desde la base de datos
  db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.all(`SELECT * FROM zonas`, (err, zonas) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener las asignaciones existentes
      db.all(
        `
        SELECT zdt.id, d.id_dispositivo, d.imei, d.vehiculo, z.nombre AS nombre_zona
        FROM zona_dispositivo_tecnico AS zdt
        INNER JOIN dispositivos AS d ON zdt.dispositivo_tecnico_id = d.id_dispositivo
        INNER JOIN zonas AS z ON zdt.zona_id = z.id`,
        (err, asignaciones) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const data = {
            dispositivos,
            zonas,
            asignaciones,
            error: null,
          };

          res.render("asignacion", data);
        }
      );
    });
  });
});

// Rutas para manejar la asignación y eliminacion de dispositivos a zonas
app.post("/asignar-dispositivo", (req, res) => {
  const { zona_id, dispositivo_id } = req.body;

  // Verificar si ya existe un registro con el mismo dispositivo_tecnico_id
  db.get(
    `SELECT * FROM dispositivo_tecnico WHERE dispositivo_id = ?`,
    [dispositivo_id],
    (err, existingRegistro) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingRegistro) {
        db.get(
          `SELECT *  FROM zona_dispositivo_tecnico WHERE  zona_id = ? AND dispositivo_tecnico_id = ?`,
          [zona_id, dispositivo_id],
          (err, existingZona) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            if (!existingZona) {
              db.run(
                `INSERT INTO zona_dispositivo_tecnico (zona_id, dispositivo_tecnico_id) VALUES (?, ?)`,
                [zona_id, dispositivo_id],
                function (err) {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }
                  res.redirect("/asignacion");
                }
              );
            } else {
              db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                db.all(`SELECT * FROM zonas`, (err, zonas) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  // Obtener las asignaciones existentes
                  db.all(
                    `
                      SELECT zdt.id, d.id_dispositivo, d.imei, d.vehiculo, z.nombre AS nombre_zona
                      FROM zona_dispositivo_tecnico AS zdt
                      INNER JOIN dispositivos AS d ON zdt.dispositivo_tecnico_id = d.id_dispositivo
                      INNER JOIN zonas AS z ON zdt.zona_id = z.id`,
                    (err, asignaciones) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      const data = {
                        dispositivos,
                        zonas,
                        asignaciones,
                        error: "La zona ya esta asignada a ese vehiculo",
                      };

                      res.render("asignacion", data);
                    }
                  );
                });
              });
            }
          }
        );
      } else {
        db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          db.all(`SELECT * FROM zonas`, (err, zonas) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Obtener las asignaciones existentes
            db.all(
              `
                SELECT zdt.id, d.id_dispositivo, d.imei, d.vehiculo, z.nombre AS nombre_zona
                FROM zona_dispositivo_tecnico AS zdt
                INNER JOIN dispositivos AS d ON zdt.dispositivo_tecnico_id = d.id_dispositivo
                INNER JOIN zonas AS z ON zdt.zona_id = z.id`,
              (err, asignaciones) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                const data = {
                  dispositivos,
                  zonas,
                  asignaciones,
                  error: "El vehiculo no esta asignado a ningun tecnico",
                };

                res.render("asignacion", data);
              }
            );
          });
        });
      }
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
      res.redirect("/asignacion");
    }
  );
});

// Ruta para verificar la zonas asignadas a un dispositivo
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

/**
 * Asignacion a tecnicos
 */
app.get("/asignar-tecnico", (req, res) => {
  // Obtener las asignaciones existentes desde la base de datos
  db.all(
    `
  SELECT dt.id, d.id_dispositivo, d.imei, d.vehiculo, t.nombre AS nombre_tecnico
  FROM dispositivo_tecnico AS dt
  INNER JOIN dispositivos AS d ON dt.dispositivo_id = d.id_dispositivo
  INNER JOIN tecnicos AS t ON dt.tecnico_id = t.id`,
    (err, asignaciones) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener la lista completa de dispositivos
      db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Obtener la lista completa de técnicos
        db.all(`SELECT * FROM tecnicos`, (err, tecnicos) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Combinar todos los datos en un solo objeto
          const data = {
            error: null,
            asignaciones,
            dispositivos,
            tecnicos,
          };

          // Renderizar la vista "asignar-tecnico.ejs" con los datos combinados
          res.render("asignar.ejs", data);
        });
      });
    }
  );
});
//Rutsa para manejar la asignación y eliminacion de tecnicos a un vehiculo
app.post("/asignar-tecnico", (req, res) => {
  const { dispositivo_id, tecnico_id } = req.body;

  // Verificar si ya existe una asignación para este dispositivo
  db.get(
    `SELECT *
FROM dispositivo_tecnico
WHERE (dispositivo_id = ? OR tecnico_id = ?) AND asignado = 1`,
    [dispositivo_id, tecnico_id],
    (err, existingAsignacion) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingAsignacion) {
        // Obtener las asignaciones existentes desde la base de datos
        db.all(
          `
  SELECT dt.id, d.id_dispositivo, d.imei, d.vehiculo, t.nombre AS nombre_tecnico
  FROM dispositivo_tecnico AS dt
  INNER JOIN dispositivos AS d ON dt.dispositivo_id = d.id_dispositivo
  INNER JOIN tecnicos AS t ON dt.tecnico_id = t.id`,
          (err, asignaciones) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Obtener la lista completa de dispositivos
            db.all(`SELECT * FROM dispositivos`, (err, dispositivos) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Obtener la lista completa de técnicos
              db.all(`SELECT * FROM tecnicos`, (err, tecnicos) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                // Combinar todos los datos en un solo objeto
                const data = {
                  error:
                    "Esta asignacion no es posible, el vehiculo o tecnico ya tiene una asignacion",
                  asignaciones,
                  dispositivos,
                  tecnicos,
                };

                // Renderizar la vista "asignar-tecnico.ejs" con los datos combinados
                res.render("asignar.ejs", data);
              });
            });
          }
        );
      } else {
        // Insertar la nueva asignación
        db.run(
          `INSERT INTO dispositivo_tecnico (dispositivo_id, tecnico_id, asignado) VALUES (?, ?, 1)`,
          [dispositivo_id, tecnico_id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.redirect("/asignar-tecnico");
          }
        );
      }
    }
  );
});

app.post("/desasignar-tecnico", (req, res) => {
  const { id } = req.body;
  db.run(`DELETE FROM dispositivo_tecnico WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.redirect("/asignar-tecnico");
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
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

//Tecnicos
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
