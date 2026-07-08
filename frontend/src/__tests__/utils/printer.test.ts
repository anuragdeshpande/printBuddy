/**
 * Tests for getPrinterImage — model → printer card image resolver.
 *
 * X2D support (#988): both the display name "X2D" and the internal SSDP
 * code "N6" must resolve to /img/printers/x2d.png so the Printers page
 * and PrinterInfoModal show the correct artwork instead of falling back
 * to default.png.
 */

import { describe, it, expect } from 'vitest';
import { getPrinterImage } from '../../utils/printer';

describe('getPrinterImage', () => {
  describe('X2D (#988)', () => {
    it('resolves display name "X2D" to x2d.png?v=printhive', () => {
      expect(getPrinterImage('X2D')).toBe('/img/printers/x2d.png?v=printhive');
    });

    it('resolves case-insensitive variants', () => {
      expect(getPrinterImage('x2d')).toBe('/img/printers/x2d.png?v=printhive');
      expect(getPrinterImage(' X2D ')).toBe('/img/printers/x2d.png?v=printhive');
    });

    it('resolves the internal SSDP code "N6" to x2d.png?v=printhive', () => {
      expect(getPrinterImage('N6')).toBe('/img/printers/x2d.png?v=printhive');
    });

    it('does not match X2D on unrelated model strings', () => {
      // Regression guard: a hypothetical future "X2" model must not
      // silently pick up x2d.png until it's explicitly mapped.
      expect(getPrinterImage('X2E')).toBe('/img/printers/default.png?v=printhive');
    });
  });

  describe('A2L (#1684)', () => {
    it('resolves display name "A2L" to a2l.png?v=printhive', () => {
      expect(getPrinterImage('A2L')).toBe('/img/printers/a2l.png?v=printhive');
    });

    it('resolves case-insensitive variants', () => {
      expect(getPrinterImage('a2l')).toBe('/img/printers/a2l.png?v=printhive');
      expect(getPrinterImage(' A2L ')).toBe('/img/printers/a2l.png?v=printhive');
    });

    it('resolves the internal SSDP code "N9" to a2l.png?v=printhive', () => {
      expect(getPrinterImage('N9')).toBe('/img/printers/a2l.png?v=printhive');
    });

    it('does not match A2L on unrelated A-series strings', () => {
      // Regression guard: a hypothetical future "A2M" or similar must not
      // silently pick up a2l.png until it's explicitly mapped, and "A1" /
      // "A1 Mini" must still resolve to their own artwork.
      expect(getPrinterImage('A2M')).toBe('/img/printers/default.png?v=printhive');
      expect(getPrinterImage('A1')).toBe('/img/printers/a1.png?v=printhive');
      expect(getPrinterImage('A1 Mini')).toBe('/img/printers/a1mini.png?v=printhive');
    });
  });

  describe('regression: existing families unchanged', () => {
    it('X1C → x1c.png?v=printhive', () => {
      expect(getPrinterImage('X1C')).toBe('/img/printers/x1c.png?v=printhive');
    });

    it('X1E → x1e.png?v=printhive', () => {
      expect(getPrinterImage('X1E')).toBe('/img/printers/x1e.png?v=printhive');
    });

    it('H2D → h2d.png?v=printhive', () => {
      expect(getPrinterImage('H2D')).toBe('/img/printers/h2d.png?v=printhive');
    });

    it('H2D Pro → h2dpro.png?v=printhive', () => {
      expect(getPrinterImage('H2D Pro')).toBe('/img/printers/h2dpro.png?v=printhive');
    });

    it('P2S → p1s.png (shared with P1S)', () => {
      // Pre-existing behaviour: P2S currently reuses the P1S artwork. Not
      // changed by the X2D diff; asserted to catch accidental regressions.
      expect(getPrinterImage('P2S')).toBe('/img/printers/p1s.png?v=printhive');
    });

    it('A1 Mini → a1mini.png (not a1.png)', () => {
      // The "a1mini" branch must run before the generic "a1" branch —
      // the X2D branch was inserted above both and must not break order.
      expect(getPrinterImage('A1 Mini')).toBe('/img/printers/a1mini.png?v=printhive');
    });

    it('null / undefined → default.png?v=printhive', () => {
      expect(getPrinterImage(null)).toBe('/img/printers/default.png?v=printhive');
      expect(getPrinterImage(undefined)).toBe('/img/printers/default.png?v=printhive');
    });

    it('unknown model → default.png?v=printhive', () => {
      expect(getPrinterImage('SomeFuturePrinter')).toBe(
        '/img/printers/default.png?v=printhive',
      );
    });
  });
});
