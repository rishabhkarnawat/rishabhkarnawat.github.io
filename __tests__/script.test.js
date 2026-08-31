/**
 * @jest-environment jsdom
 */

const {
  getMarginCellPosition,
  getMarginCellColumns,
  PI_ACCORDION_DURATION,
} = require('../script');

describe('getMarginCellPosition', () => {
  const gridSize = 22;

  describe('left margin (isRight = false)', () => {
    it('returns the cell at (0,0) for the top-left corner', () => {
      const result = getMarginCellPosition(0, 0, 110, gridSize, false);
      expect(result).toEqual({ cellX: 0, cellY: 0, cellW: gridSize, cellH: gridSize });
    });

    it('snaps x coordinate to grid boundary', () => {
      const result = getMarginCellPosition(30, 10, 110, gridSize, false);
      expect(result.cellX).toBe(22);
      expect(result.cellW).toBe(gridSize);
    });

    it('snaps y coordinate to grid boundary', () => {
      const result = getMarginCellPosition(5, 50, 110, gridSize, false);
      expect(result.cellY).toBe(44);
      expect(result.cellH).toBe(gridSize);
    });

    it('handles width evenly divisible by gridSize', () => {
      const width = gridSize * 5;
      const result = getMarginCellPosition(45, 0, width, gridSize, false);
      expect(result.cellX).toBe(44);
      expect(result.cellW).toBe(gridSize);
    });

    it('returns partial cell width when x falls in the remainder strip on the right', () => {
      const width = gridSize * 3 + 10;
      const result = getMarginCellPosition(width - 5, 0, width, gridSize, false);
      expect(result.cellX).toBe(width - 10);
      expect(result.cellW).toBe(10);
    });

    it('returns full cell width when x is before the remainder strip', () => {
      const width = gridSize * 3 + 10;
      const result = getMarginCellPosition(10, 0, width, gridSize, false);
      expect(result.cellX).toBe(0);
      expect(result.cellW).toBe(gridSize);
    });
  });

  describe('right margin (isRight = true)', () => {
    it('returns partial cell at the leading edge when width has remainder', () => {
      const width = gridSize * 3 + 10;
      const result = getMarginCellPosition(5, 0, width, gridSize, true);
      expect(result.cellX).toBe(0);
      expect(result.cellW).toBe(10);
    });

    it('returns full cell width after the remainder strip', () => {
      const width = gridSize * 3 + 10;
      const result = getMarginCellPosition(15, 0, width, gridSize, true);
      expect(result.cellX).toBe(10);
      expect(result.cellW).toBe(gridSize);
    });

    it('handles width evenly divisible by gridSize', () => {
      const width = gridSize * 4;
      const result = getMarginCellPosition(25, 0, width, gridSize, true);
      expect(result.cellX).toBe(22);
      expect(result.cellW).toBe(gridSize);
    });

    it('returns correct y cell position', () => {
      const result = getMarginCellPosition(0, 100, 110, gridSize, true);
      expect(result.cellY).toBe(88);
    });
  });
});

describe('getMarginCellColumns', () => {
  const gridSize = 22;

  describe('left margin (isRight = false)', () => {
    it('returns full columns when width is evenly divisible', () => {
      const columns = getMarginCellColumns(gridSize * 3, gridSize, false);
      expect(columns).toEqual([
        { x: 0, w: gridSize },
        { x: 22, w: gridSize },
        { x: 44, w: gridSize },
      ]);
    });

    it('appends a partial column at the end when there is a remainder', () => {
      const width = gridSize * 2 + 10;
      const columns = getMarginCellColumns(width, gridSize, false);
      expect(columns).toEqual([
        { x: 0, w: gridSize },
        { x: 22, w: gridSize },
        { x: 44, w: 10 },
      ]);
    });

    it('returns only a partial column when width < gridSize', () => {
      const columns = getMarginCellColumns(15, gridSize, false);
      expect(columns).toEqual([{ x: 0, w: 15 }]);
    });

    it('returns empty when width is 0', () => {
      const columns = getMarginCellColumns(0, gridSize, false);
      expect(columns).toEqual([]);
    });
  });

  describe('right margin (isRight = true)', () => {
    it('prepends a partial column at the start when there is a remainder', () => {
      const width = gridSize * 2 + 10;
      const columns = getMarginCellColumns(width, gridSize, true);
      expect(columns).toEqual([
        { x: 0, w: 10 },
        { x: 10, w: gridSize },
        { x: 32, w: gridSize },
      ]);
    });

    it('returns only full columns when width is evenly divisible', () => {
      const columns = getMarginCellColumns(gridSize * 3, gridSize, true);
      expect(columns).toEqual([
        { x: 0, w: gridSize },
        { x: 22, w: gridSize },
        { x: 44, w: gridSize },
      ]);
    });

    it('returns only a partial column when width < gridSize', () => {
      const columns = getMarginCellColumns(15, gridSize, true);
      expect(columns).toEqual([{ x: 0, w: 15 }]);
    });
  });
});

describe('PI_ACCORDION_DURATION', () => {
  it('is exported as 450', () => {
    expect(PI_ACCORDION_DURATION).toBe(450);
  });
});
