import { describe, it } from 'vitest';
import { buildStructureTree, normalizeStructure, StructureNodeData } from '../availability';

const slice = (path: string, name: string) => ({ name, path, parts: [{ name, fullName: `X.${name}`, kind: 'Command' }] });

describe('when building the tree of a structure with modules, sub-features and slices', () => {
    const roots = buildStructureTree(normalizeStructure({
        modules: [{
            name: 'Fleet',
            path: 'Fleet',
            slices: [slice('Fleet/Dock', 'Dock')],
            features: [{
                name: 'Quality',
                path: 'Fleet/Quality',
                slices: [],
                features: [{ name: 'Scores', path: 'Fleet/Quality/Scores', features: [], slices: [slice('Fleet/Quality/Scores/Rank', 'Rank')] }],
            }],
        }],
    }));

    it('should have one root per module', () => roots.map(_ => _.label).should.deep.equal(['Fleet']));
    it('should key a node by its path', () => roots[0].key!.should.equal('path:Fleet'));
    it('should list features before slices', () => roots[0].children!.map(_ => _.label).should.deep.equal(['Quality', 'Dock']));
    it('should nest a sub-feature in its feature', () => roots[0].children![0].children![0].key!.should.equal('path:Fleet/Quality/Scores'));
    it('should nest a slice in its sub-feature', () => roots[0].children![0].children![0].children![0].key!.should.equal('path:Fleet/Quality/Scores/Rank'));
    it('should mark slices as leaves carrying their parts', () => {
        const node = roots[0].children![1];
        node.leaf!.should.be.true;
        (node.data as StructureNodeData).should.deep.include({ kind: 'slice', path: 'Fleet/Dock' });
        (node.data as StructureNodeData).parts.map(_ => _.fullName).should.deep.equal(['X.Dock']);
    });
});

describe('when building the tree of what belongs to no module', () => {
    const roots = buildStructureTree(normalizeStructure({
        modules: [{ name: '', path: '', features: [{ name: 'Billing', path: 'Billing', features: [], slices: [] }], slices: [slice('Ping', 'Ping')] }],
    }));

    it('should use its features and slices as roots', () => roots.map(_ => _.label).should.deep.equal(['Billing', 'Ping']));
});

describe('when normalizing a structure that is missing parts', () => {
    const structure = normalizeStructure({ modules: [{ name: 'Fleet' }, 'junk', null] });

    it('should default what is missing to empty', () => structure.modules.should.deep.equal([{ name: 'Fleet', path: '', features: [], slices: [] }]));
    it('should accept nothing at all', () => normalizeStructure(undefined).modules.should.deep.equal([]));
});
