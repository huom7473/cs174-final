import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere
} = defs;

class PhysicsObject {

    static ACC_GRAVITY = 5;

    constructor(shape, mass, material, initialForces, initialVelocity, model_transform) {
        this.shape = shape;
        this.mass = mass;
        this.material = material;
        this.forces = initialForces;
        this.velocity = initialVelocity;

        this.model_transform = model_transform;
        this.lastDrawnTime = null;

        this.forces.gravity = vec3(0, -1 * PhysicsObject.ACC_GRAVITY * this.mass, 0);
    }

    draw(context, program_state) {
        if (this.lastDrawnTime === null) {
            this.lastDrawnTime = program_state.animation_time;
        }

        let dt = (program_state.animation_time - this.lastDrawnTime) / 1000;

        let sumForces = Object.values(this.forces).reduce(
            (previous, current) => previous.plus(current), vec3(0, 0, 0)
        );

        let acceleration = sumForces.copy();
        acceleration.scale_by(1 / this.mass);

        this.velocity = this.velocity.plus(acceleration.times(dt));

        let displacement = this.velocity.times(dt);
        this.model_transform.pre_multiply(Mat4.translation(...displacement));
        this.shape.draw(context, program_state, this.model_transform, this.material);

        this.lastDrawnTime = program_state.animation_time;
    }

    addForce(name, force) {
        this.forces[name] = force;
    }

    removeForce(name) {
        delete this.forces[name];
    }

}

export class FinalProject extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sphere: new Subdivision_Sphere(4),
        };

        // *** Materials
        this.materials = {
            test: new Material(new Phong_Shader(), {
                ambient: 1, color: hex_color("#9d2b2b")
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        this.ball = new PhysicsObject(this.shapes.sphere, 50, this.materials.test, {}, vec3(0, 0, 0), Mat4.identity());
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.

    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        program_state.lights = [new Light(vec4(0, 10, 0, 1), color(1, 1, 1, 1), 1000)];


        if (this.ball.model_transform[1][3] < 0) {
            // this.ball.addForce("up", vec3(0, 250, 0));
            this.ball.velocity = vec3(0, 10, 0);
        }
        this.ball.draw(context, program_state);
    }
}


