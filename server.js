const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.MYSQL_HOST || 'localhost';
const DB_PORT = Number(process.env.MYSQL_PORT || 3306);
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '12345';
const DB_NAME = process.env.MYSQL_DB || 'restaurante1';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let pool;
async function initDb() {
  pool = await mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z'
  });
  await updateSchemaIfNecessary();
  await seedMesasIfEmpty();
  await seedAdminIfEmpty();
}

async function updateSchemaIfNecessary() {
  try {
    // 1. Añadir contrasena si no existe
    const [colsPass] = await pool.query('SHOW COLUMNS FROM Cliente LIKE "contrasena"');
    if (colsPass.length === 0) {
      await pool.query('ALTER TABLE Cliente ADD COLUMN contrasena VARCHAR(255)');
      console.log('Columna contrasena añadida a la tabla Cliente');
    }

    // 2. Atomizar nombres de Cliente
    const [colsNombre] = await pool.query('SHOW COLUMNS FROM Cliente LIKE "nombre"');
    if (colsNombre.length > 0) {
      await pool.query('ALTER TABLE Cliente ADD COLUMN nombre1 VARCHAR(100), ADD COLUMN nombre2 VARCHAR(100), ADD COLUMN apellido_paterno VARCHAR(100), ADD COLUMN apellido_materno VARCHAR(100)');
      const [clientes] = await pool.query('SELECT idCliente, nombre FROM Cliente');
      for (const c of clientes) {
        const parts = c.nombre.trim().split(/\s+/);
        let n1 = parts[0] || '', n2 = '', ap = '', am = '';
        if (parts.length === 2) { ap = parts[1]; }
        else if (parts.length === 3) { ap = parts[1]; am = parts[2]; }
        else if (parts.length >= 4) { n2 = parts[1]; ap = parts[2]; am = parts[3]; }
        await pool.query('UPDATE Cliente SET nombre1=?, nombre2=?, apellido_paterno=?, apellido_materno=? WHERE idCliente=?', [n1, n2, ap, am, c.idCliente]);
      }
      await pool.query('ALTER TABLE Cliente DROP COLUMN nombre');
      console.log('Tabla Cliente atomizada');
    }

    // 3. Corregir error de dedo: diponibilidad -> disponibilidad en Mesa
    const [colsDisp] = await pool.query('SHOW COLUMNS FROM Mesa LIKE "diponibilidad"');
    if (colsDisp.length > 0) {
      await pool.query('ALTER TABLE Mesa CHANGE diponibilidad disponibilidad TINYINT(1) DEFAULT 1');
      console.log('Columna diponibilidad corregida a disponibilidad');
    }

    // 4. Estandarizar idMesas -> idMesa en Mesa y sus referencias
    const [colsIdMesa] = await pool.query('SHOW COLUMNS FROM Mesa LIKE "idMesas"');
    if (colsIdMesa.length > 0) {
      // Primero eliminamos la FK en Reserva para poder renombrar la PK
      try {
        const [fks] = await pool.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'Reserva' AND COLUMN_NAME = 'Mesa_idMesas' AND REFERENCED_TABLE_NAME = 'Mesa'
        `);
        for (const fk of fks) {
          await pool.query(`ALTER TABLE Reserva DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }
      } catch (e) { console.log('No se pudo borrar FK (tal vez no existe)'); }

      // Renombrar PK en Mesa
      await pool.query('ALTER TABLE Mesa CHANGE idMesas idMesa INT');
      // Renombrar FK en Reserva
      await pool.query('ALTER TABLE Reserva CHANGE Mesa_idMesas Mesa_idMesa INT');
      // Re-añadir FK corregida
      await pool.query('ALTER TABLE Reserva ADD CONSTRAINT fk_reserva_mesa FOREIGN KEY (Mesa_idMesa) REFERENCES Mesa(idMesa)');
      
      console.log('Estandarizado idMesas a idMesa en Mesa y Reserva');
    }

  } catch (e) {
    console.error('Error actualizando esquema:', e.message);
  }
}

async function seedMesasIfEmpty() {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM Mesa');
  if (rows[0].c === 0) {
    const mesas = [];
    for (let i = 1; i <= 18; i++) {
      let cap = 4;
      if (i === 1) cap = 2;
      if (i >= 5 && i <= 7) cap = 6;
      if (i === 6) cap = 8;
      if (i >= 12 && i <= 14) cap = 8;
      if (i === 16) cap = 8;
      if (i === 17 || i === 18) cap = 10;
      mesas.push([i, `Mesa ${i}`, cap, 'salon', 1, 'normal']);
    }
    for (let i = 1; i <= 6; i++) {
      let cap = 4;
      if (i >= 3 && i <= 4) cap = 6;
      if (i >= 5 && i <= 6) cap = 8;
      mesas.push([100 + i, `Booth ${i}`, cap, 'booth', 1, 'booth']);
    }
    await pool.query(
      'INSERT INTO Mesa (idMesa, numero, capacidad, ubicacion, disponibilidad, tipo) VALUES ?',
      [mesas]
    );
    console.log('Mesas seed insertadas');
  }
}

async function seedAdminIfEmpty() {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM Administrador');
  if (rows[0].c === 0) {
    await pool.query('INSERT INTO Administrador (idAdministrador, email, contrasena, rol) VALUES (1, "admin@restaurante.mx", "12345", "admin")');
  }
}

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.json({ ok: false });
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: r[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use('/api', (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no disponible. Configure MYSQL_* en .env' });
  next();
});

app.get('/api/clientes', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT idCliente, nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono FROM Cliente ORDER BY idCliente DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT idCliente, nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono FROM Cliente WHERE idCliente=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre1, nombre2, apellido_paterno, apellido_materno, telefono, contrasena } = req.body;
  try {
    let query = 'UPDATE Cliente SET nombre1=?, nombre2=?, apellido_paterno=?, apellido_materno=?, telefono=?';
    let params = [nombre1, nombre2 || null, apellido_paterno, apellido_materno, telefono || null];
    if (contrasena) {
      query += ', contrasena=?';
      params.push(contrasena);
    }
    query += ' WHERE idCliente=?';
    params.push(id);
    await pool.query(query, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/mesas', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT idMesa, numero, capacidad, ubicacion, disponibilidad, tipo FROM Mesa ORDER BY idMesa');
    res.json(rows.map(m => ({
      idMesa: m.idMesa,
      numero: m.numero,
      capacidad: m.capacidad,
      ubicacion: m.ubicacion,
      disponibilidad: m.disponibilidad
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/mesas-disponibilidad', async (req, res) => {
  const { fecha_hora } = req.query;
  if (!fecha_hora) return res.status(400).json({ error: 'fecha_hora requerida' });
  try {
    const [mesas] = await pool.query('SELECT idMesa, numero FROM Mesa');
    const [reservas] = await pool.query(`
      SELECT Mesa_idMesa 
      FROM Reserva 
      WHERE ? >= DATE_SUB(fecha_hora, INTERVAL 2 HOUR) 
      AND ? <= DATE_ADD(fecha_hora, INTERVAL 2 HOUR)
      AND estado != 'CANCELADA'
      AND estado != 'RECHAZADA'
    `, [fecha_hora, fecha_hora]);
    const ocupadas = new Set(reservas.map(r => r.Mesa_idMesa));
    const resultado = mesas.map(m => ({
      idMesa: m.idMesa,
      numero: m.numero,
      disponibilidad: ocupadas.has(m.idMesa) ? 0 : 1
    }));
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clientes/registro', async (req, res) => {
  const { nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono, contrasena } = req.body;
  if (!nombre1 || !apellido_paterno || !apellido_materno || !email || !contrasena) {
    return res.status(400).json({ error: 'Faltan campos requeridos (Nombre, Apellidos)' });
  }
  
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!nameRegex.test(nombre1) || !nameRegex.test(apellido_paterno) || !nameRegex.test(apellido_materno)) {
    return res.status(400).json({ error: 'Los nombres y apellidos solo deben contener letras' });
  }
  if (nombre2 && !nameRegex.test(nombre2)) {
    return res.status(400).json({ error: 'El segundo nombre solo debe contener letras' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!['gmail.com', 'hotmail.com'].includes(emailDomain)) {
    return res.status(400).json({ error: 'Solo se permiten correos @gmail.com o @hotmail.com' });
  }
  
  if (telefono && telefono.length !== 10) {
    return res.status(400).json({ error: 'El teléfono debe tener exactamente 10 dígitos' });
  }
  
  if (contrasena.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  
  try {
    const [ins] = await pool.query(
      'INSERT INTO Cliente (nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono, contrasena) VALUES (?,?,?,?,?,?,?)',
      [nombre1, nombre2 || null, apellido_paterno, apellido_materno, email, telefono || null, contrasena]
    );
    res.json({ ok: true, id: ins.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clientes/login', async (req, res) => {
  const { email, contrasena } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT idCliente, nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono FROM Cliente WHERE email=? AND contrasena=?',
      [email, contrasena]
    );
    if (rows.length > 0) {
      res.json({ ok: true, user: rows[0] });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/mesas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { disponibilidad } = req.body ?? {};
  if (typeof disponibilidad !== 'number') return res.status(400).json({ error: 'disponibilidad requerida (0 o 1)' });
  try {
    await pool.query('UPDATE Mesa SET disponibilidad=? WHERE idMesa=?', [disponibilidad, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });
  try {
    const [rows] = await pool.query('SELECT idAdministrador, email, contrasena, rol FROM Administrador WHERE email=? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    const admin = rows[0];
    if (admin.contrasena !== password) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({ ok: true, admin: { id: admin.idAdministrador, email: admin.email, rol: admin.rol || 'admin' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reservas', async (_req, res) => {
  try {
    // Auto-delete past reservations (more than 2 hours ago)
    await pool.query(`DELETE FROM Reserva WHERE fecha_hora < DATE_SUB(NOW(), INTERVAL 2 HOUR) AND estado IN ('CREADA', 'CONFIRMADA')`);
    
    const [rows] = await pool.query(`
      SELECT 
        r.folioReserva, r.fecha_hora, r.numero_personas, r.estado, r.notas,
        CONCAT(c.nombre1, IF(c.nombre2 IS NOT NULL AND c.nombre2 != "", CONCAT(" ", c.nombre2), ""), " ", c.apellido_paterno, " ", c.apellido_materno) AS cliente_nombre,
        c.email AS cliente_email,
        m.numero AS mesa_numero
      FROM Reserva r
      JOIN Cliente c ON r.Cliente_idCliente = c.idCliente
      LEFT JOIN Mesa m ON r.Mesa_idMesa = m.idMesa
      ORDER BY r.fecha_hora DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reservas/cliente/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.folioReserva, r.fecha_hora, r.numero_personas, r.estado, r.notas,
        m.numero AS mesa_numero
      FROM Reserva r
      LEFT JOIN Mesa m ON r.Mesa_idMesa = m.idMesa
      WHERE r.Cliente_idCliente = ?
      ORDER BY r.fecha_hora DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT Mesa_idMesa FROM Reserva WHERE folioReserva = ?', [id]);
    if (rows.length > 0 && rows[0].Mesa_idMesa) {
      await conn.query('UPDATE Mesa SET disponibilidad = 1 WHERE idMesa = ?', [rows[0].Mesa_idMesa]);
    }
    await conn.query('DELETE FROM Reserva WHERE folioReserva = ?', [id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.put('/api/reservas/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'estado requerido' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (estado === 'CANCELADA' || estado === 'RECHAZADA') {
      const [rows] = await conn.query('SELECT Mesa_idMesa FROM Reserva WHERE folioReserva = ?', [id]);
      if (rows.length > 0 && rows[0].Mesa_idMesa) {
        await conn.query('UPDATE Mesa SET disponibilidad = 1 WHERE idMesa = ?', [rows[0].Mesa_idMesa]);
      }
    }
    await conn.query('UPDATE Reserva SET estado = ? WHERE folioReserva = ?', [estado, id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.post('/api/reservas', async (req, res) => {
  const { nombre, email, telefono, fecha_hora, numero_personas, notas, mesa_id, estado, nombre1, nombre2, apellido_paterno, apellido_materno } = req.body ?? {};
  if (!email || !fecha_hora || !numero_personas) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!['gmail.com', 'hotmail.com'].includes(emailDomain)) {
    return res.status(400).json({ error: 'Solo se permiten correos @gmail.com o @hotmail.com' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let clienteId;
    const [cRows] = await conn.query('SELECT idCliente FROM Cliente WHERE email=?', [email]);
    let n1 = nombre1, n2 = nombre2, ap = apellido_paterno, am = apellido_materno;
    if (!n1 && nombre) {
      const parts = nombre.trim().split(/\s+/);
      n1 = parts[0] || '';
      if (parts.length === 2) { ap = parts[1]; }
      else if (parts.length === 3) { ap = parts[1]; am = parts[2]; }
      else if (parts.length >= 4) { n2 = parts[1]; ap = parts[2]; am = parts[3]; }
    }
    if (cRows.length > 0) {
      clienteId = cRows[0].idCliente;
      await conn.query('UPDATE Cliente SET nombre1=?, nombre2=?, apellido_paterno=?, apellido_materno=?, telefono=? WHERE idCliente=?', [n1, n2 || null, ap, am, telefono || null, clienteId]);
    } else {
      const [ins] = await conn.query('INSERT INTO Cliente (nombre1, nombre2, apellido_paterno, apellido_materno, email, telefono) VALUES (?,?,?,?,?,?)', [n1, n2 || null, ap, am, email, telefono || null]);
      clienteId = ins.insertId;
    }
    const finalMesaId = (mesa_id && mesa_id !== 0) ? mesa_id : null;
    let finalEstado = "CREADA";
    if (estado && typeof estado === 'string' && estado.trim() !== "") {
      finalEstado = estado.trim().toUpperCase();
    }
    const [insRes] = await conn.query(
      'INSERT INTO Reserva (Cliente_idCliente, Mesa_idMesa, fecha_hora, numero_personas, estado, fecha_creacion, notas) VALUES (?,?,?,?,?,NOW(),?)',
      [clienteId, finalMesaId, fecha_hora, numero_personas, finalEstado, notas || null]
    );
    const folio = insRes.insertId;
    if (finalMesaId && (finalEstado === "CREADA" || finalEstado === "CONFIRMADA")) {
      await conn.query('UPDATE Mesa SET disponibilidad=0 WHERE idMesa=?', [finalMesaId]);
    }
    await conn.commit();
    res.json({ ok: true, folio, clienteId });
  } catch (e) {
    await conn.rollback();
    console.error('Error en reserva:', e);
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  try {
    await initDb();
  } catch (err) {
    console.error('Error inicializando DB (continuará sin DB):', err.message);
  }
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
start();
