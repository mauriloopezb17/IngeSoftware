import { ArrowDown, ArrowUp, FolderTree, Pencil } from 'lucide-react';
import { Boton, Insignia } from '../../ui/index.js';

function FilaNodo({
  sede,
  indice,
  totalHermanas,
  sedeActivaId,
  puedeGestionarSedes,
  moviendoId,
  onSubir,
  onBajar,
  onMover,
  onEditar,
}) {
  const editando = sedeActivaId === sede.id;
  const cargando = moviendoId === sede.id;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sand bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{sede.nombre}</p>
          <Insignia variante="borrador">{sede.tipo?.nombre}</Insignia>
          <Insignia variante={sede.activo === false ? 'archivado' : 'publicado'}>
            {sede.activo === false ? 'Inactiva' : 'Activa'}
          </Insignia>
        </div>
        <p className="mt-0.5 text-xs text-muted">/{sede.slug}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {puedeGestionarSedes && (
          <>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={ArrowUp}
              disabled={indice === 0 || Boolean(moviendoId)}
              onClick={onSubir}
              aria-label={`Subir «${sede.nombre}»`}
            >
              Subir
            </Boton>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={ArrowDown}
              disabled={indice >= totalHermanas - 1 || Boolean(moviendoId)}
              onClick={onBajar}
              aria-label={`Bajar «${sede.nombre}»`}
            >
              Bajar
            </Boton>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={FolderTree}
              cargando={cargando}
              disabled={Boolean(moviendoId)}
              onClick={() => onMover(sede)}
              aria-label={`Mover «${sede.nombre}»`}
            >
              Mover
            </Boton>
          </>
        )}
        <Boton
          variante={editando ? 'primario' : 'secundario'}
          tamano="sm"
          icono={Pencil}
          onClick={() => onEditar(sede.id)}
          aria-label={`Editar «${sede.nombre}»`}
        >
          {editando ? 'Editando' : 'Editar'}
        </Boton>
      </div>
    </div>
  );
}

function ListaHermanas({
  hermanas,
  sedeActivaId,
  puedeGestionarSedes,
  moviendoId,
  onReordenar,
  onMover,
  onEditar,
  renderHijas,
}) {
  return (
    <ul className="flex flex-col gap-3">
      {hermanas.map((sede, indice) => (
        <li key={sede.id}>
          <FilaNodo
            sede={sede}
            indice={indice}
            totalHermanas={hermanas.length}
            sedeActivaId={sedeActivaId}
            puedeGestionarSedes={puedeGestionarSedes}
            moviendoId={moviendoId}
            onSubir={() => onReordenar(hermanas, indice, indice - 1)}
            onBajar={() => onReordenar(hermanas, indice, indice + 1)}
            onMover={onMover}
            onEditar={onEditar}
          />
          {renderHijas?.(sede)}
        </li>
      ))}
    </ul>
  );
}

export default function ArbolSedes({
  arbol,
  sedeActivaId,
  puedeGestionarSedes,
  moviendoId,
  onReordenar,
  onMover,
  onEditar,
}) {
  const parroquias = arbol?.parroquias ?? [];
  const pasionistas = arbol?.comunidadesPasionistas ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="titulo-arbol-parroquias" className="flex flex-col gap-3">
        <h2 id="titulo-arbol-parroquias" className="font-body text-lg font-semibold text-ink">
          Parroquias, capillas y comunidades
        </h2>
        {parroquias.length === 0 ? (
          <p className="rounded-md border border-sand bg-white p-4 text-sm text-muted">
            No hay parroquias registradas todavía.
          </p>
        ) : (
          <ListaHermanas
            hermanas={parroquias}
            sedeActivaId={sedeActivaId}
            puedeGestionarSedes={puedeGestionarSedes}
            moviendoId={moviendoId}
            onReordenar={onReordenar}
            onMover={onMover}
            onEditar={onEditar}
            renderHijas={(parroquia) => {
              const tieneHijas =
                (parroquia.capillas?.length ?? 0) > 0 ||
                (parroquia.comunidades?.length ?? 0) > 0;
              if (!tieneHijas) return null;

              return (
                <div className="mt-3 ml-5 flex flex-col gap-3 border-l-2 border-sand pl-4">
                  {(parroquia.capillas?.length ?? 0) > 0 && (
                    <ListaHermanas
                      hermanas={parroquia.capillas}
                      sedeActivaId={sedeActivaId}
                      puedeGestionarSedes={puedeGestionarSedes}
                      moviendoId={moviendoId}
                      onReordenar={onReordenar}
                      onMover={onMover}
                      onEditar={onEditar}
                      renderHijas={(capilla) =>
                        (capilla.comunidades?.length ?? 0) > 0 ? (
                          <div className="mt-3 ml-5 border-l-2 border-sand pl-4">
                            <ListaHermanas
                              hermanas={capilla.comunidades}
                              sedeActivaId={sedeActivaId}
                              puedeGestionarSedes={puedeGestionarSedes}
                              moviendoId={moviendoId}
                              onReordenar={onReordenar}
                              onMover={onMover}
                              onEditar={onEditar}
                            />
                          </div>
                        ) : null
                      }
                    />
                  )}

                  {(parroquia.comunidades?.length ?? 0) > 0 && (
                    <ListaHermanas
                      hermanas={parroquia.comunidades}
                      sedeActivaId={sedeActivaId}
                      puedeGestionarSedes={puedeGestionarSedes}
                      moviendoId={moviendoId}
                      onReordenar={onReordenar}
                      onMover={onMover}
                      onEditar={onEditar}
                    />
                  )}
                </div>
              );
            }}
          />
        )}
      </section>

      <section aria-labelledby="titulo-arbol-pasionistas" className="flex flex-col gap-3">
        <h2 id="titulo-arbol-pasionistas" className="font-body text-lg font-semibold text-ink">
          Comunidad pasionista
        </h2>
        {pasionistas.length === 0 ? (
          <p className="rounded-md border border-sand bg-white p-4 text-sm text-muted">
            No hay comunidades pasionistas registradas todavía.
          </p>
        ) : (
          <ListaHermanas
            hermanas={pasionistas}
            sedeActivaId={sedeActivaId}
            puedeGestionarSedes={puedeGestionarSedes}
            moviendoId={moviendoId}
            onReordenar={onReordenar}
            onMover={onMover}
            onEditar={onEditar}
          />
        )}
      </section>
    </div>
  );
}
