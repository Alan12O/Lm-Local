/**
 * Tests de integración: MarkdownText + ArtifactCanvas
 *
 * Valida que el parser de Markdown intercepta bloques de código
 * con lenguaje html/artifact y los delega a ArtifactCanvas en lugar
 * de renderizar texto crudo.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownText } from '../../../src/components/MarkdownText';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Integración: MarkdownText → ArtifactCanvas', () => {
  it('renderiza un bloque ```html como ArtifactCanvas (muestra "HTML Preview")', () => {
    const markdown = '```html\n<h1>Hola</h1>\n```';
    const { getByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    expect(getByText('HTML Preview')).toBeTruthy();
  });

  it('renderiza un bloque ```artifact como ArtifactCanvas (muestra "Artifact")', () => {
    const markdown = '```artifact\n<div>Test</div>\n```';
    const { getByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    expect(getByText('Artifact')).toBeTruthy();
  });

  it('renderiza un bloque ```svg como ArtifactCanvas (muestra "HTML Preview")', () => {
    const markdown = '```svg\n<svg><circle r="50"/></svg>\n```';
    const { getByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    expect(getByText('HTML Preview')).toBeTruthy();
  });

  it('renderiza un bloque ```javascript como código crudo (NO muestra ArtifactCanvas)', () => {
    const markdown = '```javascript\nconsole.log("test");\n```';
    const { queryByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    // No debería aparecer el encabezado de ArtifactCanvas
    expect(queryByText('HTML Preview')).toBeNull();
    expect(queryByText('Artifact')).toBeNull();
  });

  it('renderiza un bloque ```python como código crudo (NO muestra ArtifactCanvas)', () => {
    const markdown = '```python\nprint("hola")\n```';
    const { queryByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    expect(queryByText('HTML Preview')).toBeNull();
  });

  it('renderiza texto markdown normal junto con un bloque html', () => {
    const markdown = 'Aquí tienes un ejemplo:\n\n```html\n<p>Párrafo</p>\n```\n\nEso es todo.';
    const { getByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    expect(getByText('HTML Preview')).toBeTruthy();
  });

  it('renderiza múltiples bloques html en el mismo mensaje', () => {
    const markdown = '```html\n<p>Primero</p>\n```\n\n```html\n<p>Segundo</p>\n```';
    const { getAllByText } = render(<MarkdownText>{markdown}</MarkdownText>);
    // Ambos bloques deben mostrar "HTML Preview"
    expect(getAllByText('HTML Preview').length).toBe(2);
  });
});
