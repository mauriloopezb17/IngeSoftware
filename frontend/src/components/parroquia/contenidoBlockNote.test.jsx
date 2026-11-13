import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import ContenidoBlockNote from './ContenidoBlockNote.jsx';

// Ejemplo completo tomado de docs/api/contenido.md (los 7 tipos de bloque + inline + anidamiento).
const DOCUMENTO_EJEMPLO_CONTRATO = {
  formato: 'blocknote',
  version: 1,
  bloques: [
    {
      id: 'b1',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        {
          type: 'text',
          text: 'Este sábado celebramos las primeras comuniones de 42 niños de nuestra parroquia.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'b2',
      type: 'heading',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
        level: 2,
        isToggleable: false,
      },
      content: [
        {
          type: 'text',
          text: 'Requisitos para la catequesis 2027',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'b3',
      type: 'bulletListItem',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [{ type: 'text', text: 'Niños desde los 8 años.', styles: {} }],
      children: [
        {
          id: 'b3a',
          type: 'bulletListItem',
          props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
          },
          content: [
            { type: 'text', text: 'Certificado de bautismo ', styles: {} },
            { type: 'text', text: 'original', styles: { bold: true } },
          ],
          children: [],
        },
      ],
    },
    {
      id: 'b4',
      type: 'numberedListItem',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        {
          type: 'text',
          text: 'Inscripción en secretaría, de febrero a marzo.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'b5',
      type: 'numberedListItem',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        {
          type: 'text',
          text: 'Reunión de padres el primer sábado de abril.',
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: 'b6',
      type: 'quote',
      props: { textColor: 'default', backgroundColor: 'default' },
      content: [
        {
          type: 'text',
          text: 'Dejen que los niños vengan a mí.',
          styles: { italic: true },
        },
      ],
      children: [],
    },
    {
      id: 'b7',
      type: 'image',
      props: {
        textAlignment: 'center',
        backgroundColor: 'default',
        name: 'crucifijo.webp',
        url: '/media/seed/crucifijo.webp',
        caption: 'Crucifijo en el interior del templo parroquial',
        showPreview: true,
        previewWidth: 720,
      },
      children: [],
    },
    {
      id: 'b8',
      type: 'video',
      props: {
        textAlignment: 'center',
        backgroundColor: 'default',
        name: 'portada-final.mp4',
        url: '/media/seed/portada-final.mp4',
        caption: 'Recorrido aéreo y del templo',
        showPreview: true,
        previewWidth: 720,
      },
      children: [],
    },
    {
      id: 'b9',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        { type: 'text', text: 'Más información en la ', styles: {} },
        {
          type: 'link',
          href: 'https://www.facebook.com/profile.php?id=100064836665037',
          content: [
            {
              type: 'text',
              text: 'página de Facebook de la parroquia',
              styles: {},
            },
          ],
        },
        { type: 'text', text: '.', styles: {} },
      ],
      children: [],
    },
  ],
};

describe('ContenidoBlockNote', () => {
  it('renderiza todos los bloques del ejemplo completo de contenido.md', () => {
    const { container } = render(<ContenidoBlockNote contenido={DOCUMENTO_EJEMPLO_CONTRATO} />);

    expect(
      screen.getByText('Este sábado celebramos las primeras comuniones de 42 niños de nuestra parroquia.'),
    ).toBeInTheDocument();

    const h2 = screen.getByRole('heading', { level: 2, name: 'Requisitos para la catequesis 2027' });
    expect(h2).toBeInTheDocument();

    expect(screen.getByText('Niños desde los 8 años.')).toBeInTheDocument();
    const original = screen.getByText('original');
    expect(original.tagName).toBe('STRONG');

    const listaNumerada = container.querySelector('ol');
    expect(listaNumerada).toBeInTheDocument();
    expect(listaNumerada.querySelectorAll('li')).toHaveLength(2);

    const cita = container.querySelector('blockquote');
    expect(cita).toBeInTheDocument();
    expect(screen.getByText('Dejen que los niños vengan a mí.').tagName).toBe('EM');

    const imagen = screen.getByAltText('Crucifijo en el interior del templo parroquial');
    expect(imagen).toHaveAttribute('src', '/media/seed/crucifijo.webp');
    expect(imagen).toHaveAttribute('width', '720');
    expect(screen.getByText('Crucifijo en el interior del templo parroquial')).toBeInTheDocument();

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/media/seed/portada-final.mp4');
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(screen.getByText('Recorrido aéreo y del templo')).toBeInTheDocument();

    const enlaceFacebook = screen.getByRole('link', { name: 'página de Facebook de la parroquia' });
    expect(enlaceFacebook).toHaveAttribute(
      'href',
      'https://www.facebook.com/profile.php?id=100064836665037',
    );
    expect(enlaceFacebook).toHaveAttribute('target', '_blank');
    expect(enlaceFacebook).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renderiza enlaces mailto y tel sin target _blank y muestra enlaces javascript: y data: como texto sin <a>', () => {
    const documento = {
      formato: 'blocknote',
      version: 1,
      bloques: [
        {
          id: 'l1',
          type: 'paragraph',
          props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
          content: [
            {
              type: 'link',
              href: 'mailto:secretaria@parroquia.bo',
              content: [{ type: 'text', text: 'Correo de secretaría', styles: {} }],
            },
            { type: 'text', text: ' · ', styles: {} },
            {
              type: 'link',
              href: 'tel:+59122784937',
              content: [{ type: 'text', text: 'Llamar ahora', styles: {} }],
            },
            { type: 'text', text: ' · ', styles: {} },
            {
              type: 'link',
              href: 'javascript:alert(1)',
              content: [{ type: 'text', text: 'Enlace malicioso JS', styles: {} }],
            },
            { type: 'text', text: ' · ', styles: {} },
            {
              type: 'link',
              href: 'data:text/html,<script>alert(1)</script>',
              content: [{ type: 'text', text: 'Enlace malicioso Data', styles: {} }],
            },
          ],
          children: [],
        },
      ],
    };

    render(<ContenidoBlockNote contenido={documento} />);

    const mailto = screen.getByRole('link', { name: 'Correo de secretaría' });
    expect(mailto).toHaveAttribute('href', 'mailto:secretaria@parroquia.bo');
    expect(mailto).not.toHaveAttribute('target');

    const tel = screen.getByRole('link', { name: 'Llamar ahora' });
    expect(tel).toHaveAttribute('href', 'tel:+59122784937');
    expect(tel).not.toHaveAttribute('target');

    expect(screen.getByText('Enlace malicioso JS')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Enlace malicioso JS' })).not.toBeInTheDocument();

    expect(screen.getByText('Enlace malicioso Data')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Enlace malicioso Data' })).not.toBeInTheDocument();
  });

  it('ignora bloques desconocidos sin romper el resto del documento y aplica estilos en línea', () => {
    const documento = {
      formato: 'blocknote',
      version: 1,
      bloques: [
        {
          id: 'u1',
          type: 'table',
          props: {},
          content: [],
          children: [],
        },
        {
          id: 'h3',
          type: 'heading',
          props: {
            level: 3,
            textAlignment: 'center',
            textColor: 'red',
            backgroundColor: 'yellow',
          },
          content: [
            { type: 'text', text: 'Subtítulo ', styles: { underline: true } },
            { type: 'text', text: 'tachado', styles: { strike: true, textColor: 'blue' } },
          ],
          children: [],
        },
      ],
    };

    render(<ContenidoBlockNote contenido={documento} />);

    const h3 = screen.getByRole('heading', { level: 3 });
    expect(h3).toHaveClass('bn-alinear-center', 'bn-texto-red', 'bn-fondo-yellow');
    expect(screen.getByText('Subtítulo').tagName).toBe('U');
    expect(screen.getByText('tachado').tagName).toBe('S');
  });

  it('no renderiza nada cuando el contenido es nulo o está vacío', () => {
    const { container: c1 } = render(<ContenidoBlockNote contenido={null} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <ContenidoBlockNote contenido={{ formato: 'blocknote', version: 1, bloques: [] }} />,
    );
    expect(c2).toBeEmptyDOMElement();
  });
});
