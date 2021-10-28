import p5 from "p5";

import SoftBody, { Point, createStationaryPoint as createSPoint, Stick, generateSticks, createStick } from "./softBody";
import { BoidHandler, createBoundary } from "boids/src/boidHandler";

function drawSoftBodyQuad(p: p5, softBody: SoftBody, width: number, height: number) {
        p.beginShape()
        
        // Top edge
        for (let i = 0; i < width; i++) {
            let pos = softBody.points[i].position;
            p.vertex(pos.x, pos.y);
        }
        
        // Right edge
        for (let i = 0; i < height; i++) {
            let pos = softBody.points[width * i + (width - 1)].position;
            p.vertex(pos.x, pos.y);
        }
        
        // Bottom edge (reversed iteration)
        for (let i = width - 1; i >= 0; i--) {
            let pos = softBody.points[(width * (height - 1)) + i].position;
            p.vertex(pos.x, pos.y);
        }
        
        // Left edge (reversed iteration)
        for (let i = height - 1; i >= 0; i--) {
            let pos = softBody.points[i * width].position;
            p.vertex(pos.x, pos.y);
        }

        p.endShape();
}

function generateGrassBlade(x: number, y: number, segments: number, segmentSize: number) {
    let points = [ createSPoint(x, y, true) ];
    for (let i = 1; i < segments + 1; i++)
        points.push(createSPoint(x, y + segmentSize * i, false, 1 / i + Math.random() * 0.05));

    let stickIndexes = [];
    for (let i = 0; i < points.length - 1; i++)
        stickIndexes.push([i, i + 1]);

    let sticks = generateSticks(points, stickIndexes);
    return new SoftBody(points, sticks);
}

const sketch = (p: p5) => {
    let width = window.innerWidth;
    let height = window.innerHeight;

    const boidBoundary = createBoundary(-50, -50, width + 50, height / 2);

    const clothX = 100;
    const clothY = height / 2 + height / 5;

    const clothWidth = 29;
    const clothHeight = 29;

    const clothCellSize = 5;
    const clothForceMultiplier = 0.01;

    let clothSoftBody: SoftBody;
    let boidHandler: BoidHandler;

    let gravity: p5.Vector;

    let grassBlades: SoftBody[] = [];

    p.setup = () => {
        p.createCanvas(width, height);

        // Generate boids
        boidHandler = new BoidHandler(p, boidBoundary, Math.min(width * height / 20, 200), 0, 1);
        boidHandler.params = {
            ...boidHandler.params,
            coherenceFactor: 0.01,
            separationFactor: 0.1,
            minDistance: 8,
            visualRange: width,
            preySpeedLimit: 3,

            containerMargin: 10,
        }

        clothSoftBody = SoftBody.generateQuad(
            clothX,
            clothY,
            clothWidth,
            clothHeight,
            clothCellSize,
            clothForceMultiplier,
        );
        clothSoftBody.points[0].locked = true;
        clothSoftBody.points[Math.floor(clothWidth / 2)].locked = true;
        clothSoftBody.points[clothWidth - 1].locked = true;

        for (let i = 0; i < 250; i ++) {
            let x = Math.random() * width;
            let lawnHeight = height / 2 + height / 10 + 10;
            let y = Math.random() * (height - lawnHeight) + lawnHeight;
            grassBlades.push(generateGrassBlade(x, y, Math.floor(Math.random() * 1 + 5), Math.random() * 2 + 5));
        }
        
        // Calculate gravity
        gravity = p.createVector(0, 1).mult(0.2);
    }

    let done = false;

    p.draw = () => {
        // Sky & boids
        
        // Group all the boids together to begin with
        if (p.frameRate() > 0 && p.frameCount > p.frameRate() * 5 && !done) {
            boidHandler.params.visualRange = 25;
            done = true;
        }
        // Update the boids
        boidHandler.updateBoids(p);
        
        // Draw the sky
        p.background("#87CEEB");
        
        // Draw the boids
        p.noStroke()
        p.fill("black");
        boidHandler.renderBoids(p, (p, boid) => p.circle(boid.pos.x, boid.pos.y, 2));

        // Grass & cloth
        
        // Generate wind force
        const windDir = p.createVector(1, 0);
        let wind = windDir.mult(p.noise(p.frameCount * 0.01, 100) * 0.1);
        
        // Update the cloth soft body
        let clothForce = wind.copy().add(gravity);
        clothSoftBody.simulateSoftBody(p, clothForce, 10)

        // Update the grass soft bodies
        let grassForce = wind.copy().mult(2).sub(gravity);
        for (let grass of grassBlades)
            grass.simulateSoftBody(p, grassForce, 10);
        
        // Draw the grass
        p.fill("#59A608");
        p.rect(-5, height / 2 + height / 10, width + 5, height + 5);

        p.stroke("#348C31");
        for (let grass of grassBlades) {
            for (let segment of grass.sticks) {
                let posA = segment.pointA.position;
                let posB = segment.pointB.position;
                p.line(posA.x, posA.y, posB.x, posB.y);
            }
        }

        // Draw the washing line
        let left = clothX - 10;
        let right = clothX + clothWidth * clothCellSize + 10;
        let bottom = clothY + clothHeight * clothCellSize + 50;

        p.stroke("black");
        p.line(left, clothY, right, clothY);
        p.line(left, clothY, left, bottom);
        p.line(right, clothY, right, bottom);

        // Draw the cloth
        p.stroke("#444");
        p.fill("grey");
        drawSoftBodyQuad(p, clothSoftBody, 29, 29);
    }
}

new p5(sketch);

