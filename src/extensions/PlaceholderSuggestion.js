import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

function createSuggestionList(items = []) {
    const container = document.createElement('div');
    container.className = 'placeholder-suggestion-list';

    const list = document.createElement('div');
    list.className = 'placeholder-suggestion-items';
    container.appendChild(list);

    let selectedIndex = 0;
    let currentItems = items;
    let command = null;

    const renderItems = () => {
        list.innerHTML = '';

        if (!currentItems.length) {
            const empty = document.createElement('div');
            empty.className = 'placeholder-suggestion-empty';
            empty.textContent = 'No placeholders found';
            list.appendChild(empty);
            return;
        }

        currentItems.forEach((item, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `placeholder-suggestion-item ${index === selectedIndex ? 'is-selected' : ''
                }`;
            button.textContent = item;

            button.addEventListener('mousedown', (event) => {
                event.preventDefault();
                if (command) {
                    command(item);
                }
            });

            list.appendChild(button);
        });
    };

    renderItems();

    return {
        element: container,

        update(props) {
            currentItems = props.items || [];
            command = props.command;

            if (selectedIndex >= currentItems.length) {
                selectedIndex = 0;
            }

            renderItems();
        },

        onKeyDown(props) {
            if (!currentItems.length) return false;

            if (props.event.key === 'ArrowUp') {
                selectedIndex =
                    (selectedIndex + currentItems.length - 1) % currentItems.length;
                renderItems();
                return true;
            }

            if (props.event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                renderItems();
                return true;
            }

            if (props.event.key === 'Enter') {
                props.event.preventDefault();
                if (command && currentItems[selectedIndex]) {
                    command(currentItems[selectedIndex]);
                    return true;
                }
            }

            return false;
        },
    };
}

export const PlaceholderSuggestion = Extension.create({
    name: 'placeholderSuggestion',

    addOptions() {
        return {
            suggestion: {
                char: '{',
                allowSpaces: false,
                startOfLine: false,

                allowedPrefixes: null,

                items: ({ editor, query }) => {
                    const variableNames =
                        editor.storage.placeholderSuggestion?.items || [];

                    const normalizedQuery = (query || '').replace(/^\{/, '').trim();

                    return variableNames.filter((item) =>
                        item.toLowerCase().includes(normalizedQuery.toLowerCase())
                    );
                },

                command: ({ editor, range, props }) => {
                    const from = range.from;
                    const to = range.to;

                    const textBefore = editor.state.doc.textBetween(
                        Math.max(0, from - 2),
                        from,
                        '\0',
                        '\0'
                    );

                    if (textBefore === '{{') {
                        editor
                            .chain()
                            .focus()
                            .deleteRange({ from: from - 2, to })
                            .insertContent(`{{${props}}}`)
                            .run();
                        return;
                    }

                    editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .insertContent(`{{${props}}}`)
                        .run();
                },

                allow: ({ state, range }) => {
                    const textBefore = state.doc.textBetween(
                        Math.max(0, range.from - 2),
                        range.from,
                        '\0',
                        '\0'
                    );

                    return textBefore === '{{';
                },

                render: () => {
                    let popup;
                    let component;

                    return {
                        onStart: (props) => {
                            component = createSuggestionList(props.items);
                            component.update(props);

                            popup = document.createElement('div');
                            popup.className = 'placeholder-suggestion-popup';
                            popup.appendChild(component.element);
                            document.body.appendChild(popup);

                            const rect = props.clientRect?.();
                            if (rect) {
                                popup.style.left = `${rect.left + window.scrollX}px`;
                                popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
                            }
                        },

                        onUpdate(props) {
                            component?.update(props);

                            const rect = props.clientRect?.();
                            if (rect && popup) {
                                popup.style.left = `${rect.left + window.scrollX}px`;
                                popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
                            }
                        },

                        onKeyDown(props) {
                            if (props.event.key === 'Escape') {
                                if (popup) popup.remove();
                                return true;
                            }

                            return component?.onKeyDown(props) || false;
                        },

                        onExit() {
                            if (popup) {
                                popup.remove();
                                popup = null;
                            }
                        },
                    };
                },
            },
        };
    },

    addStorage() {
        return {
            items: [],
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});