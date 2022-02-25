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
            cube: new defs.Cube(),
            cone: new defs.Closed_Cone(30, 30),
            wheel: new defs.Capped_Cylinder(15,15),
        };

        // *** Materials
        this.materials = {
            test: new Material(new Phong_Shader(), {
                ambient: 1, color: hex_color("#9d2b2b")
            }),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 0, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 80), vec3(0, 0, 0), vec3(0, 1, 0));

        this.ball = new PhysicsObject(this.shapes.sphere, 50, this.materials.test, {}, vec3(-10, 0, 0), Mat4.identity());
    }

    draw_tom(context, program_state, model_transform) {
        let tom_color = hex_color("#242b53");
        let tom_ear_color = hex_color("#763956");

        let model_transform_original = model_transform;
        model_transform = model_transform.times(Mat4.scale(3, 3, 3));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: tom_color}));
        model_transform = model_transform.times(Mat4.translation(2, -1, 0)).times(Mat4.scale(2, 1.5, 1));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: tom_color}));

        //outer ear
        let model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color:tom_color}));
        model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color:tom_color}));

        //inner ear
        let model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color:tom_ear_color}));
        model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color:tom_ear_color}));
    }

    draw_plane(context, program_state, model_transform) {
        let plane_color = hex_color("#8b0000");
        let upper = model_transform;
        let lower = model_transform;
        model_transform = model_transform.times(Mat4.scale(2,2,1));

        for(let i = 0; i < 4; i++){
            this.shapes.wheel.draw(context, program_state, model_transform, this.materials.plastic.override({color: plane_color}));
            model_transform = model_transform.times(Mat4.scale(0.25,2,0.5));
            model_transform = model_transform.times(Mat4.translation(0,1,0));
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: plane_color}));
            model_transform = model_transform.times(Mat4.scale(4,0.5,2));
            if (i == 0){
                model_transform = model_transform.times(Mat4.translation(5,-2,0));
            } else if (i == 1){
                model_transform = model_transform.times(Mat4.translation(0,-2,-10));
            } else if (i == 2) {
                model_transform = model_transform.times(Mat4.translation(-5, -2, 0));
            }
        }

        //Upper and lower floors
        upper = upper.times(Mat4.translation(5,8,-5));
        upper = upper.times(Mat4.scale(7, 0.2, 14));
        this.shapes.cube.draw(context, program_state, upper, this.materials.plastic.override({color: plane_color}));
        lower = lower.times(Mat4.translation(5,1,-5));
        lower = lower.times(Mat4.scale(6, 0.2, 4.5));
        this.shapes.cube.draw(context, program_state, lower, this.materials.plastic.override({color: plane_color}));

        return model_transform;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.

    }

    display(context, program_state) {

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);
        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:

        super.display(context, program_state);
        let model_transform_plane = Mat4.identity();
        let model_transform_tom = Mat4.translation(2, 15.5, -5);
        const t = this.t = program_state.animation_time / 1000;
        this.draw_tom(context, program_state, model_transform_tom);
        this.draw_plane(context, program_state, model_transform_plane);

        program_state.lights = [new Light(vec4(0, 10, 0, 1), color(1, 1, 1, 1), 1000)];


        // if (this.ball.model_transform[1][3] < 0) {
        //     // this.ball.addForce("up", vec3(0, 250, 0));
        //     this.ball.velocity = vec3(0, 10, 0);
        // }
        this.ball.draw(context, program_state);
    }
}


