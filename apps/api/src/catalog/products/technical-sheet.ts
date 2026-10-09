import { BadRequestException } from '@nestjs/common';
import { parseDocument } from 'htmlparser2';
import type { UpdateTechnicalSheetDto } from './dto/update-technical-sheet.dto';

export type ProductSheet = Pick<UpdateTechnicalSheetDto, 'technical' | 'benefits'>;
const allowed = new Set(['p', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'em', 'strong', 'b', 'h3', 'br', 'ul', 'ol', 'li']);
const blocked = new Set(['script', 'style', 'iframe', 'object', 'svg', 'math', 'template']);
const icons = new Set(['joints', 'digestion', 'coat', 'dental', 'urinary', 'weight', 'growth', 'cognition', 'energy', 'natural', 'protein', 'immunity', 'heart', 'vision', 'odor', 'hygiene', 'palatability', 'hydration', 'safety', 'fit', 'durability', 'training', 'sustainability', 'value', 'nutrition', 'freshness']);
export const sheetSourceKey = (url: string) => url.toLowerCase().replace(/\/+$/, '');
export const escapeSheetText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sanitizeSheetHtml(html: string): string {
  const document = parseDocument(html);
  const render = (node: typeof document.children[number]): string => {
    if (node.type === 'text') return escapeSheetText(node.data);
    if (!('children' in node)) return '';
    if ('name' in node && blocked.has(node.name)) return '';
    const content = node.children.map(render).join('');
    if (!('name' in node) || !allowed.has(node.name)) return content;
    const attributes: string[] = [];
    if (node.name === 'td' || node.name === 'th') {
      for (const name of ['colspan', 'rowspan']) {
        const value = node.attribs[name];
        if (value && /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 100) attributes.push(`${name}="${Number(value)}"`);
      }
      if (['col', 'row', 'colgroup', 'rowgroup'].includes(node.attribs.scope)) attributes.push(`scope="${node.attribs.scope}"`);
    }
    return `<${node.name}${attributes.length ? ' ' + attributes.join(' ') : ''}>${node.name === 'br' ? '' : `${content}</${node.name}>`}`;
  };
  return document.children.map(render).join('');
}

function hasContent(html: string) {
  const document = parseDocument(html);
  const text = (node: typeof document.children[number]): string => node.type === 'text' ? node.data : 'children' in node ? node.children.map(text).join('') : '';
  return Boolean(document.children.map(text).join('').trim());
}

export function normalizeTechnicalSheet(input: ProductSheet): ProductSheet {
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 80000) throw new BadRequestException('La ficha tecnica es demasiado extensa.');
  const technical = input.technical.map((block) => {
    const label = block.label.trim();
    if (!label) throw new BadRequestException('Cada seccion necesita un titulo.');
    if (block.html !== undefined && block.text !== undefined) throw new BadRequestException('Usa un solo formato por seccion.');
    if (block.html !== undefined) {
      const html = sanitizeSheetHtml(block.html);
      if (!hasContent(html)) throw new BadRequestException(`La seccion ${label} esta vacia.`);
      return { label, html };
    }
    const text = block.text?.trim();
    if (!text) throw new BadRequestException(`La seccion ${label} esta vacia.`);
    return { label, text };
  });
  if (new Set(technical.map((block) => block.label.toLocaleLowerCase('es'))).size !== technical.length) throw new BadRequestException('Los titulos de las secciones no pueden repetirse.');
  const benefits = input.benefits.map(({ icon, label }) => {
    if (!icons.has(icon) || !label.trim()) throw new BadRequestException('Revisa las caracteristicas principales.');
    return { icon, label: label.trim() };
  });
  return { technical, benefits };
}
