import p5 from "p5";

export interface Point {
    position: p5.Vector;
    prevPosition: p5.Vector;
    forceMultiplier: number,

    locked: boolean;
}

export function createStationaryPoint(x: number, y: number, locked: boolean = false, forceMultiplier: number = 1) {
    let position = new p5.Vector().set(x, y);
    return {
        position,
        prevPosition: position.copy(),
        forceMultiplier,
        locked,
    };
}

export interface Stick {
    pointA: Point;
    pointB: Point;

    length: number;
}

export function createStick(a: Point, b: Point, length: number) {
    return {
        pointA: a,
        pointB: b,
        length,
    };
}

export function generateSticks(points: Point[], links: [number, number][]) {
    let sticks: Stick[] = [];
    for (let [ a, b ] of links)
        sticks.push(createStick(points[a], points[b], points[a].position.copy().sub(points[b].position).mag()));

    return sticks
}

export default class SoftBody {
    points: Point[];
    sticks: Stick[];

    static generateQuad(
        x: number,
        y: number,
        width: number,
        height: number, 
        sectorSize: number,
        forceMultiplier: number = 1,
    ) {
        let points = [];
        for (let i = 0; i < height; i++)
            for (let j = 0; j < width; j++)
                points.push(createStationaryPoint(
                    x + j * sectorSize,
                    y + i * sectorSize,
                    false,
                    forceMultiplier,
                ));

        let stickIndexes = [];

        // Vertical links
        for (let i = 0; i < height; i++)
            for (let j = 0; j < width - 1; j++)
                stickIndexes.push([i * width + j, i * width + j + 1]);

        // Horizontal links
        for (let j = 0; j < width; j++)
            for (let i = 0; i < height - 1; i++)
                stickIndexes.push([i * width + j, (i + 1) * width + j]);

        let sticks = generateSticks(points, stickIndexes);

        return new SoftBody(points, sticks);
    }       

    constructor(points: Point[], sticks: Stick[]) {
        this.points = points;
        this.sticks = sticks;
    }

    simulateSoftBody(p: p5, gravity: p5.Vector, iterations: number = 5) {
        for (let point of this.points) {
            if (!point.locked) {
                let prevPosition = point.position.copy();
                // Keep point in motion
                point.position.add(point.position.copy().sub(point.prevPosition));

                // Apply gravity
                point.position.add(gravity.copy().mult(p.deltaTime).mult(point.forceMultiplier));

                // Record position before update
                point.prevPosition = prevPosition;
            }
        }

        // Multiple iterations to prevent anomalous results
        for (let i = 0; i < iterations; i++) {
            for (let stick of this.sticks) {
                // Get the mid point of the stick
                let stickCentre = stick.pointA.position.copy().add(stick.pointB.position).div(2);
                // Get the direction of the stick
                let stickDirection = stick.pointA.position.copy().sub(stick.pointB.position.copy()).normalize();

                // Pull the points in towards the middle to the correct stick size if the points are not locked
                if (!stick.pointA.locked)
                    stick.pointA.position = stickCentre.copy().add(stickDirection.copy().mult(stick.length).div(2));
                if (!stick.pointB.locked)
                    stick.pointB.position = stickCentre.copy().sub(stickDirection.copy().mult(stick.length).div(2));
            }
        }
    }
}


