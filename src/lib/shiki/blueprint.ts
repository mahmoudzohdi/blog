import type { ThemeRegistration } from 'shiki';

/** "Blueprint": code colours from the zohdi.me palette, shared with talks.zohdi.me. Navy in light and dark mode. */
export const blueprint: ThemeRegistration = {
  name: 'zohdi-blueprint',
  type: 'dark',
  colors: { 'editor.background': '#0a1257', 'editor.foreground': '#d6e0ff' },
  tokenColors: [
    { settings: { foreground: '#d6e0ff' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#7d88b8', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'variable.language'], settings: { foreground: '#9db0ff' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string', 'markup.inline.raw'], settings: { foreground: '#8fe3d8' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'support.constant', 'constant.other'], settings: { foreground: '#f08a5d' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'variable.function'], settings: { foreground: '#ffffff' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: '#b9c6ff' } },
    { scope: ['entity.name.tag', 'punctuation.definition.tag'], settings: { foreground: '#9db0ff' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#8fe3d8', fontStyle: 'italic' } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key', 'support.type.property-name'], settings: { foreground: '#d6e0ff' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#a3acc4' } },
    { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: '#ffffff', fontStyle: 'bold' } },
    { scope: ['markup.inserted'], settings: { foreground: '#4cc493' } },
    { scope: ['markup.deleted'], settings: { foreground: '#f08a5d' } },
  ],
};
