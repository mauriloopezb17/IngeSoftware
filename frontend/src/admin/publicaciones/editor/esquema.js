// Configuración del editor de publicaciones: SOLO los bloques y estilos que permite
// docs/api/contenido.md ("Configuración del editor en el panel"). Cualquier otro tipo de BlockNote
// (tablas, código, archivos, audio, casillas, desplegables, separadores) la API lo rechaza con
// 400 VALIDACION, por eso el editor ni siquiera los ofrece.
//
// Este archivo importa BlockNote: solo debe cargarse desde el editor (que se descarga de forma
// diferida), nunca desde el resto de la pantalla.
import { BlockNoteSchema, createHeadingBlockSpec, defaultBlockSpecs, defaultStyleSpecs } from '@blocknote/core';

const { paragraph, bulletListItem, numberedListItem, quote, image, video } = defaultBlockSpecs;
const { bold, italic, underline, strike, textColor, backgroundColor } = defaultStyleSpecs;

// `heading` solo admite los niveles 2 y 3: el título (h1) lo pone el portal.
export const NIVELES_DE_TITULO = [2, 3];
const heading = createHeadingBlockSpec({ levels: NIVELES_DE_TITULO, defaultLevel: 2 });

export const esquemaPublicacion = BlockNoteSchema.create({
  blockSpecs: { paragraph, heading, bulletListItem, numberedListItem, quote, image, video },
  styleSpecs: { bold, italic, underline, strike, textColor, backgroundColor },
});

export const BLOQUES_PERMITIDOS = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'quote', 'image', 'video'];
export const ESTILOS_PERMITIDOS = ['bold', 'italic', 'underline', 'strike', 'textColor', 'backgroundColor'];

// Opciones del menú «/» y del selector de tipo de bloque que sí se ofrecen. BlockNote trae además los
// títulos desplegables (toggle) y el selector de emojis, que el contrato no contempla.
const CLAVES_DEL_MENU = ['heading_2', 'heading_3', 'quote', 'numbered_list', 'bullet_list', 'paragraph', 'image', 'video'];

export const esOpcionPermitidaDelMenu = (item) => CLAVES_DEL_MENU.includes(item.key);
export const esTipoDeBloquePermitido = (item) => !item.props?.isToggleable;
