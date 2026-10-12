import mysql from 'mysql2/promise';
import 'dotenv/config';

const variablesRequeridas = ['MYSQLHOST', 'MYSQLUSER', 'MYSQLPASSWORD', 'MYSQLDATABASE', 'MYSQLPORT'];

for (const variable of variablesRequeridas) {
  if (!process.env[variable]) {
    throw new Error(
      `Falta la variable de entorno ${variable}`
    );
  }
}

const puerto = Number(process.env.MYSQLPORT);

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('MYSQLPORT debe ser un puerto válido');
}

export const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: puerto,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});