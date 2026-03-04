// // src/extensions/BlockIdExtension.js
// import { Node } from '@tiptap/core';
// import { v4 as uuidv4 } from 'uuid';

// export const BlockIdExtension = Node.create({
//     name: 'blockIdAttr',  // Attribute on existing nodes
//     addAttributes() {
//         return {
//             blockId: {
//                 default: null,
//                 parseHTML: el => el.getAttribute('data-block-id'),
//                 renderHTML: attrs => attrs.blockId ? { 'data-block-id': attrs.blockId } : {},
//             },
//         };
//     },
// });

// // Also create a ProseMirror plugin to auto-assign on insert
// import { Plugin, PluginKey } from 'prosemirror-state';

// const blockIdPlugin = new Plugin({
//     key: new PluginKey('blockId'),
//     props: {
//         attributes(input) {
//             return { 'data-block-id': uuidv4() };  // New blocks get ID
//         },
//     },
//     appendTransaction: [/* persist on changes */],
// });





import { Node } from '@tiptap/core';
import { v4 as uuidv4 } from 'uuid';

export const BlockIdExtension = Node.create({
    name: 'blockIdAttr',
    group: 'block',
    selectable: true,
    atom: true,

    addAttributes() {
        return {
            blockId: {
                default: null,
                parseHTML: el => el.getAttribute('data-block-id'),
                renderHTML: attrs => ({
                    'data-block-id': attrs.blockId || uuidv4()
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-block-id]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-block-id': HTMLAttributes.blockId || uuidv4() }, 0];
    },
});
