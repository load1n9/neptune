import { Composite } from "../body/Composite.ts";
import { Body } from "../body/Body.ts";
import type { IBody, IComposite } from "../types.ts";
import { Common } from "../core/Common.ts";
import { Constraint } from "../constraint/Constraint.ts";

export class Composites {
  static stack(
    x: number,
    y: number,
    columns: number,
    rows: number,
    columnGap: number,
    rowGap: number,
    // deno-lint-ignore no-explicit-any
    callback: any,
  ): IComposite {
    const stack = Composite.create({ label: "Stack" });
    let _x = x;
    let _y = y;
    let lastBody;
    let i = 0;
    for (let row = 0; row < rows; row++) {
      let maxHeight = 0;

      for (let column = 0; column < columns; column++) {
        // deno-lint-ignore no-explicit-any
        const body: any = callback(_x, _y, column, row, lastBody, i);

        if (body) {
          const bodyHeight = body.bounds.max.y - body.bounds.min.y;
          const bodyWidth = body.bounds.max.x - body.bounds.min.x;

          if (bodyHeight > maxHeight) {
            maxHeight = bodyHeight;
          }

          Body.translate(body, { x: bodyWidth * 0.5, y: bodyHeight * 0.5 });

          _x = body.bounds.max.x + columnGap;

          Composite.addBody(stack, body);

          lastBody = body;
          i += 1;
        } else {
          _x += columnGap;
        }
      }

      _y += maxHeight + rowGap;
      _x = x;
    }

    return stack;
  }

  static chain(
    composite: IComposite,
    xOffsetA: number,
    yOffsetA: number,
    xOffsetB: number,
    yOffsetB: number,
    // deno-lint-ignore no-explicit-any
    options: any,
  ): IComposite {
    const bodies = composite.bodies;

    for (let i = 1; i < bodies.length; i++) {
      const bodyA = bodies[i - 1],
        bodyB = bodies[i],
        bodyAHeight = bodyA.bounds.max.y - bodyA.bounds.min.y,
        bodyAWidth = bodyA.bounds.max.x - bodyA.bounds.min.x,
        bodyBHeight = bodyB.bounds.max.y - bodyB.bounds.min.y,
        bodyBWidth = bodyB.bounds.max.x - bodyB.bounds.min.x;

      const defaults = {
        bodyA: bodyA,
        pointA: { x: bodyAWidth * xOffsetA, y: bodyAHeight * yOffsetA },
        bodyB: bodyB,
        pointB: { x: bodyBWidth * xOffsetB, y: bodyBHeight * yOffsetB },
      };

      const constraint = Common.extend(defaults, options);

      Composite.addConstraint(composite, Constraint.create(constraint));
    }

    composite.label += " Chain";

    return composite;
  }

  static mesh(
    composite: IComposite,
    columns: number,
    rows: number,
    crossBrace: boolean,
    // deno-lint-ignore no-explicit-any
    options: any,
  ): IComposite {
    const bodies = composite.bodies;
    let row,
      col,
      bodyA,
      bodyB,
      bodyC;

    for (row = 0; row < rows; row++) {
      for (col = 1; col < columns; col++) {
        bodyA = bodies[(col - 1) + (row * columns)];
        bodyB = bodies[col + (row * columns)];
        Composite.addConstraint(
          composite,
          Constraint.create(
            Common.extend({ bodyA: bodyA, bodyB: bodyB }, options),
          ),
        );
      }

      if (row > 0) {
        for (col = 0; col < columns; col++) {
          bodyA = bodies[col + ((row - 1) * columns)];
          bodyB = bodies[col + (row * columns)];
          Composite.addConstraint(
            composite,
            Constraint.create(
              Common.extend({ bodyA: bodyA, bodyB: bodyB }, options),
            ),
          );

          if (crossBrace && col > 0) {
            bodyC = bodies[(col - 1) + ((row - 1) * columns)];
            Composite.addConstraint(
              composite,
              Constraint.create(
                Common.extend({ bodyA: bodyC, bodyB: bodyB }, options),
              ),
            );
          }

          if (crossBrace && col < columns - 1) {
            bodyC = bodies[(col + 1) + ((row - 1) * columns)];
            Composite.addConstraint(
              composite,
              Constraint.create(
                Common.extend({ bodyA: bodyC, bodyB: bodyB }, options),
              ),
            );
          }
        }
      }
    }

    composite.label += " Mesh";

    return composite;
  }

  static pyramid(
    x: number,
    y: number,
    columns: number,
    rows: number,
    columnGap: number,
    rowGap: number,
    // deno-lint-ignore no-explicit-any
    callback: any,
  ) {
    return Composites.stack(
      x,
      y,
      columns,
      rows,
      columnGap,
      rowGap,
      (
        _x: number,
        _y: number,
        column: number,
        row: number,
        lastBody: IBody | undefined,
        i: number,
      ) => {
        const actualRows = Math.min(rows, Math.ceil(columns / 2)),
          lastBodyWidth = lastBody
            ? lastBody.bounds.max.x - lastBody.bounds.min.x
            : 0;

        if (row > actualRows) {
          return;
        }
        row = actualRows - row;

        const start = row,
          end = columns - 1 - row;

        if (column < start || column > end) {
          return;
        }
        if (i === 1) {
          Body.translate(lastBody!, {
            x: (column + (columns % 2 === 1 ? 1 : -1)) * lastBodyWidth,
            y: 0,
          });
        }

        const xOffset = lastBody ? column * lastBodyWidth : 0;

        return callback(
          x + xOffset + column * columnGap,
          _y,
          column,
          row,
          lastBody,
          i,
        );
      },
    );
  }
}
