import { db } from './services/db';

async function runMigration() {
  console.log('Iniciando migración de datos...');
  try {
    await db.seedFirebase();
    console.log('Migración de datos completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración de datos:', error);
  }
}

runMigration();