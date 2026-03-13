import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const PLACEHOLDER_REGEX = /\{\{([A-Za-z0-9_]+)\}\}/g;

function createPlaceholderDecorations(doc) {
    const decorations = [];

    doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;

        const text = node.text;
        let match;

        while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
            const start = pos + match.index;
            const end = start + match[0].length;

            decorations.push(
                Decoration.inline(start, end, {
                    class: 'placeholder-variable',
                    'data-placeholder-name': match[1],
                })
            );
        }

        PLACEHOLDER_REGEX.lastIndex = 0;
    });

    return DecorationSet.create(doc, decorations);
}

export const PlaceholderHighlight = Extension.create({
    name: 'placeholderHighlight',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                state: {
                    init(_, { doc }) {
                        return createPlaceholderDecorations(doc);
                    },
                    apply(tr, oldDecorationSet) {
                        if (!tr.docChanged) return oldDecorationSet;
                        return createPlaceholderDecorations(tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
            }),
        ];
    },
});