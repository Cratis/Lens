import { describe, it } from 'vitest';
import { formatBytes } from '../formatBytes';

describe('when formatting a size', () => {
    it('should keep whole bytes below a kilobyte', () => {
        formatBytes(0).should.equal('0 B');
        formatBytes(1023).should.equal('1023 B');
    });

    it('should switch to kilobytes at a kilobyte', () => {
        formatBytes(1024).should.equal('1.0 KB');
        formatBytes(1536).should.equal('1.5 KB');
    });

    it('should switch to megabytes at a megabyte', () => {
        formatBytes(1024 * 1024).should.equal('1.0 MB');
        formatBytes(5 * 1024 * 1024).should.equal('5.0 MB');
    });

    it('should not present nonsense for a value it cannot measure', () => {
        formatBytes(Number.NaN).should.equal('—');
        formatBytes(-1).should.equal('—');
    });
});
