import { compareBlocks } from './BlockComparator';
import { compareTableNodes } from './TableComparator';

// Helper to build a map of block-ids
const buildIdMap = (contentArray, map = new Map()) => {
    if (!contentArray || !Array.isArray(contentArray)) return map;

    contentArray.forEach(node => {
        if (node.attrs && node.attrs['block-id']) {
            map.set(node.attrs['block-id'], node);
        }
        // Descend into node content (useful for nested block-ids, though tip-tap usually keeps them top level)
        if (node.content && node.type !== 'table') {
            buildIdMap(node.content, map);
        }
    });
    return map;
};

export const generateDocumentDiff = (oldJson, newJson) => {
    if (!oldJson || !newJson) return { content: [] };

    const oldContent = oldJson.content || [];
    const newContent = newJson.content || [];

    const oldMap = buildIdMap(oldContent);
    const newMap = buildIdMap(newContent);

    const diffResult = [];

    // 1. Build a list of all unique block-ids in order of appearance in the OLD document
    const oldOrder = oldContent.filter(n => n.attrs?.['block-id']).map(n => n.attrs['block-id']);

    // 2. Process new document content
    newContent.forEach(newNode => {
        const blockId = newNode.attrs ? newNode.attrs['block-id'] : null;

        // Find which old blocks were BEFORE this block but haven't been processed yet
        if (blockId) {
            const currentIndex = oldOrder.indexOf(blockId);
            if (currentIndex !== -1) {
                // All blocks in oldOrder before this index that are still in oldMap are removals that happened BEFORE this block
                const previousRemovals = oldOrder.slice(0, currentIndex);
                previousRemovals.forEach(pid => {
                    const removedNode = oldMap.get(pid);
                    if (removedNode) {
                        diffResult.push({ ...removedNode, diffStatus: 'removed' });
                        oldMap.delete(pid);
                    }
                });
            }
        }

        if (newNode.type === 'table') {
            const oldNode = blockId ? oldMap.get(blockId) : oldContent.find(n => n.type === 'table' && JSON.stringify(n) !== JSON.stringify(newNode));
            if (oldNode) {
                const tableDiff = compareTableNodes(oldNode, newNode);
                diffResult.push(tableDiff.isChanged ? { ...tableDiff.node, diffStatus: 'modified' } : newNode);
                if (blockId) oldMap.delete(blockId);
            } else {
                diffResult.push({ ...newNode, diffStatus: 'added' });
            }
        }
        else if (blockId) {
            const oldNode = oldMap.get(blockId);
            if (oldNode) {
                const diff = compareBlocks(oldNode, newNode);
                diffResult.push(diff.isChanged ? { ...diff.node, diffStatus: 'modified' } : newNode);
                oldMap.delete(blockId);
            } else {
                diffResult.push({ ...newNode, diffStatus: 'added' });
            }
        } else {
            const exactMatch = oldContent.find(n => JSON.stringify(n) === JSON.stringify(newNode));
            if (exactMatch) {
                diffResult.push(newNode);
            } else {
                diffResult.push({ ...newNode, diffStatus: 'added' });
            }
        }
    });

    // 3. Process remaining old content (these were at the end of the old doc)
    oldMap.forEach((oldNode) => {
        diffResult.push({ ...oldNode, diffStatus: 'removed' });
    });

    return { type: 'doc', content: diffResult };
};
