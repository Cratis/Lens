/// <reference types="chai/register-should" />
import { should } from 'chai';

// Cratis specs read as sentences -- result.should.equal(expected) -- so the fluent interface is installed
// once here rather than imported per spec. The reference above is what teaches tsc about Object.should.
should();
