// Punto de entrada del panel CMS (/admin/*). Se carga de forma diferida:
// el portal público no descarga este código.
// Provisional: la sección del panel lo reemplaza con su propio árbol de rutas.
function AdminApp() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 font-body">
      <h1 className="serif-title text-4xl">Panel de administración</h1>
      <p className="mt-4 text-muted">En construcción.</p>
    </main>
  );
}

export default AdminApp;
