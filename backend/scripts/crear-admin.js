// Crea un usuario Administrador (sin sede) en la base de datos de DATABASE_URL.
//   npm run crear-admin
// Pide el correo, el nombre y la contraseña por consola. La contraseña no se escribe en pantalla
// ni se recibe por argumentos, para que no quede en el historial ni en la lista de procesos.
import readline from 'node:readline/promises';
import { ErrorEntorno, obtenerEntorno } from '../src/config/entorno.js';
import { cerrarPool, transaccion } from '../src/db/index.js';
import { ErrorApp } from '../src/errores/ErrorApp.js';
import { crearAdministrador } from '../src/services/usuarios.service.js';
import { contrasenaNueva } from '../src/utils/contrasenas.js';

// Pregunta con eco (correo y nombre).
async function preguntar(texto) {
  const lector = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await lector.question(texto)).trim();
  } finally {
    lector.close();
  }
}

// Pregunta sin mostrar lo que se escribe (contraseña). Requiere una terminal interactiva.
function preguntarOculto(texto) {
  return new Promise((resolver, rechazar) => {
    const { stdin, stdout } = process;
    let escrito = '';

    function terminar() {
      stdin.off('data', alRecibir);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    }

    function alRecibir(trozo) {
      for (const caracter of trozo) {
        if (caracter === '\r' || caracter === '\n') {
          terminar();
          return resolver(escrito);
        }
        if (caracter === '\u0003') {
          terminar();
          return rechazar(new Error('Cancelado.'));
        }
        if (caracter === '\u007f' || caracter === '\b') {
          escrito = escrito.slice(0, -1);
        } else {
          escrito += caracter;
        }
      }
    }

    stdout.write(texto);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', alRecibir);
  });
}

async function pedirContrasena() {
  for (;;) {
    const contrasena = await preguntarOculto('Contraseña (mínimo 10 caracteres): ');
    const comprobacion = contrasenaNueva.safeParse(contrasena);
    if (!comprobacion.success) {
      console.error(`  ${comprobacion.error.issues[0].message}`);
      continue;
    }

    const repetida = await preguntarOculto('Repite la contraseña: ');
    if (repetida !== contrasena) {
      console.error('  Las contraseñas no coinciden.');
      continue;
    }
    return contrasena;
  }
}

async function principal() {
  if (!process.stdin.isTTY) {
    throw new Error('Ejecuta este script en una terminal interactiva (npm run crear-admin).');
  }

  obtenerEntorno();
  console.log('Crear un usuario Administrador (acceso a todas las sedes).\n');

  const correo = await preguntar('Correo: ');
  const nombreCompleto = await preguntar('Nombre completo: ');
  const contrasena = await pedirContrasena();

  const administrador = await transaccion(({ consultar }) =>
    crearAdministrador({ correo, nombreCompleto, contrasena }, { consultar }),
  );

  console.log(`\nAdministrador creado: ${administrador.correo} (id ${administrador.id}).`);
}

try {
  await principal();
  await cerrarPool();
  process.exit(0);
} catch (error) {
  if (error instanceof ErrorEntorno) {
    console.error(error.message);
  } else if (error instanceof ErrorApp) {
    console.error(`\n${error.message}`);
    for (const detalle of error.detalles) console.error(`  - ${detalle.campo}: ${detalle.mensaje}`);
  } else {
    console.error(`\nNo se pudo crear el administrador: ${error.message}`);
  }
  await cerrarPool().catch(() => {});
  process.exit(1);
}
