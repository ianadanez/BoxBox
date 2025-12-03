
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURACIÓN ---
const TARGET_SEASON = '2025';
const COLLECTIONS_TO_MIGRATE = ['teams', 'drivers']; // Corregido a 'teams' y 'drivers'
// -------------------

// Carga las credenciales de servicio desde el archivo en la raíz del proyecto
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
    console.error(`Error: No se pudo encontrar o leer el archivo serviceAccountKey.json.`);
    console.error(`Asegúrate de que el archivo 'serviceAccountKey.json' exista en la raíz de tu proyecto.`);
    process.exit(1);
}

// Inicializa la app de Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

/**
 * Copia todos los documentos de una colección raíz a una subcolección dentro de un documento de temporada.
 * @param sourceCollectionName El nombre de la colección a copiar (ej. "teams").
 * @param targetSeason El año de la temporada de destino (ej. "2025").
 */
async function copyCollectionToSeason(sourceCollectionName: string, targetSeason: string) {
  console.log(`\nIniciando la copia para la colección: ${sourceCollectionName}...`);

  const sourceColRef = db.collection(sourceCollectionName);
  const targetColRef = db.collection('seasons').doc(targetSeason).collection(sourceCollectionName);
  
  const snapshot = await sourceColRef.get();

  if (snapshot.empty) {
    console.log(`-> No se encontraron documentos en '${sourceCollectionName}'. Saltando.`);
    return;
  }

  console.log(`-> Se encontraron ${snapshot.size} documentos en '${sourceCollectionName}'. Preparando para copiar...`);

  // Usamos un batch para escribir todos los documentos en una sola operación atómica
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    const docData = doc.data();
    const docId = doc.id;
    console.log(`   - Añadiendo documento con ID: ${docId}`);
    const targetDocRef = targetColRef.doc(docId);
    batch.set(targetDocRef, docData);
  });

  await batch.commit();
  console.log(`-> ¡Éxito! Se replicaron ${snapshot.size} documentos de '${sourceCollectionName}' a 'seasons/${targetSeason}/${sourceCollectionName}'.`);
}

/**
 * Función principal que ejecuta todo el proceso de copia.
 */
async function runMigration() {
  try {
    console.log(`================================================================`);
    console.log(`🚀 Iniciando la réplica de entidades para la temporada ${TARGET_SEASON} 🚀`);
    console.log(`================================================================`);

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        await copyCollectionToSeason(collectionName, TARGET_SEASON);
    }

    console.log(`\n================================================================`);
    console.log(`✅ Proceso de copia completado con éxito.`);
    console.log(`================================================================`);

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA COPIA:', error);
    process.exit(1); // Termina el script con un código de error
  }
}

// Ejecutar el script
runMigration();
