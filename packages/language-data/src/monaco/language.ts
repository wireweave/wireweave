/**
 * Monaco Language Definition for Wireframe DSL
 *
 * Provides syntax highlighting via Monarch tokenizer
 */

import type * as Monaco from 'monaco-editor'
import { getComponentNames, getAttributeNames } from '../utils.js'
import { VALUE_KEYWORDS } from '../keywords.js'

/**
 * Language ID for Monaco
 */
export const LANGUAGE_ID = 'wireframe'

/**
 * Language aliases
 */
export const LANGUAGE_ALIASES = ['wireweave', 'wf']

/**
 * File extensions
 */
export const LANGUAGE_EXTENSIONS = ['.wf', '.wireframe']

/**
 * Get Monarch tokenizer configuration
 * This provides syntax highlighting for the Wireframe DSL
 */
export function getMonarchTokensProvider(): Monaco.languages.IMonarchLanguage {
  const componentNames = getComponentNames()
  const attributeNames = getAttributeNames()

  // Layout/container components (keywords)
  const layoutComponents = [
    'page',
    'header',
    'footer',
    'main',
    'sidebar',
    'nav',
    'row',
    'col',
    'card',
    'modal',
    'table',
    'form',
    'tabs',
  ]

  // Other components (types)
  const otherComponents = componentNames.filter((c) => !layoutComponents.includes(c))

  return {
    defaultToken: '',
    tokenPostfix: '.wireframe',

    // Keywords and identifiers
    keywords: layoutComponents,
    typeKeywords: otherComponents,
    attributes: attributeNames,
    valueKeywords: VALUE_KEYWORDS,

    // Operators
    operators: ['='],

    // Symbols
    symbols: /[=><!~?:&|+\-*/^%]+/,

    // Escapes
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    // Tokenizer
    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],

        // Numbers
        [/\d+(\.\d+)?/, 'number'],

        // Identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@attributes': 'attribute.name',
              '@valueKeywords': 'attribute.value',
              '@default': 'identifier',
            },
          },
        ],

        // Brackets
        [/[{}()[\]]/, '@brackets'],

        // Operators
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],

        // Whitespace
        [/[ \t\r\n]+/, 'white'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
    },
  }
}

/**
 * Language configuration for Monaco
 * Provides bracket matching, auto-closing, etc.
 */
export function getLanguageConfiguration(): Monaco.languages.LanguageConfiguration {
  return {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
    ],
    folding: {
      markers: {
        start: /^\s*\{/,
        end: /^\s*\}/,
      },
    },
    indentationRules: {
      increaseIndentPattern: /\{\s*$/,
      decreaseIndentPattern: /^\s*\}/,
    },
  }
}
